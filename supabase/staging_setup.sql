-- =============================================
-- STAGING DATABASE COMPLETE SETUP
-- Copy and paste this entire SQL into Supabase SQL Editor
-- =============================================

-- Step 1: Clean existing schema
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- Step 2: Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- CORE TABLES (in dependency order)
-- =============================================

-- 1. USERS (base table - no dependencies)
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name character varying NOT NULL DEFAULT 'User',
  last_name character varying NOT NULL DEFAULT 'Name',
  phone character varying,
  role character varying NOT NULL DEFAULT 'tenant'::character varying CHECK (role::text = ANY (ARRAY['admin'::character varying, 'landlord'::character varying, 'nuomotojas'::character varying, 'property_manager'::character varying, 'tenant'::character varying, 'maintenance'::character varying]::text[])),
  is_active boolean DEFAULT true,
  email_verified boolean DEFAULT false,
  last_login timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  password_reset_token character varying,
  password_reset_expires timestamp with time zone,
  google_linked boolean DEFAULT false,
  google_email text UNIQUE,
  nickname text UNIQUE,
  avatar_url text,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- 2. ADDRESSES (depends on users)
CREATE TABLE public.addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_address character varying NOT NULL,
  street character varying,
  house_number character varying,
  city character varying NOT NULL,
  postal_code character varying,
  coordinates_lat numeric,
  coordinates_lng numeric,
  building_type character varying DEFAULT 'Butų namas'::character varying,
  total_apartments integer DEFAULT 1,
  floors integer DEFAULT 1,
  year_built integer,
  management_type character varying DEFAULT 'Nuomotojas'::character varying,
  chairman_name character varying,
  chairman_phone character varying,
  chairman_email character varying,
  company_name character varying,
  contact_person character varying,
  company_phone character varying,
  company_email character varying,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT addresses_pkey PRIMARY KEY (id),
  CONSTRAINT addresses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- 3. PROPERTIES (depends on addresses, users)
CREATE TABLE public.properties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  address_id uuid,
  address character varying,
  apartment_number character varying NOT NULL,
  tenant_name character varying NOT NULL DEFAULT '',
  phone character varying,
  email character varying,
  rent numeric NOT NULL DEFAULT 0,
  area integer,
  rooms integer,
  status character varying DEFAULT 'vacant'::character varying CHECK (status::text = ANY (ARRAY['occupied'::character varying, 'vacant'::character varying, 'maintenance'::character varying]::text[])),
  contract_start date,
  contract_end date,
  auto_renewal_enabled boolean DEFAULT false,
  deposit_amount numeric DEFAULT 0,
  deposit_paid_amount numeric DEFAULT 0,
  deposit_paid boolean DEFAULT false,
  deposit_returned boolean DEFAULT false,
  deposit_deductions numeric DEFAULT 0,
  bedding_owner character varying DEFAULT 'tenant'::character varying CHECK (bedding_owner::text = ANY (ARRAY['tenant'::character varying, 'landlord'::character varying]::text[])),
  bedding_fee_paid boolean DEFAULT false,
  cleaning_required boolean DEFAULT false,
  cleaning_cost numeric DEFAULT 0,
  last_notification_sent timestamp with time zone,
  notification_count integer DEFAULT 0,
  original_contract_duration_months integer DEFAULT 12,
  tenant_response character varying DEFAULT 'no_response'::character varying,
  tenant_response_date timestamp with time zone,
  planned_move_out_date date,
  contract_status character varying DEFAULT 'active'::character varying,
  payment_status character varying DEFAULT 'current'::character varying,
  deposit_status character varying DEFAULT 'unpaid'::character varying,
  notification_status character varying DEFAULT 'none'::character varying,
  tenant_communication_status character varying DEFAULT 'responsive'::character varying,
  owner_id uuid,
  manager_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT properties_pkey PRIMARY KEY (id),
  CONSTRAINT properties_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(id),
  CONSTRAINT properties_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id),
  CONSTRAINT properties_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id)
);

-- 4. ADDRESS_METERS (depends on addresses)
CREATE TABLE public.address_meters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  address_id uuid,
  name character varying NOT NULL,
  type character varying NOT NULL DEFAULT 'individual',
  unit character varying NOT NULL DEFAULT 'kWh',
  price_per_unit numeric DEFAULT 0,
  fixed_price numeric DEFAULT 0,
  distribution_method character varying NOT NULL DEFAULT 'per_apartment',
  description text,
  requires_photo boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  policy jsonb DEFAULT '{"scope": "building", "collectionMode": "landlord_only"}'::jsonb,
  collection_mode text DEFAULT 'landlord_only'::text,
  landlord_reading_enabled boolean DEFAULT true,
  tenant_photo_enabled boolean DEFAULT false,
  CONSTRAINT address_meters_pkey PRIMARY KEY (id),
  CONSTRAINT address_meters_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(id)
);

