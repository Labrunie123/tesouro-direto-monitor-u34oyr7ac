-- Ensure unique constraint on (reference_date, bond_type) for idempotent inserts
CREATE UNIQUE INDEX IF NOT EXISTS vna_history_reference_date_bond_type_key
  ON public.vna_history(reference_date, bond_type);

-- Seed recent VNA data for NTN-B 2026-07-15 (idempotent)
INSERT INTO public.vna_history (reference_date, vna_value, bond_type) VALUES
  ('2026-07-01', 2856.732451, 'NTN-B 2026-07-15'),
  ('2026-07-02', 2858.142003, 'NTN-B 2026-07-15'),
  ('2026-07-03', 2859.551837, 'NTN-B 2026-07-15'),
  ('2026-07-04', 2860.962054, 'NTN-B 2026-07-15'),
  ('2026-07-07', 2862.372654, 'NTN-B 2026-07-15'),
  ('2026-07-08', 2863.783629, 'NTN-B 2026-07-15'),
  ('2026-07-09', 2865.194978, 'NTN-B 2026-07-15'),
  ('2026-07-10', 2866.606700, 'NTN-B 2026-07-15'),
  ('2026-07-11', 2868.018797, 'NTN-B 2026-07-15'),
  ('2026-07-14', 2869.431269, 'NTN-B 2026-07-15')
ON CONFLICT (reference_date, bond_type) DO NOTHING;
