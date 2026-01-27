--
-- PostgreSQL database dump
--


-- Dumped from database version 17.4
-- Dumped by pg_dump version 18.0

-- Started on 2026-01-20 20:43:41

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 140 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--




--
-- TOC entry 4454 (class 0 OID 0)
-- Dependencies: 140
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--



--
-- TOC entry 438 (class 1255 OID 139144)
-- Name: app_user_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_user_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
    SELECT auth.uid();
$$;



--
-- TOC entry 546 (class 1255 OID 139145)
-- Name: app_user_role(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_user_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
    SELECT role FROM public.users WHERE id = auth.uid();
$$;



--
-- TOC entry 563 (class 1255 OID 139233)
-- Name: check_username_available(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_username_available(p_username text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN public.is_username_available(p_username);
END;
$$;



--
-- TOC entry 547 (class 1255 OID 139168)
-- Name: create_apartment_meters_from_address(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_apartment_meters_from_address(p_address_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    -- Implementation depends on your schema
    NULL;
END;
$$;



--
-- TOC entry 506 (class 1255 OID 32658)
-- Name: create_apartment_meters_from_address(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_apartment_meters_from_address(p_property_id uuid, p_address_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE am RECORD;
BEGIN
  FOR am IN SELECT * FROM address_meters WHERE address_id=p_address_id AND is_active=true LOOP
    IF am.type='individual' THEN
      INSERT INTO apartment_meters (
        property_id,address_meter_id,name,type,unit,price_per_unit,fixed_price,
        distribution_method,description,requires_photo,is_active,is_custom,policy
      ) VALUES (
        p_property_id, am.id, am.name, am.type, am.unit, am.price_per_unit, am.fixed_price,
        am.distribution_method, am.description, am.requires_photo, true, false,
        jsonb_build_object('scope','apartment','collectionMode','tenant_photo')
      ) ON CONFLICT (property_id,address_meter_id) DO NOTHING;

      INSERT INTO property_meter_configs (
        property_id,meter_type,custom_name,unit,tariff,price_per_unit,fixed_price,
        initial_reading,initial_date,require_photo,require_serial,serial_number,provider,
        status,notes,is_inherited,address_id,type
      ) VALUES (
        p_property_id,
        CASE
          WHEN am.name ILIKE '%vanduo%šalt%' OR am.name ILIKE '%water%cold%' THEN 'water_cold'
          WHEN am.name ILIKE '%vanduo%karšt%' OR am.name ILIKE '%water%hot%'  THEN 'water_hot'
          WHEN am.name ILIKE '%elektra%individual%' OR am.name ILIKE '%electricity%individual%' THEN 'electricity'
          WHEN am.name ILIKE '%dujos%' OR am.name ILIKE '%gas%' THEN 'gas'
          WHEN am.name ILIKE '%šildymas%' OR am.name ILIKE '%heating%' THEN 'heating'
          WHEN am.name ILIKE '%internetas%' OR am.name ILIKE '%internet%' THEN 'internet'
          WHEN am.name ILIKE '%šiukšl%' OR am.name ILIKE '%garbage%' THEN 'garbage'
          ELSE 'custom'
        END,
        am.name, am.unit, 'single', am.price_per_unit, COALESCE(am.fixed_price,0),
        0, CURRENT_DATE, am.requires_photo, false, NULL, NULL, 'active', am.description,
        true, p_address_id, 'individual'
      ) ON CONFLICT (property_id, meter_type, custom_name) DO NOTHING;
    END IF;
  END LOOP;
END; $$;



--
-- TOC entry 428 (class 1255 OID 139167)
-- Name: create_apartment_meters_trigger(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_apartment_meters_trigger() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    -- Implementation depends on your schema
    NULL;
END;
$$;



--
-- TOC entry 466 (class 1255 OID 139166)
-- Name: create_meters_for_existing_properties(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_meters_for_existing_properties() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    -- Implementation depends on your schema
    NULL;
END;
$$;



--
-- TOC entry 571 (class 1255 OID 139164)
-- Name: create_missing_apartment_meters(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_missing_apartment_meters() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    -- Implementation depends on your schema
    -- This is a placeholder - adjust based on your actual logic
    NULL;
END;
$$;



--
-- TOC entry 597 (class 1255 OID 139165)
-- Name: create_missing_property_meter_configs(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_missing_property_meter_configs() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    -- Implementation depends on your schema
    NULL;
END;
$$;



--
-- TOC entry 632 (class 1255 OID 140382)
-- Name: delete_user_account(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_user_account(target_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  result json;
BEGIN
  -- Verify the user is deleting their own account
  IF auth.uid() != target_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: can only delete your own account');
  END IF;

  -- Delete from profiles table
  DELETE FROM public.profiles WHERE id = target_user_id;
  
  -- Delete from users table
  DELETE FROM public.users WHERE id = target_user_id;
  
  -- Delete addresses created by this user
  DELETE FROM public.addresses WHERE created_by = target_user_id;
  
  -- Delete the auth user (requires service role)
  -- This is called with SECURITY DEFINER so it runs with elevated privileges
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN json_build_object('success', true, 'message', 'Account deleted successfully');
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;



--
-- TOC entry 4465 (class 0 OID 0)
-- Dependencies: 632
-- Name: FUNCTION delete_user_account(target_user_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.delete_user_account(target_user_id uuid) IS 'Safely deletes a user account and all associated data. User can only delete their own account.';


--
-- TOC entry 448 (class 1255 OID 143973)
-- Name: ensure_user_row(text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.ensure_user_row(p_role text DEFAULT 'tenant'::text, p_first_name text DEFAULT 'User'::text, p_last_name text DEFAULT 'Name'::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_existing_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_email IS NULL THEN RETURN; END IF;

  SELECT id INTO v_existing_id FROM public.users WHERE email = v_email OR id = v_user_id LIMIT 1;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.users (id, email, role, google_linked, google_email, first_name, last_name, created_at, updated_at)
    VALUES (v_user_id, v_email, COALESCE(p_role, 'tenant'), true, v_email, COALESCE(NULLIF(p_first_name, ''), 'User'), COALESCE(NULLIF(p_last_name, ''), 'Name'), now(), now())
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      role = COALESCE(public.users.role, EXCLUDED.role),
      google_linked = EXCLUDED.google_linked, google_email = EXCLUDED.google_email,
      first_name = COALESCE(NULLIF(public.users.first_name, ''), EXCLUDED.first_name),
      last_name = COALESCE(NULLIF(public.users.last_name, ''), EXCLUDED.last_name), updated_at = now();
  ELSE
    UPDATE public.users SET
      role = COALESCE(role, p_role, 'tenant'),
      google_linked = true, google_email = COALESCE(google_email, v_email),
      first_name = COALESCE(NULLIF(first_name, ''), p_first_name, 'User'),
      last_name = COALESCE(NULLIF(last_name, ''), p_last_name, 'Name'), updated_at = now()
    WHERE id = v_user_id OR email = v_email;
  END IF;
END; $$;



--
-- TOC entry 593 (class 1255 OID 139170)
-- Name: fill_missing_apartment_meters(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fill_missing_apartment_meters() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    -- Implementation depends on your schema
    NULL;
END;
$$;



--
-- TOC entry 559 (class 1255 OID 39693)
-- Name: get_current_user_data(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_current_user_data() RETURNS TABLE(id uuid, email text, first_name text, last_name text, role text, is_active boolean, email_verified boolean, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.is_active,
    u.email_verified,
    u.created_at
  FROM users u
  WHERE u.id = auth.uid();
END $$;



--
-- TOC entry 589 (class 1255 OID 54190)
-- Name: get_user_by_google_email(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_by_google_email(p_google_email text) RETURNS TABLE(user_id uuid, user_email text, first_name text, last_name text, role text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role
  FROM public.users u
  WHERE u.google_email = p_google_email 
  AND u.google_linked = true;
END;
$$;



--
-- TOC entry 580 (class 1255 OID 139159)
-- Name: get_user_by_google_email_bypass(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_by_google_email_bypass(p_google_email text) RETURNS TABLE(id uuid, email text, role text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    IF NOT public.is_mgr_or_admin() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT u.id, u.email, u.role
    FROM public.users u
    WHERE u.google_email = p_google_email;
END;
$$;



--
-- TOC entry 541 (class 1255 OID 139231)
-- Name: get_user_by_username(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_by_username(p_username text) RETURNS TABLE(user_id uuid, email text, has_password boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.has_password
  FROM public.profiles p
  WHERE LOWER(p.username) = LOWER(p_username);
END;
$$;



--
-- TOC entry 562 (class 1255 OID 32662)
-- Name: get_user_with_permissions(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_with_permissions(user_email text) RETURNS TABLE(id uuid, email character varying, first_name character varying, last_name character varying, phone character varying, role character varying, is_active boolean, last_login timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone, permissions text[])
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT u.id,u.email,u.first_name,u.last_name,u.phone,u.role,u.is_active,u.last_login,u.created_at,u.updated_at,
         ARRAY_AGG(up.permission) FILTER (WHERE up.permission IS NOT NULL AND up.granted)
  FROM users u
  LEFT JOIN user_permissions up ON up.user_id=u.id
  WHERE u.email=user_email AND u.is_active=true
  GROUP BY u.id,u.email,u.first_name,u.last_name,u.phone,u.role,u.is_active,u.last_login,u.created_at,u.updated_at;
END; $$;



--
-- TOC entry 437 (class 1255 OID 139248)
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    user_first_name text;
    user_last_name text;
BEGIN
    -- Extract names from Google OAuth metadata
    user_first_name := COALESCE(
        NEW.raw_user_meta_data->>'given_name',
        NEW.raw_user_meta_data->>'first_name',
        'User'
    );
    
    user_last_name := COALESCE(
        NEW.raw_user_meta_data->>'family_name',
        NEW.raw_user_meta_data->>'last_name',
        'Name'
    );

    -- Insert into public.users
    INSERT INTO public.users (
        id, 
        email, 
        first_name, 
        last_name, 
        role, 
        google_linked,
        google_email,
        created_at, 
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        user_first_name,
        user_last_name,
        'landlord',
        true,
        NEW.email,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        google_linked = true,
        google_email = EXCLUDED.google_email,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$;



--
-- TOC entry 587 (class 1255 OID 34784)
-- Name: has_access_to_address(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.has_access_to_address(addr_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN app_user_role() = 'admin'
     OR EXISTS (SELECT 1 FROM addresses a
                WHERE a.id = addr_id
                  AND a.created_by = app_user_id())
     OR EXISTS (SELECT 1 FROM user_addresses ua
                WHERE ua.address_id = addr_id
                  AND ua.user_id = app_user_id());
END; $$;



--
-- TOC entry 568 (class 1255 OID 34785)
-- Name: has_access_to_property(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.has_access_to_property(prop_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN app_user_role() = 'admin'
     OR EXISTS (SELECT 1 FROM properties p
                WHERE p.id = prop_id
                  AND (p.owner_id = app_user_id() OR p.manager_id = app_user_id()))
     OR EXISTS (SELECT 1
                  FROM properties p
                  JOIN user_addresses ua ON ua.address_id = p.address_id
                 WHERE p.id = prop_id
                   AND ua.user_id = app_user_id());
END; $$;



--
-- TOC entry 478 (class 1255 OID 139146)
-- Name: is_mgr_or_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_mgr_or_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
    SELECT role IN ('manager', 'admin') FROM public.users WHERE id = auth.uid();
$$;



--
-- TOC entry 487 (class 1255 OID 139148)
-- Name: is_user_active(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_user_active() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
    SELECT is_active = true FROM public.users WHERE id = auth.uid();
$$;



--
-- TOC entry 456 (class 1255 OID 139147)
-- Name: is_user_role(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_user_role(p_role text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
    SELECT role = p_role FROM public.users WHERE id = auth.uid();
$$;



--
-- TOC entry 582 (class 1255 OID 139232)
-- Name: is_username_available(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_username_available(p_username text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE LOWER(username) = LOWER(p_username)
  );
END;
$$;



--
-- TOC entry 584 (class 1255 OID 139153)
-- Name: link_google_account(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.link_google_account(p_google_email text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE public.users
    SET google_linked = true, google_email = p_google_email, updated_at = NOW()
    WHERE id = v_user_id;
END;
$$;



--
-- TOC entry 462 (class 1255 OID 139157)
-- Name: link_google_account_bypass(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.link_google_account_bypass(p_user_id uuid, p_google_email text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    IF NOT public.is_mgr_or_admin() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    UPDATE public.users
    SET google_linked = true, google_email = p_google_email, updated_at = NOW()
    WHERE id = p_user_id;
END;
$$;



--
-- TOC entry 635 (class 1255 OID 139155)
-- Name: link_google_account_rpc(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.link_google_account_rpc(p_google_email text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    PERFORM public.link_google_account(p_google_email);
END;
$$;



--
-- TOC entry 464 (class 1255 OID 139169)
-- Name: on_address_meter_insert_create_apartment_meters(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.on_address_meter_insert_create_apartment_meters() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    -- Implementation depends on your schema
    RETURN NEW;
END;
$$;



--
-- TOC entry 595 (class 1255 OID 139142)
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;



--
-- TOC entry 564 (class 1255 OID 139150)
-- Name: set_user_id_from_auth(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_user_id_from_auth() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    NEW.user_id := auth.uid();
    RETURN NEW;
END;
$$;



--
-- TOC entry 479 (class 1255 OID 140383)
-- Name: set_user_password(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_user_password(new_password text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get the current user's ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate password length
  IF length(new_password) < 8 THEN
    RETURN json_build_object('success', false, 'error', 'Password must be at least 8 characters');
  END IF;

  -- Update the user's encrypted password in auth.users
  -- This uses the internal Supabase password hashing
  UPDATE auth.users
  SET 
    encrypted_password = crypt(new_password, gen_salt('bf')),
    updated_at = now()
  WHERE id = current_user_id;

  -- Update has_password flag in profiles
  UPDATE public.profiles
  SET has_password = true, updated_at = now()
  WHERE id = current_user_id;

  RETURN json_build_object('success', true, 'message', 'Password set successfully');
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;



--
-- TOC entry 4487 (class 0 OID 0)
-- Dependencies: 479
-- Name: FUNCTION set_user_password(new_password text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.set_user_password(new_password text) IS 'Allows authenticated users (including OAuth users) to set a password for username+password login.';


--
-- TOC entry 606 (class 1255 OID 139171)
-- Name: sync_user_address_role(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_user_address_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    -- Implementation depends on your schema
    RETURN NEW;
END;
$$;



--
-- TOC entry 444 (class 1255 OID 139149)
-- Name: test_function(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.test_function() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    RETURN 'test';
END;
$$;



--
-- TOC entry 494 (class 1255 OID 139162)
-- Name: trg_fn_addresses_autolink(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_fn_addresses_autolink() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    -- Only insert link if user_id is not null
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO public.user_addresses (user_id, address_id, role, role_at_address, created_at)
        VALUES (auth.uid(), NEW.id, 'landlord', 'landlord', NOW())
        ON CONFLICT (user_id, address_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;



--
-- TOC entry 473 (class 1255 OID 139161)
-- Name: trg_fn_addresses_set_created_by(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_fn_addresses_set_created_by() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    -- Set created_by if not already set
    IF NEW.created_by IS NULL AND auth.uid() IS NOT NULL THEN
        NEW.created_by := auth.uid();
    END IF;
    RETURN NEW;
END;
$$;



--
-- TOC entry 575 (class 1255 OID 139163)
-- Name: trg_fn_users_normalize_email(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_fn_users_normalize_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    NEW.email := LOWER(TRIM(NEW.email));
    RETURN NEW;
END;
$$;



--
-- TOC entry 599 (class 1255 OID 139160)
-- Name: trg_fn_users_self_provision_guard(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_fn_users_self_provision_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    IF NEW.id <> auth.uid() THEN
        RAISE EXCEPTION 'Users can only create their own profile';
    END IF;
    RETURN NEW;
END;
$$;



--
-- TOC entry 489 (class 1255 OID 139154)
-- Name: unlink_google_account(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.unlink_google_account() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE public.users
    SET google_linked = false, google_email = NULL, updated_at = NOW()
    WHERE id = v_user_id;
END;
$$;



--
-- TOC entry 550 (class 1255 OID 139158)
-- Name: unlink_google_account_bypass(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.unlink_google_account_bypass(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    IF NOT public.is_mgr_or_admin() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    UPDATE public.users
    SET google_linked = false, google_email = NULL, updated_at = NOW()
    WHERE id = p_user_id;
END;
$$;



--
-- TOC entry 496 (class 1255 OID 139156)
-- Name: unlink_google_account_rpc(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.unlink_google_account_rpc() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    PERFORM public.unlink_google_account();
END;
$$;



--
-- TOC entry 531 (class 1255 OID 142763)
-- Name: update_conversation_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_conversation_timestamp() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
    update public.conversations 
    set updated_at = now() 
    where id = NEW.conversation_id;
    return NEW;
end;
$$;



--
-- TOC entry 480 (class 1255 OID 139143)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;



SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 392 (class 1259 OID 32164)
-- Name: address_meters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.address_meters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    address_id uuid,
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    unit character varying(20) NOT NULL,
    price_per_unit numeric(10,2) DEFAULT 0,
    fixed_price numeric(10,2) DEFAULT 0,
    distribution_method character varying(50) NOT NULL,
    description text,
    requires_photo boolean DEFAULT true,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    policy jsonb DEFAULT '{"scope": "building", "collectionMode": "landlord_only"}'::jsonb,
    collection_mode text DEFAULT 'landlord_only'::text,
    landlord_reading_enabled boolean DEFAULT true,
    tenant_photo_enabled boolean DEFAULT false,
    CONSTRAINT address_meters_distribution_method_check CHECK (((distribution_method)::text = ANY ((ARRAY['per_apartment'::character varying, 'per_person'::character varying, 'per_area'::character varying, 'fixed_split'::character varying, 'per_consumption'::character varying])::text[]))),
    CONSTRAINT address_meters_type_check CHECK (((type)::text = ANY ((ARRAY['individual'::character varying, 'communal'::character varying])::text[]))),
    CONSTRAINT address_meters_unit_check CHECK (((unit)::text = ANY ((ARRAY['m3'::character varying, 'kWh'::character varying, 'GJ'::character varying, 'Kitas'::character varying])::text[])))
);



--
-- TOC entry 394 (class 1259 OID 32207)
-- Name: address_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.address_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    address_id uuid NOT NULL,
    building_info jsonb DEFAULT '{}'::jsonb NOT NULL,
    contact_info jsonb DEFAULT '{}'::jsonb NOT NULL,
    financial_settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    notification_settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    communal_config jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);



--
-- TOC entry 389 (class 1259 OID 32072)
-- Name: addresses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_address character varying(255) NOT NULL,
    street character varying(255),
    house_number character varying(20),
    city character varying(100) NOT NULL,
    postal_code character varying(10),
    coordinates_lat numeric(10,8),
    coordinates_lng numeric(11,8),
    building_type character varying(100) DEFAULT 'Butų namas'::character varying,
    total_apartments integer DEFAULT 1,
    floors integer DEFAULT 1,
    year_built integer,
    management_type character varying(50) DEFAULT 'Nuomotojas'::character varying,
    chairman_name character varying(255),
    chairman_phone character varying(50),
    chairman_email character varying(255),
    company_name character varying(255),
    contact_person character varying(255),
    company_phone character varying(50),
    company_email character varying(255),
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);



--
-- TOC entry 395 (class 1259 OID 32228)
-- Name: apartment_meters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.apartment_meters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid,
    address_meter_id uuid,
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    unit character varying(20) NOT NULL,
    price_per_unit numeric(10,2) DEFAULT 0,
    fixed_price numeric(10,2) DEFAULT 0,
    distribution_method character varying(50) NOT NULL,
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
    CONSTRAINT apartment_meters_distribution_method_check CHECK (((distribution_method)::text = ANY ((ARRAY['per_apartment'::character varying, 'per_person'::character varying, 'per_area'::character varying, 'fixed_split'::character varying, 'per_consumption'::character varying])::text[]))),
    CONSTRAINT apartment_meters_type_check CHECK (((type)::text = ANY ((ARRAY['individual'::character varying, 'communal'::character varying])::text[]))),
    CONSTRAINT apartment_meters_unit_check CHECK (((unit)::text = ANY ((ARRAY['m3'::character varying, 'kWh'::character varying, 'GJ'::character varying, 'Kitas'::character varying])::text[])))
);



--
-- TOC entry 398 (class 1259 OID 32307)
-- Name: communal_expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.communal_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    address_id uuid,
    meter_id uuid,
    month character varying(7) NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    total_units numeric(10,2),
    distribution_amount numeric(10,2) NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);



--
-- TOC entry 399 (class 1259 OID 32326)
-- Name: communal_expenses_new; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.communal_expenses_new (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    meter_id uuid NOT NULL,
    month character varying(7) NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    total_units numeric(10,2),
    distribution_amount numeric(10,2) NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);



--
-- TOC entry 393 (class 1259 OID 32186)
-- Name: communal_meters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.communal_meters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    address_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    unit character varying(20) NOT NULL,
    price_per_unit numeric(10,2) DEFAULT 0.00,
    fixed_price numeric(10,2) DEFAULT 0.00,
    distribution_method character varying(50) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT communal_meters_distribution_method_check CHECK (((distribution_method)::text = ANY ((ARRAY['per_apartment'::character varying, 'per_person'::character varying, 'per_area'::character varying, 'fixed_split'::character varying, 'per_consumption'::character varying])::text[]))),
    CONSTRAINT communal_meters_type_check CHECK (((type)::text = ANY ((ARRAY['individual'::character varying, 'communal'::character varying])::text[]))),
    CONSTRAINT communal_meters_unit_check CHECK (((unit)::text = ANY ((ARRAY['m3'::character varying, 'kWh'::character varying, 'GJ'::character varying, 'Kitas'::character varying])::text[])))
);



--
-- TOC entry 423 (class 1259 OID 142707)
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid,
    participant_1 uuid NOT NULL,
    participant_2 uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- TOC entry 386 (class 1259 OID 17360)
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    property_id uuid,
    invoice_number text NOT NULL,
    invoice_date date NOT NULL,
    due_date date NOT NULL,
    amount numeric(10,2) NOT NULL,
    rent_amount numeric(10,2) NOT NULL,
    utilities_amount numeric(10,2) DEFAULT 0,
    other_amount numeric(10,2) DEFAULT 0,
    status text DEFAULT 'unpaid'::text NOT NULL,
    paid_date date,
    payment_method text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT invoices_payment_method_check CHECK ((payment_method = ANY (ARRAY['cash'::text, 'bank_transfer'::text, 'card'::text, 'check'::text]))),
    CONSTRAINT invoices_status_check CHECK ((status = ANY (ARRAY['paid'::text, 'unpaid'::text, 'overdue'::text, 'cancelled'::text])))
);



--
-- TOC entry 424 (class 1259 OID 142732)
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    message_type text DEFAULT 'text'::text NOT NULL,
    metadata jsonb,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT messages_message_type_check CHECK ((message_type = ANY (ARRAY['text'::text, 'invitation_code'::text, 'system'::text])))
);



--
-- TOC entry 397 (class 1259 OID 32289)
-- Name: meter_readings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meter_readings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid,
    meter_id uuid,
    meter_type character varying(20) NOT NULL,
    type character varying(50) NOT NULL,
    reading_date date NOT NULL,
    previous_reading numeric(10,2),
    current_reading numeric(10,2) NOT NULL,
    consumption numeric(10,2) GENERATED ALWAYS AS ((current_reading - COALESCE(previous_reading, (0)::numeric))) STORED,
    difference numeric(10,2) NOT NULL,
    price_per_unit numeric(10,2) NOT NULL,
    total_sum numeric(10,2) NOT NULL,
    amount numeric(10,2),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT meter_readings_meter_type_check CHECK (((meter_type)::text = ANY ((ARRAY['address'::character varying, 'apartment'::character varying])::text[]))),
    CONSTRAINT meter_readings_type_check CHECK (((type)::text = ANY ((ARRAY['electricity'::character varying, 'water'::character varying, 'heating'::character varying, 'internet'::character varying, 'garbage'::character varying, 'gas'::character varying])::text[])))
);



--
-- TOC entry 387 (class 1259 OID 32036)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email public.citext NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    phone character varying(20),
    role character varying(50) DEFAULT 'tenant'::character varying NOT NULL,
    is_active boolean DEFAULT true,
    email_verified boolean DEFAULT false,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    password_reset_token character varying(255),
    password_reset_expires timestamp with time zone,
    google_linked boolean DEFAULT false,
    google_email text,
    nickname text,
    avatar_url text,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'landlord'::character varying, 'property_manager'::character varying, 'tenant'::character varying, 'maintenance'::character varying])::text[])))
);

ALTER TABLE ONLY public.users FORCE ROW LEVEL SECURITY;



--
-- TOC entry 407 (class 1259 OID 105516)
-- Name: nickname_lookup; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.nickname_lookup AS
 SELECT id,
    nickname,
    lower(nickname) AS nickname_lower
   FROM public.users u
  WHERE (nickname IS NOT NULL);



--
-- TOC entry 411 (class 1259 OID 106323)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    kind text NOT NULL,
    title text NOT NULL,
    body text,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);



--
-- TOC entry 401 (class 1259 OID 32512)
-- Name: password_resets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_resets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    reset_token character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.password_resets FORCE ROW LEVEL SECURITY;



--
-- TOC entry 419 (class 1259 OID 139207)
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    username text NOT NULL,
    role text NOT NULL,
    has_password boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    avatar_url text,
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['landlord'::text, 'tenant'::text])))
);



--
-- TOC entry 391 (class 1259 OID 32112)
-- Name: properties; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.properties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    address_id uuid,
    address character varying(255),
    apartment_number character varying(10) NOT NULL,
    tenant_name character varying(255) NOT NULL,
    phone character varying(20),
    email character varying(255),
    rent numeric(10,2) NOT NULL,
    area integer,
    rooms integer,
    status character varying(50) DEFAULT 'occupied'::character varying,
    contract_start date NOT NULL,
    contract_end date NOT NULL,
    auto_renewal_enabled boolean DEFAULT false,
    deposit_amount numeric(10,2) DEFAULT 0,
    deposit_paid_amount numeric(10,2) DEFAULT 0,
    deposit_paid boolean DEFAULT false,
    deposit_returned boolean DEFAULT false,
    deposit_deductions numeric(10,2) DEFAULT 0,
    bedding_owner character varying(50) DEFAULT 'tenant'::character varying,
    bedding_fee_paid boolean DEFAULT false,
    cleaning_required boolean DEFAULT false,
    cleaning_cost numeric(10,2) DEFAULT 0,
    last_notification_sent timestamp with time zone,
    notification_count integer DEFAULT 0,
    original_contract_duration_months integer DEFAULT 12,
    tenant_response character varying(50) DEFAULT 'no_response'::character varying,
    tenant_response_date timestamp with time zone,
    planned_move_out_date date,
    contract_status character varying(50) DEFAULT 'active'::character varying,
    payment_status character varying(50) DEFAULT 'current'::character varying,
    deposit_status character varying(50) DEFAULT 'unpaid'::character varying,
    notification_status character varying(50) DEFAULT 'none'::character varying,
    tenant_communication_status character varying(50) DEFAULT 'responsive'::character varying,
    owner_id uuid,
    manager_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT properties_bedding_owner_check CHECK (((bedding_owner)::text = ANY ((ARRAY['tenant'::character varying, 'landlord'::character varying])::text[]))),
    CONSTRAINT properties_contract_status_check CHECK (((contract_status)::text = ANY ((ARRAY['active'::character varying, 'expired'::character varying, 'terminated'::character varying, 'renewed'::character varying, 'pending_renewal'::character varying, 'maintenance'::character varying, 'vacant'::character varying])::text[]))),
    CONSTRAINT properties_deposit_status_check CHECK (((deposit_status)::text = ANY ((ARRAY['paid'::character varying, 'unpaid'::character varying, 'partially_paid'::character varying, 'returned'::character varying, 'deducted'::character varying])::text[]))),
    CONSTRAINT properties_notification_status_check CHECK (((notification_status)::text = ANY ((ARRAY['none'::character varying, 'first_sent'::character varying, 'second_sent'::character varying, 'final_sent'::character varying, 'expired'::character varying])::text[]))),
    CONSTRAINT properties_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['current'::character varying, 'overdue'::character varying, 'partial'::character varying, 'paid_in_advance'::character varying])::text[]))),
    CONSTRAINT properties_status_check CHECK (((status)::text = ANY ((ARRAY['occupied'::character varying, 'vacant'::character varying, 'maintenance'::character varying])::text[]))),
    CONSTRAINT properties_tenant_communication_status_check CHECK (((tenant_communication_status)::text = ANY ((ARRAY['responsive'::character varying, 'unresponsive'::character varying, 'no_contact'::character varying, 'disputed'::character varying])::text[]))),
    CONSTRAINT properties_tenant_response_check CHECK (((tenant_response)::text = ANY ((ARRAY['wants_to_renew'::character varying, 'does_not_want_to_renew'::character varying, 'no_response'::character varying])::text[])))
);



--
-- TOC entry 396 (class 1259 OID 32258)
-- Name: property_meter_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.property_meter_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid,
    meter_type text NOT NULL,
    custom_name text,
    unit text NOT NULL,
    tariff text DEFAULT 'single'::text NOT NULL,
    price_per_unit numeric(8,4) NOT NULL,
    fixed_price numeric(8,2),
    initial_reading numeric(10,2),
    initial_date date,
    require_photo boolean DEFAULT true,
    require_serial boolean DEFAULT false,
    serial_number text,
    provider text,
    status text DEFAULT 'active'::text NOT NULL,
    notes text,
    is_inherited boolean DEFAULT false,
    address_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    type character varying(50) DEFAULT 'individual'::character varying NOT NULL,
    CONSTRAINT property_meter_configs_meter_type_check CHECK ((meter_type = ANY (ARRAY['electricity'::text, 'water_cold'::text, 'water_hot'::text, 'gas'::text, 'heating'::text, 'internet'::text, 'garbage'::text, 'custom'::text]))),
    CONSTRAINT property_meter_configs_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'maintenance'::text]))),
    CONSTRAINT property_meter_configs_tariff_check CHECK ((tariff = ANY (ARRAY['single'::text, 'day_night'::text, 'peak_offpeak'::text]))),
    CONSTRAINT property_meter_configs_type_check CHECK (((type)::text = ANY ((ARRAY['individual'::character varying, 'communal'::character varying])::text[]))),
    CONSTRAINT property_meter_configs_unit_check CHECK ((unit = ANY (ARRAY['m3'::text, 'kWh'::text, 'GJ'::text, 'Kitas'::text])))
);



--
-- TOC entry 410 (class 1259 OID 106296)
-- Name: tenant_invitations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenant_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    phone text,
    contract_start date,
    contract_end date,
    rent numeric(12,2),
    deposit numeric(12,2),
    status text DEFAULT 'pending'::text NOT NULL,
    token uuid DEFAULT gen_random_uuid() NOT NULL,
    invited_by uuid,
    invited_by_email text,
    property_label text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    responded_at timestamp with time zone,
    CONSTRAINT tenant_invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text])))
);



--
-- TOC entry 400 (class 1259 OID 32479)
-- Name: tenants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid,
    user_id uuid,
    name character varying(255) NOT NULL,
    phone character varying(20),
    email character varying(255),
    role character varying(100) DEFAULT 'Nuomininkas'::character varying,
    monthly_income numeric(10,2),
    contract_start date NOT NULL,
    contract_end date NOT NULL,
    lease_start date,
    lease_end date,
    created_at timestamp with time zone DEFAULT now()
);



--
-- TOC entry 390 (class 1259 OID 32091)
-- Name: user_addresses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    address_id uuid,
    role_at_address character varying(50) NOT NULL,
    role character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_addresses_role_at_address_check CHECK (((role_at_address)::text = ANY ((ARRAY['landlord'::character varying, 'tenant'::character varying, 'property_manager'::character varying, 'maintenance'::character varying])::text[]))),
    CONSTRAINT user_addresses_role_check CHECK (((role)::text = ANY ((ARRAY['landlord'::character varying, 'tenant'::character varying, 'property_manager'::character varying, 'maintenance'::character varying])::text[])))
);



--
-- TOC entry 409 (class 1259 OID 105964)
-- Name: user_hidden_meter_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_hidden_meter_templates (
    user_id uuid NOT NULL,
    template_id text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);



--
-- TOC entry 408 (class 1259 OID 105920)
-- Name: user_meter_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_meter_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    mode text NOT NULL,
    unit text NOT NULL,
    price_per_unit numeric(12,4) DEFAULT 0 NOT NULL,
    distribution_method text NOT NULL,
    requires_photo boolean DEFAULT false NOT NULL,
    icon text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT user_meter_templates_distribution_method_check CHECK ((distribution_method = ANY (ARRAY['per_apartment'::text, 'per_area'::text, 'per_person'::text, 'per_consumption'::text, 'fixed_split'::text]))),
    CONSTRAINT user_meter_templates_mode_check CHECK ((mode = ANY (ARRAY['individual'::text, 'communal'::text]))),
    CONSTRAINT user_meter_templates_unit_check CHECK ((unit = ANY (ARRAY['m3'::text, 'kWh'::text, 'GJ'::text, 'Kitas'::text])))
);



--
-- TOC entry 388 (class 1259 OID 32052)
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    permission character varying(100) NOT NULL,
    granted boolean DEFAULT true,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now()
);



--
-- TOC entry 4091 (class 2606 OID 32180)
-- Name: address_meters address_meters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address_meters
    ADD CONSTRAINT address_meters_pkey PRIMARY KEY (id);


--
-- TOC entry 4102 (class 2606 OID 32222)
-- Name: address_settings address_settings_address_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address_settings
    ADD CONSTRAINT address_settings_address_id_key UNIQUE (address_id);


--
-- TOC entry 4104 (class 2606 OID 32220)
-- Name: address_settings address_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address_settings
    ADD CONSTRAINT address_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 4070 (class 2606 OID 32085)
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- TOC entry 4107 (class 2606 OID 32245)
-- Name: apartment_meters apartment_meters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.apartment_meters
    ADD CONSTRAINT apartment_meters_pkey PRIMARY KEY (id);


--
-- TOC entry 4109 (class 2606 OID 32247)
-- Name: apartment_meters apartment_meters_property_id_address_meter_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.apartment_meters
    ADD CONSTRAINT apartment_meters_property_id_address_meter_id_key UNIQUE (property_id, address_meter_id);


--
-- TOC entry 4130 (class 2606 OID 32334)
-- Name: communal_expenses_new communal_expenses_new_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communal_expenses_new
    ADD CONSTRAINT communal_expenses_new_pkey PRIMARY KEY (id);


--
-- TOC entry 4128 (class 2606 OID 32315)
-- Name: communal_expenses communal_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communal_expenses
    ADD CONSTRAINT communal_expenses_pkey PRIMARY KEY (id);


--
-- TOC entry 4098 (class 2606 OID 32201)
-- Name: communal_meters communal_meters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communal_meters
    ADD CONSTRAINT communal_meters_pkey PRIMARY KEY (id);


--
-- TOC entry 4158 (class 2606 OID 142714)
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- TOC entry 4049 (class 2606 OID 17376)
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- TOC entry 4051 (class 2606 OID 17374)
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- TOC entry 4166 (class 2606 OID 142743)
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- TOC entry 4126 (class 2606 OID 32301)
-- Name: meter_readings meter_readings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter_readings
    ADD CONSTRAINT meter_readings_pkey PRIMARY KEY (id);


--
-- TOC entry 4148 (class 2606 OID 106333)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 4136 (class 2606 OID 32519)
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- TOC entry 4152 (class 2606 OID 139217)
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 4155 (class 2606 OID 139219)
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


--
-- TOC entry 4089 (class 2606 OID 32148)
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- TOC entry 4119 (class 2606 OID 32276)
-- Name: property_meter_configs property_meter_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_meter_configs
    ADD CONSTRAINT property_meter_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 4121 (class 2606 OID 32278)
-- Name: property_meter_configs property_meter_configs_property_id_meter_type_custom_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_meter_configs
    ADD CONSTRAINT property_meter_configs_property_id_meter_type_custom_name_key UNIQUE (property_id, meter_type, custom_name);


--
-- TOC entry 4145 (class 2606 OID 106307)
-- Name: tenant_invitations tenant_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_invitations
    ADD CONSTRAINT tenant_invitations_pkey PRIMARY KEY (id);


--
-- TOC entry 4134 (class 2606 OID 32488)
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- TOC entry 4074 (class 2606 OID 56818)
-- Name: addresses unique_address_per_user; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT unique_address_per_user UNIQUE (created_by, full_address);


--
-- TOC entry 4162 (class 2606 OID 142716)
-- Name: conversations unique_conversation; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT unique_conversation UNIQUE (participant_1, participant_2);


--
-- TOC entry 4056 (class 2606 OID 53871)
-- Name: users unique_google_email; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT unique_google_email UNIQUE (google_email);


--
-- TOC entry 4096 (class 2606 OID 34779)
-- Name: address_meters uq_address_meters_address_id_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address_meters
    ADD CONSTRAINT uq_address_meters_address_id_name UNIQUE (address_id, name);


--
-- TOC entry 4079 (class 2606 OID 32099)
-- Name: user_addresses user_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_pkey PRIMARY KEY (id);


--
-- TOC entry 4081 (class 2606 OID 32101)
-- Name: user_addresses user_addresses_user_id_address_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_user_id_address_id_key UNIQUE (user_id, address_id);


--
-- TOC entry 4141 (class 2606 OID 105971)
-- Name: user_hidden_meter_templates user_hidden_meter_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_hidden_meter_templates
    ADD CONSTRAINT user_hidden_meter_templates_pkey PRIMARY KEY (user_id, template_id);


--
-- TOC entry 4138 (class 2606 OID 105934)
-- Name: user_meter_templates user_meter_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_meter_templates
    ADD CONSTRAINT user_meter_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 4066 (class 2606 OID 32059)
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 4068 (class 2606 OID 32061)
-- Name: user_permissions user_permissions_user_id_permission_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_permission_key UNIQUE (user_id, permission);


--
-- TOC entry 4058 (class 2606 OID 47713)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4061 (class 2606 OID 104989)
-- Name: users users_nickname_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_nickname_key UNIQUE (nickname);


--
-- TOC entry 4063 (class 2606 OID 32049)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4092 (class 1259 OID 32629)
-- Name: idx_address_meters_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_address_meters_active ON public.address_meters USING btree (is_active);


--
-- TOC entry 4093 (class 1259 OID 32627)
-- Name: idx_address_meters_address_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_address_meters_address_id ON public.address_meters USING btree (address_id);


--
-- TOC entry 4094 (class 1259 OID 32628)
-- Name: idx_address_meters_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_address_meters_type ON public.address_meters USING btree (type);


--
-- TOC entry 4105 (class 1259 OID 32641)
-- Name: idx_address_settings_address_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_address_settings_address_id ON public.address_settings USING btree (address_id);


--
-- TOC entry 4071 (class 1259 OID 32620)
-- Name: idx_addresses_city; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_addresses_city ON public.addresses USING btree (city);


--
-- TOC entry 4072 (class 1259 OID 32619)
-- Name: idx_addresses_full_address; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_addresses_full_address ON public.addresses USING btree (full_address);


--
-- TOC entry 4110 (class 1259 OID 32633)
-- Name: idx_apartment_meters_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_apartment_meters_active ON public.apartment_meters USING btree (is_active);


--
-- TOC entry 4111 (class 1259 OID 32631)
-- Name: idx_apartment_meters_address_meter_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_apartment_meters_address_meter_id ON public.apartment_meters USING btree (address_meter_id);


--
-- TOC entry 4112 (class 1259 OID 32630)
-- Name: idx_apartment_meters_property_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_apartment_meters_property_id ON public.apartment_meters USING btree (property_id);


--
-- TOC entry 4113 (class 1259 OID 32632)
-- Name: idx_apartment_meters_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_apartment_meters_type ON public.apartment_meters USING btree (type);


--
-- TOC entry 4131 (class 1259 OID 32639)
-- Name: idx_communal_expenses_new_meter_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_communal_expenses_new_meter_id ON public.communal_expenses_new USING btree (meter_id);


--
-- TOC entry 4132 (class 1259 OID 32640)
-- Name: idx_communal_expenses_new_month; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_communal_expenses_new_month ON public.communal_expenses_new USING btree (month);


--
-- TOC entry 4099 (class 1259 OID 32638)
-- Name: idx_communal_meters_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_communal_meters_active ON public.communal_meters USING btree (is_active);


--
-- TOC entry 4100 (class 1259 OID 32637)
-- Name: idx_communal_meters_address_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_communal_meters_address_id ON public.communal_meters USING btree (address_id);


--
-- TOC entry 4159 (class 1259 OID 142756)
-- Name: idx_conversations_participant_1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_participant_1 ON public.conversations USING btree (participant_1);


--
-- TOC entry 4160 (class 1259 OID 142757)
-- Name: idx_conversations_participant_2; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_participant_2 ON public.conversations USING btree (participant_2);


--
-- TOC entry 4045 (class 1259 OID 17437)
-- Name: idx_invoices_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_due_date ON public.invoices USING btree (due_date);


--
-- TOC entry 4046 (class 1259 OID 17435)
-- Name: idx_invoices_property_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_property_id ON public.invoices USING btree (property_id);


--
-- TOC entry 4047 (class 1259 OID 17436)
-- Name: idx_invoices_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);


--
-- TOC entry 4163 (class 1259 OID 142754)
-- Name: idx_messages_conversation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_conversation ON public.messages USING btree (conversation_id);


--
-- TOC entry 4164 (class 1259 OID 142755)
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);


--
-- TOC entry 4122 (class 1259 OID 32635)
-- Name: idx_meter_readings_meter_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meter_readings_meter_id ON public.meter_readings USING btree (meter_id);


--
-- TOC entry 4123 (class 1259 OID 32634)
-- Name: idx_meter_readings_property_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meter_readings_property_id ON public.meter_readings USING btree (property_id);


--
-- TOC entry 4124 (class 1259 OID 32636)
-- Name: idx_meter_readings_reading_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meter_readings_reading_date ON public.meter_readings USING btree (reading_date);


--
-- TOC entry 4082 (class 1259 OID 32621)
-- Name: idx_properties_address_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_properties_address_id ON public.properties USING btree (address_id);


--
-- TOC entry 4083 (class 1259 OID 32623)
-- Name: idx_properties_contract_end; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_properties_contract_end ON public.properties USING btree (contract_end);


--
-- TOC entry 4084 (class 1259 OID 32625)
-- Name: idx_properties_contract_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_properties_contract_status ON public.properties USING btree (contract_status);


--
-- TOC entry 4085 (class 1259 OID 32626)
-- Name: idx_properties_payment_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_properties_payment_status ON public.properties USING btree (payment_status);


--
-- TOC entry 4086 (class 1259 OID 32622)
-- Name: idx_properties_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_properties_status ON public.properties USING btree (status);


--
-- TOC entry 4087 (class 1259 OID 32624)
-- Name: idx_properties_tenant_response; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_properties_tenant_response ON public.properties USING btree (tenant_response);


--
-- TOC entry 4114 (class 1259 OID 32645)
-- Name: idx_property_meter_configs_inherited; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_property_meter_configs_inherited ON public.property_meter_configs USING btree (is_inherited);


--
-- TOC entry 4115 (class 1259 OID 32643)
-- Name: idx_property_meter_configs_meter_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_property_meter_configs_meter_type ON public.property_meter_configs USING btree (meter_type);


--
-- TOC entry 4116 (class 1259 OID 32642)
-- Name: idx_property_meter_configs_property_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_property_meter_configs_property_id ON public.property_meter_configs USING btree (property_id);


--
-- TOC entry 4117 (class 1259 OID 32644)
-- Name: idx_property_meter_configs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_property_meter_configs_status ON public.property_meter_configs USING btree (status);


--
-- TOC entry 4075 (class 1259 OID 32617)
-- Name: idx_user_addresses_address_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_addresses_address_id ON public.user_addresses USING btree (address_id);


--
-- TOC entry 4076 (class 1259 OID 32618)
-- Name: idx_user_addresses_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_addresses_role ON public.user_addresses USING btree (role);


--
-- TOC entry 4077 (class 1259 OID 32616)
-- Name: idx_user_addresses_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_addresses_user_id ON public.user_addresses USING btree (user_id);


--
-- TOC entry 4064 (class 1259 OID 32615)
-- Name: idx_user_permissions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_permissions_user_id ON public.user_permissions USING btree (user_id);


--
-- TOC entry 4052 (class 1259 OID 47714)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 4053 (class 1259 OID 37171)
-- Name: idx_users_google_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_google_email ON public.users USING btree (google_email);


--
-- TOC entry 4054 (class 1259 OID 32614)
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- TOC entry 4149 (class 1259 OID 106339)
-- Name: notifications_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_user_id_idx ON public.notifications USING btree (user_id, created_at DESC);


--
-- TOC entry 4150 (class 1259 OID 139226)
-- Name: profiles_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX profiles_email_idx ON public.profiles USING btree (email);


--
-- TOC entry 4153 (class 1259 OID 140423)
-- Name: profiles_username_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX profiles_username_idx ON public.profiles USING btree (username);


--
-- TOC entry 4156 (class 1259 OID 139225)
-- Name: profiles_username_unique_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX profiles_username_unique_idx ON public.profiles USING btree (lower(username));


--
-- TOC entry 4143 (class 1259 OID 106318)
-- Name: tenant_invitations_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tenant_invitations_email_idx ON public.tenant_invitations USING btree (lower(email));


--
-- TOC entry 4146 (class 1259 OID 106319)
-- Name: tenant_invitations_property_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tenant_invitations_property_idx ON public.tenant_invitations USING btree (property_id);


--
-- TOC entry 4142 (class 1259 OID 105977)
-- Name: user_hidden_meter_templates_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_hidden_meter_templates_user_id_idx ON public.user_hidden_meter_templates USING btree (user_id);


--
-- TOC entry 4139 (class 1259 OID 105940)
-- Name: user_meter_templates_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_meter_templates_user_id_idx ON public.user_meter_templates USING btree (user_id);


--
-- TOC entry 4059 (class 1259 OID 105064)
-- Name: users_nickname_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_nickname_idx ON public.users USING btree (nickname);


--
-- TOC entry 4201 (class 2620 OID 139251)
-- Name: addresses addresses_autolink_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER addresses_autolink_trigger AFTER INSERT ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.trg_fn_addresses_autolink();


--
-- TOC entry 4202 (class 2620 OID 139250)
-- Name: addresses addresses_set_created_by_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER addresses_set_created_by_trigger BEFORE INSERT ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.trg_fn_addresses_set_created_by();


--
-- TOC entry 4205 (class 2620 OID 142784)
-- Name: messages on_new_message; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_new_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();


--
-- TOC entry 4203 (class 2620 OID 139204)
-- Name: addresses update_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 4204 (class 2620 OID 139234)
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4176 (class 2606 OID 32181)
-- Name: address_meters address_meters_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address_meters
    ADD CONSTRAINT address_meters_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(id) ON DELETE CASCADE;


--
-- TOC entry 4178 (class 2606 OID 32223)
-- Name: address_settings address_settings_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address_settings
    ADD CONSTRAINT address_settings_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(id) ON DELETE CASCADE;


--
-- TOC entry 4170 (class 2606 OID 105576)
-- Name: addresses addresses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4179 (class 2606 OID 32253)
-- Name: apartment_meters apartment_meters_address_meter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.apartment_meters
    ADD CONSTRAINT apartment_meters_address_meter_id_fkey FOREIGN KEY (address_meter_id) REFERENCES public.address_meters(id) ON DELETE CASCADE;


--
-- TOC entry 4180 (class 2606 OID 32248)
-- Name: apartment_meters apartment_meters_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.apartment_meters
    ADD CONSTRAINT apartment_meters_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- TOC entry 4184 (class 2606 OID 32316)
-- Name: communal_expenses communal_expenses_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communal_expenses
    ADD CONSTRAINT communal_expenses_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(id) ON DELETE CASCADE;


--
-- TOC entry 4185 (class 2606 OID 32321)
-- Name: communal_expenses communal_expenses_meter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communal_expenses
    ADD CONSTRAINT communal_expenses_meter_id_fkey FOREIGN KEY (meter_id) REFERENCES public.address_meters(id) ON DELETE CASCADE;


--
-- TOC entry 4186 (class 2606 OID 32335)
-- Name: communal_expenses_new communal_expenses_new_meter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communal_expenses_new
    ADD CONSTRAINT communal_expenses_new_meter_id_fkey FOREIGN KEY (meter_id) REFERENCES public.communal_meters(id) ON DELETE CASCADE;


--
-- TOC entry 4177 (class 2606 OID 32202)
-- Name: communal_meters communal_meters_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communal_meters
    ADD CONSTRAINT communal_meters_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(id) ON DELETE CASCADE;


--
-- TOC entry 4196 (class 2606 OID 142722)
-- Name: conversations conversations_participant_1_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_participant_1_fkey FOREIGN KEY (participant_1) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4197 (class 2606 OID 142727)
-- Name: conversations conversations_participant_2_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_participant_2_fkey FOREIGN KEY (participant_2) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4198 (class 2606 OID 142717)
-- Name: conversations conversations_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;


--
-- TOC entry 4167 (class 2606 OID 106404)
-- Name: invoices invoices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- TOC entry 4199 (class 2606 OID 142744)
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- TOC entry 4200 (class 2606 OID 142749)
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4183 (class 2606 OID 32302)
-- Name: meter_readings meter_readings_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter_readings
    ADD CONSTRAINT meter_readings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- TOC entry 4194 (class 2606 OID 106334)
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4189 (class 2606 OID 32520)
-- Name: password_resets password_resets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4195 (class 2606 OID 139220)
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4173 (class 2606 OID 32149)
-- Name: properties properties_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(id) ON DELETE CASCADE;


--
-- TOC entry 4174 (class 2606 OID 32159)
-- Name: properties properties_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id);


--
-- TOC entry 4175 (class 2606 OID 32154)
-- Name: properties properties_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- TOC entry 4181 (class 2606 OID 32284)
-- Name: property_meter_configs property_meter_configs_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_meter_configs
    ADD CONSTRAINT property_meter_configs_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(id);


--
-- TOC entry 4182 (class 2606 OID 32279)
-- Name: property_meter_configs property_meter_configs_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_meter_configs
    ADD CONSTRAINT property_meter_configs_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- TOC entry 4192 (class 2606 OID 106313)
-- Name: tenant_invitations tenant_invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_invitations
    ADD CONSTRAINT tenant_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);


--
-- TOC entry 4193 (class 2606 OID 106308)
-- Name: tenant_invitations tenant_invitations_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_invitations
    ADD CONSTRAINT tenant_invitations_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- TOC entry 4187 (class 2606 OID 32489)
-- Name: tenants tenants_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- TOC entry 4188 (class 2606 OID 32494)
-- Name: tenants tenants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4171 (class 2606 OID 32107)
-- Name: user_addresses user_addresses_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(id) ON DELETE CASCADE;


--
-- TOC entry 4172 (class 2606 OID 32102)
-- Name: user_addresses user_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4191 (class 2606 OID 105972)
-- Name: user_hidden_meter_templates user_hidden_meter_templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_hidden_meter_templates
    ADD CONSTRAINT user_hidden_meter_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4190 (class 2606 OID 105935)
-- Name: user_meter_templates user_meter_templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_meter_templates
    ADD CONSTRAINT user_meter_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4168 (class 2606 OID 32067)
-- Name: user_permissions user_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- TOC entry 4169 (class 2606 OID 32062)
-- Name: user_permissions user_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4411 (class 3256 OID 139182)
-- Name: apartment_meters Managers can manage apartment meters; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Managers can manage apartment meters" ON public.apartment_meters USING ((EXISTS ( SELECT 1
   FROM ((public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
     JOIN public.properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = apartment_meters.property_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
     JOIN public.properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = apartment_meters.property_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))));


--
-- TOC entry 4413 (class 3256 OID 139187)
-- Name: invoices Managers can manage invoices; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Managers can manage invoices" ON public.invoices USING ((EXISTS ( SELECT 1
   FROM ((public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
     JOIN public.properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = invoices.property_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
     JOIN public.properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = invoices.property_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))));


--
-- TOC entry 4417 (class 3256 OID 139197)
-- Name: property_meter_configs Managers can manage meter configs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Managers can manage meter configs" ON public.property_meter_configs USING ((EXISTS ( SELECT 1
   FROM (public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = property_meter_configs.address_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = property_meter_configs.address_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))));


--
-- TOC entry 4409 (class 3256 OID 139178)
-- Name: address_meters Managers can manage meters for their addresses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Managers can manage meters for their addresses" ON public.address_meters USING ((EXISTS ( SELECT 1
   FROM public.user_addresses ua
  WHERE ((ua.address_id = address_meters.address_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_addresses ua
  WHERE ((ua.address_id = address_meters.address_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))));


--
-- TOC entry 4415 (class 3256 OID 139192)
-- Name: properties Managers can manage properties; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Managers can manage properties" ON public.properties USING ((EXISTS ( SELECT 1
   FROM (public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = properties.address_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = properties.address_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))));


--
-- TOC entry 4429 (class 3256 OID 139230)
-- Name: profiles Public can lookup username for auth; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public can lookup username for auth" ON public.profiles FOR SELECT USING (true);


--
-- TOC entry 4379 (class 3256 OID 142780)
-- Name: conversations Users can create conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK (((auth.uid() = participant_1) OR (auth.uid() = participant_2)));


--
-- TOC entry 4438 (class 3256 OID 141590)
-- Name: profiles Users can delete own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE TO authenticated USING ((auth.uid() = id));


--
-- TOC entry 4439 (class 3256 OID 141591)
-- Name: users Users can delete own user; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own user" ON public.users FOR DELETE TO authenticated USING ((auth.uid() = id));


--
-- TOC entry 4420 (class 3256 OID 139203)
-- Name: user_addresses Users can delete their own address links; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own address links" ON public.user_addresses FOR DELETE USING ((user_id = auth.uid()));


--
-- TOC entry 4426 (class 3256 OID 139228)
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- TOC entry 4443 (class 3256 OID 140424)
-- Name: address_settings Users can insert their address_settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their address_settings" ON public.address_settings FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_addresses ua
  WHERE ((ua.address_id = address_settings.address_id) AND (ua.user_id = auth.uid())))));


--
-- TOC entry 4395 (class 3256 OID 105426)
-- Name: password_resets Users can manage their password reset tokens; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their password reset tokens" ON public.password_resets USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- TOC entry 4385 (class 3256 OID 142783)
-- Name: messages Users can mark messages as read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can mark messages as read" ON public.messages FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = messages.conversation_id) AND ((c.participant_1 = auth.uid()) OR (c.participant_2 = auth.uid())))))) WITH CHECK ((is_read = true));


--
-- TOC entry 4425 (class 3256 OID 139227)
-- Name: profiles Users can read own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- TOC entry 4381 (class 3256 OID 142782)
-- Name: messages Users can send messages in their conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can send messages in their conversations" ON public.messages FOR INSERT WITH CHECK (((sender_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = messages.conversation_id) AND ((c.participant_1 = auth.uid()) OR (c.participant_2 = auth.uid())))))));


--
-- TOC entry 4428 (class 3256 OID 139229)
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- TOC entry 4444 (class 3256 OID 140425)
-- Name: address_settings Users can update their address_settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their address_settings" ON public.address_settings FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_addresses ua
  WHERE ((ua.address_id = address_settings.address_id) AND (ua.user_id = auth.uid())))));


