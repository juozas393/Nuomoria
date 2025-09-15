# 🚀 Email-First Authentication Implementation Guide

## **1. Supabase Dashboard Setup (5 min)**

### Authentication Settings:
1. Go to **Authentication > Settings** in Supabase Dashboard
2. Enable **Email OTP** ✅
3. Enable **Magic Link** ✅
4. Enable **Passkeys** ✅ (WebAuthn)
5. Set **Email confirmed required** ✅
6. Configure **Google OAuth** (optional) ✅

### Email Templates:
1. Go to **Authentication > Email Templates**
2. Customize **OTP** template with your branding
3. Customize **Magic Link** template with your branding
4. Add your logo and company colors

### Rate Limiting:
1. Go to **Authentication > Rate Limits**
2. Set **OTP requests**: 5 per 10 minutes per email
3. Set **Magic link requests**: 3 per 15 minutes per email
4. Set **Verification attempts**: 3 per 10 minutes per email

## **2. Database Setup (10 min)**

Run these SQL scripts in **Supabase SQL Editor**:

```sql
-- 1. Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS passkey_credentials JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_passkey_auth TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_org_id UUID REFERENCES organizations(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_org_id UUID REFERENCES organizations(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- 2. Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create memberships table
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'manager', 'accountant', 'maintenance')) NOT NULL,
  invited_by UUID REFERENCES users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- 4. Create invites table
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable RLS and create policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
CREATE POLICY "Users can view their organizations" ON organizations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM memberships m 
    WHERE m.org_id = organizations.id 
    AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their memberships" ON memberships
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage memberships" ON memberships
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM memberships m 
    WHERE m.org_id = memberships.org_id 
    AND m.user_id = auth.uid() 
    AND m.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Users can view invites for their email" ON invites
FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can view their own audit logs" ON audit_log
FOR SELECT USING (user_id = auth.uid());
```

## **3. Frontend Setup (5 min)**

### Update your environment variables:
```env
# Add to .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Property Manager"
```

### Install dependencies (if needed):
```bash
npm install @supabase/supabase-js
```

## **4. Test the Flow (5 min)**

1. **Start your app**: `npm start`
2. **Go to login**: Navigate to `/login`
3. **Test magic link**:
   - Enter your email
   - Select "Nuoroda el. paštu"
   - Click "Siųsti nuorodą"
   - Check your email and click the link
4. **Test OTP**:
   - Enter your email
   - Select "Kodas el. paštu"
   - Click "Siųsti kodą"
   - Check your email for the 6-digit code
   - Enter the code and click "Patvirtinti kodą"
5. **Test Google OAuth** (if configured):
   - Click "Tęsti su Google"
   - Complete Google sign-in

## **5. Email Deliverability Setup (15 min)**

### For production, set up SPF, DKIM, and DMARC:

1. **SPF Record** (DNS):
   ```
   v=spf1 include:_spf.google.com include:mailgun.org ~all
   ```

2. **DKIM** (if using custom domain):
   - Generate DKIM key in your email provider
   - Add DNS record

3. **DMARC** (DNS):
   ```
   v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
   ```

## **6. Next Steps (Optional)**

### Add Passkey Support:
1. Install WebAuthn library: `npm install @simplewebauthn/server`
2. Implement passkey registration in `useSupabaseAuth.ts`
3. Add passkey authentication flow

### Add Organization Management:
1. Create organization creation UI
2. Add team invitation system
3. Implement role-based access control

### Add Step-up Authentication:
1. Identify sensitive actions (IBAN changes, payouts, exports)
2. Require passkey re-authentication
3. Implement time-based re-auth (5 minutes)

## **7. Security Checklist**

- ✅ Rate limiting enabled
- ✅ Email verification required
- ✅ Secure session management
- ✅ RLS policies configured
- ✅ Audit logging enabled
- ✅ SPF/DKIM/DMARC configured
- ✅ HTTPS enabled
- ✅ Secure cookies configured

## **8. Troubleshooting**

### Common Issues:

1. **"Email not confirmed" error**:
   - Check Supabase email templates
   - Verify email delivery
   - Check spam folder

2. **"Rate limit exceeded"**:
   - Wait for cooldown period
   - Check rate limit settings
   - Clear browser cache

3. **"Invalid token" error**:
   - Check token expiration (10 minutes)
   - Verify callback URL configuration
   - Check Supabase auth settings

### Debug Mode:
Add to your `.env.local`:
```env
NEXT_PUBLIC_DEBUG_AUTH=true
```

This will show detailed auth logs in console.

## **9. Production Deployment**

1. **Update environment variables** with production URLs
2. **Configure custom domain** in Supabase
3. **Set up email templates** with production branding
4. **Enable monitoring** and alerts
5. **Test all flows** in production environment

## **10. Support**

If you encounter issues:
1. Check Supabase Dashboard logs
2. Review browser console errors
3. Verify environment variables
4. Test with different email addresses
5. Check network connectivity

---

**🎉 Congratulations!** You now have a modern, secure email-first authentication system that's ready for production use.






