# 🚀 Production Deployment Guide

## **Quick Start (Vercel - Recommended)**

### **Step 1: Complete Vercel Login**
1. **Open your browser** and go to: https://vercel.com/oauth/device?user_code=JWSF-QJJV
2. **Login with your GitHub/Google account**
3. **Return to terminal** and press ENTER

### **Step 2: Deploy to Vercel**
```bash
# Deploy to production
npx vercel --prod

# Or deploy preview first
npx vercel
```

### **Step 3: Configure Environment Variables**
In Vercel Dashboard:
1. Go to your project → Settings → Environment Variables
2. Add these variables:

```
REACT_APP_SUPABASE_URL=https://qdsduvwojbknslbviqdq.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkc2R1dndvamJrbnNsYnZpcWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNDEyOTEsImV4cCI6MjA3MzYxNzI5MX0.TwxsrQDuaqS65Nieuyj0kys8oKQ3pdOWE0PtEqXq1xA
REACT_APP_APP_URL=https://nuomoria.lt
REACT_APP_APP_NAME=Nuomoria
REACT_APP_AUTH_REDIRECT_URL=https://nuomoria.lt/auth/callback
REACT_APP_EMAIL_FROM=login@auth.nuomoria.lt
REACT_APP_EMAIL_REPLY_TO=support@nuomoria.lt
GENERATE_SOURCEMAP=false
REACT_APP_ENV=production
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_ERROR_REPORTING=true
REACT_APP_ENABLE_PERFORMANCE_MONITORING=true
REACT_APP_ENABLE_DEBUG_MODE=false
REACT_APP_ENABLE_SERVICE_WORKER=true
REACT_APP_CACHE_STRATEGY=aggressive
```

---

## **Alternative: Manual Build & Deploy**

### **Step 1: Build for Production**
```bash
# Build optimized production bundle
npm run build:prod

# This creates a 'build' folder with optimized files
```

### **Step 2: Deploy Options**

#### **Option A: Netlify**
1. Drag & drop the `build` folder to [netlify.com/drop](https://netlify.com/drop)
2. Configure environment variables in Netlify dashboard

#### **Option B: GitHub Pages**
1. Push to GitHub repository
2. Enable GitHub Pages in repository settings
3. Set source to `build` folder

#### **Option C: Traditional Hosting**
1. Upload `build` folder contents to your web server
2. Configure server to serve `index.html` for all routes

---

## **Performance Optimization**

### **Build Analysis**
```bash
# Analyze bundle size
npm run build:analyze

# Performance audit
npm run performance
```

### **Core Web Vitals Targets**
- **LCP (Largest Contentful Paint)**: < 1.5s
- **FID (First Input Delay)**: < 100ms  
- **CLS (Cumulative Layout Shift)**: < 0.1

---

## **Domain Configuration**

### **Custom Domain Setup**
1. **In Vercel Dashboard:**
   - Go to Project → Settings → Domains
   - Add `nuomoria.lt` and `www.nuomoria.lt`

2. **DNS Configuration:**
   - Add CNAME record: `www` → `cname.vercel-dns.com`
   - Add A record: `@` → `76.76.19.61`

---

## **Database Migration**

### **Before First Deploy:**
1. **Export development data:**
   ```bash
   # Use the scripts we created earlier
   # Run: used-tables-data-export.sql in development database
   ```

2. **Import to production:**
   ```bash
   # Run: used-tables-only-export.sql in production database
   ```

---

## **Post-Deployment Checklist**

### **✅ Verify Deployment**
- [ ] Site loads at production URL
- [ ] Authentication works (magic link, Google OAuth)
- [ ] Database connections work
- [ ] All features function correctly
- [ ] Performance metrics are good

### **✅ Monitor Performance**
- [ ] Check Core Web Vitals
- [ ] Monitor error rates
- [ ] Verify analytics tracking
- [ ] Test on mobile devices

### **✅ Security**
- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] No sensitive data in client bundle
- [ ] CORS properly configured

---

## **Troubleshooting**

### **Common Issues:**

#### **Build Fails**
```bash
# Clear cache and rebuild
npm run clean
npm run build:prod
```

#### **Environment Variables Not Working**
- Check Vercel dashboard environment variables
- Ensure variable names start with `REACT_APP_`
- Redeploy after adding variables

#### **Database Connection Issues**
- Verify production Supabase URL/key
- Check RLS policies in production database
- Ensure all tables exist in production

#### **Authentication Not Working**
- Update Supabase Auth settings:
  - Site URL: `https://nuomoria.lt`
  - Redirect URLs: `https://nuomoria.lt/auth/callback`

---

## **Next Steps After Deployment**

1. **Set up monitoring** (Sentry, Google Analytics)
2. **Configure backups** for production database
3. **Set up CI/CD** for automatic deployments
4. **Performance monitoring** and optimization
5. **User feedback collection**

---

## **Support**

If you encounter issues:
1. Check browser console for errors
2. Verify environment variables
3. Test locally with production build
4. Check Vercel deployment logs



