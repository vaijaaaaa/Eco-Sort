import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Search, MapPin, DollarSign, Filter, Phone, Mail } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { createBuyRequest, fetchListings, type ListingStatus } from "@/services/listingService";

const categoryFilters = [
  "all",
  "Laptop",
  "Smartphone",
  "Tablet",
  "Desktop",
  "Accessories",
  "Audio",
  "Gaming",
  "Other",
];

const statusFilters: { label: string; value: ListingStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Available", value: "available" },
  { label: "Pending", value: "pending" },
  { label: "Sold", value: "sold" },
];

const Marketplace = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<ListingStatus | "all">("available");
  const [activeListingId, setActiveListingId] = useState<string | null>(null);
  const [message, setMessage] = useState("Hello! I'm interested in purchasing this item.");
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: listings, isLoading } = useQuery({
    queryKey: ["marketplace-listings", { search, category, status }],
    queryFn: () =>
      fetchListings({
        search: search.trim() || undefined,
        category: category !== "all" ? category : undefined,
        status: status !== "all" ? [status] : undefined,
      }),
  });

  const createRequest = useMutation({
    mutationFn: async ({ listingId, buyerId, note }: { listingId: string; buyerId: string; note: string }) => {
      await createBuyRequest(listingId, buyerId, note);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["buyer-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast({
        title: "Request sent",
        description: "The seller has been notified of your interest.",
      });
      setActiveListingId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Unable to send request", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmitRequest = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Create an account or sign in to contact sellers.",
        variant: "destructive",
      });
      return;
    }

    if (!activeListingId) return;

    createRequest.mutate({ listingId: activeListingId, buyerId: user.id, note: message });
  };

  const openRequestDialog = (listingId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Create an account or sign in to contact sellers.",
        variant: "destructive",
      });
      return;
    }
    setActiveListingId(listingId);
    setMessage("Hello! I'm interested in purchasing this item.");
  };
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12 space-y-3 text-center">
          <h1 className="text-4xl font-bold md:text-5xl">E-Waste Marketplace</h1>
          <p className="text-lg text-muted-foreground">
            Buy, sell, or donate electronics. Keep devices in circulation and reduce environmental impact.
          </p>
        </div>

        <Card className="mb-8 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search listings, locations, or descriptions"
                className="pl-10"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue placeholder="Category">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" /> Category
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categoryFilters.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={status} onValueChange={(value) => setStatus(value as ListingStatus | "all")}>
                <SelectTrigger className="sm:w-40">
                  <SelectValue placeholder="Status">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" /> Status
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {statusFilters.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button asChild>
                <Link to="/dashboard/listings/new">Post listing</Link>
              </Button>
            </div>
          </div>
        </Card>

        {isLoading ? (
          <Card className="flex min-h-[320px] items-center justify-center">
            <Spinner size="lg" />
          </Card>
        ) : listings && listings.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <Card key={listing.id} className="flex h-full flex-col overflow-hidden">
                {listing.images.length ? (
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-muted text-sm text-muted-foreground">
                    No image provided
                  </div>
                )}

                <div className="flex flex-1 flex-col gap-4 p-6">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{listing.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {listing.description ?? "No description provided."}
                        </p>
                      </div>
                      <Badge variant="secondary">{listing.category}</Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> {listing.location}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-4 w-4" /> {listing.contact_email ?? "—"}
                      </span>
                      {listing.contact_phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-4 w-4" /> {listing.contact_phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t pt-4">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-semibold text-foreground">
                        {Number(listing.price).toLocaleString()} {listing.currency ?? "USD"}
                      </span>
                    </div>
                    <Badge variant="outline">{listing.condition}</Badge>
                  </div>

                  <div className="mt-auto flex flex-col gap-2">
                    <Button
                      disabled={listing.status !== "available" || listing.owner_id === user?.id}
                      onClick={() => openRequestDialog(listing.id)}
                    >
                      {listing.status === "available" ? "Request to buy" : `Status: ${listing.status}`}
                    </Button>
                    {listing.owner && (
                      <p className="text-xs text-muted-foreground">
                        Seller: {listing.owner.full_name ?? "EcoSort seller"}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-lg font-semibold text-foreground">No listings match your filters</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Try updating your search keywords or exploring another category.
            </p>
            <Button variant="outline" onClick={() => setStatus("all")}>Reset filters</Button>
          </Card>
        )}

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          <Card className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Fair pricing</h3>
            <p className="text-sm text-muted-foreground">Get the most out of your electronics with transparent offers.</p>
          </Card>
          <Card className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
              <MapPin className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Local connections</h3>
            <p className="text-sm text-muted-foreground">Coordinate local pickups or shipping with trusted community members.</p>
          </Card>
          <Card className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-6 w-6 text-primary"
              >
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground">Eco-friendly impact</h3>
            <p className="text-sm text-muted-foreground">Keep electronics in use longer and reduce landfill contributions.</p>
          </Card>
        </div>
      </div>

      <Dialog open={Boolean(activeListingId)} onOpenChange={(open) => !open && !createRequest.isPending && setActiveListingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send purchase request</DialogTitle>
            <DialogDescription>
              Share a short message with the seller. They will receive your email address to follow up.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveListingId(null)} disabled={createRequest.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmitRequest} disabled={createRequest.isPending} className="gap-2">
              {createRequest.isPending && <Spinner size="sm" />}
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Marketplace;
