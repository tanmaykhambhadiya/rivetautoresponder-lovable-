-- Create booking_rules table
CREATE TABLE public.booking_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rule_type text NOT NULL,
  description text,
  config jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for booking_rules
CREATE POLICY "Authenticated users can view booking rules"
ON public.booking_rules FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "Admins can manage booking rules"
ON public.booking_rules FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default booking rules
INSERT INTO public.booking_rules (name, rule_type, description, config, priority, is_active) VALUES
('Block All Units Same Day', 'block_all_units', 'When a nurse is booked for any unit, block all other units for that day', '{"block_same_day": true}', 1, true),
('Allow Non-Overlapping Shifts', 'allow_non_overlapping', 'Allow multiple bookings if time slots do not overlap', '{"min_gap_minutes": 60, "max_shifts_per_day": 2}', 2, false);