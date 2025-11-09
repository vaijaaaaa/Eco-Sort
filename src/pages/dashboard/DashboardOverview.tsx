import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Package, Clock, CheckCircle, CircleDollarSign, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/useAuth";
import { fetchDashboardSummary } from "@/services/dashboardService";
import { formatDistanceToNow } from "date-fns";

const DashboardOverview = () => {
  const { user } = useAuth();

  const {
    data: summary,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["dashboard-summary", user?.id],
    queryFn: () => fetchDashboardSummary(user!.id),
    enabled: Boolean(user?.id),
  });

  const stats = useMemo(
    () => [
      {
        label: "Active listings",
        value: summary?.availableCount ?? 0,
        icon: Package,
        tone: "text-primary",
      },
      {
        label: "Pending requests",
        value: summary?.pendingCount ?? 0,
        icon: Clock,
        tone: "text-accent",
      },
      {
        label: "Items sold",
        value: summary?.soldCount ?? 0,
        icon: CheckCircle,
        tone: "text-emerald-500",
      },
      {
        label: "Revenue (USD)",
        value: (summary?.totalRevenue ?? 0).toLocaleString(),
        icon: CircleDollarSign,
        tone: "text-green-500",
      },
    ],
    [summary?.availableCount, summary?.pendingCount, summary?.soldCount, summary?.totalRevenue],
  );

  if (isLoading) {
    return (
      <Card className="flex min-h-[320px] items-center justify-center">
        <Spinner size="lg" />
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Overview</h2>
          <p className="text-sm text-muted-foreground">
            Track your marketplace performance and stay ahead of requests
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          {isFetching && <Spinner size="sm" />}
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="space-y-3 p-6">
            <div className={`inline-flex items-center gap-2 text-sm font-medium ${stat.tone}`}>
              <stat.icon className="h-4 w-4" />
              {stat.label}
            </div>
            <p className="text-3xl font-semibold text-foreground">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Recent activity</h3>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            {summary?.recentActivity?.length ? (
              summary.recentActivity.map((item) => (
                <div
                  key={item.id + item.timestamp}
                  className="flex items-start justify-between rounded-lg border border-border/60 bg-background/60 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    {item.meta?.buyer && (
                      <p className="text-xs text-muted-foreground">Buyer: {String(item.meta.buyer)}</p>
                    )}
                    {item.meta?.status && (
                      <p className="text-xs text-muted-foreground">Status: {String(item.meta.status)}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity yet. Create your first listing!</p>
            )}
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Purchase requests</h3>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="space-y-3">
            {summary?.requestsAsSeller?.length ? (
              summary.requestsAsSeller.slice(0, 5).map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-1 rounded-lg border border-border/60 bg-background/60 p-4"
                >
                  <div className="flex items-center justify-between text-sm font-medium text-foreground">
                    <span>{request.listing?.title ?? "Listing"}</span>
                    <span className="text-xs uppercase text-muted-foreground">{request.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Buyer: {request.buyer?.full_name ?? request.buyer?.email ?? "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Requested {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">You have not received any purchase requests yet.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;
