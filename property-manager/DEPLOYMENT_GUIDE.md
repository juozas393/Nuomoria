# 🚀 Deployment Guide - nuomoria.lt

## Prerequisites
- ✅ Domain: nuomoria.lt
- ✅ Email: ImprovMX + Postmark configured
- ✅ Supabase: SMTP connected to Postmark

## 1. Environment Variables

Create `.env.production`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=https://nuomoria.lt
NEXT_PUBLIC_APP_NAME="Nuomoria"
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 2. Supabase Configuration

### URL Configuration:
```
Site URL: https://nuomoria.lt
Redirect URLs: https://nuomoria.lt/auth/callback
```

### SMTP Settings:
```
Sender: login@auth.nuomoria.lt
Host: smtp.postmarkapp.com
Port: 587
Username: postmark
Password: [Postmark Server Token]
Reply-To: support@nuomoria.lt
```

## 3. Build & Deploy

```bash
# Build for production
npm run build

# Deploy to your hosting provider
# (Vercel, Netlify, or your server)
```

## 4. Testing Checklist

### Email Authentication:
- [ ] Magic Link works
- [ ] OTP works  
- [ ] Emails arrive from login@auth.nuomoria.lt
- [ ] Redirect to https://nuomoria.lt/auth/callback works

### Google OAuth:
- [ ] Google sign-in works
- [ ] Redirect to https://nuomoria.lt/auth/callback works

### Email Delivery:
- [ ] Test email to owner@nuomoria.lt arrives
- [ ] Auth emails not marked as spam
- [ ] DKIM/SPF/DMARC pass

## 5. Post-Deployment

1. **Monitor email delivery** in Postmark dashboard
2. **Check Supabase logs** for auth errors
3. **Test all auth flows** thoroughly
4. **Update DNS** if needed for subdomain

## 6. Security Notes

- ✅ DKIM/SPF/DMARC configured
- ✅ Rate limiting enabled
- ✅ Captcha enabled
- ✅ Enhanced MFA enabled
- ✅ Separate auth subdomain (auth.nuomoria.lt)

## Support

For issues:
- Email: owner@nuomoria.lt
- Check Postmark delivery logs
- Check Supabase auth logs
- Verify DNS settings






