import { Leaf } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCarbonAmount, getMaterialInfo, type MaterialType } from "@/services/carbonService";

interface CarbonBadgeProps {
  carbonFootprintKg: number;
  materialType?: MaterialType;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

export const CarbonBadge = ({
  carbonFootprintKg,
  materialType,
  size = "md",
  showTooltip = true,
}: CarbonBadgeProps) => {
  if (carbonFootprintKg <= 0) return null;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const badge = (
    <Badge
      variant="outline"
      className={`gap-1.5 border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400 ${sizeClasses[size]}`}
    >
      <Leaf className={iconSizes[size]} />
      <span className="font-semibold">{formatCarbonAmount(carbonFootprintKg)}</span>
      <span className="text-xs opacity-75">saved</span>
    </Badge>
  );

  if (!showTooltip) return badge;

  const materialInfo = materialType ? getMaterialInfo(materialType) : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-semibold">Carbon Footprint Saved</p>
          <p className="mt-1 text-sm">
            By reusing this item instead of buying new, you'll save{" "}
            <span className="font-semibold">{formatCarbonAmount(carbonFootprintKg)}</span> of CO₂
            emissions.
          </p>
          {materialInfo && (
            <p className="mt-2 text-xs text-muted-foreground">
              {materialInfo.icon} {materialInfo.name} material
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface MaterialBadgeProps {
  materialType: MaterialType;
  size?: "sm" | "md" | "lg";
}

export const MaterialBadge = ({ materialType, size = "md" }: MaterialBadgeProps) => {
  const materialInfo = getMaterialInfo(materialType);

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <Badge variant="secondary" className={`gap-1.5 ${sizeClasses[size]}`}>
      <span>{materialInfo.icon}</span>
      <span>{materialInfo.name}</span>
    </Badge>
  );
};

interface CarbonImpactCardProps {
  carbonFootprintKg: number;
  materialType?: MaterialType;
  weightKg?: number;
  className?: string;
}

export const CarbonImpactCard = ({
  carbonFootprintKg,
  materialType,
  weightKg,
  className = "",
}: CarbonImpactCardProps) => {
  if (carbonFootprintKg <= 0) return null;

  const materialInfo = materialType ? getMaterialInfo(materialType) : null;

  return (
    <div
      className={`rounded-lg border border-green-200 bg-green-50/50 p-4 dark:border-green-800 dark:bg-green-950/20 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
          <Leaf className="h-5 w-5 text-green-600 dark:text-green-500" />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-green-900 dark:text-green-100">
            Environmental Impact
          </p>
          <p className="text-lg font-bold text-green-700 dark:text-green-400">
            {formatCarbonAmount(carbonFootprintKg)} saved
          </p>
          <p className="text-xs text-green-700/80 dark:text-green-400/80">
            By choosing to reuse this item instead of buying new
          </p>
          {materialInfo && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg">{materialInfo.icon}</span>
              <span className="text-xs text-green-700 dark:text-green-400">
                {materialInfo.name}
                {weightKg && ` • ${weightKg} kg`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