--
-- TOC entry 4419 (class 3256 OID 139202)
-- Name: user_addresses Users can update their own address links; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own address links" ON public.user_addresses FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 4410 (class 3256 OID 139180)
-- Name: apartment_meters Users can view apartment meters for their addresses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view apartment meters for their addresses" ON public.apartment_meters FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
     JOIN public.properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = apartment_meters.property_id) AND (ua.user_id = auth.uid())))));


--
-- TOC entry 4412 (class 3256 OID 139185)
-- Name: invoices Users can view invoices for their properties; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view invoices for their properties" ON public.invoices FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
     JOIN public.properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = invoices.property_id) AND (ua.user_id = auth.uid())))));


--
-- TOC entry 4380 (class 3256 OID 142781)
-- Name: messages Users can view messages in their conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = messages.conversation_id) AND ((c.participant_1 = auth.uid()) OR (c.participant_2 = auth.uid()))))));


--
-- TOC entry 4416 (class 3256 OID 139195)
-- Name: property_meter_configs Users can view meter configs for their addresses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view meter configs for their addresses" ON public.property_meter_configs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = property_meter_configs.address_id) AND (ua.user_id = auth.uid())))));


--
-- TOC entry 4408 (class 3256 OID 139177)
-- Name: address_meters Users can view meters for their addresses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view meters for their addresses" ON public.address_meters FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_addresses ua
  WHERE ((ua.address_id = address_meters.address_id) AND (ua.user_id = auth.uid())))));


