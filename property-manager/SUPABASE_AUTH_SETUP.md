# Supabase Auth Setup - Email-First Authentication

## 1. Supabase Dashboard konfigūracija

### Authentication Settings:
- **Email OTP**: ✅ Enabled
- **Magic Link**: ✅ Enabled  
- **Passkeys**: ✅ Enabled (WebAuthn)
- **Email confirmed required**: ✅ Enabled
- **Google OAuth**: ✅ Enabled (optional)

### Email Templates:
- **OTP Template**: Customize with your branding
- **Magic Link Template**: Customize with your branding
- **Invite Template**: Customize for team invitations

### Rate Limiting:
- **OTP requests**: 5 per 10 minutes per email
- **Magic link requests**: 3 per 15 minutes per email
- **Verification attempts**: 3 per 10 minutes per email

## 2. Database Schema Updates

### Add missing columns to users table:
```sql
-- Add passkey support
ALTER TABLE users ADD COLUMN IF NOT EXISTS passkey_credentials JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_passkey_auth TIMESTAMPTZ;

-- Add organization support
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_org_id UUID REFERENCES organizations(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_org_id UUID REFERENCES organizations(id);

-- Add audit fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;
```

### Create organizations table:
```sql
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organizations" ON organizations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM memberships m 
    WHERE m.org_id = organizations.id 
    AND m.user_id = auth.uid()
  )
);
```

### Create memberships table:
```sql
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'manager', 'accountant', 'maintenance')) NOT NULL,
  invited_by UUID REFERENCES users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- Add RLS
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

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
```

### Create invites table:
```sql
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

-- Add RLS
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invites for their email" ON invites
FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
```

### Create audit_log table:
```sql
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

-- Add RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs" ON audit_log
FOR SELECT USING (user_id = auth.uid());
```

## 3. RLS Policies for existing tables

### Properties table:
```sql
-- Update properties RLS
DROP POLICY IF EXISTS "Users can view their properties" ON properties;
CREATE POLICY "Users can view their properties" ON properties
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM memberships m 
    WHERE m.org_id = properties.org_id 
    AND m.user_id = auth.uid()
  )
);
```

### Leases table:
```sql
-- Update leases RLS
DROP POLICY IF EXISTS "Users can view their leases" ON leases;
CREATE POLICY "Users can view their leases" ON leases
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM lease_members lm 
    WHERE lm.lease_id = leases.id 
    AND lm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM memberships m 
    WHERE m.org_id = leases.org_id 
    AND m.user_id = auth.uid()
  )
);
```

## 4. Supabase Functions

### Create user organization setup function:
```sql
CREATE OR REPLACE FUNCTION setup_user_organization(
  user_email TEXT,
  org_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  org_id UUID;
  result JSON;
BEGIN
  -- Get user ID
  SELECT id INTO user_id FROM users WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Create organization if name provided
  IF org_name IS NOT NULL THEN
    INSERT INTO organizations (name, slug) 
    VALUES (org_name, lower(replace(org_name, ' ', '-')))
    RETURNING id INTO org_id;
    
    -- Add user as owner
    INSERT INTO memberships (org_id, user_id, role)
    VALUES (org_id, user_id, 'owner');
    
    -- Set as primary org
    UPDATE users 
    SET primary_org_id = org_id, current_org_id = org_id
    WHERE id = user_id;
  END IF;
  
  RETURN json_build_object('success', true, 'org_id', org_id);
END;
$$;
```

### Create invite acceptance function:
```sql
CREATE OR REPLACE FUNCTION accept_invite(
  invite_token TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invite_record RECORD;
  user_id UUID;
  result JSON;
BEGIN
  -- Get invite details
  SELECT * INTO invite_record 
  FROM invites 
  WHERE token = invite_token 
  AND expires_at > NOW() 
  AND accepted_at IS NULL;
  
  IF invite_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invite');
  END IF;
  
  -- Get current user ID
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Accept invite
  IF invite_record.org_id IS NOT NULL THEN
    INSERT INTO memberships (org_id, user_id, role, invited_by)
    VALUES (invite_record.org_id, user_id, invite_record.role, invite_record.invited_by)
    ON CONFLICT (org_id, user_id) DO NOTHING;
  END IF;
  
  IF invite_record.lease_id IS NOT NULL THEN
    INSERT INTO lease_members (lease_id, user_id, role)
    VALUES (invite_record.lease_id, user_id, invite_record.role)
    ON CONFLICT (lease_id, user_id) DO NOTHING;
  END IF;
  
  -- Mark invite as accepted
  UPDATE invites 
  SET accepted_at = NOW() 
  WHERE id = invite_record.id;
  
  -- Log audit
  INSERT INTO audit_log (user_id, action, resource_type, resource_id, metadata)
  VALUES (user_id, 'invite_accepted', 'invite', invite_record.id, 
          json_build_object('org_id', invite_record.org_id, 'lease_id', invite_record.lease_id));
  
  RETURN json_build_object('success', true, 'org_id', invite_record.org_id, 'lease_id', invite_record.lease_id);
END;
$$;
```

## 5. Environment Variables

Add to your `.env.local`:
```env
# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email (if using custom SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# App settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Property Manager"
```

## 6. Next Steps

1. Run the SQL scripts above in Supabase SQL Editor
2. Configure email templates in Supabase Dashboard
3. Update your frontend to use new auth flow
4. Test the complete flow
5. Set up SPF/DKIM/DMARC for email deliverability






