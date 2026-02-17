-- Add missing indexes on foreign key columns for query performance
-- These indexes speed up JOINs and RLS policy checks
-- Wrapped in exception handlers for columns/tables that may not exist yet

-- Add missing indexes on foreign key columns for query performance
-- These indexes speed up JOINs and RLS policy checks
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_address_meters_address_id ON address_meters(address_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_addresses_created_by ON addresses(created_by);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_amenities_category ON amenities(category);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_amenities_created_by ON amenities(created_by);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_apartment_meters_address_meter_id ON apartment_meters(address_meter_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_apartment_meters_property_id ON apartment_meters(property_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_communal_expenses_address_id ON communal_expenses(address_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_communal_expenses_meter_id ON communal_expenses(meter_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_communal_expenses_new_meter_id ON communal_expenses_new(meter_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_communal_meters_address_id ON communal_meters(address_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_conversations_participant_1 ON conversations(participant_1);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_conversations_participant_2 ON conversations(participant_2);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_conversations_property_id ON conversations(property_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_property_id ON dashboard_layouts(property_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user_id ON dashboard_layouts(user_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user_property ON dashboard_layouts(user_id, property_id, view);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_invoices_address_id ON invoices(address_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_invoices_property_id ON invoices(property_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_invoice_payments_created_by ON invoice_payments(created_by);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS invoice_payments_invoice_idx ON invoice_payments(invoice_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS invoice_payments_paid_at_idx ON invoice_payments(paid_at DESC);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_meter_readings_meter_id ON meter_readings(meter_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_meter_readings_property_id ON meter_readings(property_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_properties_address_id ON properties(address_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_properties_manager_id ON properties(manager_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_property_amenities_amenity ON property_amenities(amenity_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_property_amenities_property ON property_amenities(property_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_property_deposit_events_created_by ON property_deposit_events(created_by);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS property_deposit_events_property_idx ON property_deposit_events(property_id, created_at DESC);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_property_documents_property_id ON property_documents(property_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_property_meter_configs_address_id ON property_meter_configs(address_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_property_meter_configs_property_id ON property_meter_configs(property_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_property_photos_order ON property_photos(property_id, order_index);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_property_photos_property_id ON property_photos(property_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_tenant_history_contract_end ON tenant_history(contract_end DESC);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_tenant_history_property_id ON tenant_history(property_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_tenant_invitations_invited_by ON tenant_invitations(invited_by);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_tenant_invitations_property_id ON tenant_invitations(property_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON tenant_invitations(token);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS tenant_invitations_email_idx ON tenant_invitations(lower(email));
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_tenants_property_id ON tenants(property_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_user_addresses_address_id ON user_addresses(address_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_user_meter_templates_user_id ON user_meter_templates(user_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_user_permissions_granted_by ON user_permissions(granted_by);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_users_purge_after ON users(purge_after) WHERE purge_after IS NOT NULL;
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

-- Text search index for amenities
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_amenities_name_search ON amenities USING gin(name gin_trgm_ops);
EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
END $$;

