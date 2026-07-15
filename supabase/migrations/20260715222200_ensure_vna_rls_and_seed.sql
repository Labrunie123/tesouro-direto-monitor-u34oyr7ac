-- Idempotent migration: ensure RLS policies on vna_history and seed user exists

ALTER TABLE public.vna_history ENABLE ROW LEVEL SECURITY;

-- Authenticated users can SELECT
DROP POLICY IF EXISTS "vna_history_select_authenticated" ON public.vna_history;
CREATE POLICY "vna_history_select_authenticated" ON public.vna_history
  FOR SELECT TO authenticated USING (true);

-- Authenticated users can INSERT
DROP POLICY IF EXISTS "vna_history_insert_authenticated" ON public.vna_history;
CREATE POLICY "vna_history_insert_authenticated" ON public.vna_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- Service role can INSERT (used by Edge Functions)
DROP POLICY IF EXISTS "vna_history_insert_service_role" ON public.vna_history;
CREATE POLICY "vna_history_insert_service_role" ON public.vna_history
  FOR INSERT TO service_role WITH CHECK (true);

-- Service role can UPDATE (used by Edge Functions for upsert)
DROP POLICY IF EXISTS "vna_history_update_service_role" ON public.vna_history;
CREATE POLICY "vna_history_update_service_role" ON public.vna_history
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- Service role can DELETE
DROP POLICY IF EXISTS "vna_history_delete_service_role" ON public.vna_history;
CREATE POLICY "vna_history_delete_service_role" ON public.vna_history
  FOR DELETE TO service_role USING (true);

-- Ensure unique index exists
CREATE UNIQUE INDEX IF NOT EXISTS vna_history_reference_date_bond_type_key
  ON public.vna_history(reference_date, bond_type);

-- Ensure seed user exists with password Skip@Pass
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'labrunie@gmail.com') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      gen_random_uuid(),
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
  ELSE
    UPDATE auth.users
    SET
      encrypted_password = crypt('Skip@Pass', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      confirmation_token = COALESCE(confirmation_token, ''),
      recovery_token = COALESCE(recovery_token, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      email_change = COALESCE(email_change, ''),
      email_change_token_current = COALESCE(email_change_token_current, ''),
      phone_change = COALESCE(phone_change, ''),
      phone_change_token = COALESCE(phone_change_token, ''),
      reauthentication_token = COALESCE(reauthentication_token, ''),
      updated_at = NOW()
    WHERE email = 'labrunie@gmail.com';
  END IF;
END $$;