-- 5. ADDRESS_SETTINGS (depends on addresses)
CREATE TABLE public.address_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  address_id uuid NOT NULL UNIQUE,
  building_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  contact_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  financial_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  notification_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  communal_config jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT address_settings_pkey PRIMARY KEY (id),
  CONSTRAINT address_settings_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(id)
);

-- 6. APARTMENT_METERS (depends on properties, address_meters)
CREATE TABLE public.apartment_meters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid,
  address_meter_id uuid,
  name character varying NOT NULL,
  type character varying NOT NULL DEFAULT 'individual',
  unit character varying NOT NULL DEFAULT 'kWh',
  price_per_unit numeric DEFAULT 0,
  fixed_price numeric DEFAULT 0,
  distribution_method character varying NOT NULL DEFAULT 'per_apartment',
  description text,
  requires_photo boolean DEFAULT true,
  is_active boolean DEFAULT true,
  is_custom boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  policy jsonb DEFAULT '{"scope": "apartment", "collectionMode": "landlord_only"}'::jsonb,
  meter_name text,
  meter_type text DEFAULT 'individual'::text,
  serial_number text,
  collection_mode text DEFAULT 'landlord_only'::text,
  landlord_reading_enabled boolean DEFAULT true,
  tenant_photo_enabled boolean DEFAULT false,
  CONSTRAINT apartment_meters_pkey PRIMARY KEY (id),
  CONSTRAINT apartment_meters_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT apartment_meters_address_meter_id_fkey FOREIGN KEY (address_meter_id) REFERENCES public.address_meters(id)
);

-- 7. COMMUNAL_METERS (depends on addresses)
CREATE TABLE public.communal_meters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  address_id uuid NOT NULL,
  name character varying NOT NULL,
  type character varying NOT NULL DEFAULT 'communal',
  unit character varying NOT NULL DEFAULT 'kWh',
  price_per_unit numeric DEFAULT 0.00,
  fixed_price numeric DEFAULT 0.00,
  distribution_method character varying NOT NULL DEFAULT 'per_apartment',
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT communal_meters_pkey PRIMARY KEY (id),
  CONSTRAINT communal_meters_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(id)
);

-- 8. COMMUNAL_EXPENSES (depends on addresses, address_meters)
CREATE TABLE public.communal_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  address_id uuid,
  meter_id uuid,
  month character varying NOT NULL,
  total_amount numeric NOT NULL,
  total_units numeric,
  distribution_amount numeric NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT communal_expenses_pkey PRIMARY KEY (id),
  CONSTRAINT communal_expenses_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(id),
  CONSTRAINT communal_expenses_meter_id_fkey FOREIGN KEY (meter_id) REFERENCES public.address_meters(id)
);

-- 9. COMMUNAL_EXPENSES_NEW (depends on communal_meters)
CREATE TABLE public.communal_expenses_new (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  meter_id uuid NOT NULL,
  month character varying NOT NULL,
  total_amount numeric NOT NULL,
  total_units numeric,
  distribution_amount numeric NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT communal_expenses_new_pkey PRIMARY KEY (id),
  CONSTRAINT communal_expenses_new_meter_id_fkey FOREIGN KEY (meter_id) REFERENCES public.communal_meters(id)
);

-- 10. CONVERSATIONS (depends on properties, auth.users)
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid,
  participant_1 uuid NOT NULL,
  participant_2 uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT conversations_participant_1_fkey FOREIGN KEY (participant_1) REFERENCES auth.users(id),
  CONSTRAINT conversations_participant_2_fkey FOREIGN KEY (participant_2) REFERENCES auth.users(id)
);

-- 11. MESSAGES (depends on conversations, auth.users)
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text'::text,
  metadata jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id)
);

-- 12. INVOICES (depends on auth.users)
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  property_id uuid,
  invoice_number text NOT NULL UNIQUE,
  invoice_date date NOT NULL,
  due_date date NOT NULL,
  amount numeric NOT NULL,
  rent_amount numeric NOT NULL,
  utilities_amount numeric DEFAULT 0,
  other_amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid'::text,
  paid_date date,
  payment_method text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- 13. METER_READINGS (depends on properties)
