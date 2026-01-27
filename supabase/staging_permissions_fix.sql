-- Fix user_permissions table RLS
ALTER TABLE IF EXISTS public.user_permissions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.user_permissions TO authenticated;

DROP POLICY IF EXISTS "user_permissions_select_own" ON public.user_permissions;
DROP POLICY IF EXISTS "user_permissions_manage" ON public.user_permissions;

CREATE POLICY "user_permissions_select_own" ON public.user_permissions 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_permissions_manage" ON public.user_permissions 
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

SELECT 'user_permissions fixed!' as status;
