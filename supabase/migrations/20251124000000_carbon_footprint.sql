-- Carbon Footprint Feature Migration
-- Add carbon tracking capabilities to the marketplace

-- Material types enum
DO $$
BEGIN
  CREATE TYPE public.material_type AS ENUM (
    'plastic',
    'glass',
    'metal',
    'paper',
    'cardboard',
    'electronics',
    'textiles',
    'wood',
    'rubber',
    'organic',
    'mixed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add carbon-related columns to listings table
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS material_type public.material_type,
ADD COLUMN IF NOT EXISTS weight_kg numeric(10,3),
ADD COLUMN IF NOT EXISTS carbon_footprint_kg numeric(10,3);

-- Create carbon footprint tracking table
CREATE TABLE IF NOT EXISTS public.carbon_footprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  material_type public.material_type NOT NULL,
  weight_kg numeric(10,3) NOT NULL,
  carbon_saved_kg numeric(10,3) NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('sell', 'buy', 'recycle')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS carbon_footprints_user_idx ON public.carbon_footprints(user_id);
CREATE INDEX IF NOT EXISTS carbon_footprints_listing_idx ON public.carbon_footprints(listing_id);
CREATE INDEX IF NOT EXISTS carbon_footprints_material_idx ON public.carbon_footprints(material_type);
CREATE INDEX IF NOT EXISTS carbon_footprints_created_idx ON public.carbon_footprints(created_at DESC);

-- Create material carbon coefficients table (kg CO2 per kg material)
CREATE TABLE IF NOT EXISTS public.material_carbon_coefficients (
  material_type public.material_type PRIMARY KEY,
  production_kg_co2_per_kg numeric(10,3) NOT NULL,
  recycling_kg_co2_per_kg numeric(10,3) NOT NULL,
  landfill_kg_co2_per_kg numeric(10,3) NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default carbon coefficients (based on research data)
INSERT INTO public.material_carbon_coefficients (material_type, production_kg_co2_per_kg, recycling_kg_co2_per_kg, landfill_kg_co2_per_kg, description)
VALUES
  ('plastic', 6.0, 1.2, 0.5, 'PET and general plastics'),
  ('glass', 0.9, 0.3, 0.1, 'Glass bottles and containers'),
  ('metal', 8.0, 1.5, 0.3, 'Aluminum and steel'),
  ('paper', 1.3, 0.4, 0.8, 'Paper and cardboard'),
  ('cardboard', 1.0, 0.3, 0.6, 'Corrugated cardboard'),
  ('electronics', 200.0, 20.0, 5.0, 'Electronic waste (average)'),
  ('textiles', 15.0, 3.0, 1.0, 'Clothing and fabrics'),
  ('wood', 0.5, 0.1, 0.3, 'Wood and lumber'),
  ('rubber', 3.5, 0.7, 0.4, 'Rubber materials'),
  ('organic', 0.3, 0.1, 2.0, 'Organic/compostable materials'),
  ('mixed', 3.0, 1.0, 0.8, 'Mixed materials')
ON CONFLICT (material_type) DO NOTHING;

-- Create function to calculate carbon footprint
CREATE OR REPLACE FUNCTION public.calculate_carbon_footprint(
  p_material_type public.material_type,
  p_weight_kg numeric
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_coefficient record;
  v_carbon_saved numeric;
BEGIN
  -- Get carbon coefficient for material
  SELECT production_kg_co2_per_kg, recycling_kg_co2_per_kg, landfill_kg_co2_per_kg
  INTO v_coefficient
  FROM public.material_carbon_coefficients
  WHERE material_type = p_material_type;
  
  IF NOT FOUND THEN
    -- Default to mixed material if not found
    SELECT production_kg_co2_per_kg, recycling_kg_co2_per_kg, landfill_kg_co2_per_kg
    INTO v_coefficient
    FROM public.material_carbon_coefficients
    WHERE material_type = 'mixed';
  END IF;
  
  -- Calculate carbon saved by reusing instead of producing new + sending to landfill
  -- Formula: (production cost - recycling cost) + landfill impact avoided
  v_carbon_saved := (v_coefficient.production_kg_co2_per_kg - v_coefficient.recycling_kg_co2_per_kg) * p_weight_kg;
  
  RETURN ROUND(v_carbon_saved, 3);
END;
$$;

-- Create trigger to auto-calculate carbon footprint on listing insert/update
CREATE OR REPLACE FUNCTION public.update_listing_carbon_footprint()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.material_type IS NOT NULL AND NEW.weight_kg IS NOT NULL AND NEW.weight_kg > 0 THEN
    NEW.carbon_footprint_kg := public.calculate_carbon_footprint(NEW.material_type, NEW.weight_kg);
  ELSE
    NEW.carbon_footprint_kg := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS calculate_listing_carbon ON public.listings;
CREATE TRIGGER calculate_listing_carbon
BEFORE INSERT OR UPDATE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.update_listing_carbon_footprint();

-- Create function to track carbon when listing is sold
CREATE OR REPLACE FUNCTION public.track_carbon_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- When a listing changes to 'sold' status
  IF NEW.status = 'sold' AND OLD.status != 'sold' 
     AND NEW.carbon_footprint_kg IS NOT NULL 
     AND NEW.carbon_footprint_kg > 0 THEN
    
    -- Record carbon saved for seller
    INSERT INTO public.carbon_footprints (
      user_id,
      listing_id,
      material_type,
      weight_kg,
      carbon_saved_kg,
      action_type
    ) VALUES (
      NEW.owner_id,
      NEW.id,
      NEW.material_type,
      NEW.weight_kg,
      NEW.carbon_footprint_kg,
      'sell'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS track_carbon_sale ON public.listings;
CREATE TRIGGER track_carbon_sale
AFTER UPDATE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.track_carbon_on_sale();

-- Create view for user carbon statistics
CREATE OR REPLACE VIEW public.user_carbon_stats AS
SELECT
  user_id,
  COUNT(*) as total_actions,
  SUM(carbon_saved_kg) as total_carbon_saved_kg,
  SUM(weight_kg) as total_weight_kg,
  COUNT(DISTINCT material_type) as materials_recycled,
  array_agg(DISTINCT material_type) as material_types,
  MAX(created_at) as last_action_at
FROM public.carbon_footprints
GROUP BY user_id;

-- Create view for material-wise carbon statistics
CREATE OR REPLACE VIEW public.material_carbon_stats AS
SELECT
  material_type,
  COUNT(*) as item_count,
  SUM(carbon_saved_kg) as total_carbon_saved_kg,
  SUM(weight_kg) as total_weight_kg,
  AVG(carbon_saved_kg) as avg_carbon_per_item,
  MAX(created_at) as last_action_at
FROM public.carbon_footprints
GROUP BY material_type;

-- Enable RLS
ALTER TABLE public.carbon_footprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_carbon_coefficients ENABLE ROW LEVEL SECURITY;

-- Carbon footprints policies
DROP POLICY IF EXISTS carbon_footprints_select_own ON public.carbon_footprints;
CREATE POLICY carbon_footprints_select_own ON public.carbon_footprints
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS carbon_footprints_insert_own ON public.carbon_footprints;
CREATE POLICY carbon_footprints_insert_own ON public.carbon_footprints
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Material coefficients are read-only for all authenticated users
DROP POLICY IF EXISTS material_coefficients_read_all ON public.material_carbon_coefficients;
CREATE POLICY material_coefficients_read_all ON public.material_carbon_coefficients
FOR SELECT USING (true);

-- Grants
GRANT SELECT, INSERT ON public.carbon_footprints TO authenticated;
GRANT SELECT ON public.material_carbon_coefficients TO authenticated, anon;
GRANT SELECT ON public.user_carbon_stats TO authenticated;
GRANT SELECT ON public.material_carbon_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_carbon_footprint TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.carbon_footprints IS 'Tracks carbon footprint savings from marketplace activities';
COMMENT ON TABLE public.material_carbon_coefficients IS 'Carbon emission coefficients per material type';
COMMENT ON FUNCTION public.calculate_carbon_footprint IS 'Calculates carbon savings based on material type and weight';
COMMENT ON VIEW public.user_carbon_stats IS 'Aggregated carbon statistics per user';
COMMENT ON VIEW public.material_carbon_stats IS 'Aggregated carbon statistics per material type';
