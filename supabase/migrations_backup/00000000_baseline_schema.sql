-- =============================================
-- BASELINE MIGRATION: Create all core tables
-- This must run BEFORE all other migrations
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    first_name TEXT DEFAULT 'User',
    last_name TEXT DEFAULT 'Name',
    role TEXT DEFAULT 'tenant' CHECK (role IN ('admin', 'landlord', 'nuomotojas', 'tenant', 'manager', 'accountant', 'maintenance')),
    is_active BOOLEAN DEFAULT true,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER PERMISSIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    permission TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, permission)
);

-- =============================================
-- ADDRESSES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    label TEXT NOT NULL,
    full_address TEXT,
    street TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'Lietuva',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PROPERTIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    address_id UUID REFERENCES public.addresses(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    type TEXT DEFAULT 'apartment',
    status TEXT DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'maintenance')),
    rent DECIMAL(10,2) DEFAULT 0,
    deposit_amount DECIMAL(10,2) DEFAULT 0,
    tenant_name TEXT,
    tenant_user_id UUID REFERENCES public.users(id),
    email TEXT,
    phone TEXT,
    contract_start DATE,
    contract_end DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PROPERTY METER CONFIGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.property_meter_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    meter_type TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT DEFAULT 'kWh',
    price_per_unit DECIMAL(10,4),
    landlord_reading_enabled BOOLEAN DEFAULT false,
    tenant_photo_enabled BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- METER READINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.meter_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    meter_config_id UUID REFERENCES public.property_meter_configs(id) ON DELETE CASCADE,
    reading_value DECIMAL(12,3) NOT NULL,
    reading_date DATE NOT NULL,
    photo_url TEXT,
    recorded_by UUID REFERENCES public.users(id),
    consumption DECIMAL(12,3),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INVOICES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    invoice_number TEXT,
    invoice_date DATE NOT NULL,
    due_date DATE,
    total_amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue', 'cancelled')),
    payment_method TEXT,
    paid_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TENANTS TABLE (legacy)
-- =============================================
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TENANT INVITATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.tenant_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    contract_start DATE,
    contract_end DATE,
    rent DECIMAL(10,2),
    deposit DECIMAL(10,2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    token UUID DEFAULT uuid_generate_v4(),
    invited_by UUID REFERENCES public.users(id),
    invited_by_email TEXT,
    property_label TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);

-- =============================================
-- CONVERSATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    participant_1 UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    participant_2 UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MESSAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'invitation_code', 'system')),
    metadata JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ADDRESS METERS TABLE (for communal)
-- =============================================
CREATE TABLE IF NOT EXISTS public.address_meters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address_id UUID REFERENCES public.addresses(id) ON DELETE CASCADE,
    meter_type TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT DEFAULT 'kWh',
    price_per_unit DECIMAL(10,4),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- COMMUNAL METERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.communal_meters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address_id UUID REFERENCES public.addresses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    unit TEXT DEFAULT 'kWh',
    price_per_unit DECIMAL(10,4),
    fixed_price DECIMAL(10,2),
    distribution_method TEXT DEFAULT 'equal',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- COMMUNAL EXPENSES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.communal_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meter_id UUID REFERENCES public.communal_meters(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    total_reading DECIMAL(12,3),
    total_cost DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- APARTMENT METERS TABLE (per property)
-- =============================================
CREATE TABLE IF NOT EXISTS public.apartment_meters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    meter_type TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT DEFAULT 'kWh',
    price_per_unit DECIMAL(10,4),
    is_active BOOLEAN DEFAULT true,
    landlord_reading_enabled BOOLEAN DEFAULT false,
    tenant_photo_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER ADDRESSES TABLE (link users to addresses)
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    address_id UUID REFERENCES public.addresses(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'tenant', 'landlord')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, address_id)
);

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER METER TEMPLATES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_meter_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    meter_type TEXT NOT NULL,
    unit TEXT DEFAULT 'kWh',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER HIDDEN METER TEMPLATES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_hidden_meter_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    template_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ENABLE RLS
-- =============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_meter_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.address_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communal_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communal_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartment_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_meter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_hidden_meter_templates ENABLE ROW LEVEL SECURITY;

-- =============================================
-- BASIC RLS POLICIES
-- =============================================
-- Users can view their own data
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================
-- ENSURE_USER_ROW FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.ensure_user_row(
    p_role TEXT DEFAULT NULL,
    p_first_name TEXT DEFAULT 'User',
    p_last_name TEXT DEFAULT 'Name'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_email TEXT;
    v_existing_role TEXT;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

    SELECT role INTO v_existing_role FROM public.users WHERE id = v_uid;

    IF v_existing_role IS NOT NULL THEN
        UPDATE public.users
        SET 
            email = v_email,
            first_name = COALESCE(p_first_name, first_name, 'User'),
            last_name = COALESCE(p_last_name, last_name, 'Name'),
            updated_at = NOW()
        WHERE id = v_uid;
    ELSE
        INSERT INTO public.users (id, email, role, first_name, last_name, is_active, created_at, updated_at)
        VALUES (
            v_uid,
            v_email,
            COALESCE(p_role, 'tenant'),
            COALESCE(p_first_name, 'User'),
            COALESCE(p_last_name, 'Name'),
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
            last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
            updated_at = NOW();
    END IF;
END;
$$;
