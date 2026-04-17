# Dendron Demo Backend — Vercel Setup Guide

## Overview
This guide helps you deploy the Dendron demo backend to Vercel with multiple Gemini API keys and auto-fallback logic.

## Architecture
- **Platform**: Vercel (100K invocations/month free)
- **Model**: Gemini 3.1 Flash Preview
- **API Keys**: 1 primary + 5 fallbacks (6 total, used randomly)
- **Latency**: ~200-500ms per request
- **Cost**: Free tier covers most demo traffic

## Step 1: Get Gemini API Keys

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key" 
3. Generate 6 API keys (1 primary + 5 fallbacks)
4. Store them securely (you'll need them in Step 3)

## Step 2: Verify Git & Vercel CLI

```bash
# Check if Git is installed
git --version

# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel (opens browser)
vercel login
```

## Step 3: Deploy the Landing Page + Backend

```bash
# Navigate to the repo
cd ~/OneDrive/Desktop/Dendron-Prod

# Deploy to Vercel (first time)
vercel

# You'll be asked:
# - "Set up and deploy?" → yes
# - "Which scope?" → Choose your personal project
# - "Link to existing project?" → no
# - "Project name?" → dendron-landing-page
# - "Directory?" → site/ (for the landing page)

# After deployment completes, note the domain (e.g., dendron-landing-page.vercel.app)
```

## Step 4: Set Environment Variables

Go to [Vercel Dashboard](https://vercel.com/dashboard) → Select your project → Settings → Environment Variables

Add these variables:

```
DENDRON_PROVIDER           = gemini
DENDRON_MODEL              = gemini-3.1-flash-preview
GEMINI_API_KEY             = [your primary key]
GEMINI_API_KEY_1           = [fallback key 1]
GEMINI_API_KEY_2           = [fallback key 2]
GEMINI_API_KEY_3           = [fallback key 3]
GEMINI_API_KEY_4           = [fallback key 4]
GEMINI_API_KEY_5           = [fallback key 5]
ALLOWED_ORIGINS            = https://dendron-landing-page.vercel.app,http://localhost:5173
```

## Step 5: Deploy Backend API

```bash
# Deploy the Vercel API function
cd deploy/vercel
vercel --prod

# Or redeploy from project root after setting env vars:
vercel --prod
```

## Step 6: Update Landing Page

Update the script endpoint in the landing page:

1. Edit `site/index.html`
2. Find: `data-endpoint="https://dendron-api.vercel.app"`  
3. Replace with your deployed Vercel URL (from Step 3)
4. Redeploy: `vercel --prod`

## Step 7: Test

1. Visit your deployed landing page
2. Go to "Quick Demo" tab
3. Copy the script tag
4. Paste on any test site
5. Open console and trigger scroll/click events
6. You should see Dendron tracking events

## Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `DENDRON_PROVIDER` | LLM provider | `gemini` |
| `DENDRON_MODEL` | Model to use | `gemini-3.1-flash-preview` |
| `GEMINI_API_KEY` | Primary API key | `AIzaSy...` |
| `GEMINI_API_KEY_1-5` | Fallback keys (optional) | `AIzaSy...` |
| `ALLOWED_ORIGINS` | CORS whitelist | `https://yoursite.com` |

## API Response Format

```json
{
  "card": {
    "type": "engagement|greeting|feature|pricing|comparison",
    "title": "Card title",
    "description": "Card description",
    "cta": "Call-to-action",
    "ctaUrl": "https://..."
  },
  "model": "gemini-3.1-flash-preview",
  "timestamp": "2026-04-17T..."
}
```

## Fallback Logic

The backend randomly selects from all configured API keys:
- **6 keys configured**: Each request uses random key from all 6 (balanced load)
- **1 key configured**: Uses only that key (no randomness)
- **No keys**: Returns error (requires at least `GEMINI_API_KEY`)

## Monitoring

In Vercel Dashboard → Functions tab:
- View invocation count
- Check error rate
- Monitor latency  
- See logs in real-time

## Troubleshooting

### "No Gemini API keys configured"
- Check env variables are set correctly
- Ensure at least `GEMINI_API_KEY` is set

### 429 (Rate Limited)
- Google Gemini free tier: 60 requests/minute per account
- With 6 keys: 360 requests/minute total
- Scale up by adding more API keys

### CORS Errors
- Check `ALLOWED_ORIGINS` includes your site URL
- Make sure to use `https://` in production

### Slow Responses
- First request may take 1-2s (Vercel cold start)
- Subsequent requests: 200-500ms
- Consider using Vercel Pro ($20/month) for faster cold starts

## Next Steps

1. **Monitor Usage**: Track API calls in Vercel dashboard
2. **Add Analytics**: Log visitor behavior to database
3. **Scale Keys**: Add more API keys for higher QPS
4. **Custom Domain**: Set up custom domain in Vercel DNS settings
5. **Production Deployment**: Use a database to store smart card reactions

## Support

- [Dendron Docs](https://github.com/bitWise72/dendron)
- [Vercel Docs](https://vercel.com/docs)
- [Google Gemini API](https://ai.google.dev/)
