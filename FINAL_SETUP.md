# ✅ Dendron Quick Demo — Final Deployment Steps

## Deployment Status: LIVE! 🎉

Your landing page is now deployed at:
- **https://dendron-landing-page.vercel.app** ⭐

## ⚠️ IMMEDIATE NEXT STEPS (Required for Quick Demo to work)

### Step 3: Add Environment Variables to Vercel

Quick Demo is currently showing on your site, but needs API keys to function. Here's how to set them up:

#### 3a. Go to Vercel Dashboard

1. Navigate to: https://vercel.com/dashboard
2. Click **dendron-landing-page** project
3. Go to **Settings** tab → **Environment Variables**

#### 3b. Add Environment Variables

Copy-paste each variable below (one at a time):

```
Name: DENDRON_PROVIDER
Value: gemini
```

```
Name: DENDRON_MODEL
Value: gemini-3.1-flash-preview
```

```
Name: GEMINI_API_KEY
Value: [Your Primary Gemini API Key]
```

**Optional (but recommended for load balancing):**

```
Name: GEMINI_API_KEY_1
Value: [Your Fallback Key #1]

Name: GEMINI_API_KEY_2
Value: [Your Fallback Key #2]

Name: GEMINI_API_KEY_3
Value: [Your Fallback Key #3]

Name: GEMINI_API_KEY_4
Value: [Your Fallback Key #4]

Name: GEMINI_API_KEY_5
Value: [Your Fallback Key #5]
```

```
Name: ALLOWED_ORIGINS
Value: https://dendron-landing-page.vercel.app
```

**For local development:**
```
Name: ALLOWED_ORIGINS
Value: https://dendron-landing-page.vercel.app,http://localhost:5173,http://localhost:3000
```

#### 3c. Save Variables

- Click **Save** after each variable
- NOTE: Each save triggers a redeploy

### Step 4: Redeploy with Environment Variables

After adding variables:

1. Vercel automatically redeploys (you'll see a new deployment)
2. Or manually run: `vercel --prod` in terminal
3. Wait for "✅  Production: ..." message

### Step 5: Test Quick Demo

#### 5a. Test API Endpoint

```bash
curl -X POST https://dendron-landing-page.vercel.app/api/dendron \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Classify this behavior: User opened product page and scrolled down"}'
```

Expected response:
```json
{
  "classification": "engagement",
  "confidence": 0.95,
  "type": "product_exploration",
  ...
}
```

#### 5b. Test on Landing Page

1. Visit: https://dendron-landing-page.vercel.app
2. Click **Quick Demo (⚡)** tab
3. Copy the script tag displayed
4. Create a test HTML file:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Test Dendron Quick Demo</title>
</head>
<body>
  <h1>Welcome! Try scrolling or clicking around...</h1>
  <p>Lorem ipsum dolor sit amet...</p>
  
  <!-- Paste the script tag here -->
  <script src="https://unpkg.com/dendron-sdk@1.0.1/dist/dendron.min.js" 
          data-endpoint="https://dendron-landing-page.vercel.app/api/dendron"></script>
  
  <script>
    // Simulate user behavior to trigger Dendron
    setTimeout(() => {
      window.Dendron?.trackEvent?.('scroll', { distance: 500 });
      console.log('Event tracked!');
    }, 2000);
  </script>
</body>
</html>
```

5. Open in browser → Check browser console for "Event tracked!" + Smart Card after 3s

## 📊 Monitoring & Debugging

### View Logs

```
Vercel Dashboard → dendron-landing-page → Logs → Deployments
```

### Check API Status

```bash
# Test CORS
curl -i -X OPTIONS https://dendron-landing-page.vercel.app/api/dendron

# Should return 204 No Content with Access-Control headers
```

### Rate Limits

- **Per Key**: 60 requests/minute (Google Gemini)
- **6 Keys Total**: 360 requests/minute (load-balanced)
- **Vercel Free Tier**: 100,000 invocations/month

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "API error: 401" | Check if GEMINI_API_KEY is correct |
| "CORS error in browser" | Add your domain to ALLOWED_ORIGINS |
| "Empty response" | Check browser console for parsing errors |
| "429 Rate limited" | Add more Gemini API keys (GEMINI_API_KEY_1-5) |
| "API timeout" | Increase DENDRON_MODEL to faster model |

## 🔄 Redeploying After Changes

After updating code or env vars:

```bash
cd ~/OneDrive/Desktop/Dendron-Prod
git add .
git commit -m "fix: description"
git push origin main
# Vercel auto-deploys instantly!
```

## 📝 Next: Customization Options

### Change LLM Provider

Instead of Gemini, use:

**OpenAI:**
```
DENDRON_PROVIDER: openai
DENDRON_MODEL: gpt-4-turbo-preview
OPENAI_API_KEY: [Your key]
```

**Anthropic:**
```
DENDRON_PROVIDER: anthropic
DENDRON_MODEL: claude-opus-2024-04-15
ANTHROPIC_API_KEY: [Your key]
```

### Customize Smart Card Appearance

Edit `site/index.html` → `.card` CSS section:
- Colors: `.card-header`, `.card-footer`
- Size: `width`, `max-height`
- Position: Update Shadow DOM injection code

### Add More API Keys

To scale beyond 6 keys, edit `api/dendron.js`:

```javascript
// Add after GEMINI_API_KEY_5
process.env.GEMINI_API_KEY_6,  // Add line
process.env.GEMINI_API_KEY_7,  // Add line
// ... etc up to GEMINI_API_KEY_20 for 360 req/min
```

Then add to Vercel env vars:
```
GEMINI_API_KEY_6: [key]
GEMINI_API_KEY_7: [key]
...
```

## ✨ You're Done!

Your Dendron Quick Demo is ready:
- ✅ Landing page deployed
- ⏭️ Add env vars (5 min)
- ⏭️ Test endpoint (2 min)
- ✨ Production ready!

**Questions?** Check:
- [DEMO_SETUP.md](../DEMO_SETUP.md) — Detailed setup guide
- [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md) — Full technical details
- [https://vercel.com/docs](https://vercel.com/docs) — Vercel documentation

---

**Current Deployment Info:**
- URL: https://dendron-landing-page.vercel.app
- GitHub: https://github.com/bitWise72/dendron
- Project: dendron-landing-page (Vercel)
- Function: /api/dendron (Serverless)
