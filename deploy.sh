#!/bin/bash

# Vercel Quick Deploy Script
# This script loads environment variables from .env.local and deploys to Vercel

echo "🚀 Starting Vercel deployment with all environment variables..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found!"
    exit 1
fi

# Read .env.local and create environment variable arguments
ENV_ARGS=""
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    if [[ ! "$key" =~ ^# ]] && [[ -n "$key" ]]; then
        # Remove quotes from value if present
        value="${value%\"}"
        value="${value#\"}"
        value="${value%\'}"
        value="${value#\'}"
        
        # Add to ENV_ARGS
        ENV_ARGS="$ENV_ARGS --env $key=\"$value\""
    fi
done < .env.local

echo "📦 Environment variables loaded from .env.local"
echo "🔧 Building and deploying to Vercel..."

# Deploy to Vercel with all environment variables
eval "npx vercel --prod --yes $ENV_ARGS"

echo "✅ Deployment complete!"