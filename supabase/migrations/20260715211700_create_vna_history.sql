CREATE TABLE IF NOT EXISTS public.vna_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_date DATE NOT NULL,
  vna_value NUMERIC NOT NULL,
  bond_type TEXT NOT NULL DEFAULT 'NTN-B',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS vna_history_reference_date_bond_type_key
  ON public.vna_history(reference_date, bond_type);

ALTER TABLE public.vna_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vna_history_select_authenticated" ON public.vna_history;
CREATE POLICY "vna_history_select_authenticated" ON public.vna_history
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "vna_history_insert_service_role" ON public.vna_history;
CREATE POLICY "vna_history_insert_service_role" ON public.vna_history
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "vna_history_update_service_role" ON public.vna_history;
CREATE POLICY "vna_history_update_service_role" ON public.vna_history
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "vna_history_delete_service_role" ON public.vna_history;
CREATE POLICY "vna_history_delete_service_role" ON public.vna_history
  FOR DELETE TO service_role USING (true);

DO $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'labrunie@gmail.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'labrunie@gmail.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Labrunie"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  END IF;
END $$;
