import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  deleteListing,
  fetchListings,
  updateListing,
  type ListingStatus,
} from "@/services/listingService";
import { formatDistanceToNow } from "date-fns";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";

const statusOptions: ListingStatus[] = ["available", "pending", "sold"];

const DashboardListings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedForDeletion, setSelectedForDeletion] = useState<string | null>(null);

  const { data: listings, isLoading } = useQuery({
    queryKey: ["listings", { ownerId: user?.id }],
    queryFn: () => fetchListings({ ownerId: user!.id }),
    enabled: Boolean(user?.id),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ListingStatus }) =>
      updateListing(id, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast({ title: "Listing updated", description: "Status changed successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error updating listing", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteListing(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast({ title: "Listing deleted", description: "The listing has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting listing", description: error.message, variant: "destructive" });
    },
  });

  const stats = useMemo(() => {
    if (!listings) return { total: 0, byStatus: { available: 0, pending: 0, sold: 0 } };
    const byStatus = listings.reduce(
      (acc, listing) => {
        acc[listing.status] = (acc[listing.status] ?? 0) + 1;
        return acc;
      },
      { available: 0, pending: 0, sold: 0 } as Record<ListingStatus, number>,
    );
    return { total: listings.length, byStatus };
  }, [listings]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">My listings</h2>
          <p className="text-sm text-muted-foreground">
            Manage availability, edit details, and review performance.
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/listings/new">Create listing</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="space-y-1 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
          <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
        </Card>
        {statusOptions.map((status) => (
          <Card key={status} className="space-y-1 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{status}</p>
            <p className="text-xl font-semibold text-foreground">{stats.byStatus[status]}</p>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <Card className="flex min-h-[240px] items-center justify-center">
          <Spinner size="lg" />
        </Card>
      ) : listings && listings.length ? (
        <div className="space-y-4">
          {listings.map((listing) => (
            <Card key={listing.id} className="p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground">{listing.title}</h3>
                    <Badge variant="secondary">{listing.category}</Badge>
                  </div>
                  <p className="max-w-2xl text-sm text-muted-foreground">{listing.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span>Condition: {listing.condition}</span>
                    <span>Price: ${Number(listing.price).toLocaleString()}</span>
                    <span>Location: {listing.location}</span>
                    <span>
                      Created {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3">
                  <Select
                    value={listing.status}
                    onValueChange={(value) =>
                      updateStatusMutation.mutate({ id: listing.id, status: value as ListingStatus })
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm" className="gap-1">
                      <Link to={`/dashboard/listings/${listing.id}/edit`}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1"
                      onClick={() => setSelectedForDeletion(listing.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-10 text-center">
          <p className="text-lg font-semibold text-foreground">No listings yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Create your first e-waste listing to start selling or donating devices. You can track requests and
            update status at any time.
          </p>
          <Button asChild>
            <Link to="/dashboard/listings/new">Create listing</Link>
          </Button>
        </Card>
      )}

      <AlertDialog open={Boolean(selectedForDeletion)} onOpenChange={(open) => !open && setSelectedForDeletion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete listing</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the listing and related requests.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (selectedForDeletion) {
                  deleteMutation.mutate(selectedForDeletion);
                  setSelectedForDeletion(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DashboardListings;
