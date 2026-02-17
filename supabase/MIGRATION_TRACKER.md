# Migration Tracker

Tracks which migrations have been applied to each environment.

## Environments

| Env | Project ID | Status |
|-----|-----------|--------|
| **Production** | `hlcvskkxrnwxtktscpyy` | Active |
| **Staging** | `isuqgyxrwvvniwvaljrc` | Active |
| **Docker Local** | — | Via `supabase db reset` |

## Migration Status

| # | Migration File | Production | Staging | Notes |
|---|---------------|:----------:|:-------:|-------|
| 0 | `00000000_baseline.sql` | ✅ | ✅ | Initial schema |
| 1 | `20250115_fix_rls_performance.sql` | ✅ | ✅ | |
| 2 | `20250115_fix_security_issues.sql` | ✅ | ✅ | |
| 3 | `20250117_dual_auth_system.sql` | ✅ | ✅ | |
| 4 | `20250120_fix_address_insert_403.sql` | ✅ | ✅ | |
| 5 | `20251109_create_hidden_meter_templates.sql` | ✅ | ✅ | |
| 6 | `20251109_create_notifications_table.sql` | ✅ | ✅ | |
| 7 | `20251109_create_tenant_invitations.sql` | ✅ | ✅ | |
| 8 | `20251109_create_user_meter_templates.sql` | ✅ | ✅ | |
| 9 | `20251109_fix_ensure_user_row.sql` | ✅ | ✅ | |
| 10 | `20251109_profile_rls_policies.sql` | ✅ | ✅ | |
| 11 | `20251110_property_view_invoices.sql` | ✅ | ✅ | |
| 12 | `20251110_property_view_phase1.sql` | ✅ | ✅ | |
| 13 | `20260116_create_profiles_dual_auth.sql` | ✅ | ✅ | |
| 14 | `20260117_add_avatar_url.sql` | ✅ | ✅ | |
| 15 | `20260117_create_avatars_bucket.sql` | ✅ | ✅ | |
| 16 | `20260117_delete_user_account.sql` | ✅ | ✅ | |
| 17 | `20260117_set_user_password.sql` | ✅ | ✅ | |
| 18 | `20260118_add_meter_columns.sql` | ✅ | ✅ | |
| 19 | `20260118_allow_account_deletion.sql` | ✅ | ✅ | |
| 20 | `20260118_create_property_photos_bucket.sql` | ✅ | ✅ | |
| 21 | `20260118_fix_address_meters_rls.sql` | ✅ | ✅ | |
| 22 | `20260119_create_messages_table.sql` | ✅ | ✅ | |
| 23 | `20260119_fix_tenant_invitations_insert.sql` | ✅ | ✅ | |
| 24 | `20260120_fix_role_overwrite.sql` | ✅ | ✅ | |
| 25 | `20260121_account_deletion_system.sql` | ✅ | ✅ | |
| 26 | `20260121_add_profiles_onboarding_column.sql` | ✅ | ✅ | |
| 27 | `20260121_docker_schema_fix.sql` | ✅ | ✅ | |
| 28 | `20260122_google_only_auth.sql` | ✅ | ✅ | |
| 29 | `20260122_property_extended_details.sql` | ✅ | ✅ | |
| 30 | `20260122_property_photos_optimization.sql` | ✅ | ✅ | |
| 31 | `20260122_storage_bucket_update.sql` | ✅ | ✅ | |
| 32 | `20260122_amenities_system.sql` | ✅ | ✅ | |
| 33 | `20260128_dashboard_layouts.sql` | ✅ | ✅ | |
| 34 | `20260128_storage_policies.sql` | ✅ | ✅ | |
| 35 | `20260211_fix_users_role_nullable.sql` | ❌ | ✅ | Needs prod deploy |
| 36 | `20260211_fix_check_username_fn.sql` | ✅ already correct | ✅ | Param name fix |

## Pending for Production

- `20260211_fix_users_role_nullable.sql` — allows NULL role for onboarding flow
- `20260211_fix_check_username_fn.sql` — not needed, prod already has correct param name