--
-- TOC entry 4378 (class 3256 OID 142779)
-- Name: conversations Users can view own conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (((auth.uid() = participant_1) OR (auth.uid() = participant_2)));


--
-- TOC entry 4414 (class 3256 OID 139190)
-- Name: properties Users can view properties for their addresses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view properties for their addresses" ON public.properties FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = properties.address_id) AND (ua.user_id = auth.uid())))));


--
-- TOC entry 4418 (class 3256 OID 139200)
-- Name: user_addresses Users can view their own address links; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own address links" ON public.user_addresses FOR SELECT USING ((user_id = auth.uid()));


--
-- TOC entry 4361 (class 0 OID 32164)
-- Dependencies: 392
-- Name: address_meters; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.address_meters ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4430 (class 3256 OID 141563)
-- Name: address_meters address_meters_manage_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY address_meters_manage_optimized ON public.address_meters USING ((EXISTS ( SELECT 1
   FROM public.user_addresses ua
  WHERE ((ua.address_id = address_meters.address_id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_addresses ua
  WHERE ((ua.address_id = address_meters.address_id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[]))))));


--
-- TOC entry 4382 (class 3256 OID 139099)
-- Name: address_meters address_meters_select_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY address_meters_select_optimized ON public.address_meters FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_addresses ua
  WHERE ((ua.address_id = address_meters.address_id) AND (ua.user_id = ( SELECT auth.uid() AS uid))))));


