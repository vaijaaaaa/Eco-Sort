import { fetchBuyerRequests, fetchListings, fetchSellerBuyRequests } from "@/services/listingService";
import type { ListingWithImages } from "@/services/listingService";

interface ActivityItem {
  id: string;
  type: "listing-created" | "listing-updated" | "buy-request" | "sale";
  title: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

export interface DashboardSummary {
  listings: ListingWithImages[];
  availableCount: number;
  pendingCount: number;
  soldCount: number;
  requestsAsSeller: Awaited<ReturnType<typeof fetchSellerBuyRequests>>;
  requestsAsBuyer: Awaited<ReturnType<typeof fetchBuyerRequests>>;
  recentActivity: ActivityItem[];
  totalRevenue: number;
}

export const fetchDashboardSummary = async (userId: string): Promise<DashboardSummary> => {
  const [listings, requestsAsSeller, requestsAsBuyer] = await Promise.all([
    fetchListings({ ownerId: userId }),
    fetchSellerBuyRequests(userId),
    fetchBuyerRequests(userId),
  ]);

  const availableCount = listings.filter((listing) => listing.status === "available").length;
  const pendingCount = listings.filter((listing) => listing.status === "pending").length;
  const soldCount = listings.filter((listing) => listing.status === "sold").length;
  const totalRevenue = listings
    .filter((listing) => listing.status === "sold")
    .reduce((acc, listing) => acc + Number(listing.price ?? 0), 0);

  const recentActivity: ActivityItem[] = [
    ...listings.slice(0, 5).map((listing) => ({
      id: listing.id,
      type: "listing-created" as const,
      title: `Listing created: ${listing.title}`,
      timestamp: listing.created_at,
      meta: { status: listing.status },
    })),
    ...requestsAsSeller.slice(0, 5).map((request) => ({
      id: request.id,
      type: "buy-request" as const,
      title: `Purchase request for ${request.listing?.title ?? "listing"}`,
      timestamp: request.created_at,
      meta: { status: request.status, buyer: request.buyer?.full_name ?? request.buyer?.email },
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  return {
    listings,
    availableCount,
    pendingCount,
    soldCount,
    requestsAsSeller,
    requestsAsBuyer,
    recentActivity,
    totalRevenue,
  };
};
