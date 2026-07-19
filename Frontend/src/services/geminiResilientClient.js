const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const DEFAULT_BACKOFF_MS = [1000, 3000, 7000];

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function extractDetail(body) {
  if (!body) return '';
  if (typeof body.detail === 'string') return body.detail;
  if (Array.isArray(body.detail)) {
    return body.detail.map((item) => item?.msg || item?.message || String(item)).join(' ');
  }
  return String(body.error || body.message || '');
}

function isRateLimitResponse(status, body) {
  if (status === 429) return true;
  const detail = extractDetail(body).toLowerCase();
  return (
    detail.includes('rate')
    || detail.includes('429')
    || detail.includes('quota')
    || detail.includes('resource_exhausted')
  );
}

function isDailyQuotaError(body) {
  const detail = extractDetail(body).toLowerCase();
  return (
    detail.includes('per day')
    || detail.includes('per-day')
    || detail.includes('daily')
    || detail.includes('rpd')
  );
}

function isRetryableServerError(status) {
  return status >= 500 && status <= 599;
}

function isNonRetryableClientError(status) {
  return status >= 400 && status < 500 && status !== 429;
}

function parseRetryDelayMs(body, attempt, backoffMs) {
  const candidates = [
    body?.retryDelay,
    body?.retry_delay,
    body?.error?.retryDelay,
    body?.details?.retryDelay,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'number' && candidate > 0) {
      return candidate > 1000 ? candidate : candidate * 1000;
    }
    if (typeof candidate === 'string') {
      const secondsMatch = candidate.match(/([\d.]+)\s*s/i);
      if (secondsMatch) return Math.ceil(parseFloat(secondsMatch[1]) * 1000);
    }
  }

  const detail = extractDetail(body);
  const retryMatch = detail.match(/retry(?: after| in)?\s*([\d.]+)\s*s/i);
  if (retryMatch) return Math.ceil(parseFloat(retryMatch[1]) * 1000);

  if (isDailyQuotaError(body)) {
    return attempt >= backoffMs.length - 1 ? 15000 : backoffMs[Math.min(attempt + 1, backoffMs.length - 1)];
  }

  return backoffMs[Math.min(attempt, backoffMs.length - 1)];
}

async function fetchOnce(endpoint, requestPayload, model) {
  const body = model ? { ...requestPayload, model } : requestPayload;
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const responseBody = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, body: responseBody };
}

/**
 * Central resilience wrapper for all Gemini-backed backend endpoints.
 *
 * Layer 1: retry with backoff on 429 / 5xx (and transient network failures)
 * Layer 2: walk modelChain when rate limits persist after Layer 1
 * Layer 3: return degradedFallback with degraded: true (always resolves)
 *
 * Rejects only on non-retryable 4xx errors (auth, validation, etc.).
 */
export async function callGeminiResilient(requestPayload, options = {}) {
  const {
    endpoint,
    modelChain = [undefined],
    degradedFallback = {},
    maxRetries = 3,
    backoffMs = DEFAULT_BACKOFF_MS,
  } = options;

  if (!endpoint) {
    throw new Error('callGeminiResilient requires an endpoint.');
  }

  const models = modelChain.length ? modelChain : [undefined];
  let lastFailure = null;

  for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
    const model = models[modelIndex];
    let rateLimited = false;

    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      try {
        const { ok, status, body } = await fetchOnce(endpoint, requestPayload, model);

        if (ok) {
          console.debug(
            '[geminiResilient] request served',
            { endpoint, model: model || '(server default)' },
          );
          return { ...body, degraded: false };
        }

        if (isNonRetryableClientError(status)) {
          const err = new Error(extractDetail(body) || `Request failed (${status}).`);
          err.status = status;
          throw err;
        }

        rateLimited = isRateLimitResponse(status, body);
        const retryable = rateLimited || isRetryableServerError(status);
        lastFailure = {
          status,
          message: extractDetail(body) || `Request failed (${status}).`,
          rateLimited,
        };

        if (!retryable || attempt === maxRetries - 1) break;

        await sleep(parseRetryDelayMs(body, attempt, backoffMs));
      } catch (err) {
        if (err?.status && isNonRetryableClientError(err.status)) throw err;

        lastFailure = {
          status: err?.status || 0,
          message: err?.message || 'Network request failed.',
          rateLimited: false,
        };

        if (attempt === maxRetries - 1) break;
        await sleep(backoffMs[Math.min(attempt, backoffMs.length - 1)]);
      }
    }

    const hasNextModel = modelIndex < models.length - 1;
    if (lastFailure?.rateLimited && hasNextModel) {
      console.debug(
        '[geminiResilient] rate-limited on model, trying fallback',
        { model: model || '(server default)' },
      );
      continue;
    }

    break;
  }

  console.warn('[geminiResilient] returning degraded fallback', {
    endpoint,
    reason: lastFailure?.message,
  });

  const fallback = typeof degradedFallback === 'function'
    ? degradedFallback(requestPayload, { lastFailure })
    : degradedFallback;

  return {
    ...(fallback || {}),
    degraded: true,
  };
}