--
-- TOC entry 4363 (class 0 OID 32207)
-- Dependencies: 394
-- Name: address_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.address_settings ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4427 (class 3256 OID 34849)
-- Name: address_settings address_settings_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY address_settings_read ON public.address_settings FOR SELECT USING (public.has_access_to_address(address_id));


--
-- TOC entry 4358 (class 0 OID 32072)
-- Dependencies: 389
-- Name: addresses; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4442 (class 3256 OID 140381)
-- Name: addresses addresses_delete_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY addresses_delete_optimized ON public.addresses FOR DELETE USING (((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND ((u.role)::text = 'admin'::text)))) OR (EXISTS ( SELECT 1
   FROM public.user_addresses ua
  WHERE ((ua.address_id = addresses.id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = 'landlord'::text)))) OR (created_by = ( SELECT auth.uid() AS uid))));


--
-- TOC entry 4440 (class 3256 OID 139252)
-- Name: addresses addresses_insert_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY addresses_insert_optimized ON public.addresses FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));


--
-- TOC entry 4436 (class 3256 OID 139235)
-- Name: addresses addresses_select_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY addresses_select_optimized ON public.addresses FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND ((u.role)::text = 'admin'::text)))) OR (EXISTS ( SELECT 1
   FROM public.user_addresses ua
  WHERE ((ua.address_id = addresses.id) AND (ua.user_id = ( SELECT auth.uid() AS uid))))) OR (created_by = ( SELECT auth.uid() AS uid))));