CREATE TABLE public.meter_readings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid,
  meter_id uuid,
  meter_type character varying NOT NULL DEFAULT 'apartment',
  type character varying NOT NULL DEFAULT 'electricity',
  reading_date date NOT NULL,
  previous_reading numeric,
  current_reading numeric NOT NULL,
  consumption numeric,
  difference numeric NOT NULL DEFAULT 0,
  price_per_unit numeric NOT NULL DEFAULT 0,
  total_sum numeric NOT NULL DEFAULT 0,
  amount numeric,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT meter_readings_pkey PRIMARY KEY (id),
  CONSTRAINT meter_readings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
);

-- 14. NOTIFICATIONS (depends on auth.users)
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- 15. PASSWORD_RESETS (depends on users)
CREATE TABLE public.password_resets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  reset_token character varying NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT password_resets_pkey PRIMARY KEY (id),
  CONSTRAINT password_resets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- 16. PROFILES (depends on auth.users)
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text,
  username text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'tenant',
  has_password boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  avatar_url text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- 17. PROPERTY_METER_CONFIGS (depends on properties, addresses)
CREATE TABLE public.property_meter_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid,
  meter_type text NOT NULL DEFAULT 'electricity',
  custom_name text,
  unit text NOT NULL DEFAULT 'kWh',
  tariff text NOT NULL DEFAULT 'single'::text,
  price_per_unit numeric NOT NULL DEFAULT 0,
  fixed_price numeric,
  initial_reading numeric,
  initial_date date,
  require_photo boolean DEFAULT true,
  require_serial boolean DEFAULT false,
  serial_number text,
  provider text,
  status text NOT NULL DEFAULT 'active'::text,
  notes text,
  is_inherited boolean DEFAULT false,
  address_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  type character varying NOT NULL DEFAULT 'individual'::character varying,
  CONSTRAINT property_meter_configs_pkey PRIMARY KEY (id),
  CONSTRAINT property_meter_configs_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT property_meter_configs_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(id)
);

-- 18. TENANT_INVITATIONS (depends on properties, auth.users)
CREATE TABLE public.tenant_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  phone text,
  contract_start date,
  contract_end date,
  rent numeric,
  deposit numeric,
  status text NOT NULL DEFAULT 'pending'::text,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  invited_by uuid,
  invited_by_email text,
  property_label text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  responded_at timestamp with time zone,
  CONSTRAINT tenant_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT tenant_invitations_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT tenant_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id)
);

-- 19. TENANTS (depends on properties, users)
CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid,
  user_id uuid,
  name character varying NOT NULL,
  phone character varying,
  email character varying,
  role character varying DEFAULT 'Nuomininkas'::character varying,
  monthly_income numeric,
  contract_start date,
  contract_end date,
  lease_start date,
  lease_end date,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tenants_pkey PRIMARY KEY (id),
  CONSTRAINT tenants_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT tenants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- 20. USER_ADDRESSES (depends on users, addresses)
CREATE TABLE public.user_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  address_id uuid,
  role_at_address character varying NOT NULL DEFAULT 'landlord',
  role character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT user_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_addresses_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(id)
);

-- 21. USER_HIDDEN_METER_TEMPLATES (depends on auth.users)
CREATE TABLE public.user_hidden_meter_templates (
  user_id uuid NOT NULL,
  template_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_hidden_meter_templates_pkey PRIMARY KEY (user_id, template_id),
  CONSTRAINT user_hidden_meter_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- 22. USER_METER_TEMPLATES (depends on auth.users)
CREATE TABLE public.user_meter_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  mode text NOT NULL DEFAULT 'individual',
  unit text NOT NULL DEFAULT 'kWh',
  price_per_unit numeric NOT NULL DEFAULT 0,
  distribution_method text NOT NULL DEFAULT 'per_apartment',
  requires_photo boolean NOT NULL DEFAULT false,
  icon text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_meter_templates_pkey PRIMARY KEY (id),
  CONSTRAINT user_meter_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- 23. USER_PERMISSIONS (depends on users)
CREATE TABLE public.user_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  permission character varying NOT NULL,
  granted boolean DEFAULT true,
  granted_by uuid,
  granted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id)
);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.address_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.address_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartment_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communal_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communal_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communal_expenses_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_meter_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_hidden_meter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_meter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- BASIC RLS POLICIES
-- =============================================
-- Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================
-- CORE FUNCTIONS
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
        -- User exists, update without changing role
        UPDATE public.users
        SET 
            email = v_email,
            first_name = COALESCE(p_first_name, first_name, 'User'),
            last_name = COALESCE(p_last_name, last_name, 'Name'),
            updated_at = NOW()
        WHERE id = v_uid;
    ELSE
        -- New user, insert with provided role
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

-- =============================================
-- SUCCESS!
-- =============================================
-- Schema created successfully. Your staging database is ready!
