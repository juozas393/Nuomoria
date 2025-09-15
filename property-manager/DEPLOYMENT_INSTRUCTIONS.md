# 🚀 Deployment į nuomoria.lt - Instrukcijos

## 📋 Ką reikia padaryti:

### 1. GitHub Repository
```bash
# Pridėk visus pakeitimus
git add .
git commit -m "Production ready - deploy to nuomoria.lt"
git push origin main
```

### 2. Vercel Deployment

**A) Eik į [Vercel](https://vercel.com) ir prisijunk su GitHub**

**B) Importuok repository:**
- Click "New Project"
- Pasirink savo GitHub repository
- Framework: "Create React App"
- Root Directory: `property-manager`

**C) Environment Variables:**
Į Vercel projektą pridėk šiuos environment variables:

```
REACT_APP_SUPABASE_URL = https://<tavo-projekto-id>.supabase.co
REACT_APP_SUPABASE_ANON_KEY = <tavo-anon-key>
REACT_APP_APP_URL = https://nuomoria.lt
REACT_APP_AUTH_REDIRECT_URL = https://nuomoria.lt/auth/callback
REACT_APP_EMAIL_FROM = login@auth.nuomoria.lt
REACT_APP_EMAIL_REPLY_TO = support@nuomoria.lt
GENERATE_SOURCEMAP = false
REACT_APP_ENV = production
```

**D) Domain Setup:**
- Vercel → Settings → Domains
- Pridėk `nuomoria.lt`
- Nukreipk DNS į Vercel

### 3. Supabase Configuration

**A) Authentication Settings:**
- Go to Supabase Dashboard → Authentication → URL Configuration
- Site URL: `https://nuomoria.lt`
- Redirect URLs: `https://nuomoria.lt/auth/callback`

**B) Email Templates:**
- Authentication → Email Templates
- Customize Magic Link template
- Add your branding

### 4. DNS Configuration

Jei naudosi Vercel:
```
Type: A
Name: @
Value: 76.76.19.61

Type: CNAME  
Name: www
Value: cname.vercel-dns.com
```

### 5. SSL Certificate
Vercel automatiškai sugeneruos SSL sertifikatą.

## 🔍 Testing Checklist

Po deployment:

- [ ] `https://nuomoria.lt` atidarosi
- [ ] Magic Link veiks
- [ ] OTP veiks
- [ ] Google OAuth veiks (jei sukonfigūruota)
- [ ] SSL sertifikatas veiks
- [ ] Performance metrics geri

## 🆘 Troubleshooting

**Jei Magic Link neveiks:**
1. Patikrink Supabase Redirect URLs
2. Patikrink Vercel environment variables
3. Patikrink Supabase logs

**Jei SSL neveiks:**
1. Palauk 24h DNS propagacijos
2. Patikrink DNS nustatymus
3. Kontaktuok Vercel support

## 📞 Support

Jei kils problemų:
- Vercel: [vercel.com/support](https://vercel.com/support)
- Supabase: [supabase.com/support](https://supabase.com/support)