--
-- TOC entry 4435 (class 3256 OID 141577)
-- Name: addresses addresses_update_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY addresses_update_optimized ON public.addresses FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND ((u.role)::text = 'admin'::text)))) OR (EXISTS ( SELECT 1
   FROM public.user_addresses ua
  WHERE ((ua.address_id = addresses.id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[]))))) OR (created_by = ( SELECT auth.uid() AS uid)))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND ((u.role)::text = 'admin'::text)))) OR (EXISTS ( SELECT 1
   FROM public.user_addresses ua
  WHERE ((ua.address_id = addresses.id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[]))))) OR (created_by = ( SELECT auth.uid() AS uid))));


--
-- TOC entry 4364 (class 0 OID 32228)
-- Dependencies: 395
-- Name: apartment_meters; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.apartment_meters ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4431 (class 3256 OID 141565)
-- Name: apartment_meters apartment_meters_manage_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY apartment_meters_manage_optimized ON public.apartment_meters USING ((EXISTS ( SELECT 1
   FROM ((public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
     JOIN public.properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = apartment_meters.property_id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
     JOIN public.properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = apartment_meters.property_id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[]))))));


--
-- TOC entry 4383 (class 3256 OID 139102)
-- Name: apartment_meters apartment_meters_select_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY apartment_meters_select_optimized ON public.apartment_meters FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
     JOIN public.properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = apartment_meters.property_id) AND (ua.user_id = ( SELECT auth.uid() AS uid))))));


