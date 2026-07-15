-- Ensure RLS policies allow service_role to insert/update/delete vna_history (idempotent)

DROP POLICY IF EXISTS "vna_history_insert_service_role" ON public.vna_history;
CREATE POLICY "vna_history_insert_service_role" ON public.vna_history
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "vna_history_update_service_role" ON public.vna_history;
CREATE POLICY "vna_history_update_service_role" ON public.vna_history
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "vna_history_delete_service_role" ON public.vna_history;
CREATE POLICY "vna_history_delete_service_role" ON public.vna_history
  FOR DELETE TO service_role USING (true);

DROP POLICY IF EXISTS "vna_history_select_authenticated" ON public.vna_history;
CREATE POLICY "vna_history_select_authenticated" ON public.vna_history
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "vna_history_insert_authenticated" ON public.vna_history;
CREATE POLICY "vna_history_insert_authenticated" ON public.vna_history
  FOR INSERT TO authenticated WITH CHECK (true);
