#!/bin/bash
# Script to properly restart dev server with cache clearing

echo "🔄 Restarting dev server with cache clearing..."

# Stop any running dev server (if possible)
echo "1. Stopping dev server..."
pkill -f "react-scripts" || true
pkill -f "vite" || true

# Clear cache
echo "2. Clearing cache..."
rm -rf node_modules/.cache
rm -rf .cache
rm -rf build

# Clear browser localStorage instructions
echo ""
echo "3. ⚠️ IMPORTANT: Clear browser localStorage:"
echo "   - Open DevTools (F12)"
echo "   - Go to Application/Storage tab"
echo "   - Clear all 'sb-*' and 'supabase*' keys"
echo ""

# Restart
echo "4. Starting dev server..."
npm start