--
-- TOC entry 4367 (class 0 OID 32307)
-- Dependencies: 398
-- Name: communal_expenses; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.communal_expenses ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4368 (class 0 OID 32326)
-- Dependencies: 399
-- Name: communal_expenses_new; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.communal_expenses_new ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4424 (class 3256 OID 34845)
-- Name: communal_expenses communal_expenses_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY communal_expenses_read ON public.communal_expenses FOR SELECT USING (public.has_access_to_address(address_id));


--
-- TOC entry 4362 (class 0 OID 32186)
-- Dependencies: 393
-- Name: communal_meters; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.communal_meters ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4400 (class 3256 OID 139134)
-- Name: communal_meters communal_meters_mutate_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY communal_meters_mutate_optimized ON public.communal_meters USING ((EXISTS ( SELECT 1
   FROM public.addresses a
  WHERE ((a.id = communal_meters.address_id) AND (a.created_by = ( SELECT auth.uid() AS uid)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.addresses a
  WHERE ((a.id = communal_meters.address_id) AND (a.created_by = ( SELECT auth.uid() AS uid))))));


--
-- TOC entry 4399 (class 3256 OID 139133)
-- Name: communal_meters communal_meters_select_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY communal_meters_select_optimized ON public.communal_meters FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.addresses a
  WHERE ((a.id = communal_meters.address_id) AND (a.created_by = ( SELECT auth.uid() AS uid))))));


