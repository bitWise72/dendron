#!/bin/bash
# Dendron Demo Backend - Quick Deployment Script

set -e

echo "🚀 Dendron Demo Backend - Vercel Deployment"
echo "============================================="
echo ""

# Check prerequisites
echo "✓ Checking prerequisites..."
if ! command -v git &> /dev/null; then
    echo "❌ Git not found. Please install Git first."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo "✓ Prerequisites met"
echo ""

# Step 1: Collect API Keys
echo "📝 Step 1: Configure Gemini API Keys"
echo "====================================="
echo "Go to https://aistudio.google.com/app/apikey and create 6 API keys"
echo ""
read -p "Enter PRIMARY Gemini API Key: " PRIMARY_KEY
read -p "Enter FALLBACK Key 1 (or press Enter to skip): " KEY_1
read -p "Enter FALLBACK Key 2 (or press Enter to skip): " KEY_2
read -p "Enter FALLBACK Key 3 (or press Enter to skip): " KEY_3
read -p "Enter FALLBACK Key 4 (or press Enter to skip): " KEY_4
read -p "Enter FALLBACK Key 5 (or press Enter to skip): " KEY_5

if [ -z "$PRIMARY_KEY" ]; then
    echo "❌ Primary API key is required"
    exit 1
fi

echo ""

# Step 2: Login to Vercel
echo "🔐 Step 2: Login to Vercel"
echo "=========================="
vercel login
echo ""

# Step 3: Deploy
echo "🚀 Step 3: Deploy to Vercel"
echo "============================"
cd "$(dirname "$0")"
vercel --prod

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📌 Next Steps:"
echo "1. Go to https://vercel.com/dashboard"
echo "2. Select your 'dendron-landing-page' project"
echo "3. Go to Settings → Environment Variables"
echo "4. Add the following variables:"
echo ""
echo "   DENDRON_PROVIDER=gemini"
echo "   DENDRON_MODEL=gemini-3.1-flash-preview"
echo "   GEMINI_API_KEY=$PRIMARY_KEY"
if [ -n "$KEY_1" ]; then echo "   GEMINI_API_KEY_1=$KEY_1"; fi
if [ -n "$KEY_2" ]; then echo "   GEMINI_API_KEY_2=$KEY_2"; fi
if [ -n "$KEY_3" ]; then echo "   GEMINI_API_KEY_3=$KEY_3"; fi
if [ -n "$KEY_4" ]; then echo "   GEMINI_API_KEY_4=$KEY_4"; fi
if [ -n "$KEY_5" ]; then echo "   GEMINI_API_KEY_5=$KEY_5"; fi
echo "   ALLOWED_ORIGINS=https://[your-vercel-domain].vercel.app"
echo ""
echo "5. Redeploy: vercel --prod"
echo ""
echo "📖 For detailed instructions, see DEMO_SETUP.md"
