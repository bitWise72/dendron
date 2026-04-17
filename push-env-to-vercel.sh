#!/bin/bash
# Push environment variables from .env to Vercel

set -e

echo "🔐 Pushing environment variables to Vercel..."

# Read .env file and skip comments
while IFS='=' read -r key value; do
  # Skip empty lines and comments
  [[ -z "$key" || "$key" =~ ^#.*$ ]] && continue
  
  # Trim whitespace
  key=$(echo "$key" | xargs)
  value=$(echo "$value" | xargs)
  
  # Skip template placeholders
  [[ "$value" == "your_"* ]] && {
    echo "⏭️  Skipping template: $key (incomplete)"
    continue
  }
  
  echo "📝 Setting: $key"
  vercel env add "$key" --prod <<< "$value"
done < .env

echo "✅ Environment variables pushed to Vercel!"
echo "🚀 To redeploy: vercel --prod"