--
-- TOC entry 4376 (class 0 OID 142707)
-- Dependencies: 423
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4355 (class 0 OID 17360)
-- Dependencies: 386
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4434 (class 3256 OID 141574)
-- Name: invoices invoices_manage_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY invoices_manage_optimized ON public.invoices USING ((EXISTS ( SELECT 1
   FROM ((public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
     JOIN public.properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = invoices.property_id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
     JOIN public.properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = invoices.property_id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[]))))));


--
-- TOC entry 4386 (class 3256 OID 139107)
-- Name: invoices invoices_select_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY invoices_select_optimized ON public.invoices FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
     JOIN public.properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = invoices.property_id) AND (ua.user_id = ( SELECT auth.uid() AS uid))))));


--
-- TOC entry 4377 (class 0 OID 142732)
-- Dependencies: 424
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4366 (class 0 OID 32289)
-- Dependencies: 397
-- Name: meter_readings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.meter_readings ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4406 (class 3256 OID 34810)
-- Name: meter_readings meter_readings_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY meter_readings_read ON public.meter_readings FOR SELECT USING (public.has_access_to_property(property_id));


--
-- TOC entry 4384 (class 3256 OID 34812)
-- Name: meter_readings meter_readings_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY meter_readings_update ON public.meter_readings FOR UPDATE USING (public.has_access_to_property(property_id)) WITH CHECK (public.has_access_to_property(property_id));


--
-- TOC entry 4407 (class 3256 OID 34811)
-- Name: meter_readings meter_readings_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY meter_readings_write ON public.meter_readings FOR INSERT WITH CHECK (public.has_access_to_property(property_id));


--
-- TOC entry 4374 (class 0 OID 106323)
-- Dependencies: 411
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4398 (class 3256 OID 139132)
-- Name: notifications notifications_insert_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notifications_insert_optimized ON public.notifications FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));


--
-- TOC entry 4396 (class 3256 OID 139130)
-- Name: notifications notifications_select_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notifications_select_optimized ON public.notifications FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- TOC entry 4397 (class 3256 OID 139131)
-- Name: notifications notifications_update_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notifications_update_optimized ON public.notifications FOR UPDATE USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- TOC entry 4370 (class 0 OID 32512)
-- Dependencies: 401
-- Name: password_resets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4375 (class 0 OID 139207)
-- Dependencies: 419
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4360 (class 0 OID 32112)
-- Dependencies: 391
-- Name: properties; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4432 (class 3256 OID 141568)
-- Name: properties properties_manage_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY properties_manage_optimized ON public.properties USING ((EXISTS ( SELECT 1
   FROM (public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = properties.address_id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = properties.address_id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[]))))));


--
-- TOC entry 4387 (class 3256 OID 139112)
-- Name: properties properties_select_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY properties_select_optimized ON public.properties FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = properties.address_id) AND (ua.user_id = ( SELECT auth.uid() AS uid))))));


--
-- TOC entry 4365 (class 0 OID 32258)
-- Dependencies: 396
-- Name: property_meter_configs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.property_meter_configs ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4433 (class 3256 OID 141571)
-- Name: property_meter_configs property_meter_configs_manage_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY property_meter_configs_manage_optimized ON public.property_meter_configs USING ((EXISTS ( SELECT 1
   FROM (public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = property_meter_configs.address_id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = property_meter_configs.address_id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[]))))));


--
-- TOC entry 4388 (class 3256 OID 139117)
-- Name: property_meter_configs property_meter_configs_select_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY property_meter_configs_select_optimized ON public.property_meter_configs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.user_addresses ua
     JOIN public.addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = property_meter_configs.address_id) AND (ua.user_id = ( SELECT auth.uid() AS uid))))));


--
-- TOC entry 4373 (class 0 OID 106296)
-- Dependencies: 410
-- Name: tenant_invitations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4405 (class 3256 OID 142786)
-- Name: tenant_invitations tenant_invitations_delete_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_invitations_delete_optimized ON public.tenant_invitations FOR DELETE USING ((invited_by = ( SELECT auth.uid() AS uid)));


--
-- TOC entry 4393 (class 3256 OID 142785)
-- Name: tenant_invitations tenant_invitations_insert_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_invitations_insert_optimized ON public.tenant_invitations FOR INSERT WITH CHECK ((invited_by = ( SELECT auth.uid() AS uid)));


--
-- TOC entry 4401 (class 3256 OID 139136)
-- Name: tenant_invitations tenant_invitations_select_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_invitations_select_optimized ON public.tenant_invitations FOR SELECT USING (((lower(email) = lower(COALESCE(( SELECT (auth.jwt() ->> 'email'::text)), ''::text))) OR (invited_by = ( SELECT auth.uid() AS uid))));


--
-- TOC entry 4402 (class 3256 OID 139137)
-- Name: tenant_invitations tenant_invitations_update_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_invitations_update_optimized ON public.tenant_invitations FOR UPDATE USING ((((status = 'pending'::text) AND (lower(email) = lower(COALESCE(( SELECT (auth.jwt() ->> 'email'::text)), ''::text)))) OR (invited_by = ( SELECT auth.uid() AS uid)))) WITH CHECK (((lower(email) = lower(COALESCE(( SELECT (auth.jwt() ->> 'email'::text)), ''::text))) OR (invited_by = ( SELECT auth.uid() AS uid))));


--
-- TOC entry 4369 (class 0 OID 32479)
-- Dependencies: 400
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4421 (class 3256 OID 34841)
-- Name: tenants tenants_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenants_read ON public.tenants FOR SELECT USING (public.has_access_to_property(property_id));


--
-- TOC entry 4423 (class 3256 OID 34843)
-- Name: tenants tenants_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenants_update ON public.tenants FOR UPDATE USING (public.has_access_to_property(property_id)) WITH CHECK (public.has_access_to_property(property_id));


--
-- TOC entry 4422 (class 3256 OID 34842)
-- Name: tenants tenants_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenants_write ON public.tenants FOR INSERT WITH CHECK (public.has_access_to_property(property_id));


--
-- TOC entry 4359 (class 0 OID 32091)
-- Dependencies: 390
-- Name: user_addresses; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4390 (class 3256 OID 139126)
-- Name: user_addresses user_addresses_delete_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_addresses_delete_optimized ON public.user_addresses FOR DELETE USING (((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND ((u.role)::text = 'admin'::text)))) OR (user_id = ( SELECT auth.uid() AS uid))));


--
-- TOC entry 4441 (class 3256 OID 139253)
-- Name: user_addresses user_addresses_insert_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_addresses_insert_optimized ON public.user_addresses FOR INSERT WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND ((u.role)::text = 'admin'::text))))));


