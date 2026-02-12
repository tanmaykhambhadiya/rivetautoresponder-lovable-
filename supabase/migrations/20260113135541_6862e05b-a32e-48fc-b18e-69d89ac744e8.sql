-- Create units registry table (if not exists)
CREATE TABLE IF NOT EXISTS public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  hospital text,
  aliases text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- RLS policies for units (drop first if exists to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can view units" ON public.units;
DROP POLICY IF EXISTS "Admins and editors can manage units" ON public.units;

CREATE POLICY "Authenticated users can view units"
ON public.units FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "Admins and editors can manage units"
ON public.units FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));