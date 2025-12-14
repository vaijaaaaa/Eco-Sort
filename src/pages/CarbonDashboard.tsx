import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import { Leaf, TrendingUp, Package, Recycle, TreePine, Car, Zap, Globe, BarChart3, Calendar } from "lucide-react";
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
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="space-y-8">
            <div className="space-y-3">
              <Skeleton className="h-10 w-96" />
              <Skeleton className="h-6 w-64" />
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalCarbonSaved = userStats?.total_carbon_saved_kg || 0;
  const totalActions = userStats?.total_actions || 0;
  const carbonEquivalents = getCarbonEquivalent(totalCarbonSaved);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Hero Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-8 dark:from-green-950 dark:via-emerald-950 dark:to-teal-950 md:p-12">
            <div className="relative z-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 dark:bg-green-900/50">
                <Leaf className="h-5 w-5 text-green-700 dark:text-green-400" />
                <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                  Environmental Impact
                </span>
              </div>
              <h1 className="mb-3 text-4xl font-bold tracking-tight text-gray-900 dark:text-white md:text-5xl">
                Carbon Impact Dashboard
              </h1>
              <p className="max-w-2xl text-lg text-gray-600 dark:text-gray-300">
                Track your environmental contribution through sustainable reuse and recycling practices.
                Every item reused makes a difference.
              </p>
              
              {totalCarbonSaved > 0 && (
                <div className="mt-6 flex flex-wrap gap-4">
                  <div className="rounded-lg bg-white/80 px-6 py-4 backdrop-blur-sm dark:bg-gray-900/80">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Impact</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {formatCarbonAmount(totalCarbonSaved)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/80 px-6 py-4 backdrop-blur-sm dark:bg-gray-900/80">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Items Reused</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalActions}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute right-0 top-0 -z-0 h-64 w-64 rounded-full bg-green-200/30 blur-3xl dark:bg-green-800/20" />
            <div className="absolute bottom-0 left-0 -z-0 h-48 w-48 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-800/20" />
          </div>

          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-4">
              <TabsTrigger value="overview" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <Calendar className="h-4 w-4" />
                History
              </TabsTrigger>
              <TabsTrigger value="materials" className="gap-2">
                <Package className="h-4 w-4" />
                Materials
              </TabsTrigger>
              <TabsTrigger value="global" className="gap-2">
                <Globe className="h-4 w-4" />
                Community
              </TabsTrigger>
            </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-8">
          {/* Key Metrics */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="overflow-hidden border-green-200 dark:border-green-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-gradient-to-br from-green-100 to-green-200 p-3 dark:from-green-900/50 dark:to-green-800/50">
                    <Leaf className="h-7 w-7 text-green-700 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Carbon Saved</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCarbonAmount(totalCarbonSaved)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 p-3 dark:from-blue-900/50 dark:to-blue-800/50">
                    <Package className="h-7 w-7 text-blue-700 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Items Reused</p>
                    <p className="text-2xl font-bold">{totalActions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-purple-200 dark:border-purple-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 p-3 dark:from-purple-900/50 dark:to-purple-800/50">
                    <Recycle className="h-7 w-7 text-purple-700 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Material Types</p>
                    <p className="text-2xl font-bold">{userStats?.materials_recycled || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-orange-200 dark:border-orange-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 p-3 dark:from-orange-900/50 dark:to-orange-800/50">
                    <TrendingUp className="h-7 w-7 text-orange-700 dark:text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Avg per Item</p>
                    <p className="text-2xl font-bold">
                      {formatCarbonAmount(totalActions > 0 ? totalCarbonSaved / totalActions : 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Carbon Equivalents */}
          {totalCarbonSaved > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-green-600" />
                  Your Impact in Real-World Terms
                </CardTitle>
                <CardDescription>
                  Understand your environmental contribution through everyday comparisons
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {carbonEquivalents.map((equiv, index) => {
                    const icons = [Car, TreePine, Zap, Recycle];
                    const Icon = icons[index];
                    const bgColors = [
                      "bg-blue-50 dark:bg-blue-950/30",
                      "bg-green-50 dark:bg-green-950/30",
                      "bg-yellow-50 dark:bg-yellow-950/30",
                      "bg-purple-50 dark:bg-purple-950/30",
                    ];
                    const iconColors = [
                      "text-blue-600 dark:text-blue-400",
                      "text-green-600 dark:text-green-400",
                      "text-yellow-600 dark:text-yellow-400",
                      "text-purple-600 dark:text-purple-400",
                    ];
                    
                    return (
                      <div key={index} className={`rounded-xl p-5 ${bgColors[index]}`}>
                        <div className="mb-3 flex items-center gap-2">
                          <Icon className={`h-6 w-6 ${iconColors[index]}`} />
                          <p className="text-sm font-medium text-muted-foreground">
                            {equiv.description}
                          </p>
                        </div>
                        <p className="text-3xl font-bold">
                          {equiv.value}{" "}
                          <span className="text-lg font-medium text-muted-foreground">{equiv.unit}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {totalActions === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-green-100 p-6 dark:bg-green-900/30">
                  <Leaf className="h-16 w-16 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="mt-6 text-xl font-semibold">Start Your Carbon Journey</h3>
                <p className="mt-2 max-w-md text-muted-foreground">
                  Create listings with material type and weight information to begin tracking your
                  environmental impact and contribution to sustainability.
                </p>
                <div className="mt-6 flex gap-3">
                  <a
                    href="/dashboard/listings/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700"
                  >
                    <Package className="h-4 w-4" />
                    Create Listing
                  </a>
                  <a
                    href="/marketplace"
                    className="inline-flex items-center gap-2 rounded-lg border bg-background px-6 py-3 font-semibold transition-colors hover:bg-accent"
                  >
                    Browse Marketplace
                  </a>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Carbon Footprint History</CardTitle>
              <CardDescription>Chronological view of your environmental contributions</CardDescription>
            </CardHeader>
            <CardContent>
              {userFootprints.length > 0 ? (
                <div className="space-y-4">
                  {userFootprints.map((footprint) => {
                    const materialInfo = getMaterialInfo(footprint.material_type);
                    return (
                      <div
                        key={footprint.id}
                        className="flex flex-col gap-4 rounded-xl border bg-card p-5 transition-all hover:border-green-300 hover:shadow-md dark:hover:border-green-700 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-3xl">
                            {materialInfo.icon}
                          </div>
                          <div className="space-y-1">
                            <p className="font-semibold">{materialInfo.name}</p>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Package className="h-3.5 w-3.5" />
                                {footprint.weight_kg} kg
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(footprint.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                          <div className="text-left sm:text-right">
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {formatCarbonAmount(footprint.carbon_saved_kg)}
                            </p>
                            <p className="text-xs text-muted-foreground">saved</p>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {footprint.action_type}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-medium">No carbon footprint data yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Start by creating listings with environmental data
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Impact by Material Type</CardTitle>
              <CardDescription>
                Detailed breakdown of carbon savings across different material categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              {materialStats.length > 0 ? (
                <div className="space-y-6">
                  {materialStats.map((stat) => {
                    const materialInfo = getMaterialInfo(stat.material_type);
                    const percentage =
                      totalCarbonSaved > 0
                        ? Math.round((stat.total_carbon_saved_kg / totalCarbonSaved) * 100)
                        : 0;

                    return (
                      <div key={stat.material_type} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-2xl">
                              {materialInfo.icon}
                            </div>
                            <div>
                              <p className="font-semibold">{materialInfo.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {stat.item_count} item{stat.item_count !== 1 ? "s" : ""} •{" "}
                                {stat.total_weight_kg.toFixed(2)} kg total
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-green-600 dark:text-green-400">
                              {formatCarbonAmount(stat.total_carbon_saved_kg)}
                            </p>
                            <p className="text-sm font-medium text-muted-foreground">{percentage}%</p>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Progress value={percentage} className="h-2.5" />
                          <p className="text-xs text-muted-foreground">
                            Avg {formatCarbonAmount(stat.avg_carbon_per_item)} per item
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-medium">No material data available</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Material statistics will appear once you have reused items
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Global Impact Tab */}
        <TabsContent value="global" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader>
                <CardDescription>Community Total</CardDescription>
                <CardTitle className="text-4xl text-green-600 dark:text-green-400">
                  {formatCarbonAmount(globalStats?.totalCarbonSaved || 0)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Total carbon saved by all users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Total Items</CardDescription>
                <CardTitle className="text-4xl">{globalStats?.totalItems || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Items reused by community</p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardDescription>Your Contribution</CardDescription>
                <CardTitle className="text-4xl text-blue-600 dark:text-blue-400">
                  {globalStats?.totalCarbonSaved > 0
                    ? Math.round((totalCarbonSaved / globalStats.totalCarbonSaved) * 100)
                    : 0}
                  %
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Of global community impact</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-green-600" />
                Community Impact
              </CardTitle>
              <CardDescription>
                See how our community is making a difference together
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="mb-3 text-sm font-medium text-muted-foreground">
                  Most Recycled Material
                </p>
                {globalStats?.topMaterial ? (
                  <div className="flex items-center gap-4 rounded-xl bg-secondary p-4">
                    <span className="text-4xl">{getMaterialInfo(globalStats.topMaterial).icon}</span>
                    <div>
                      <p className="text-xl font-bold">
                        {getMaterialInfo(globalStats.topMaterial).name}
                      </p>
                      <p className="text-sm text-muted-foreground">Top material by carbon saved</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No data available</p>
                )}
              </div>
              
              <Separator />
              
              <div>
                <p className="mb-4 font-medium">Together, we've saved carbon equivalent to:</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {getCarbonEquivalent(globalStats?.totalCarbonSaved || 0)
                    .slice(0, 2)
                    .map((equiv, index) => {
                      const icons = [Car, TreePine];
                      const Icon = icons[index];
                      return (
                        <div
                          key={index}
                          className="flex items-start gap-4 rounded-xl border bg-card p-5"
                        >
                          <div className="rounded-lg bg-secondary p-3">
                            <Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">{equiv.description}</p>
                            <p className="mt-1 text-2xl font-bold">
                              {equiv.value} {equiv.unit}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </div>
      </div>
    </div>
  );
};

export default CarbonDashboard;
