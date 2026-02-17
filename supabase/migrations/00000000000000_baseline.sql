


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."app_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ SELECT auth.uid(); $$;


ALTER FUNCTION "public"."app_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."app_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ SELECT role FROM public.users WHERE id = auth.uid(); $$;


ALTER FUNCTION "public"."app_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_username_available"("p_username" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN public.is_username_available(p_username);
END;
$$;


ALTER FUNCTION "public"."check_username_available"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_apartment_meters_from_address"("p_address_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ BEGIN NULL; END; $$;


ALTER FUNCTION "public"."create_apartment_meters_from_address"("p_address_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_apartment_meters_from_address"("p_property_id" "uuid", "p_address_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE am RECORD;
BEGIN
  FOR am IN SELECT * FROM public.address_meters WHERE address_id=p_address_id AND is_active=true LOOP
    IF am.type='individual' THEN
      INSERT INTO public.apartment_meters (property_id,address_meter_id,name,type,unit,price_per_unit,fixed_price,distribution_method,description,requires_photo,is_active,is_custom,policy)
      VALUES (p_property_id, am.id, am.name, am.type, am.unit, am.price_per_unit, am.fixed_price, am.distribution_method, am.description, am.requires_photo, true, false, jsonb_build_object('scope','apartment','collectionMode','tenant_photo'))
      ON CONFLICT (property_id,address_meter_id) DO NOTHING;
      INSERT INTO public.property_meter_configs (property_id,meter_type,custom_name,unit,tariff,price_per_unit,fixed_price,initial_reading,initial_date,require_photo,require_serial,serial_number,provider,status,notes,is_inherited,address_id,type)
      VALUES (p_property_id,
        CASE WHEN am.name ILIKE '%vanduo%šalt%' OR am.name ILIKE '%water%cold%' THEN 'water_cold'
             WHEN am.name ILIKE '%vanduo%karšt%' OR am.name ILIKE '%water%hot%'  THEN 'water_hot'
             WHEN am.name ILIKE '%elektra%individual%' OR am.name ILIKE '%electricity%individual%' THEN 'electricity'
             WHEN am.name ILIKE '%dujos%' OR am.name ILIKE '%gas%' THEN 'gas'
             WHEN am.name ILIKE '%šildymas%' OR am.name ILIKE '%heating%' THEN 'heating'
             WHEN am.name ILIKE '%internetas%' OR am.name ILIKE '%internet%' THEN 'internet'
             WHEN am.name ILIKE '%šiukšl%' OR am.name ILIKE '%garbage%' THEN 'garbage'
             ELSE 'custom' END,
        am.name, am.unit, 'single', am.price_per_unit, COALESCE(am.fixed_price,0), 0, CURRENT_DATE, am.requires_photo, false, NULL, NULL, 'active', am.description, true, p_address_id, 'individual')
      ON CONFLICT (property_id, meter_type, custom_name) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."create_apartment_meters_from_address"("p_property_id" "uuid", "p_address_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_apartment_meters_trigger"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ BEGIN NULL; END; $$;


ALTER FUNCTION "public"."create_apartment_meters_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_meters_for_existing_properties"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ BEGIN NULL; END; $$;


ALTER FUNCTION "public"."create_meters_for_existing_properties"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_missing_apartment_meters"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ BEGIN NULL; END; $$;


ALTER FUNCTION "public"."create_missing_apartment_meters"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_missing_property_meter_configs"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ BEGIN NULL; END; $$;


ALTER FUNCTION "public"."create_missing_property_meter_configs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_account"("target_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE result json;
BEGIN
  IF auth.uid() != target_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: can only delete your own account');
  END IF;
  DELETE FROM public.profiles WHERE id = target_user_id;
  DELETE FROM public.users WHERE id = target_user_id;
  DELETE FROM public.addresses WHERE created_by = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
  RETURN json_build_object('success', true, 'message', 'Account deleted successfully');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."delete_user_account"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_user_row"("p_role" "text" DEFAULT NULL::"text", "p_first_name" "text" DEFAULT 'User'::"text", "p_last_name" "text" DEFAULT 'Name'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE v_user_id uuid := auth.uid(); v_email text; v_existing_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_email IS NULL THEN RETURN; END IF;
  SELECT id INTO v_existing_id FROM public.users WHERE email = v_email OR id = v_user_id LIMIT 1;
  IF v_existing_id IS NULL THEN
    INSERT INTO public.users (id, email, role, status, google_linked, google_email, first_name, last_name, created_at, updated_at)
    VALUES (v_user_id, v_email, p_role, 'active', true, v_email, COALESCE(NULLIF(p_first_name, ''), 'User'), COALESCE(NULLIF(p_last_name, ''), 'Name'), now(), now())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = COALESCE(public.users.role, EXCLUDED.role), google_linked = EXCLUDED.google_linked, google_email = EXCLUDED.google_email, first_name = COALESCE(NULLIF(public.users.first_name, ''), EXCLUDED.first_name), last_name = COALESCE(NULLIF(public.users.last_name, ''), EXCLUDED.last_name), updated_at = now();
  ELSE
    UPDATE public.users SET role = COALESCE(role, p_role), google_linked = true, google_email = COALESCE(google_email, v_email), first_name = COALESCE(NULLIF(first_name, ''), p_first_name, 'User'), last_name = COALESCE(NULLIF(last_name, ''), p_last_name, 'Name'), updated_at = now() WHERE id = v_user_id OR email = v_email;
  END IF;
END;
$$;


ALTER FUNCTION "public"."ensure_user_row"("p_role" "text", "p_first_name" "text", "p_last_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fill_missing_apartment_meters"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ BEGIN NULL; END; $$;


ALTER FUNCTION "public"."fill_missing_apartment_meters"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_data"() RETURNS TABLE("id" "uuid", "email" "text", "first_name" "text", "last_name" "text", "role" "text", "is_active" boolean, "email_verified" boolean, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN RETURN QUERY SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.email_verified, u.created_at FROM users u WHERE u.id = auth.uid(); END $$;


ALTER FUNCTION "public"."get_current_user_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_login_info_by_username"("lookup_username" "text") RETURNS TABLE("user_id" "uuid", "email" "text", "has_password" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN RETURN QUERY SELECT p.id as user_id, p.email, p.has_password FROM public.profiles p WHERE LOWER(p.username) = LOWER(lookup_username) LIMIT 1; END; $$;


ALTER FUNCTION "public"."get_login_info_by_username"("lookup_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_by_google_email"("p_google_email" "text") RETURNS TABLE("user_id" "uuid", "user_email" "text", "first_name" "text", "last_name" "text", "role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN RETURN QUERY SELECT u.id, u.email, u.first_name, u.last_name, u.role FROM public.users u WHERE u.google_email = p_google_email AND u.google_linked = true; END; $$;


ALTER FUNCTION "public"."get_user_by_google_email"("p_google_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_by_google_email_bypass"("p_google_email" "text") RETURNS TABLE("id" "uuid", "email" "text", "role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ BEGIN IF NOT public.is_mgr_or_admin() THEN RAISE EXCEPTION 'Access denied'; END IF; RETURN QUERY SELECT u.id, u.email, u.role FROM public.users u WHERE u.google_email = p_google_email; END; $$;


ALTER FUNCTION "public"."get_user_by_google_email_bypass"("p_google_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_by_username"("p_username" "text") RETURNS TABLE("user_id" "uuid", "email" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN QUERY SELECT p.id, p.email FROM public.profiles p WHERE LOWER(p.username) = LOWER(p_username);
END;
$$;


ALTER FUNCTION "public"."get_user_by_username"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_with_permissions"("user_email" "text") RETURNS TABLE("id" "uuid", "email" character varying, "first_name" character varying, "last_name" character varying, "phone" character varying, "role" character varying, "is_active" boolean, "last_login" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "permissions" "text"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN RETURN QUERY SELECT u.id,u.email,u.first_name,u.last_name,u.phone,u.role,u.is_active,u.last_login,u.created_at,u.updated_at, ARRAY_AGG(up.permission) FILTER (WHERE up.permission IS NOT NULL AND up.granted) FROM users u LEFT JOIN user_permissions up ON up.user_id=u.id WHERE u.email=user_email AND u.is_active=true GROUP BY u.id,u.email,u.first_name,u.last_name,u.phone,u.role,u.is_active,u.last_login,u.created_at,u.updated_at; END; $$;


ALTER FUNCTION "public"."get_user_with_permissions"("user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_invitation_accepted"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status <> 'accepted') THEN
    UPDATE properties SET
      status = 'occupied',
      tenant_name = COALESCE(NEW.full_name, NEW.email),
      email = NEW.email,
      phone = NEW.phone,
      contract_start = COALESCE(NEW.contract_start, contract_start, CURRENT_DATE),
      contract_end = COALESCE(NEW.contract_end, contract_end, (CURRENT_DATE + interval '1 year')::date),
      rent = COALESCE(NEW.rent, rent),
      deposit_amount = COALESCE(NEW.deposit, deposit_amount)
    WHERE id = NEW.property_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_invitation_accepted"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE user_first_name text; user_last_name text;
BEGIN
    user_first_name := COALESCE(NEW.raw_user_meta_data->>'given_name', NEW.raw_user_meta_data->>'first_name', 'User');
    user_last_name := COALESCE(NEW.raw_user_meta_data->>'family_name', NEW.raw_user_meta_data->>'last_name', 'Name');
    INSERT INTO public.users (id, email, first_name, last_name, role, status, google_linked, google_email, created_at, updated_at)
    VALUES (NEW.id, NEW.email, user_first_name, user_last_name, NULL, 'active', true, NEW.email, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, google_linked = true, google_email = EXCLUDED.google_email, role = COALESCE(public.users.role, EXCLUDED.role), updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_access_to_address"("addr_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN RETURN app_user_role() = 'admin' OR EXISTS (SELECT 1 FROM addresses a WHERE a.id = addr_id AND a.created_by = app_user_id()) OR EXISTS (SELECT 1 FROM user_addresses ua WHERE ua.address_id = addr_id AND ua.user_id = app_user_id()); END; $$;


ALTER FUNCTION "public"."has_access_to_address"("addr_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_access_to_property"("prop_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN RETURN app_user_role() = 'admin' OR EXISTS (SELECT 1 FROM properties p WHERE p.id = prop_id AND (p.owner_id = app_user_id() OR p.manager_id = app_user_id())) OR EXISTS (SELECT 1 FROM properties p JOIN user_addresses ua ON ua.address_id = p.address_id WHERE p.id = prop_id AND ua.user_id = app_user_id()); END; $$;


ALTER FUNCTION "public"."has_access_to_property"("prop_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_mgr_or_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ SELECT role IN ('manager', 'admin') FROM public.users WHERE id = auth.uid(); $$;


ALTER FUNCTION "public"."is_mgr_or_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_active"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ SELECT is_active = true FROM public.users WHERE id = auth.uid(); $$;


ALTER FUNCTION "public"."is_user_active"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_role"("p_role" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ SELECT role = p_role FROM public.users WHERE id = auth.uid(); $$;


ALTER FUNCTION "public"."is_user_role"("p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_username_available"("p_username" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN NOT EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(username) = LOWER(p_username));
END;
$$;


ALTER FUNCTION "public"."is_username_available"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_google_account"("p_google_email" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ DECLARE v_user_id uuid := auth.uid(); BEGIN IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF; UPDATE public.users SET google_linked = true, google_email = p_google_email, updated_at = NOW() WHERE id = v_user_id; END; $$;


ALTER FUNCTION "public"."link_google_account"("p_google_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_google_account_bypass"("p_user_id" "uuid", "p_google_email" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ BEGIN IF NOT public.is_mgr_or_admin() THEN RAISE EXCEPTION 'Access denied'; END IF; UPDATE public.users SET google_linked = true, google_email = p_google_email, updated_at = NOW() WHERE id = p_user_id; END; $$;


ALTER FUNCTION "public"."link_google_account_bypass"("p_user_id" "uuid", "p_google_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_google_account_rpc"("p_google_email" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ BEGIN PERFORM public.link_google_account(p_google_email); END; $$;


ALTER FUNCTION "public"."link_google_account_rpc"("p_google_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."on_address_meter_insert_create_apartment_meters"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ BEGIN RETURN NEW; END; $$;


ALTER FUNCTION "public"."on_address_meter_insert_create_apartment_meters"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_user_id_from_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ BEGIN NEW.user_id := auth.uid(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."set_user_id_from_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_user_address_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ BEGIN RETURN NEW; END; $$;


ALTER FUNCTION "public"."sync_user_address_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_function"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ BEGIN RETURN 'test'; END; $$;


ALTER FUNCTION "public"."test_function"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_fn_addresses_autolink"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ BEGIN IF auth.uid() IS NOT NULL THEN INSERT INTO public.user_addresses (user_id, address_id, role, role_at_address, created_at) VALUES (auth.uid(), NEW.id, 'landlord', 'landlord', NOW()) ON CONFLICT (user_id, address_id) DO NOTHING; END IF; RETURN NEW; END; $$;


ALTER FUNCTION "public"."trg_fn_addresses_autolink"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_fn_addresses_set_created_by"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ BEGIN IF NEW.created_by IS NULL AND auth.uid() IS NOT NULL THEN NEW.created_by := auth.uid(); END IF; RETURN NEW; END; $$;


ALTER FUNCTION "public"."trg_fn_addresses_set_created_by"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_fn_users_normalize_email"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ BEGIN NEW.email := LOWER(TRIM(NEW.email)); RETURN NEW; END; $$;


ALTER FUNCTION "public"."trg_fn_users_normalize_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_fn_users_self_provision_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ BEGIN IF NEW.id <> auth.uid() THEN RAISE EXCEPTION 'Users can only create their own profile'; END IF; RETURN NEW; END; $$;


ALTER FUNCTION "public"."trg_fn_users_self_provision_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unlink_google_account"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ DECLARE v_user_id uuid := auth.uid(); BEGIN IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF; UPDATE public.users SET google_linked = false, google_email = NULL, updated_at = NOW() WHERE id = v_user_id; END; $$;


ALTER FUNCTION "public"."unlink_google_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unlink_google_account_bypass"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ BEGIN IF NOT public.is_mgr_or_admin() THEN RAISE EXCEPTION 'Access denied'; END IF; UPDATE public.users SET google_linked = false, google_email = NULL, updated_at = NOW() WHERE id = p_user_id; END; $$;


ALTER FUNCTION "public"."unlink_google_account_bypass"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unlink_google_account_rpc"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ BEGIN PERFORM public.unlink_google_account(); END; $$;


ALTER FUNCTION "public"."unlink_google_account_rpc"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_dashboard_layouts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_dashboard_layouts_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_property_photos_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_property_photos_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."address_meters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "address_id" "uuid",
    "name" character varying(255) NOT NULL,
    "type" character varying(50) NOT NULL,
    "unit" character varying(20) NOT NULL,
    "price_per_unit" numeric(10,2) DEFAULT 0,
    "fixed_price" numeric(10,2) DEFAULT 0,
    "distribution_method" character varying(50) NOT NULL,
    "description" "text",
    "requires_photo" boolean DEFAULT true,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "policy" "jsonb" DEFAULT '{"scope": "building", "collectionMode": "landlord_only"}'::"jsonb",
    "collection_mode" "text" DEFAULT 'landlord_only'::"text",
    "landlord_reading_enabled" boolean DEFAULT true,
    "tenant_photo_enabled" boolean DEFAULT false,
    CONSTRAINT "address_meters_distribution_method_check" CHECK ((("distribution_method")::"text" = ANY (ARRAY[('per_apartment'::character varying)::"text", ('per_person'::character varying)::"text", ('per_area'::character varying)::"text", ('fixed_split'::character varying)::"text", ('per_consumption'::character varying)::"text"]))),
    CONSTRAINT "address_meters_type_check" CHECK ((("type")::"text" = ANY (ARRAY[('individual'::character varying)::"text", ('communal'::character varying)::"text"]))),
    CONSTRAINT "address_meters_unit_check" CHECK ((("unit")::"text" = ANY (ARRAY[('m3'::character varying)::"text", ('kWh'::character varying)::"text", ('GJ'::character varying)::"text", ('Kitas'::character varying)::"text"])))
);


ALTER TABLE "public"."address_meters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."address_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "address_id" "uuid" NOT NULL,
    "building_info" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "contact_info" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "financial_settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "notification_settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "communal_config" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."address_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_address" character varying(255) NOT NULL,
    "street" character varying(255),
    "house_number" character varying(20),
    "city" character varying(100) NOT NULL,
    "postal_code" character varying(10),
    "coordinates_lat" numeric(10,8),
    "coordinates_lng" numeric(11,8),
    "building_type" character varying(100) DEFAULT 'Butų namas'::character varying,
    "total_apartments" integer DEFAULT 1,
    "floors" integer DEFAULT 1,
    "year_built" integer,
    "management_type" character varying(50) DEFAULT 'Nuomotojas'::character varying,
    "chairman_name" character varying(255),
    "chairman_phone" character varying(50),
    "chairman_email" character varying(255),
    "company_name" character varying(255),
    "contact_person" character varying(255),
    "company_phone" character varying(50),
    "company_email" character varying(255),
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."amenities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" DEFAULT 'custom'::"text" NOT NULL,
    "is_custom" boolean DEFAULT false NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."amenities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."apartment_meters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid",
    "address_meter_id" "uuid",
    "name" character varying(255) NOT NULL,
    "type" character varying(50) NOT NULL,
    "unit" character varying(20) NOT NULL,
    "price_per_unit" numeric(10,2) DEFAULT 0,
    "fixed_price" numeric(10,2) DEFAULT 0,
    "distribution_method" character varying(50) NOT NULL,
    "description" "text",
    "requires_photo" boolean DEFAULT true,
    "is_active" boolean DEFAULT true,
    "is_custom" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "policy" "jsonb" DEFAULT '{"scope": "apartment", "collectionMode": "landlord_only"}'::"jsonb",
    "meter_name" "text",
    "meter_type" "text" DEFAULT 'individual'::"text",
    "serial_number" "text",
    "collection_mode" "text" DEFAULT 'landlord_only'::"text",
    "landlord_reading_enabled" boolean DEFAULT true,
    "tenant_photo_enabled" boolean DEFAULT false,
    CONSTRAINT "apartment_meters_distribution_method_check" CHECK ((("distribution_method")::"text" = ANY (ARRAY[('per_apartment'::character varying)::"text", ('per_person'::character varying)::"text", ('per_area'::character varying)::"text", ('fixed_split'::character varying)::"text", ('per_consumption'::character varying)::"text"]))),
    CONSTRAINT "apartment_meters_type_check" CHECK ((("type")::"text" = ANY (ARRAY[('individual'::character varying)::"text", ('communal'::character varying)::"text"]))),
    CONSTRAINT "apartment_meters_unit_check" CHECK ((("unit")::"text" = ANY (ARRAY[('m3'::character varying)::"text", ('kWh'::character varying)::"text", ('GJ'::character varying)::"text", ('Kitas'::character varying)::"text"])))
);


ALTER TABLE "public"."apartment_meters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."communal_expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "address_id" "uuid",
    "meter_id" "uuid",
    "month" character varying(7) NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "total_units" numeric(10,2),
    "distribution_amount" numeric(10,2) NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."communal_expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."communal_expenses_new" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "meter_id" "uuid" NOT NULL,
    "month" character varying(7) NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "total_units" numeric(10,2),
    "distribution_amount" numeric(10,2) NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."communal_expenses_new" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."communal_meters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "address_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "type" character varying(50) NOT NULL,
    "unit" character varying(20) NOT NULL,
    "price_per_unit" numeric(10,2) DEFAULT 0.00,
    "fixed_price" numeric(10,2) DEFAULT 0.00,
    "distribution_method" character varying(50) NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "communal_meters_distribution_method_check" CHECK ((("distribution_method")::"text" = ANY (ARRAY[('per_apartment'::character varying)::"text", ('per_person'::character varying)::"text", ('per_area'::character varying)::"text", ('fixed_split'::character varying)::"text", ('per_consumption'::character varying)::"text"]))),
    CONSTRAINT "communal_meters_type_check" CHECK ((("type")::"text" = ANY (ARRAY[('individual'::character varying)::"text", ('communal'::character varying)::"text"]))),
    CONSTRAINT "communal_meters_unit_check" CHECK ((("unit")::"text" = ANY (ARRAY[('m3'::character varying)::"text", ('kWh'::character varying)::"text", ('GJ'::character varying)::"text", ('Kitas'::character varying)::"text"])))
);


ALTER TABLE "public"."communal_meters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid",
    "participant_1" "uuid" NOT NULL,
    "participant_2" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dashboard_layouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "view" "text" DEFAULT 'overview'::"text" NOT NULL,
    "breakpoint" "text" DEFAULT 'lg'::"text" NOT NULL,
    "layout" "jsonb" NOT NULL,
    "layout_version" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dashboard_layouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "payment_method" "text",
    "paid_at" "date" DEFAULT ("timezone"('utc'::"text", "now"()))::"date" NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "invoice_payments_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "invoice_payments_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['cash'::"text", 'bank_transfer'::"text", 'card'::"text", 'check'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."invoice_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "property_id" "uuid",
    "invoice_number" "text" NOT NULL,
    "invoice_date" "date" NOT NULL,
    "due_date" "date" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "rent_amount" numeric(10,2) NOT NULL,
    "utilities_amount" numeric(10,2) DEFAULT 0,
    "other_amount" numeric(10,2) DEFAULT 0,
    "status" "text" DEFAULT 'unpaid'::"text" NOT NULL,
    "paid_date" "date",
    "payment_method" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "tenant_id" "uuid",
    "address_id" "uuid",
    "period_start" "date",
    "period_end" "date",
    "late_fee" numeric DEFAULT 0,
    "line_items" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "invoices_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['cash'::"text", 'bank_transfer'::"text", 'card'::"text", 'check'::"text"]))),
    CONSTRAINT "invoices_status_check" CHECK (("status" = ANY (ARRAY['paid'::"text", 'unpaid'::"text", 'overdue'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "message_type" "text" DEFAULT 'text'::"text" NOT NULL,
    "metadata" "jsonb",
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "messages_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'invitation_code'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meter_readings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid",
    "meter_id" "uuid",
    "meter_type" character varying(20) NOT NULL,
    "type" character varying(50) NOT NULL,
    "reading_date" "date" NOT NULL,
    "previous_reading" numeric(10,2),
    "current_reading" numeric(10,2) NOT NULL,
    "consumption" numeric(10,2) GENERATED ALWAYS AS (("current_reading" - COALESCE("previous_reading", (0)::numeric))) STORED,
    "difference" numeric(10,2) NOT NULL,
    "price_per_unit" numeric(10,2) NOT NULL,
    "total_sum" numeric(10,2) NOT NULL,
    "amount" numeric(10,2),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "meter_readings_meter_type_check" CHECK ((("meter_type")::"text" = ANY (ARRAY[('address'::character varying)::"text", ('apartment'::character varying)::"text"]))),
    CONSTRAINT "meter_readings_type_check" CHECK ((("type")::"text" = ANY (ARRAY[('electricity'::character varying)::"text", ('water'::character varying)::"text", ('heating'::character varying)::"text", ('internet'::character varying)::"text", ('garbage'::character varying)::"text", ('gas'::character varying)::"text"])))
);


ALTER TABLE "public"."meter_readings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "extensions"."citext" NOT NULL,
    "first_name" character varying(100) NOT NULL,
    "last_name" character varying(100) NOT NULL,
    "phone" character varying(20),
    "role" character varying(50),
    "is_active" boolean DEFAULT true,
    "email_verified" boolean DEFAULT false,
    "last_login" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "password_reset_token" character varying(255),
    "password_reset_expires" timestamp with time zone,
    "google_linked" boolean DEFAULT false,
    "google_email" "text",
    "nickname" "text",
    "avatar_url" "text",
    "status" "text" DEFAULT 'ACTIVE'::"text",
    "deleted_at" timestamp with time zone,
    "purge_after" timestamp with time zone,
    CONSTRAINT "users_role_check" CHECK ((("role")::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('landlord'::character varying)::"text", ('property_manager'::character varying)::"text", ('tenant'::character varying)::"text", ('maintenance'::character varying)::"text"]))),
    CONSTRAINT "users_status_check" CHECK (("status" = ANY (ARRAY['ACTIVE'::"text", 'DELETED'::"text", 'PENDING_PURGE'::"text", 'active'::"text"])))
);

ALTER TABLE ONLY "public"."users" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."nickname_lookup" WITH ("security_invoker"='true') AS
 SELECT "id",
    "nickname",
    "lower"("nickname") AS "nickname_lower"
   FROM "public"."users" "u"
  WHERE ("nickname" IS NOT NULL);


ALTER VIEW "public"."nickname_lookup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "username" "text" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "avatar_url" "text",
    "onboarding_completed" boolean DEFAULT false,
    "first_name" "text",
    "last_name" "text",
    "profile_changed_at" timestamp with time zone,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['landlord'::"text", 'tenant'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."avatar_url" IS 'URL to user profile avatar image stored in Supabase Storage';



CREATE TABLE IF NOT EXISTS "public"."properties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "address_id" "uuid",
    "address" character varying(255),
    "apartment_number" character varying(10) NOT NULL,
    "tenant_name" character varying(255) NOT NULL,
    "phone" character varying(20),
    "email" character varying(255),
    "rent" numeric(10,2) NOT NULL,
    "area" integer,
    "rooms" integer,
    "status" character varying(50) DEFAULT 'occupied'::character varying,
    "contract_start" "date" NOT NULL,
    "contract_end" "date" NOT NULL,
    "auto_renewal_enabled" boolean DEFAULT false,
    "deposit_amount" numeric(10,2) DEFAULT 0,
    "deposit_paid_amount" numeric(10,2) DEFAULT 0,
    "deposit_paid" boolean DEFAULT false,
    "deposit_returned" boolean DEFAULT false,
    "deposit_deductions" numeric(10,2) DEFAULT 0,
    "bedding_owner" character varying(50) DEFAULT 'tenant'::character varying,
    "bedding_fee_paid" boolean DEFAULT false,
    "cleaning_required" boolean DEFAULT false,
    "cleaning_cost" numeric(10,2) DEFAULT 0,
    "last_notification_sent" timestamp with time zone,
    "notification_count" integer DEFAULT 0,
    "original_contract_duration_months" integer DEFAULT 12,
    "tenant_response" character varying(50) DEFAULT 'no_response'::character varying,
    "tenant_response_date" timestamp with time zone,
    "planned_move_out_date" "date",
    "contract_status" character varying(50) DEFAULT 'active'::character varying,
    "payment_status" character varying(50) DEFAULT 'current'::character varying,
    "deposit_status" character varying(50) DEFAULT 'unpaid'::character varying,
    "notification_status" character varying(50) DEFAULT 'none'::character varying,
    "tenant_communication_status" character varying(50) DEFAULT 'responsive'::character varying,
    "owner_id" "uuid",
    "manager_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "extended_details" "jsonb" DEFAULT '{}'::"jsonb",
    "floor" integer,
    "floors_total" integer,
    "property_type" character varying(50) DEFAULT 'apartment'::character varying,
    CONSTRAINT "properties_bedding_owner_check" CHECK ((("bedding_owner")::"text" = ANY (ARRAY[('tenant'::character varying)::"text", ('landlord'::character varying)::"text"]))),
    CONSTRAINT "properties_contract_status_check" CHECK ((("contract_status")::"text" = ANY (ARRAY[('active'::character varying)::"text", ('expired'::character varying)::"text", ('terminated'::character varying)::"text", ('renewed'::character varying)::"text", ('pending_renewal'::character varying)::"text", ('maintenance'::character varying)::"text", ('vacant'::character varying)::"text"]))),
    CONSTRAINT "properties_deposit_status_check" CHECK ((("deposit_status")::"text" = ANY (ARRAY[('paid'::character varying)::"text", ('unpaid'::character varying)::"text", ('partially_paid'::character varying)::"text", ('returned'::character varying)::"text", ('deducted'::character varying)::"text"]))),
    CONSTRAINT "properties_notification_status_check" CHECK ((("notification_status")::"text" = ANY (ARRAY[('none'::character varying)::"text", ('first_sent'::character varying)::"text", ('second_sent'::character varying)::"text", ('final_sent'::character varying)::"text", ('expired'::character varying)::"text"]))),
    CONSTRAINT "properties_payment_status_check" CHECK ((("payment_status")::"text" = ANY (ARRAY[('current'::character varying)::"text", ('overdue'::character varying)::"text", ('partial'::character varying)::"text", ('paid_in_advance'::character varying)::"text"]))),
    CONSTRAINT "properties_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('occupied'::character varying)::"text", ('vacant'::character varying)::"text", ('maintenance'::character varying)::"text"]))),
    CONSTRAINT "properties_tenant_communication_status_check" CHECK ((("tenant_communication_status")::"text" = ANY (ARRAY[('responsive'::character varying)::"text", ('unresponsive'::character varying)::"text", ('no_contact'::character varying)::"text", ('disputed'::character varying)::"text"]))),
    CONSTRAINT "properties_tenant_response_check" CHECK ((("tenant_response")::"text" = ANY (ARRAY[('wants_to_renew'::character varying)::"text", ('does_not_want_to_renew'::character varying)::"text", ('no_response'::character varying)::"text"])))
);


ALTER TABLE "public"."properties" OWNER TO "postgres";


COMMENT ON COLUMN "public"."properties"."extended_details" IS 'Flexible storage for: amenities[], heating_type, energy_class, furnished, parking_type, parking_spots, balcony, storage, bathrooms, bedrooms, min_term_months, pets_allowed, pets_deposit, smoking_allowed, utilities_paid_by, payment_due_day, notes_internal';



CREATE TABLE IF NOT EXISTS "public"."property_amenities" (
    "property_id" "uuid" NOT NULL,
    "amenity_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."property_amenities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_deposit_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "balance_after" numeric(12,2),
    "notes" "text",
    "created_by" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "property_deposit_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['received'::"text", 'adjustment'::"text", 'refund'::"text"])))
);


ALTER TABLE "public"."property_deposit_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" DEFAULT 'other'::"text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" bigint,
    "mime_type" "text",
    "storage_path" "text" NOT NULL,
    "uploaded_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."property_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_meter_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid",
    "meter_type" "text" NOT NULL,
    "custom_name" "text",
    "unit" "text" NOT NULL,
    "tariff" "text" DEFAULT 'single'::"text" NOT NULL,
    "price_per_unit" numeric(8,4) NOT NULL,
    "fixed_price" numeric(8,2),
    "initial_reading" numeric(10,2),
    "initial_date" "date",
    "require_photo" boolean DEFAULT true,
    "require_serial" boolean DEFAULT false,
    "serial_number" "text",
    "provider" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "notes" "text",
    "is_inherited" boolean DEFAULT false,
    "address_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "type" character varying(50) DEFAULT 'individual'::character varying NOT NULL,
    CONSTRAINT "property_meter_configs_meter_type_check" CHECK (("meter_type" = ANY (ARRAY['electricity'::"text", 'water_cold'::"text", 'water_hot'::"text", 'gas'::"text", 'heating'::"text", 'internet'::"text", 'garbage'::"text", 'custom'::"text"]))),
    CONSTRAINT "property_meter_configs_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'maintenance'::"text"]))),
    CONSTRAINT "property_meter_configs_tariff_check" CHECK (("tariff" = ANY (ARRAY['single'::"text", 'day_night'::"text", 'peak_offpeak'::"text"]))),
    CONSTRAINT "property_meter_configs_type_check" CHECK ((("type")::"text" = ANY (ARRAY[('individual'::character varying)::"text", ('communal'::character varying)::"text"]))),
    CONSTRAINT "property_meter_configs_unit_check" CHECK (("unit" = ANY (ARRAY['m3'::"text", 'kWh'::"text", 'GJ'::"text", 'Kitas'::"text"])))
);


ALTER TABLE "public"."property_meter_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "full_url" "text" NOT NULL,
    "thumb_url" "text" NOT NULL,
    "full_width" integer,
    "full_height" integer,
    "full_bytes" integer,
    "thumb_bytes" integer,
    "mime" "text" DEFAULT 'image/webp'::"text",
    "order_index" integer DEFAULT 0,
    "blurhash" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."property_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "tenant_name" "text" NOT NULL,
    "tenant_email" "text",
    "tenant_phone" "text",
    "rent" numeric,
    "contract_start" "date",
    "contract_end" "date",
    "end_reason" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tenant_history_end_reason_check" CHECK (("end_reason" = ANY (ARRAY['expired'::"text", 'moved_out'::"text", 'evicted'::"text", 'mutual'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."tenant_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "phone" "text",
    "contract_start" "date",
    "contract_end" "date",
    "rent" numeric(12,2),
    "deposit" numeric(12,2),
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "token" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "invited_by" "uuid",
    "invited_by_email" "text",
    "property_label" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "responded_at" timestamp with time zone,
    "expires_at" timestamp with time zone DEFAULT ("timezone"('utc'::"text", "now"()) + '12:00:00'::interval),
    CONSTRAINT "tenant_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text"])))
);


ALTER TABLE "public"."tenant_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid",
    "user_id" "uuid",
    "name" character varying(255) NOT NULL,
    "phone" character varying(20),
    "email" character varying(255),
    "role" character varying(100) DEFAULT 'Nuomininkas'::character varying,
    "monthly_income" numeric(10,2),
    "contract_start" "date" NOT NULL,
    "contract_end" "date" NOT NULL,
    "lease_start" "date",
    "lease_end" "date",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "address_id" "uuid",
    "role_at_address" character varying(50) NOT NULL,
    "role" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_addresses_role_at_address_check" CHECK ((("role_at_address")::"text" = ANY (ARRAY[('landlord'::character varying)::"text", ('tenant'::character varying)::"text", ('property_manager'::character varying)::"text", ('maintenance'::character varying)::"text"]))),
    CONSTRAINT "user_addresses_role_check" CHECK ((("role")::"text" = ANY (ARRAY[('landlord'::character varying)::"text", ('tenant'::character varying)::"text", ('property_manager'::character varying)::"text", ('maintenance'::character varying)::"text"])))
);


ALTER TABLE "public"."user_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_hidden_meter_templates" (
    "user_id" "uuid" NOT NULL,
    "template_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."user_hidden_meter_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_meter_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "mode" "text" NOT NULL,
    "unit" "text" NOT NULL,
    "price_per_unit" numeric(12,4) DEFAULT 0 NOT NULL,
    "distribution_method" "text" NOT NULL,
    "requires_photo" boolean DEFAULT false NOT NULL,
    "icon" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "user_meter_templates_distribution_method_check" CHECK (("distribution_method" = ANY (ARRAY['per_apartment'::"text", 'per_area'::"text", 'per_person'::"text", 'per_consumption'::"text", 'fixed_split'::"text"]))),
    CONSTRAINT "user_meter_templates_mode_check" CHECK (("mode" = ANY (ARRAY['individual'::"text", 'communal'::"text"]))),
    CONSTRAINT "user_meter_templates_unit_check" CHECK (("unit" = ANY (ARRAY['m3'::"text", 'kWh'::"text", 'GJ'::"text", 'Kitas'::"text"])))
);


ALTER TABLE "public"."user_meter_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "permission" character varying(100) NOT NULL,
    "granted" boolean DEFAULT true,
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_permissions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."address_settings"
    ADD CONSTRAINT "address_settings_address_id_key" UNIQUE ("address_id");



ALTER TABLE ONLY "public"."address_settings"
    ADD CONSTRAINT "address_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."amenities"
    ADD CONSTRAINT "amenities_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."amenities"
    ADD CONSTRAINT "amenities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."apartment_meters"
    ADD CONSTRAINT "apartment_meters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."apartment_meters"
    ADD CONSTRAINT "apartment_meters_property_id_address_meter_id_key" UNIQUE ("property_id", "address_meter_id");



ALTER TABLE ONLY "public"."communal_expenses_new"
    ADD CONSTRAINT "communal_expenses_new_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communal_expenses"
    ADD CONSTRAINT "communal_expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."address_meters"
    ADD CONSTRAINT "communal_meters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communal_meters"
    ADD CONSTRAINT "communal_meters_pkey1" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dashboard_layouts"
    ADD CONSTRAINT "dashboard_layouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dashboard_layouts"
    ADD CONSTRAINT "dashboard_layouts_user_id_property_id_view_breakpoint_key" UNIQUE ("user_id", "property_id", "view", "breakpoint");



ALTER TABLE ONLY "public"."invoice_payments"
    ADD CONSTRAINT "invoice_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_invoice_number_key" UNIQUE ("invoice_number");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meter_readings"
    ADD CONSTRAINT "meter_readings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_amenities"
    ADD CONSTRAINT "property_amenities_pkey" PRIMARY KEY ("property_id", "amenity_id");



ALTER TABLE ONLY "public"."property_deposit_events"
    ADD CONSTRAINT "property_deposit_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_documents"
    ADD CONSTRAINT "property_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_meter_configs"
    ADD CONSTRAINT "property_meter_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_meter_configs"
    ADD CONSTRAINT "property_meter_configs_property_id_meter_type_custom_name_key" UNIQUE ("property_id", "meter_type", "custom_name");



ALTER TABLE ONLY "public"."property_photos"
    ADD CONSTRAINT "property_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_history"
    ADD CONSTRAINT "tenant_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_invitations"
    ADD CONSTRAINT "tenant_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_invitations"
    ADD CONSTRAINT "tenant_invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_addresses"
    ADD CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_addresses"
    ADD CONSTRAINT "user_addresses_user_id_address_id_key" UNIQUE ("user_id", "address_id");



ALTER TABLE ONLY "public"."user_hidden_meter_templates"
    ADD CONSTRAINT "user_hidden_meter_templates_pkey" PRIMARY KEY ("user_id", "template_id");



ALTER TABLE ONLY "public"."user_meter_templates"
    ADD CONSTRAINT "user_meter_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_address_meters_address_id" ON "public"."address_meters" USING "btree" ("address_id");



CREATE INDEX "idx_addresses_created_by" ON "public"."addresses" USING "btree" ("created_by");



CREATE INDEX "idx_amenities_category" ON "public"."amenities" USING "btree" ("category");



CREATE INDEX "idx_amenities_created_by" ON "public"."amenities" USING "btree" ("created_by");



CREATE INDEX "idx_amenities_name_search" ON "public"."amenities" USING "gin" ("name" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_apartment_meters_address_meter_id" ON "public"."apartment_meters" USING "btree" ("address_meter_id");



CREATE INDEX "idx_apartment_meters_property_id" ON "public"."apartment_meters" USING "btree" ("property_id");



CREATE INDEX "idx_communal_expenses_address_id" ON "public"."communal_expenses" USING "btree" ("address_id");



CREATE INDEX "idx_communal_expenses_meter_id" ON "public"."communal_expenses" USING "btree" ("meter_id");



CREATE INDEX "idx_communal_expenses_new_meter_id" ON "public"."communal_expenses_new" USING "btree" ("meter_id");



CREATE INDEX "idx_communal_meters_address_id" ON "public"."communal_meters" USING "btree" ("address_id");



CREATE INDEX "idx_conversations_participant_1" ON "public"."conversations" USING "btree" ("participant_1");



CREATE INDEX "idx_conversations_participant_2" ON "public"."conversations" USING "btree" ("participant_2");



CREATE INDEX "idx_conversations_property_id" ON "public"."conversations" USING "btree" ("property_id");



CREATE INDEX "idx_dashboard_layouts_property_id" ON "public"."dashboard_layouts" USING "btree" ("property_id");



CREATE INDEX "idx_dashboard_layouts_user_id" ON "public"."dashboard_layouts" USING "btree" ("user_id");



CREATE INDEX "idx_dashboard_layouts_user_property" ON "public"."dashboard_layouts" USING "btree" ("user_id", "property_id", "view");



CREATE INDEX "idx_invoice_payments_created_by" ON "public"."invoice_payments" USING "btree" ("created_by");



CREATE INDEX "idx_invoices_address_id" ON "public"."invoices" USING "btree" ("address_id");



CREATE INDEX "idx_invoices_created_by" ON "public"."invoices" USING "btree" ("created_by");



CREATE INDEX "idx_invoices_due_date" ON "public"."invoices" USING "btree" ("due_date");



CREATE INDEX "idx_invoices_property_id" ON "public"."invoices" USING "btree" ("property_id");



CREATE INDEX "idx_invoices_status" ON "public"."invoices" USING "btree" ("status");



CREATE INDEX "idx_invoices_tenant_id" ON "public"."invoices" USING "btree" ("tenant_id");



CREATE INDEX "idx_messages_conversation_id" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_messages_sender_id" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_meter_readings_meter_id" ON "public"."meter_readings" USING "btree" ("meter_id");



CREATE INDEX "idx_meter_readings_property_id" ON "public"."meter_readings" USING "btree" ("property_id");



CREATE INDEX "idx_notifications_is_read" ON "public"."notifications" USING "btree" ("is_read");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_properties_address_id" ON "public"."properties" USING "btree" ("address_id");



CREATE INDEX "idx_properties_manager_id" ON "public"."properties" USING "btree" ("manager_id");



CREATE INDEX "idx_properties_owner_id" ON "public"."properties" USING "btree" ("owner_id");



CREATE INDEX "idx_property_amenities_amenity" ON "public"."property_amenities" USING "btree" ("amenity_id");



CREATE INDEX "idx_property_amenities_property" ON "public"."property_amenities" USING "btree" ("property_id");



CREATE INDEX "idx_property_deposit_events_created_by" ON "public"."property_deposit_events" USING "btree" ("created_by");



CREATE INDEX "idx_property_documents_property_id" ON "public"."property_documents" USING "btree" ("property_id");



CREATE INDEX "idx_property_meter_configs_address_id" ON "public"."property_meter_configs" USING "btree" ("address_id");



CREATE INDEX "idx_property_meter_configs_property_id" ON "public"."property_meter_configs" USING "btree" ("property_id");



CREATE INDEX "idx_property_photos_order" ON "public"."property_photos" USING "btree" ("property_id", "order_index");



CREATE INDEX "idx_property_photos_property_id" ON "public"."property_photos" USING "btree" ("property_id");



CREATE INDEX "idx_tenant_history_contract_end" ON "public"."tenant_history" USING "btree" ("contract_end" DESC);



CREATE INDEX "idx_tenant_history_property_id" ON "public"."tenant_history" USING "btree" ("property_id");



CREATE INDEX "idx_tenant_invitations_invited_by" ON "public"."tenant_invitations" USING "btree" ("invited_by");



CREATE INDEX "idx_tenant_invitations_property_id" ON "public"."tenant_invitations" USING "btree" ("property_id");



CREATE INDEX "idx_tenant_invitations_token" ON "public"."tenant_invitations" USING "btree" ("token");



CREATE INDEX "idx_tenants_property_id" ON "public"."tenants" USING "btree" ("property_id");



CREATE INDEX "idx_tenants_user_id" ON "public"."tenants" USING "btree" ("user_id");



CREATE INDEX "idx_user_addresses_address_id" ON "public"."user_addresses" USING "btree" ("address_id");



CREATE INDEX "idx_user_addresses_user_id" ON "public"."user_addresses" USING "btree" ("user_id");



CREATE INDEX "idx_user_meter_templates_user_id" ON "public"."user_meter_templates" USING "btree" ("user_id");



CREATE INDEX "idx_user_permissions_granted_by" ON "public"."user_permissions" USING "btree" ("granted_by");



CREATE INDEX "idx_user_permissions_user_id" ON "public"."user_permissions" USING "btree" ("user_id");



CREATE INDEX "idx_users_purge_after" ON "public"."users" USING "btree" ("purge_after") WHERE ("purge_after" IS NOT NULL);



CREATE INDEX "idx_users_status" ON "public"."users" USING "btree" ("status");



CREATE INDEX "invoice_payments_invoice_idx" ON "public"."invoice_payments" USING "btree" ("invoice_id");



CREATE INDEX "invoice_payments_paid_at_idx" ON "public"."invoice_payments" USING "btree" ("paid_at" DESC);



CREATE UNIQUE INDEX "profiles_username_lower_idx" ON "public"."profiles" USING "btree" ("lower"("username"));



CREATE INDEX "property_deposit_events_property_idx" ON "public"."property_deposit_events" USING "btree" ("property_id", "created_at" DESC);



CREATE INDEX "tenant_invitations_email_idx" ON "public"."tenant_invitations" USING "btree" ("lower"("email"));



CREATE OR REPLACE TRIGGER "addresses_autolink_trigger" AFTER INSERT ON "public"."addresses" FOR EACH ROW EXECUTE FUNCTION "public"."trg_fn_addresses_autolink"();



CREATE OR REPLACE TRIGGER "addresses_set_created_by_trigger" BEFORE INSERT ON "public"."addresses" FOR EACH ROW EXECUTE FUNCTION "public"."trg_fn_addresses_set_created_by"();



CREATE OR REPLACE TRIGGER "dashboard_layouts_updated_at" BEFORE UPDATE ON "public"."dashboard_layouts" FOR EACH ROW EXECUTE FUNCTION "public"."update_dashboard_layouts_updated_at"();



CREATE OR REPLACE TRIGGER "on_invitation_accepted" AFTER UPDATE ON "public"."tenant_invitations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_invitation_accepted"();



CREATE OR REPLACE TRIGGER "on_new_message" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_timestamp"();



CREATE OR REPLACE TRIGGER "property_photos_updated_at" BEFORE UPDATE ON "public"."property_photos" FOR EACH ROW EXECUTE FUNCTION "public"."update_property_photos_updated_at"();



CREATE OR REPLACE TRIGGER "update_addresses_updated_at" BEFORE UPDATE ON "public"."addresses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "update_conversations_timestamp" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_timestamp"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."address_meters"
    ADD CONSTRAINT "address_meters_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."address_settings"
    ADD CONSTRAINT "address_settings_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."amenities"
    ADD CONSTRAINT "amenities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."apartment_meters"
    ADD CONSTRAINT "apartment_meters_address_meter_id_fkey" FOREIGN KEY ("address_meter_id") REFERENCES "public"."address_meters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."apartment_meters"
    ADD CONSTRAINT "apartment_meters_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communal_expenses"
    ADD CONSTRAINT "communal_expenses_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communal_expenses"
    ADD CONSTRAINT "communal_expenses_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "public"."address_meters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communal_expenses_new"
    ADD CONSTRAINT "communal_expenses_new_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "public"."communal_meters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communal_meters"
    ADD CONSTRAINT "communal_meters_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_participant_1_fkey" FOREIGN KEY ("participant_1") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_participant_2_fkey" FOREIGN KEY ("participant_2") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dashboard_layouts"
    ADD CONSTRAINT "dashboard_layouts_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dashboard_layouts"
    ADD CONSTRAINT "dashboard_layouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_payments"
    ADD CONSTRAINT "invoice_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."invoice_payments"
    ADD CONSTRAINT "invoice_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meter_readings"
    ADD CONSTRAINT "meter_readings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."property_amenities"
    ADD CONSTRAINT "property_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "public"."amenities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_amenities"
    ADD CONSTRAINT "property_amenities_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_deposit_events"
    ADD CONSTRAINT "property_deposit_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."property_deposit_events"
    ADD CONSTRAINT "property_deposit_events_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_documents"
    ADD CONSTRAINT "property_documents_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_documents"
    ADD CONSTRAINT "property_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."property_meter_configs"
    ADD CONSTRAINT "property_meter_configs_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id");



ALTER TABLE ONLY "public"."property_meter_configs"
    ADD CONSTRAINT "property_meter_configs_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_photos"
    ADD CONSTRAINT "property_photos_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_history"
    ADD CONSTRAINT "tenant_history_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_invitations"
    ADD CONSTRAINT "tenant_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tenant_invitations"
    ADD CONSTRAINT "tenant_invitations_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_addresses"
    ADD CONSTRAINT "user_addresses_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_addresses"
    ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_hidden_meter_templates"
    ADD CONSTRAINT "user_hidden_meter_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_meter_templates"
    ADD CONSTRAINT "user_meter_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Landlord can delete tenant history" ON "public"."tenant_history" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."properties" "p"
  WHERE (("p"."id" = "tenant_history"."property_id") AND ("p"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Landlord can insert tenant history" ON "public"."tenant_history" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."properties" "p"
  WHERE (("p"."id" = "tenant_history"."property_id") AND ("p"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Landlord can update tenant history" ON "public"."tenant_history" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."properties" "p"
  WHERE (("p"."id" = "tenant_history"."property_id") AND ("p"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Landlord can view tenant history" ON "public"."tenant_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."properties" "p"
  WHERE (("p"."id" = "tenant_history"."property_id") AND ("p"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Public can lookup username for auth" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can delete own user" ON "public"."users" FOR DELETE TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."address_meters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "address_meters_manage_optimized" ON "public"."address_meters" USING ((EXISTS ( SELECT 1
   FROM "public"."user_addresses" "ua"
  WHERE (("ua"."address_id" = "address_meters"."address_id") AND ("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("ua"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::"text"[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_addresses" "ua"
  WHERE (("ua"."address_id" = "address_meters"."address_id") AND ("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("ua"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::"text"[]))))));



ALTER TABLE "public"."address_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "address_settings_insert" ON "public"."address_settings" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_addresses" "ua"
  WHERE (("ua"."address_id" = "address_settings"."address_id") AND ("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "address_settings_read" ON "public"."address_settings" FOR SELECT USING ("public"."has_access_to_address"("address_id"));



CREATE POLICY "address_settings_update" ON "public"."address_settings" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_addresses" "ua"
  WHERE (("ua"."address_id" = "address_settings"."address_id") AND ("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."addresses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "addresses_delete_optimized" ON "public"."addresses" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("u"."role")::"text" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."user_addresses" "ua"
  WHERE (("ua"."address_id" = "addresses"."id") AND ("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("ua"."role")::"text" = 'owner'::"text")))) OR (("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."user_addresses" "ua"
  WHERE (("ua"."address_id" = "addresses"."id") AND (("ua"."role")::"text" = 'owner'::"text"))))))));



CREATE POLICY "addresses_insert_optimized" ON "public"."addresses" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "addresses_select_optimized" ON "public"."addresses" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("u"."role")::"text" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."user_addresses" "ua"
  WHERE (("ua"."address_id" = "addresses"."id") AND ("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "addresses_update_optimized" ON "public"."addresses" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("u"."role")::"text" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."user_addresses" "ua"
  WHERE (("ua"."address_id" = "addresses"."id") AND ("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("ua"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::"text"[]))))) OR ("created_by" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("u"."role")::"text" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."user_addresses" "ua"
  WHERE (("ua"."address_id" = "addresses"."id") AND ("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("ua"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::"text"[]))))) OR ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."amenities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "amenities_insert" ON "public"."amenities" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ("is_custom" = true) AND ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "amenities_select" ON "public"."amenities" FOR SELECT USING (true);



ALTER TABLE "public"."apartment_meters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "apartment_meters_manage_optimized" ON "public"."apartment_meters" USING ((EXISTS ( SELECT 1
   FROM (("public"."user_addresses" "ua"
     JOIN "public"."addresses" "a" ON (("a"."id" = "ua"."address_id")))
     JOIN "public"."properties" "p" ON (("p"."address_id" = "a"."id")))
  WHERE (("p"."id" = "apartment_meters"."property_id") AND ("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("ua"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::"text"[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."user_addresses" "ua"
     JOIN "public"."addresses" "a" ON (("a"."id" = "ua"."address_id")))
     JOIN "public"."properties" "p" ON (("p"."address_id" = "a"."id")))
  WHERE (("p"."id" = "apartment_meters"."property_id") AND ("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("ua"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::"text"[]))))));



ALTER TABLE "public"."communal_expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."communal_expenses_new" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "communal_expenses_new_manage" ON "public"."communal_expenses_new" USING ((EXISTS ( SELECT 1
   FROM ("public"."communal_meters" "cm"
     JOIN "public"."addresses" "a" ON (("a"."id" = "cm"."address_id")))
  WHERE (("cm"."id" = "communal_expenses_new"."meter_id") AND ("a"."created_by" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."communal_meters" "cm"
     JOIN "public"."addresses" "a" ON (("a"."id" = "cm"."address_id")))
  WHERE (("cm"."id" = "communal_expenses_new"."meter_id") AND ("a"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "communal_expenses_read" ON "public"."communal_expenses" FOR SELECT USING ("public"."has_access_to_address"("address_id"));



ALTER TABLE "public"."communal_meters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "communal_meters_mutate_optimized" ON "public"."communal_meters" USING ((EXISTS ( SELECT 1
   FROM "public"."addresses" "a"
  WHERE (("a"."id" = "communal_meters"."address_id") AND ("a"."created_by" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."addresses" "a"
  WHERE (("a"."id" = "communal_meters"."address_id") AND ("a"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversations_insert" ON "public"."conversations" FOR INSERT WITH CHECK ((("participant_1" = ( SELECT "auth"."uid"() AS "uid")) OR ("participant_2" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "conversations_select" ON "public"."conversations" FOR SELECT USING ((("participant_1" = ( SELECT "auth"."uid"() AS "uid")) OR ("participant_2" = ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."dashboard_layouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dashboard_layouts_delete" ON "public"."dashboard_layouts" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "dashboard_layouts_insert" ON "public"."dashboard_layouts" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "dashboard_layouts_select" ON "public"."dashboard_layouts" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "dashboard_layouts_update" ON "public"."dashboard_layouts" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "deposit_events_manage" ON "public"."property_deposit_events" USING (("created_by" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("created_by" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."invoice_payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoice_payments_manage" ON "public"."invoice_payments" USING (("created_by" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("created_by" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoices_manage_optimized" ON "public"."invoices" USING ((EXISTS ( SELECT 1
   FROM (("public"."user_addresses" "ua"
     JOIN "public"."addresses" "a" ON (("a"."id" = "ua"."address_id")))
     JOIN "public"."properties" "p" ON (("p"."address_id" = "a"."id")))
  WHERE (("p"."id" = "invoices"."property_id") AND ("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("ua"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::"text"[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."user_addresses" "ua"
     JOIN "public"."addresses" "a" ON (("a"."id" = "ua"."address_id")))
     JOIN "public"."properties" "p" ON (("p"."address_id" = "a"."id")))
  WHERE (("p"."id" = "invoices"."property_id") AND ("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("ua"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::"text"[]))))));



CREATE POLICY "landlord_manage_documents" ON "public"."property_documents" USING ((EXISTS ( SELECT 1
   FROM ("public"."properties" "p"
     JOIN "public"."user_addresses" "ua" ON (("ua"."address_id" = "p"."address_id")))
  WHERE (("p"."id" = "property_documents"."property_id") AND ("ua"."user_id" = "auth"."uid"())))));



CREATE POLICY "landlords_manage_payments" ON "public"."invoice_payments" USING (("invoice_id" IN ( SELECT "i"."id"
   FROM ((("public"."invoices" "i"
     JOIN "public"."properties" "p" ON (("p"."id" = "i"."property_id")))
     JOIN "public"."addresses" "a" ON (("a"."id" = "p"."address_id")))
     JOIN "public"."user_addresses" "ua" ON (("ua"."address_id" = "a"."id")))
  WHERE (("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("ua"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::"text"[])))))) WITH CHECK (("invoice_id" IN ( SELECT "i"."id"
   FROM ((("public"."invoices" "i"
     JOIN "public"."properties" "p" ON (("p"."id" = "i"."property_id")))
     JOIN "public"."addresses" "a" ON (("a"."id" = "p"."address_id")))
     JOIN "public"."user_addresses" "ua" ON (("ua"."address_id" = "a"."id")))
  WHERE (("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("ua"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::"text"[]))))));



ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_insert" ON "public"."messages" FOR INSERT WITH CHECK ((("sender_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND (("c"."participant_1" = ( SELECT "auth"."uid"() AS "uid")) OR ("c"."participant_2" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "messages_select" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND (("c"."participant_1" = ( SELECT "auth"."uid"() AS "uid")) OR ("c"."participant_2" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "messages_update" ON "public"."messages" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND (("c"."participant_1" = ( SELECT "auth"."uid"() AS "uid")) OR ("c"."participant_2" = ( SELECT "auth"."uid"() AS "uid"))))))) WITH CHECK (("is_read" = true));



ALTER TABLE "public"."meter_readings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "meter_readings_read" ON "public"."meter_readings" FOR SELECT USING ("public"."has_access_to_property"("property_id"));



CREATE POLICY "meter_readings_update" ON "public"."meter_readings" FOR UPDATE USING ("public"."has_access_to_property"("property_id")) WITH CHECK ("public"."has_access_to_property"("property_id"));



CREATE POLICY "meter_readings_write" ON "public"."meter_readings" FOR INSERT WITH CHECK ("public"."has_access_to_property"("property_id"));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_insert_optimized" ON "public"."notifications" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "notifications_select_optimized" ON "public"."notifications" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "notifications_update_optimized" ON "public"."notifications" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_delete" ON "public"."profiles" FOR DELETE TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "profiles_insert" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "profiles_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."properties" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "properties_manage_optimized" ON "public"."properties" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_addresses" "ua"
     JOIN "public"."addresses" "a" ON (("a"."id" = "ua"."address_id")))
  WHERE (("a"."id" = "properties"."address_id") AND ("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("ua"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::"text"[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_addresses" "ua"
     JOIN "public"."addresses" "a" ON (("a"."id" = "ua"."address_id")))
  WHERE (("a"."id" = "properties"."address_id") AND ("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("ua"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::"text"[]))))));



ALTER TABLE "public"."property_amenities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "property_amenities_delete" ON "public"."property_amenities" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."properties" "p"
  WHERE (("p"."id" = "property_amenities"."property_id") AND (("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
           FROM "public"."user_addresses" "ua"
          WHERE (("ua"."address_id" = "p"."address_id") AND ("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("ua"."role")::"text" = 'landlord'::"text")))))))));



CREATE POLICY "property_amenities_insert" ON "public"."property_amenities" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."properties" "p"
  WHERE (("p"."id" = "property_amenities"."property_id") AND (("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
           FROM "public"."user_addresses" "ua"
          WHERE (("ua"."address_id" = "p"."address_id") AND ("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("ua"."role")::"text" = 'landlord'::"text")))))))));



CREATE POLICY "property_amenities_select" ON "public"."property_amenities" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."properties" "p"
  WHERE (("p"."id" = "property_amenities"."property_id") AND (("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
           FROM "public"."user_addresses" "ua"
          WHERE (("ua"."address_id" = "p"."address_id") AND ("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))))));



ALTER TABLE "public"."property_deposit_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."property_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."property_meter_configs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "property_meter_configs_manage_optimized" ON "public"."property_meter_configs" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_addresses" "ua"
     JOIN "public"."addresses" "a" ON (("a"."id" = "ua"."address_id")))
  WHERE (("a"."id" = "property_meter_configs"."address_id") AND ("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("ua"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::"text"[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_addresses" "ua"
     JOIN "public"."addresses" "a" ON (("a"."id" = "ua"."address_id")))
  WHERE (("a"."id" = "property_meter_configs"."address_id") AND ("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("ua"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::"text"[]))))));



ALTER TABLE "public"."property_photos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "property_photos_delete" ON "public"."property_photos" FOR DELETE USING (("property_id" IN ( SELECT "p"."id"
   FROM (("public"."properties" "p"
     JOIN "public"."addresses" "a" ON (("p"."address_id" = "a"."id")))
     JOIN "public"."user_addresses" "ua" ON (("ua"."address_id" = "a"."id")))
  WHERE (("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("ua"."role")::"text" = 'landlord'::"text")))));



CREATE POLICY "property_photos_insert" ON "public"."property_photos" FOR INSERT WITH CHECK (("property_id" IN ( SELECT "p"."id"
   FROM (("public"."properties" "p"
     JOIN "public"."addresses" "a" ON (("p"."address_id" = "a"."id")))
     JOIN "public"."user_addresses" "ua" ON (("ua"."address_id" = "a"."id")))
  WHERE (("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("ua"."role")::"text" = 'landlord'::"text")))));



CREATE POLICY "property_photos_select" ON "public"."property_photos" FOR SELECT USING (("property_id" IN ( SELECT "p"."id"
   FROM (("public"."properties" "p"
     JOIN "public"."addresses" "a" ON (("p"."address_id" = "a"."id")))
     JOIN "public"."user_addresses" "ua" ON (("ua"."address_id" = "a"."id")))
  WHERE ("ua"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."tenant_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_invitations_delete_optimized" ON "public"."tenant_invitations" FOR DELETE USING (("invited_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "tenant_invitations_insert_optimized" ON "public"."tenant_invitations" FOR INSERT WITH CHECK (("invited_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "tenant_invitations_select_optimized" ON "public"."tenant_invitations" FOR SELECT USING ((("lower"("email") = "lower"(( SELECT "auth"."email"() AS "email"))) OR ("invited_by" = ( SELECT "auth"."uid"() AS "uid")) OR (("status" = 'pending'::"text") AND (( SELECT "auth"."uid"() AS "uid") IS NOT NULL))));



CREATE POLICY "tenant_invitations_update_optimized" ON "public"."tenant_invitations" FOR UPDATE USING (((("status" = 'pending'::"text") AND (( SELECT "auth"."uid"() AS "uid") IS NOT NULL)) OR ("invited_by" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK ((("lower"("email") = "lower"(( SELECT "auth"."email"() AS "email"))) OR ("invited_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "tenant_view_documents" ON "public"."property_documents" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."tenants" "t"
  WHERE (("t"."property_id" = "property_documents"."property_id") AND ("t"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenants_read" ON "public"."tenants" FOR SELECT USING ("public"."has_access_to_property"("property_id"));



CREATE POLICY "tenants_update" ON "public"."tenants" FOR UPDATE USING ("public"."has_access_to_property"("property_id")) WITH CHECK ("public"."has_access_to_property"("property_id"));



CREATE POLICY "tenants_view_own_invoices" ON "public"."invoices" FOR SELECT USING (("tenant_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "tenants_view_own_payments" ON "public"."invoice_payments" FOR SELECT USING (("invoice_id" IN ( SELECT "invoices"."id"
   FROM "public"."invoices"
  WHERE ("invoices"."tenant_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "tenants_write" ON "public"."tenants" FOR INSERT WITH CHECK ("public"."has_access_to_property"("property_id"));



ALTER TABLE "public"."user_addresses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_addresses_delete_optimized" ON "public"."user_addresses" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("u"."role")::"text" = 'admin'::"text")))) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "user_addresses_insert_optimized" ON "public"."user_addresses" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("u"."role")::"text" = 'admin'::"text"))))));



CREATE POLICY "user_addresses_select_optimized" ON "public"."user_addresses" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("u"."role")::"text" = 'admin'::"text")))) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "user_addresses_update_optimized" ON "public"."user_addresses" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("u"."role")::"text" = 'admin'::"text")))) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("u"."role")::"text" = 'admin'::"text")))) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."user_hidden_meter_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_hidden_meter_templates_manage_optimized" ON "public"."user_hidden_meter_templates" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."user_meter_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_meter_templates_manage_optimized" ON "public"."user_meter_templates" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."user_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_permissions_manage" ON "public"."user_permissions" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("granted_by" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK (("granted_by" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_insert_optimized" ON "public"."users" FOR INSERT WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "users_select_optimized" ON "public"."users" FOR SELECT USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "users_update_optimized" ON "public"."users" FOR UPDATE USING (("id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





























































































































































































































































































































































































GRANT ALL ON FUNCTION "public"."app_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."app_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."app_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."app_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."app_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."app_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_username_available"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_username_available"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_username_available"("p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_apartment_meters_from_address"("p_address_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_apartment_meters_from_address"("p_address_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_apartment_meters_from_address"("p_address_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_apartment_meters_from_address"("p_property_id" "uuid", "p_address_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_apartment_meters_from_address"("p_property_id" "uuid", "p_address_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_apartment_meters_from_address"("p_property_id" "uuid", "p_address_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_apartment_meters_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_apartment_meters_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_apartment_meters_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_meters_for_existing_properties"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_meters_for_existing_properties"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_meters_for_existing_properties"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_missing_apartment_meters"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_missing_apartment_meters"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_missing_apartment_meters"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_missing_property_meter_configs"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_missing_property_meter_configs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_missing_property_meter_configs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_account"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_account"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_account"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_user_row"("p_role" "text", "p_first_name" "text", "p_last_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_user_row"("p_role" "text", "p_first_name" "text", "p_last_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_user_row"("p_role" "text", "p_first_name" "text", "p_last_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fill_missing_apartment_meters"() TO "anon";
GRANT ALL ON FUNCTION "public"."fill_missing_apartment_meters"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fill_missing_apartment_meters"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_login_info_by_username"("lookup_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_login_info_by_username"("lookup_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_login_info_by_username"("lookup_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_by_google_email"("p_google_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_by_google_email"("p_google_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_by_google_email"("p_google_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_by_google_email_bypass"("p_google_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_by_google_email_bypass"("p_google_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_by_google_email_bypass"("p_google_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_by_username"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_by_username"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_by_username"("p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_with_permissions"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_with_permissions"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_with_permissions"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_invitation_accepted"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_invitation_accepted"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_invitation_accepted"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_access_to_address"("addr_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_access_to_address"("addr_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_access_to_address"("addr_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_access_to_property"("prop_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_access_to_property"("prop_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_access_to_property"("prop_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_mgr_or_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_mgr_or_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_mgr_or_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_active"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_active"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_active"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_role"("p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_role"("p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_role"("p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_username_available"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_username_available"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_username_available"("p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."link_google_account"("p_google_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."link_google_account"("p_google_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_google_account"("p_google_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."link_google_account_bypass"("p_user_id" "uuid", "p_google_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."link_google_account_bypass"("p_user_id" "uuid", "p_google_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_google_account_bypass"("p_user_id" "uuid", "p_google_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."link_google_account_rpc"("p_google_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."link_google_account_rpc"("p_google_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_google_account_rpc"("p_google_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."on_address_meter_insert_create_apartment_meters"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_address_meter_insert_create_apartment_meters"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_address_meter_insert_create_apartment_meters"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_user_id_from_auth"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_user_id_from_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_user_id_from_auth"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_address_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_address_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_address_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_function"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_function"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_function"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_fn_addresses_autolink"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_fn_addresses_autolink"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_fn_addresses_autolink"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_fn_addresses_set_created_by"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_fn_addresses_set_created_by"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_fn_addresses_set_created_by"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_fn_users_normalize_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_fn_users_normalize_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_fn_users_normalize_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_fn_users_self_provision_guard"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_fn_users_self_provision_guard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_fn_users_self_provision_guard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unlink_google_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."unlink_google_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."unlink_google_account"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unlink_google_account_bypass"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."unlink_google_account_bypass"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unlink_google_account_bypass"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."unlink_google_account_rpc"() TO "anon";
GRANT ALL ON FUNCTION "public"."unlink_google_account_rpc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."unlink_google_account_rpc"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_dashboard_layouts_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_dashboard_layouts_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_dashboard_layouts_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_property_photos_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_property_photos_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_property_photos_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
























GRANT ALL ON TABLE "public"."address_meters" TO "anon";
GRANT ALL ON TABLE "public"."address_meters" TO "authenticated";
GRANT ALL ON TABLE "public"."address_meters" TO "service_role";



GRANT ALL ON TABLE "public"."address_settings" TO "anon";
GRANT ALL ON TABLE "public"."address_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."address_settings" TO "service_role";



GRANT ALL ON TABLE "public"."addresses" TO "anon";
GRANT ALL ON TABLE "public"."addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."addresses" TO "service_role";



GRANT ALL ON TABLE "public"."amenities" TO "anon";
GRANT ALL ON TABLE "public"."amenities" TO "authenticated";
GRANT ALL ON TABLE "public"."amenities" TO "service_role";



GRANT ALL ON TABLE "public"."apartment_meters" TO "anon";
GRANT ALL ON TABLE "public"."apartment_meters" TO "authenticated";
GRANT ALL ON TABLE "public"."apartment_meters" TO "service_role";



GRANT ALL ON TABLE "public"."communal_expenses" TO "anon";
GRANT ALL ON TABLE "public"."communal_expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."communal_expenses" TO "service_role";



GRANT ALL ON TABLE "public"."communal_expenses_new" TO "anon";
GRANT ALL ON TABLE "public"."communal_expenses_new" TO "authenticated";
GRANT ALL ON TABLE "public"."communal_expenses_new" TO "service_role";



GRANT ALL ON TABLE "public"."communal_meters" TO "anon";
GRANT ALL ON TABLE "public"."communal_meters" TO "authenticated";
GRANT ALL ON TABLE "public"."communal_meters" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_layouts" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_layouts" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_layouts" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_payments" TO "anon";
GRANT ALL ON TABLE "public"."invoice_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_payments" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."meter_readings" TO "anon";
GRANT ALL ON TABLE "public"."meter_readings" TO "authenticated";
GRANT ALL ON TABLE "public"."meter_readings" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."nickname_lookup" TO "anon";
GRANT ALL ON TABLE "public"."nickname_lookup" TO "authenticated";
GRANT ALL ON TABLE "public"."nickname_lookup" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."properties" TO "anon";
GRANT ALL ON TABLE "public"."properties" TO "authenticated";
GRANT ALL ON TABLE "public"."properties" TO "service_role";



GRANT ALL ON TABLE "public"."property_amenities" TO "anon";
GRANT ALL ON TABLE "public"."property_amenities" TO "authenticated";
GRANT ALL ON TABLE "public"."property_amenities" TO "service_role";



GRANT ALL ON TABLE "public"."property_deposit_events" TO "anon";
GRANT ALL ON TABLE "public"."property_deposit_events" TO "authenticated";
GRANT ALL ON TABLE "public"."property_deposit_events" TO "service_role";



GRANT ALL ON TABLE "public"."property_documents" TO "anon";
GRANT ALL ON TABLE "public"."property_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."property_documents" TO "service_role";



GRANT ALL ON TABLE "public"."property_meter_configs" TO "anon";
GRANT ALL ON TABLE "public"."property_meter_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."property_meter_configs" TO "service_role";



GRANT ALL ON TABLE "public"."property_photos" TO "anon";
GRANT ALL ON TABLE "public"."property_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."property_photos" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_history" TO "anon";
GRANT ALL ON TABLE "public"."tenant_history" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_history" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_invitations" TO "anon";
GRANT ALL ON TABLE "public"."tenant_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



GRANT ALL ON TABLE "public"."user_addresses" TO "anon";
GRANT ALL ON TABLE "public"."user_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."user_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."user_hidden_meter_templates" TO "anon";
GRANT ALL ON TABLE "public"."user_hidden_meter_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."user_hidden_meter_templates" TO "service_role";



GRANT ALL ON TABLE "public"."user_meter_templates" TO "anon";
GRANT ALL ON TABLE "public"."user_meter_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."user_meter_templates" TO "service_role";



GRANT ALL ON TABLE "public"."user_permissions" TO "anon";
GRANT ALL ON TABLE "public"."user_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_permissions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































