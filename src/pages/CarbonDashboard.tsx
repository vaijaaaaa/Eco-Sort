import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Leaf, TrendingUp, Package, Recycle, TreePine, Car, Zap } from "lucide-react";
import {
  getUserCarbonStats,
  getUserCarbonFootprints,
  getMaterialCarbonStats,
  getGlobalCarbonStats,
  formatCarbonAmount,
  getMaterialInfo,
  getCarbonEquivalent,
  type CarbonFootprint,
  type MaterialCarbonStats as MaterialStats,
} from "@/services/carbonService";

const CarbonDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<any>(null);
  const [userFootprints, setUserFootprints] = useState<CarbonFootprint[]>([]);
  const [materialStats, setMaterialStats] = useState<MaterialStats[]>([]);
  const [globalStats, setGlobalStats] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const [stats, footprints, materials, global] = await Promise.all([
          getUserCarbonStats(user.id),
          getUserCarbonFootprints(user.id),
          getMaterialCarbonStats(),
          getGlobalCarbonStats(),
        ]);

        setUserStats(stats);
        setUserFootprints(footprints);
        setMaterialStats(materials);
        setGlobalStats(global);
      } catch (error) {
        console.error("Error loading carbon data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Leaf className="mx-auto h-12 w-12 animate-pulse text-green-600" />
          <p className="mt-4 text-muted-foreground">Loading carbon data...</p>
        </div>
      </div>
    );
  }

  const totalCarbonSaved = userStats?.total_carbon_saved_kg || 0;
  const totalActions = userStats?.total_actions || 0;
  const carbonEquivalents = getCarbonEquivalent(totalCarbonSaved);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Carbon Impact Dashboard</h1>
        <p className="text-muted-foreground">
          Track your environmental impact through reuse and recycling
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="global">Global Impact</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
                  <Leaf className="h-6 w-6 text-green-600 dark:text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Carbon Saved</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-500">
                    {formatCarbonAmount(totalCarbonSaved)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
                  <Package className="h-6 w-6 text-blue-600 dark:text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Items Reused</p>
                  <p className="text-2xl font-bold">{totalActions}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">
                  <Recycle className="h-6 w-6 text-purple-600 dark:text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Material Types</p>
                  <p className="text-2xl font-bold">{userStats?.materials_recycled || 0}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-orange-100 p-3 dark:bg-orange-900/30">
                  <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg per Item</p>
                  <p className="text-2xl font-bold">
                    {formatCarbonAmount(totalActions > 0 ? totalCarbonSaved / totalActions : 0)}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Carbon Equivalents */}
          {totalCarbonSaved > 0 && (
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold">Your Impact in Real-World Terms</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {carbonEquivalents.map((equiv, index) => {
                  const icons = [Car, TreePine, Zap, Recycle];
                  const Icon = icons[index];
                  const colors = ["text-blue-600", "text-green-600", "text-yellow-600", "text-purple-600"];
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${colors[index]}`} />
                        <p className="text-sm font-medium">{equiv.description}</p>
                      </div>
                      <p className="text-2xl font-bold">
                        {equiv.value} <span className="text-base text-muted-foreground">{equiv.unit}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Empty State */}
          {totalActions === 0 && (
            <Card className="p-12 text-center">
              <Leaf className="mx-auto h-16 w-16 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Start Your Carbon Journey</h3>
              <p className="mt-2 text-muted-foreground">
                Create listings with material type and weight to track your carbon impact
              </p>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Carbon Footprint History</h3>
            {userFootprints.length > 0 ? (
              <div className="space-y-3">
                {userFootprints.map((footprint) => {
                  const materialInfo = getMaterialInfo(footprint.material_type);
                  return (
                    <div
                      key={footprint.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-2xl">{materialInfo.icon}</div>
                        <div>
                          <p className="font-medium">{materialInfo.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {footprint.weight_kg} kg • {new Date(footprint.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600 dark:text-green-500">
                          {formatCarbonAmount(footprint.carbon_saved_kg)}
                        </p>
                        <Badge variant="outline" className="mt-1">
                          {footprint.action_type}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No carbon footprint data yet. Start by creating listings with environmental data.
              </p>
            )}
          </Card>
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials" className="space-y-4">
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Impact by Material Type</h3>
            {materialStats.length > 0 ? (
              <div className="space-y-4">
                {materialStats.map((stat) => {
                  const materialInfo = getMaterialInfo(stat.material_type);
                  const percentage =
                    totalCarbonSaved > 0
                      ? Math.round((stat.total_carbon_saved_kg / totalCarbonSaved) * 100)
                      : 0;

                  return (
                    <div key={stat.material_type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{materialInfo.icon}</span>
                          <div>
                            <p className="font-medium">{materialInfo.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {stat.item_count} items • {stat.total_weight_kg} kg total
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCarbonAmount(stat.total_carbon_saved_kg)}</p>
                          <p className="text-sm text-muted-foreground">{percentage}%</p>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-green-600 dark:bg-green-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">No material data available yet.</p>
            )}
          </Card>
        </TabsContent>

        {/* Global Impact Tab */}
        <TabsContent value="global" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Community Total</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-500">
                  {formatCarbonAmount(globalStats?.totalCarbonSaved || 0)}
                </p>
                <p className="text-xs text-muted-foreground">Carbon saved by all users</p>
              </div>
            </Card>

            <Card className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-3xl font-bold">{globalStats?.totalItems || 0}</p>
                <p className="text-xs text-muted-foreground">Items reused globally</p>
              </div>
            </Card>

            <Card className="p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Your Contribution</p>
                <p className="text-3xl font-bold">
                  {globalStats?.totalCarbonSaved > 0
                    ? Math.round((totalCarbonSaved / globalStats.totalCarbonSaved) * 100)
                    : 0}
                  %
                </p>
                <p className="text-xs text-muted-foreground">Of community impact</p>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Community Impact</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Most Recycled Material</p>
                {globalStats?.topMaterial && (
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getMaterialInfo(globalStats.topMaterial).icon}</span>
                    <p className="text-xl font-semibold">{getMaterialInfo(globalStats.topMaterial).name}</p>
                  </div>
                )}
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Together, we've saved carbon equivalent to:</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {getCarbonEquivalent(globalStats?.totalCarbonSaved || 0).slice(0, 2).map((equiv, index) => (
                    <div key={index} className="rounded-lg bg-secondary p-3">
                      <p className="text-sm text-muted-foreground">{equiv.description}</p>
                      <p className="text-lg font-bold">
                        {equiv.value} {equiv.unit}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CarbonDashboard;