--
-- TOC entry 4437 (class 3256 OID 139242)
-- Name: user_addresses user_addresses_select_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_addresses_select_optimized ON public.user_addresses FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND ((u.role)::text = 'admin'::text)))) OR (user_id = ( SELECT auth.uid() AS uid))));


--
-- TOC entry 4389 (class 3256 OID 139124)
-- Name: user_addresses user_addresses_update_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_addresses_update_optimized ON public.user_addresses FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND ((u.role)::text = 'admin'::text)))) OR (user_id = ( SELECT auth.uid() AS uid)))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND ((u.role)::text = 'admin'::text)))) OR (user_id = ( SELECT auth.uid() AS uid))));


--
-- TOC entry 4372 (class 0 OID 105964)
-- Dependencies: 409
-- Name: user_hidden_meter_templates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_hidden_meter_templates ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4404 (class 3256 OID 139140)
-- Name: user_hidden_meter_templates user_hidden_meter_templates_manage_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_hidden_meter_templates_manage_optimized ON public.user_hidden_meter_templates USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- TOC entry 4371 (class 0 OID 105920)
-- Dependencies: 408
-- Name: user_meter_templates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_meter_templates ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4403 (class 3256 OID 139139)
-- Name: user_meter_templates user_meter_templates_manage_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_meter_templates_manage_optimized ON public.user_meter_templates USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- TOC entry 4357 (class 0 OID 32052)
-- Dependencies: 388
-- Name: user_permissions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4356 (class 0 OID 32036)
-- Dependencies: 387
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4392 (class 3256 OID 139128)
-- Name: users users_insert_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_insert_optimized ON public.users FOR INSERT WITH CHECK ((id = ( SELECT auth.uid() AS uid)));


--
-- TOC entry 4391 (class 3256 OID 139127)
-- Name: users users_select_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_select_optimized ON public.users FOR SELECT USING ((id = ( SELECT auth.uid() AS uid)));


--
-- TOC entry 4394 (class 3256 OID 139129)
-- Name: users users_update_optimized; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_update_optimized ON public.users FOR UPDATE USING ((id = ( SELECT auth.uid() AS uid))) WITH CHECK ((id = ( SELECT auth.uid() AS uid)));


--
-- TOC entry 4455 (class 0 OID 0)
-- Dependencies: 140
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--



--
-- TOC entry 4456 (class 0 OID 0)
-- Dependencies: 438
-- Name: FUNCTION app_user_id(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4457 (class 0 OID 0)
-- Dependencies: 546
-- Name: FUNCTION app_user_role(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4458 (class 0 OID 0)
-- Dependencies: 563
-- Name: FUNCTION check_username_available(p_username text); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4459 (class 0 OID 0)
-- Dependencies: 547
-- Name: FUNCTION create_apartment_meters_from_address(p_address_id uuid); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4460 (class 0 OID 0)
-- Dependencies: 506
-- Name: FUNCTION create_apartment_meters_from_address(p_property_id uuid, p_address_id uuid); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4461 (class 0 OID 0)
-- Dependencies: 428
-- Name: FUNCTION create_apartment_meters_trigger(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4462 (class 0 OID 0)
-- Dependencies: 466
-- Name: FUNCTION create_meters_for_existing_properties(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4463 (class 0 OID 0)
-- Dependencies: 571
-- Name: FUNCTION create_missing_apartment_meters(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4464 (class 0 OID 0)
-- Dependencies: 597
-- Name: FUNCTION create_missing_property_meter_configs(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4466 (class 0 OID 0)
-- Dependencies: 632
-- Name: FUNCTION delete_user_account(target_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4467 (class 0 OID 0)
-- Dependencies: 448
-- Name: FUNCTION ensure_user_row(p_role text, p_first_name text, p_last_name text); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4468 (class 0 OID 0)
-- Dependencies: 593
-- Name: FUNCTION fill_missing_apartment_meters(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4469 (class 0 OID 0)
-- Dependencies: 559
-- Name: FUNCTION get_current_user_data(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4470 (class 0 OID 0)
-- Dependencies: 589
-- Name: FUNCTION get_user_by_google_email(p_google_email text); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4471 (class 0 OID 0)
-- Dependencies: 580
-- Name: FUNCTION get_user_by_google_email_bypass(p_google_email text); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4472 (class 0 OID 0)
-- Dependencies: 541
-- Name: FUNCTION get_user_by_username(p_username text); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4473 (class 0 OID 0)
-- Dependencies: 562
-- Name: FUNCTION get_user_with_permissions(user_email text); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4474 (class 0 OID 0)
-- Dependencies: 437
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4475 (class 0 OID 0)
-- Dependencies: 587
-- Name: FUNCTION has_access_to_address(addr_id uuid); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4476 (class 0 OID 0)
-- Dependencies: 568
-- Name: FUNCTION has_access_to_property(prop_id uuid); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4477 (class 0 OID 0)
-- Dependencies: 478
-- Name: FUNCTION is_mgr_or_admin(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4478 (class 0 OID 0)
-- Dependencies: 487
-- Name: FUNCTION is_user_active(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4479 (class 0 OID 0)
-- Dependencies: 456
-- Name: FUNCTION is_user_role(p_role text); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4480 (class 0 OID 0)
-- Dependencies: 582
-- Name: FUNCTION is_username_available(p_username text); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4481 (class 0 OID 0)
-- Dependencies: 584
-- Name: FUNCTION link_google_account(p_google_email text); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4482 (class 0 OID 0)
-- Dependencies: 462
-- Name: FUNCTION link_google_account_bypass(p_user_id uuid, p_google_email text); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4483 (class 0 OID 0)
-- Dependencies: 635
-- Name: FUNCTION link_google_account_rpc(p_google_email text); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4484 (class 0 OID 0)
-- Dependencies: 464
-- Name: FUNCTION on_address_meter_insert_create_apartment_meters(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4485 (class 0 OID 0)
-- Dependencies: 595
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4486 (class 0 OID 0)
-- Dependencies: 564
-- Name: FUNCTION set_user_id_from_auth(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4488 (class 0 OID 0)
-- Dependencies: 479
-- Name: FUNCTION set_user_password(new_password text); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4489 (class 0 OID 0)
-- Dependencies: 606
-- Name: FUNCTION sync_user_address_role(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4490 (class 0 OID 0)
-- Dependencies: 444
-- Name: FUNCTION test_function(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4491 (class 0 OID 0)
-- Dependencies: 494
-- Name: FUNCTION trg_fn_addresses_autolink(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4492 (class 0 OID 0)
-- Dependencies: 473
-- Name: FUNCTION trg_fn_addresses_set_created_by(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4493 (class 0 OID 0)
-- Dependencies: 575
-- Name: FUNCTION trg_fn_users_normalize_email(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4494 (class 0 OID 0)
-- Dependencies: 599
-- Name: FUNCTION trg_fn_users_self_provision_guard(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4495 (class 0 OID 0)
-- Dependencies: 489
-- Name: FUNCTION unlink_google_account(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4496 (class 0 OID 0)
-- Dependencies: 550
-- Name: FUNCTION unlink_google_account_bypass(p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4497 (class 0 OID 0)
-- Dependencies: 496
-- Name: FUNCTION unlink_google_account_rpc(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4498 (class 0 OID 0)
-- Dependencies: 531
-- Name: FUNCTION update_conversation_timestamp(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4499 (class 0 OID 0)
-- Dependencies: 480
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4500 (class 0 OID 0)
-- Dependencies: 392
-- Name: TABLE address_meters; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4501 (class 0 OID 0)
-- Dependencies: 394
-- Name: TABLE address_settings; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4502 (class 0 OID 0)
-- Dependencies: 389
-- Name: TABLE addresses; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4503 (class 0 OID 0)
-- Dependencies: 395
-- Name: TABLE apartment_meters; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4504 (class 0 OID 0)
-- Dependencies: 398
-- Name: TABLE communal_expenses; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4505 (class 0 OID 0)
-- Dependencies: 399
-- Name: TABLE communal_expenses_new; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4506 (class 0 OID 0)
-- Dependencies: 393
-- Name: TABLE communal_meters; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4507 (class 0 OID 0)
-- Dependencies: 423
-- Name: TABLE conversations; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4508 (class 0 OID 0)
-- Dependencies: 386
-- Name: TABLE invoices; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4509 (class 0 OID 0)
-- Dependencies: 424
-- Name: TABLE messages; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4510 (class 0 OID 0)
-- Dependencies: 397
-- Name: TABLE meter_readings; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4511 (class 0 OID 0)
-- Dependencies: 387
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4512 (class 0 OID 0)
-- Dependencies: 407
-- Name: TABLE nickname_lookup; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4513 (class 0 OID 0)
-- Dependencies: 411
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4514 (class 0 OID 0)
-- Dependencies: 401
-- Name: TABLE password_resets; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4515 (class 0 OID 0)
-- Dependencies: 419
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4516 (class 0 OID 0)
-- Dependencies: 391
-- Name: TABLE properties; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4517 (class 0 OID 0)
-- Dependencies: 396
-- Name: TABLE property_meter_configs; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4518 (class 0 OID 0)
-- Dependencies: 410
-- Name: TABLE tenant_invitations; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4519 (class 0 OID 0)
-- Dependencies: 400
-- Name: TABLE tenants; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4520 (class 0 OID 0)
-- Dependencies: 390
-- Name: TABLE user_addresses; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4521 (class 0 OID 0)
-- Dependencies: 409
-- Name: TABLE user_hidden_meter_templates; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4522 (class 0 OID 0)
-- Dependencies: 408
-- Name: TABLE user_meter_templates; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 4523 (class 0 OID 0)
-- Dependencies: 388
-- Name: TABLE user_permissions; Type: ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 2676 (class 826 OID 16488)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 2677 (class 826 OID 16489)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--



--
-- TOC entry 2675 (class 826 OID 16487)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 2679 (class 826 OID 16491)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--



--
-- TOC entry 2674 (class 826 OID 16486)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--



--
-- TOC entry 2678 (class 826 OID 16490)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--



-- Completed on 2026-01-20 20:43:45

--
-- PostgreSQL database dump complete
--


