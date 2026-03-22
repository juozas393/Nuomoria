-- RPC: get_invoice_parties
-- Returns created_by and tenant_id with resolved user names for given invoice numbers
-- SECURITY DEFINER to bypass RLS (admin-only via app logic)

CREATE OR REPLACE FUNCTION public.get_invoice_parties(invoice_numbers text[])
RETURNS TABLE (
    invoice_number text,
    issuer_name text,
    issuer_email text,
    tenant_name text,
    tenant_email text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        i.invoice_number,
        COALESCE(creator.full_name, creator.email) AS issuer_name,
        creator.email AS issuer_email,
        COALESCE(tenant.full_name, tenant.email) AS tenant_name,
        tenant.email AS tenant_email
    FROM invoices i
    LEFT JOIN users creator ON creator.id = i.created_by
    LEFT JOIN users tenant ON tenant.id = i.tenant_id
    WHERE i.invoice_number = ANY(invoice_numbers);
$$;

-- Grant execute to authenticated users (admin check is done via app logic)
GRANT EXECUTE ON FUNCTION public.get_invoice_parties(text[]) TO authenticated;
