# Environment Setup Guide

This guide explains how to set up different environments for the Property Manager application.

## 🎯 Overview

The application supports two main environments:
- **Development**: For local development and testing
- **Production**: For live deployment

## 📁 Environment Files

### Template Files (Safe to commit)
- `env.development.template` - Development environment template
- `env.production.template` - Production environment template
- `env.example` - General example file

### Actual Environment Files (Never commit these!)
- `.env.development` - Development environment variables
- `.env.production` - Production environment variables
- `.env` - Default environment file (fallback)

## 🚀 Quick Setup

### Option 1: Automated Setup (Recommended)
```bash
node setup-env.js
```
This interactive script will guide you through creating the appropriate environment file.

### Option 2: Manual Setup
1. Copy the appropriate template:
   ```bash
   # For development
   cp env.development.template .env.development
   
   # For production
   cp env.production.template .env.production
   ```

2. Edit the file and replace placeholder values with your actual credentials.

## 🔧 Available Scripts

### Development
```bash
npm run start:dev      # Start development server
npm run build:dev      # Build for development
npm run test:dev       # Run tests in development mode
```

### Production
```bash
npm run start:prod     # Start production server
npm run build:prod     # Build for production
npm run test:prod      # Run tests in production mode
```

### General
```bash
npm start              # Default start (uses .env)
npm run dev            # Clean and start development
```

## 🔑 Required Environment Variables

### Supabase Configuration
```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
```

### Application Configuration
```env
REACT_APP_APP_URL=http://localhost:3000          # Development
REACT_APP_APP_URL=https://nuomoria.lt           # Production
REACT_APP_APP_NAME="Property Manager"
REACT_APP_AUTH_REDIRECT_URL=http://localhost:3000/auth/callback
```

### Email Configuration
```env
REACT_APP_EMAIL_FROM=login@auth.nuomoria.lt
REACT_APP_EMAIL_REPLY_TO=support@nuomoria.lt
```

### Feature Flags
```env
REACT_APP_ENABLE_ANALYTICS=true                 # Production only
REACT_APP_ENABLE_ERROR_REPORTING=true           # Production only
REACT_APP_ENABLE_PERFORMANCE_MONITORING=true
REACT_APP_ENABLE_DEBUG_MODE=false               # Development only
REACT_APP_ENABLE_SERVICE_WORKER=true            # Production only
```

## 🏗️ Environment-Specific Settings

### Development Environment
- Source maps enabled for debugging
- Debug mode enabled
- Analytics disabled
- Service worker disabled
- Minimal caching strategy

### Production Environment
- Source maps disabled for security
- Debug mode disabled
- Analytics enabled
- Service worker enabled
- Aggressive caching strategy

## 🔒 Security Notes

1. **Never commit `.env` files** - They contain sensitive information
2. **Use different Supabase projects** for development and production
3. **Service role keys** should never be in client-side environment files
4. **Production builds** automatically disable console logging

## 🐛 Troubleshooting

### "Invalid URL" Error
This error occurs when Supabase environment variables are missing or invalid.

**Solution:**
1. Create the appropriate `.env` file using the setup script
2. Ensure your Supabase URL and API key are correct
3. Restart your development server

### Environment Variables Not Loading
Make sure your environment file is in the correct location and has the right name:
- `.env.development` for development
- `.env.production` for production
- `.env` as fallback

### Build Issues
If you're having build issues, try:
```bash
npm run clean
npm run build:prod
```

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Environment Variables](https://create-react-app.dev/docs/adding-custom-environment-variables/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)





