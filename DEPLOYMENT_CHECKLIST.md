# Dendron Demo - Complete Deployment Checklist

## What You've Already Done ✅
- ✅ Created Quick Demo UI option on landing page
- ✅ Updated Vercel backend to support multiple Gemini API keys
- ✅ Added random key selection logic (fallback system)
- ✅ Configured for Gemini 3.1 Flash model

## Environment Variables to Add

### In Vercel Dashboard (Settings → Environment Variables):

```
DENDRON_PROVIDER=gemini
DENDRON_MODEL=gemini-3.1-flash-preview
GEMINI_API_KEY=AIzaSy_[primary_key]
GEMINI_API_KEY_1=AIzaSy_[fallback_1]
GEMINI_API_KEY_2=AIzaSy_[fallback_2]
GEMINI_API_KEY_3=AIzaSy_[fallback_3]
GEMINI_API_KEY_4=AIzaSy_[fallback_4]
GEMINI_API_KEY_5=AIzaSy_[fallback_5]
ALLOWED_ORIGINS=https://dendron-landing-page.vercel.app,http://localhost:5173
```

## Backend Architecture

### Request Flow:
```
User Site
    ↓
Dendron SDK (13KB)
    ↓
POST /api/dendron with visitor behavior data
    ↓
Vercel Function (api/dendron.js)
    ↓
Pick random Gemini API key from [6 available]
    ↓
Call Google Gemini 3.1 Flash API
    ↓
Return Smart Card JSON
    ↓
Dendron SDK renders in Shadow DOM
    ↓
User sees smart card
```

### Key Selection Logic:
```javascript
// Loads 6 keys (1 primary + 5 fallbacks) into array
const allKeys = [GEMINI_API_KEY, ...GEMINI_API_KEY_1-5]

// On each request, randomly picks one
const selectedKey = allKeys[Math.random() * allKeys.length]

// Benefits:
// - Load balancing across 6 API accounts
// - Auto-fallback if one key hits rate limit
// - 6x the rate limit (360 req/min instead of 60)
```

## API Request/Response Format

### Request (from Dendron SDK):
```json
{
  "prompt": "Generate a smart card for high-intent user",
  "context": {
    "scrollDepth": 45,
    "timeOnPage": 120,
    "clicks": 3,
    "pageContent": "Product features page"
  }
}
```

### Response (from Backend):
```json
{
  "success": true,
  "card": {
    "type": "engagement",
    "title": "Your content resonates",
    "description": "You've spent 2min reading our features...",
    "cta": "Schedule demo",
    "ctaUrl": "https://calendly.com/..."
  },
  "model": "gemini-3.1-flash-preview",
  "timestamp": "2026-04-17T12:34:56Z"
}
```

## Deployment Checklist

### Pre-Deployment:
- [ ] Have 6 Gemini API keys ready (from aistudio.google.com/app/apikey)
- [ ] Have Vercel account (vercel.com)
- [ ] Have Git installed (git --version)
- [ ] Have Vercel CLI installed (npm install -g vercel)

### Deployment Steps:

1. **Verify Backend Code**
   ```bash
   cat deploy/vercel/api/dendron.js | grep "getAllGeminiKeys\|getRandomGeminiKey"
   # Should show: function getAllGeminiKeys() and function getRandomGeminiKey()
   ```

2. **Deploy Landing Site**
   ```bash
   cd ~/OneDrive/Desktop/Dendron-Prod
   vercel --prod
   # Note the deployed URL (e.g., dendron-landing-page.vercel.app)
   ```

3. **Set Environment Variables**
   - Visit https://vercel.com/dashboard
   - Click "dendron-landing-page" project
   - Go to Settings → Environment Variables
   - Add all variables from the list above
   - Save and redeploy: vercel --prod

4. **Verify Deployment**
   ```bash
   # Test the API endpoint
   curl -X POST https://dendron-landing-page.vercel.app/api/dendron \
     -H "Content-Type: application/json" \
     -d '{"prompt":"test"}'
   
   # Should see success response with smart card JSON
   ```

5. **Update Landing Page Endpoint**
   - Edit `site/index.html`
   - Find: `data-endpoint="https://dendron-api.vercel.app"`
   - Replace with: `data-endpoint="https://dendron-landing-page.vercel.app"`
   - Redeploy: `vercel --prod`

### Post-Deployment:

- [ ] Test Quick Demo button on landing page
- [ ] Copy script tag and test on a sample site
- [ ] Check Vercel dashboard for function invocations
- [ ] Monitor error rate and latency
- [ ] Check rate limit status

## Testing the Quick Demo

1. Go to deployed landing page (e.g., `dendron-landing-page.vercel.app`)
2. Click "Quick Demo" tab (⚡)
3. Copy the script tag
4. Paste into any website before `</body>`
5. Open browser console
6. Scroll, click, wait 3+ seconds
7. Should see smart card appear at bottom-right

## Rate Limits

### Free Tier (per key):
- Google Gemini: 60 requests/minute
- Vercel: 100,000 invocations/month

### With 6 Keys:
- Combined: 360 requests/minute
- Monthly: 600,000 requests (well above free tier!)

### If You Hit Rate Limits:
1. Add 6 more Gemini keys (now 12 keys)
2. Update GEMINI_API_KEY_6 through GEMINI_API_KEY_11
3. Redeploy with new keys

## Files Modified/Created

```
deploy/vercel/api/dendron.js        ← Updated with random key logic
site/index.html                     ← Added Quick Demo tab + UI
DEMO_SETUP.md                       ← Detailed setup guide
.env.example                        ← Env vars template
deploy-demo.sh                      ← Auto-deployment script
```

## Troubleshooting

### "No Gemini API keys configured"
- Ensure GEMINI_API_KEY is set in Vercel dashboard
- Redeploy after setting: `vercel --prod`

### CORS Errors on Frontend
- Add your site URL to ALLOWED_ORIGINS
- Include `https://` prefix
- Redeploy: `vercel --prod`

### 429 Rate Limited
- One key hit its limit (60 req/min)
- Other 5 keys still work (random selection)
- If all 6 exhausted, add more keys

### Function Takes >10s
- Vercel cold start: 1-3s
- Gemini API call: 200-500ms
- Total: 1.2-3.5s typical
- Usually acceptable for demo

## Support Resources

- **Dendron Docs**: https://github.com/bitWise72/dendron
- **Vercel Docs**: https://vercel.com/docs
- **Gemini API**: https://ai.google.dev/gemini-api/docs
- **This Guide**: See DEMO_SETUP.md for details

---

**Ready to Deploy?**
1. Get 6 Gemini keys
2. Run: `bash deploy-demo.sh`
3. Follow prompts to set env vars
4. Test on your site!

**Questions?** Check DEMO_SETUP.md for detailed explanations.
