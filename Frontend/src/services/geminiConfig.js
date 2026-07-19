/**
 * Model chain configuration for resilient Gemini calls.
 * Call sites pass this into callGeminiResilient — the wrapper itself does not
 * hardcode model names.
 */
export function getGeminiModelChain() {
  const chain = [
    import.meta.env.VITE_GEMINI_MODEL,
    import.meta.env.VITE_GEMINI_MODEL_FALLBACK,
  ].filter(Boolean);

  // Empty chain => omit model on the request and let the backend default apply.
  return chain.length ? chain : [undefined];
}
