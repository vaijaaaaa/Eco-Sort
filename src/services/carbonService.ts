import { supabase } from "@/integrations/supabase/client";

export type MaterialType =
  | "plastic"
  | "glass"
  | "metal"
  | "paper"
  | "cardboard"
  | "electronics"
  | "textiles"
  | "wood"
  | "rubber"
  | "organic"
  | "mixed";

export interface CarbonCoefficient {
  material_type: MaterialType;
  production_kg_co2_per_kg: number;
  recycling_kg_co2_per_kg: number;
  landfill_kg_co2_per_kg: number;
  description: string;
}

export interface CarbonFootprint {
  id: string;
  user_id: string;
  listing_id: string | null;
  material_type: MaterialType;
  weight_kg: number;
  carbon_saved_kg: number;
  action_type: "sell" | "buy" | "recycle";
  created_at: string;
}

export interface UserCarbonStats {
  user_id: string;
  total_actions: number;
  total_carbon_saved_kg: number;
  total_weight_kg: number;
  materials_recycled: number;
  material_types: MaterialType[];
  last_action_at: string;
}

export interface MaterialCarbonStats {
  material_type: MaterialType;
  item_count: number;
  total_carbon_saved_kg: number;
  total_weight_kg: number;
  avg_carbon_per_item: number;
  last_action_at: string;
}

/**
 * Calculate carbon footprint for a material and weight
 */
export const calculateCarbonFootprint = async (
  materialType: MaterialType,
  weightKg: number
): Promise<number> => {
  try {
    // @ts-ignore - RPC function types not fully generated yet
    const { data, error } = await supabase.rpc("calculate_carbon_footprint", {
      p_material_type: materialType,
      p_weight_kg: weightKg,
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error("Error calculating carbon footprint:", error);
    return 0;
  }
};

/**
 * Get all material carbon coefficients
 */
export const getMaterialCoefficients = async (): Promise<CarbonCoefficient[]> => {
  try {
    const { data, error } = await supabase
      .from("material_carbon_coefficients")
      .select("*")
      .order("material_type");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching material coefficients:", error);
    return [];
  }
};

/**
 * Get user's carbon statistics
 */
export const getUserCarbonStats = async (
  userId: string
): Promise<UserCarbonStats | null> => {
  try {
    const { data, error } = await supabase
      .from("user_carbon_stats")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // No data found
      throw error;
    }
    return data;
  } catch (error) {
    console.error("Error fetching user carbon stats:", error);
    return null;
  }
};

/**
 * Get carbon footprints for a user
 */
export const getUserCarbonFootprints = async (
  userId: string
): Promise<CarbonFootprint[]> => {
  try {
    const { data, error } = await supabase
      .from("carbon_footprints")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching carbon footprints:", error);
    return [];
  }
};

/**
 * Get material-wise carbon statistics
 */
export const getMaterialCarbonStats = async (): Promise<MaterialCarbonStats[]> => {
  try {
    const { data, error } = await supabase
      .from("material_carbon_stats")
      .select("*")
      .order("total_carbon_saved_kg", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching material carbon stats:", error);
    return [];
  }
};

/**
 * Get global carbon statistics (all users)
 */
export const getGlobalCarbonStats = async (): Promise<{
  totalCarbonSaved: number;
  totalItems: number;
  totalWeight: number;
  topMaterial: MaterialType | null;
}> => {
  try {
    const { data, error } = await supabase
      .from("carbon_footprints")
      .select("carbon_saved_kg, weight_kg, material_type");

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        totalCarbonSaved: 0,
        totalItems: 0,
        totalWeight: 0,
        topMaterial: null,
      };
    }

    // Type assertion for the selected fields
    type CarbonData = {
      carbon_saved_kg: number;
      weight_kg: number;
      material_type: MaterialType;
    };
    const carbonData = data as CarbonData[];

    const totalCarbonSaved = carbonData.reduce(
      (sum, item) => sum + (item.carbon_saved_kg || 0),
      0
    );
    const totalWeight = carbonData.reduce((sum, item) => sum + (item.weight_kg || 0), 0);

    // Find top material by carbon saved
    const materialMap = new Map<MaterialType, number>();
    carbonData.forEach((item) => {
      const current = materialMap.get(item.material_type) || 0;
      materialMap.set(item.material_type, current + item.carbon_saved_kg);
    });

    let topMaterial: MaterialType | null = null;
    let maxCarbon = 0;
    materialMap.forEach((carbon, material) => {
      if (carbon > maxCarbon) {
        maxCarbon = carbon;
        topMaterial = material;
      }
    });

    return {
      totalCarbonSaved: Math.round(totalCarbonSaved * 100) / 100,
      totalItems: carbonData.length,
      totalWeight: Math.round(totalWeight * 100) / 100,
      topMaterial,
    };
  } catch (error) {
    console.error("Error fetching global carbon stats:", error);
    return {
      totalCarbonSaved: 0,
      totalItems: 0,
      totalWeight: 0,
      topMaterial: null,
    };
  }
};

/**
 * Format carbon amount with appropriate unit
 */
export const formatCarbonAmount = (kgCO2: number): string => {
  if (kgCO2 < 1) {
    return `${Math.round(kgCO2 * 1000)} g CO₂`;
  } else if (kgCO2 < 1000) {
    return `${Math.round(kgCO2 * 10) / 10} kg CO₂`;
  } else {
    return `${Math.round((kgCO2 / 1000) * 10) / 10} tonnes CO₂`;
  }
};

/**
 * Get material display name and icon
 */
export const getMaterialInfo = (
  material: MaterialType
): { name: string; icon: string; color: string } => {
  const materialInfo: Record<
    MaterialType,
    { name: string; icon: string; color: string }
  > = {
    plastic: { name: "Plastic", icon: "♻️", color: "text-blue-600" },
    glass: { name: "Glass", icon: "🥤", color: "text-green-600" },
    metal: { name: "Metal", icon: "🔩", color: "text-gray-600" },
    paper: { name: "Paper", icon: "📄", color: "text-yellow-600" },
    cardboard: { name: "Cardboard", icon: "📦", color: "text-orange-600" },
    electronics: { name: "Electronics", icon: "⚡", color: "text-purple-600" },
    textiles: { name: "Textiles", icon: "👕", color: "text-pink-600" },
    wood: { name: "Wood", icon: "🪵", color: "text-amber-700" },
    rubber: { name: "Rubber", icon: "⚫", color: "text-gray-700" },
    organic: { name: "Organic", icon: "🌿", color: "text-green-700" },
    mixed: { name: "Mixed", icon: "🔀", color: "text-gray-500" },
  };

  return materialInfo[material] || materialInfo.mixed;
};

/**
 * Calculate equivalent carbon savings in real-world terms
 */
export const getCarbonEquivalent = (
  kgCO2: number
): { value: number; unit: string; description: string }[] => {
  return [
    {
      value: Math.round((kgCO2 / 0.404) * 10) / 10,
      unit: "km",
      description: "driving a car",
    },
    {
      value: Math.round(kgCO2 / 21.77),
      unit: "trees",
      description: "planted and grown for 10 years",
    },
    {
      value: Math.round((kgCO2 / 0.233) * 10) / 10,
      unit: "kWh",
      description: "of electricity consumption",
    },
    {
      value: Math.round((kgCO2 / 8.887) * 10) / 10,
      unit: "gallons",
      description: "of gasoline consumed",
    },
  ];
};
