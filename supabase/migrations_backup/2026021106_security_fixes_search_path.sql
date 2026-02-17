-- Security fixes: set search_path on all public functions
-- This prevents search_path injection attacks (Supabase security advisor recommendation)

-- Functions that need search_path="" (empty = most secure)
ALTER FUNCTION app_user_id() SET search_path = '';
ALTER FUNCTION app_user_role() SET search_path = '';
ALTER FUNCTION check_username_available(text) SET search_path = '';
ALTER FUNCTION create_apartment_meters_from_address(uuid) SET search_path = '';
ALTER FUNCTION create_apartment_meters_from_address(uuid, uuid) SET search_path = '';
ALTER FUNCTION create_apartment_meters_trigger() SET search_path = '';
ALTER FUNCTION create_meters_for_existing_properties() SET search_path = '';
ALTER FUNCTION create_missing_apartment_meters() SET search_path = '';
ALTER FUNCTION create_missing_property_meter_configs() SET search_path = '';
ALTER FUNCTION ensure_user_row(text, text, text) SET search_path = '';
ALTER FUNCTION fill_missing_apartment_meters() SET search_path = '';
ALTER FUNCTION get_user_by_google_email_bypass(text) SET search_path = '';
ALTER FUNCTION get_user_by_username(text) SET search_path = '';
ALTER FUNCTION is_mgr_or_admin() SET search_path = '';
ALTER FUNCTION is_user_active() SET search_path = '';
ALTER FUNCTION is_user_role(text) SET search_path = '';
ALTER FUNCTION is_username_available(text) SET search_path = '';
ALTER FUNCTION link_google_account(text) SET search_path = '';
ALTER FUNCTION link_google_account_bypass(uuid, text) SET search_path = '';
ALTER FUNCTION link_google_account_rpc(text) SET search_path = '';
ALTER FUNCTION on_address_meter_insert_create_apartment_meters() SET search_path = '';
ALTER FUNCTION set_updated_at() SET search_path = '';
ALTER FUNCTION set_user_id_from_auth() SET search_path = '';
ALTER FUNCTION sync_user_address_role() SET search_path = '';
ALTER FUNCTION test_function() SET search_path = '';
ALTER FUNCTION trg_fn_addresses_autolink() SET search_path = '';
ALTER FUNCTION trg_fn_addresses_set_created_by() SET search_path = '';
ALTER FUNCTION trg_fn_users_normalize_email() SET search_path = '';
ALTER FUNCTION trg_fn_users_self_provision_guard() SET search_path = '';
ALTER FUNCTION unlink_google_account() SET search_path = '';
ALTER FUNCTION unlink_google_account_bypass(uuid) SET search_path = '';
ALTER FUNCTION unlink_google_account_rpc() SET search_path = '';
ALTER FUNCTION update_conversation_timestamp() SET search_path = '';
ALTER FUNCTION update_dashboard_layouts_updated_at() SET search_path = '';
ALTER FUNCTION update_property_photos_updated_at() SET search_path = '';
ALTER FUNCTION update_updated_at_column() SET search_path = '';

-- Functions that need search_path=public (use public schema objects)
ALTER FUNCTION delete_user_account(uuid) SET search_path = 'public';
ALTER FUNCTION get_current_user_data() SET search_path = 'public';
ALTER FUNCTION get_login_info_by_username(text) SET search_path = 'public';
ALTER FUNCTION get_user_by_google_email(text) SET search_path = 'public';
ALTER FUNCTION get_user_with_permissions(text) SET search_path = 'public';
ALTER FUNCTION handle_new_user() SET search_path = 'public';
ALTER FUNCTION has_access_to_address(uuid) SET search_path = 'public';
ALTER FUNCTION has_access_to_property(uuid) SET search_path = 'public';

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS citext SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;
