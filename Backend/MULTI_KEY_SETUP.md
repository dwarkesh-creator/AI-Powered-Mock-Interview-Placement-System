# 🔑 Multi-Key Setup Guide

## Why Use Multiple API Keys?

Gemini free tier has **15 requests/minute (RPM)** limit per API key.

With **4 API keys**, you get:
- ✅ **60 RPM total** (15 × 4)
- ✅ **~20 concurrent users** instead of 5
- ✅ **Automatic rotation** when one key hits rate limit
- ✅ **Zero downtime** during peak usage

---

## Step 1: Create Additional Gemini API Keys

You need **3-4 Google accounts** (can be personal, family, friends):

### For Each Google Account:

1. Go to: https://aistudio.google.com/apikey
2. Sign in with the Google account
3. Click **"Create API Key"**
4. Copy the key (looks like: `AIzaSyC...`)
5. Save it somewhere safe

**Tip:** Use these accounts:
- Your personal Gmail
- College email
- Parent's/sibling's Gmail
- Create a new free Gmail

---

## Step 2: Add Keys to Local `.env` File

Edit `Backend/.env`:

```env
# Primary key (your current one)
GEMINI_API_KEY=AIzaSyC1aBcDeFgHiJkLmNoPqRsTuVwXyZ

# Additional keys from other accounts
GEMINI_API_KEY_2=AIzaSyC2XyZaBcDeFgHiJkLmNoPqRsTuVw
GEMINI_API_KEY_3=AIzaSyC3TuVwXyZaBcDeFgHiJkLmNoPqRs
GEMINI_API_KEY_4=AIzaSyC4PqRsTuVwXyZaBcDeFgHiJkLmNo
```

**Don't have 4 keys yet?** Start with 2-3, add more later!

---

## Step 3: Add Keys to Render (Production)

### Go to Render Dashboard:

1. Open: https://dashboard.render.com/
2. Click on **"nilgen-backend"** service
3. Go to **"Environment"** tab
4. Click **"Add Environment Variable"**

### Add Each Key:

| Key Name | Value | Example |
|----------|-------|---------|
| `GEMINI_API_KEY_2` | Your 2nd key | `AIzaSyC2XyZaBc...` |
| `GEMINI_API_KEY_3` | Your 3rd key | `AIzaSyC3TuVwXy...` |
| `GEMINI_API_KEY_4` | Your 4th key | `AIzaSyC4PqRsTu...` |

### After Adding:

1. Click **"Save Changes"**
2. Render will **auto-redeploy** (takes 2-3 minutes)
3. Done! Your system now has 60 RPM!

---

## Step 4: Verify It's Working

### Check Render Logs:

Look for this message when a key hits limit:
```
RuntimeWarning: Gemini API key #1 hit rate limit, rotating to next key...
```

This means rotation is working! ✅

### Test Your Site:

1. Go to: https://nilgen-ai.vercel.app
2. Start 3-4 interviews simultaneously (open in different tabs)
3. If all work without errors → Multi-key rotation is working!

---

## How It Works (Technical)

### Round-Robin Rotation:

```
Request 1 → Key 1
Request 2 → Key 2
Request 3 → Key 3
Request 4 → Key 4
Request 5 → Key 1 (back to start)
```

### Automatic Failover:

```
If Key 1 returns 429 (rate limit):
  → Try Key 2
  → If Key 2 works: Success!
  → If all keys fail: Show error
```

---

## FAQ

### Q: Do all keys need to be from different accounts?
**A:** Yes! Same account = same rate limit.

### Q: What if I only have 2 keys?
**A:** That's fine! 30 RPM (2 × 15) is still better than 15 RPM.

### Q: Will this violate Google's ToS?
**A:** It's a gray area. For college projects/demos it's fine. For real production, add credits instead.

### Q: Do keys expire?
**A:** Free keys may expire after 60 days of inactivity. Paid keys don't expire.

### Q: How do I check which key is being used?
**A:** Check Render logs for rotation messages.

---

## Troubleshooting

### Error: "No Gemini API keys configured"

**Fix:** Make sure `GEMINI_API_KEY` (primary) is set in Render.

### Error: "All Gemini API keys exhausted"

**Fix:** All your keys hit rate limits. Options:
1. Wait 1 minute (limits reset)
2. Add more keys
3. Add credits to one key

### Keys still hitting rate limit

**Fix:** You need more keys or add credits to unlock higher limits.

---

## Next Steps

Once you have multiple keys working:

1. **Monitor usage** in Render logs
2. **Add more keys** if you see "exhausted" errors
3. **Consider adding credits** (₹500) for unlimited RPM when your project grows

**Need help?** Check Render logs or test locally first!
