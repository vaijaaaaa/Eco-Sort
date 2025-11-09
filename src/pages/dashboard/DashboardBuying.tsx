import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { fetchBuyerRequests } from "@/services/listingService";
import { formatDistanceToNow } from "date-fns";

const DashboardBuying = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["buyer-requests", user?.id],
    queryFn: () => fetchBuyerRequests(user!.id),
    enabled: Boolean(user?.id),
  });

  const handleContactSeller = (email?: string | null) => {
    if (!email) {
      toast({ title: "Seller email unavailable", description: "Try sending a follow-up request." });
      return;
    }

    window.location.href = `mailto:${email}`;
  };

  if (isLoading) {
    return (
      <Card className="flex min-h-[320px] items-center justify-center">
        <Spinner size="lg" />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Buying activity</h2>
        <p className="text-sm text-muted-foreground">
          Follow up on your purchase requests and keep track of statuses.
        </p>
      </div>

      {requests && requests.length ? (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">{request.listing?.title ?? "Listing"}</h3>
                  <Badge variant="outline">{request.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Requested {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                </p>
                {request.message && <p className="text-sm text-muted-foreground">Your note: {request.message}</p>}
              </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    variant="outline"
                    onClick={() => handleContactSeller(request.listing?.contact_email)}
                  >
                    Contact seller
                  </Button>
                  {request.listing?.contact_phone && (
                    <span className="text-sm text-muted-foreground">
                      Phone: {request.listing.contact_phone}
                    </span>
                  )}
                </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-lg font-semibold text-foreground">No purchase requests yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Browse the marketplace to find electronics and send a purchase request. You will see all updates here.
          </p>
          <Button asChild>
            <Link to="/marketplace">Explore marketplace</Link>
          </Button>
        </Card>
      )}
    </div>
  );
};

export default DashboardBuying;
