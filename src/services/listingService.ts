import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type ListingStatus = Tables<"listings">["status"];
export type Listing = Tables<"listings"> & {
  images?: { url: string }[];
  owner?: Pick<Tables<"profiles">, "id" | "full_name" | "avatar_url">;
};
export type ListingWithImages = Omit<Tables<"listings">, "created_at" | "updated_at"> & {
  created_at: string;
  updated_at: string;
  images: string[];
  owner?: Pick<Tables<"profiles">, "id" | "full_name" | "avatar_url">;
};

interface ListingFilters {
  ownerId?: string;
  category?: string;
  status?: ListingStatus[];
  search?: string;
}

const mapListing = (listing: Listing): ListingWithImages => ({
  ...listing,
  images: listing.images?.map((image) => image.url) ?? [],
});

export const fetchListings = async (filters?: ListingFilters) => {
  let query = supabase
    .from("listings")
    .select("*, images:listing_images(url), owner:profiles(id, full_name, avatar_url)")
    .order("created_at", { ascending: false });

  if (filters?.ownerId) {
    query = query.eq("owner_id", filters.ownerId);
  }

  if (filters?.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }

  if (filters?.status?.length) {
    query = query.in("status", filters.status);
  }

  if (filters?.search) {
    const keyword = `%${filters.search}%`;
    query = query.or(`title.ilike.${keyword},description.ilike.${keyword},location.ilike.${keyword}`);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapListing);
};

export const fetchListingById = async (id: string) => {
  const { data, error } = await supabase
    .from("listings")
    .select("*, images:listing_images(url), owner:profiles(id, full_name, avatar_url)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapListing(data) : null;
};

export const createListing = async (
  payload: TablesInsert<"listings"> & { imageUrls?: string[] },
) => {
  const { imageUrls = [], ...listingPayload } = payload;

  const { data, error } = await supabase
    .from("listings")
    .insert(listingPayload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (imageUrls.length) {
    const imageRows = imageUrls.map((url) => ({ listing_id: data.id, url }));
    const { error: imageError } = await supabase.from("listing_images").insert(imageRows);
    if (imageError) {
      throw imageError;
    }
  }

  return fetchListingById(data.id);
};

export const updateListing = async (
  id: string,
  payload: TablesUpdate<"listings"> & { imageUrls?: string[] },
) => {
  const { imageUrls, ...updatePayload } = payload;

  if (Object.keys(updatePayload).length) {
    const { error } = await supabase
      .from("listings")
      .update({ ...updatePayload, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      throw error;
    }
  }

  if (imageUrls) {
    const { error: deleteError } = await supabase.from("listing_images").delete().eq("listing_id", id);
    if (deleteError) {
      throw deleteError;
    }

    if (imageUrls.length) {
      const { error: insertError } = await supabase
        .from("listing_images")
        .insert(imageUrls.map((url) => ({ listing_id: id, url })));
      if (insertError) {
        throw insertError;
      }
    }
  }

  return fetchListingById(id);
};

export const deleteListing = async (id: string) => {
  const { error: imagesError } = await supabase.from("listing_images").delete().eq("listing_id", id);
  if (imagesError) {
    throw imagesError;
  }

  const { error } = await supabase.from("listings").delete().eq("id", id);
  if (error) {
    throw error;
  }
};

export const createBuyRequest = async (
  listingId: string,
  buyerId: string,
  message: string | null,
) => {
  const payload: TablesInsert<"buy_requests"> = {
    listing_id: listingId,
    buyer_id: buyerId,
    message,
    status: "pending",
  };

  const { data, error } = await supabase
    .from("buy_requests")
    .insert(payload)
    .select("*, listing:listings(title, price, status), buyer:profiles(full_name, email)")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const fetchSellerBuyRequests = async (sellerId: string) => {
  const { data, error } = await supabase
    .from("buy_requests")
    .select(
      "*, buyer:profiles(full_name, email, id), listing:listings(id, title, status, price, location, owner_id)"
    )
    .eq("listing.owner_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const fetchBuyerRequests = async (buyerId: string) => {
  const { data, error } = await supabase
    .from("buy_requests")
    .select(
      "*, listing:listings(id, title, status, price, location, owner_id, contact_email, contact_phone)"
    )
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
};