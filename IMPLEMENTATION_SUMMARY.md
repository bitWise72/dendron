# ✅ Dendron Quick Demo - Implementation Complete

## What Has Been Done

### 1. Frontend - Quick Demo UI
✅ Added "Quick Demo (⚡)" tab at the top of Quick Start section
✅ Shows one-line deployment: copy script tag and paste on site
✅ Displays features: hosted backend, Gemini AI, auto-scaling, etc.
✅ Mobile responsive ✓

### 2. Backend - Vercel API Function
✅ Updated `/deploy/vercel/api/dendron.js`
✅ Implemented random Gemini API key selection
✅ Added fallback logic from 6 keys
✅ Model: `gemini-3.1-flash-preview` (latest)
✅ CORS enabled for all origins (configurable)

### 3. Documentation
✅ `DEMO_SETUP.md` - Complete step-by-step guide
✅ `DEPLOYMENT_CHECKLIST.md` - Full checklist with troubleshooting
✅ `.env.example` - Template for environment variables
✅ `deploy-demo.sh` - Automated deployment script

## Environment Variables to Add

### Required (Vercel Dashboard → Settings → Environment Variables):

```
DENDRON_PROVIDER=gemini
DENDRON_MODEL=gemini-3.1-flash-preview
GEMINI_API_KEY=[your primary key]
```

### Optional (but recommended for load balancing):

```
GEMINI_API_KEY_1=[fallback key 1]
GEMINI_API_KEY_2=[fallback key 2]
GEMINI_API_KEY_3=[fallback key 3]
GEMINI_API_KEY_4=[fallback key 4]
GEMINI_API_KEY_5=[fallback key 5]
ALLOWED_ORIGINS=https://dendron-landing-page.vercel.app,http://localhost:5173
```

## Backend Implementation Details

### How It Works:

1. **User clicks "Quick Demo"** → Gets one-liner script tag
2. **Script tag deployed** on their site → Tracks behavior
3. **Request to /api/dendron** when engagement threshold crossed
4. **Backend logic**:
   - Loads all configured Gemini keys into array
   - Randomly selects one key per request
   - Calls Google Gemini 3.1 Flash API
   - Returns smart card JSON
5. **Frontend** renders smart card in Shadow DOM

### Load Balancing:

```
1 API Key:  60 requests/minute
6 API Keys: 360 requests/minute (balanced across all accounts)

Each request randomly picks from:
[GEMINI_API_KEY, GEMINI_API_KEY_1-5]
```

### Error Handling:

- If key hits rate limit (429) → next request uses different key
- If all keys exhausted → return 429 (add more keys)
- No keys configured → return 400 error
- Fallback to basic text response if JSON parse fails

## Next: Deployment Steps

### Step 1: Get 6 Gemini API Keys
```
Visit: https://aistudio.google.com/app/apikey
Click: "Create API Key" (×6)
Copy and save all 6 keys
```

### Step 2: Deploy to Vercel
```bash
# Option A: Automated (recommended)
cd ~/OneDrive/Desktop/Dendron-Prod
bash deploy-demo.sh

# Option B: Manual
vercel --prod
```

### Step 3: Set Environment Variables
```
1. Go to: https://vercel.com/dashboard
2. Select: dendron-landing-page project
3. Go to: Settings → Environment Variables
4. Add all variables from list above
5. Redeploy: vercel --prod
```

### Step 4: Test
```bash
# Test API endpoint
curl -X POST https://dendron-landing-page.vercel.app/api/dendron \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}'

# Should see JSON response with smart card
```

### Step 5: Verify on Landing Page
```
1. Visit deployed URL
2. Click "Quick Demo" tab
3. Copy script tag
4. Paste on any test website
5. Trigger behavior (scroll, click, wait)
6. See smart card appear!
```

## Files Changed

| File | Change |
|------|--------|
| `site/index.html` | Added Quick Demo tab + UI |
| `deploy/vercel/api/dendron.js` | Added random key selection + fallback logic |
| `DEMO_SETUP.md` | NEW - Complete setup guide |
| `DEPLOYMENT_CHECKLIST.md` | NEW - Deployment checklist |
| `.env.example` | NEW - Env variables template |
| `deploy-demo.sh` | NEW - Auto-deployment script |

## Testing Quick Demo Locally

Before deploying to Vercel:

```bash
# Start local dev server
npm run dev

# Visit http://localhost:5173
# Go to Quick Start → Quick Demo (⚡)
# Copy the script tag (URL = https://dendron-api.vercel.app)

# Test on any local site by pasting:
<script src="https://unpkg.com/dendron-sdk@1.0.1/dist/dendron.min.js" 
        data-endpoint="https://dendron-api.vercel.app"></script>

# Open console and trigger events
```

## Rate Limits & Scaling

### Free Tier Limits:
- **Per Key**: 60 requests/minute (Google)
- **Monthly**: 100,000 invocations (Vercel)

### With 6 Keys:
- **Combined**: 360 requests/minute
- **Monthly**: 600,000+ requests capacity

### If You Exceed:
- Add keys 6-11 in GEMINI_API_KEY_6 through GEMINI_API_KEY_11
- Now 12 keys = 720 requests/minute
- Redeploy to pick up new keys

## Cost Estimate

| Item | Free Tier | Cost | Notes |
|------|-----------|------|-------|
| Gemini API | 60 req/min, unlimited | $0 | Easy to stay free |
| Vercel | 100K invocations/month | $0 | Usually < 10K needed |
| **Total** | — | **$0/month** | ✅ Free! |

## Recommended Next Steps

1. **Get API Keys** (5 min)
2. **Deploy with `deploy-demo.sh`** (3 min)
3. **Set Env Vars** (2 min)
4. **Test on test site** (2 min)
5. **Monitor in Vercel dashboard** (ongoing)

## Support & Resources

- **Implementation Guide**: `DEMO_SETUP.md`
- **Troubleshooting**: `DEPLOYMENT_CHECKLIST.md`
- **Dendron Docs**: https://github.com/bitWise72/dendron
- **Vercel Docs**: https://vercel.com/docs
- **Google Gemini**: https://ai.google.dev/gemini-api/docs

---

**You're ready to deploy!** 🚀

**Questions?** Refer to `DEMO_SETUP.md` or `DEPLOYMENT_CHECKLIST.md` for detailed explanations.

**Ready to deploy to Vercel?**
```bash
bash deploy-demo.sh
```
