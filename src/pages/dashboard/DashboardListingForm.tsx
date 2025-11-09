import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { listingSchema, type ListingFormValues } from "@/lib/validators/listing";
import { createListing, fetchListingById, updateListing } from "@/services/listingService";

const categories = [
  "Laptop",
  "Smartphone",
  "Tablet",
  "Desktop",
  "Accessories",
  "Audio",
  "Gaming",
  "Other",
];

const conditions = ["Like new", "Excellent", "Good", "Fair", "Needs repair"];

const DashboardListingForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isEdit = Boolean(id);

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: "",
      category: "",
      condition: "",
      description: "",
      price: 0,
      currency: "USD",
      location: "",
      contactEmail: user?.email ?? "",
      contactPhone: "",
      status: "available",
      imageUrls: [],
    },
  });
  const imageUrls = form.watch("imageUrls") ?? [];

  const handleAddImage = () => {
    const current = form.getValues("imageUrls") ?? [];
    if (current.length >= 5) {
      return;
    }
    form.setValue("imageUrls", [...current, ""]);
  };

  const handleRemoveImage = (index: number) => {
    const current = form.getValues("imageUrls") ?? [];
    form.setValue(
      "imageUrls",
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const { data: listing, isLoading: listingLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListingById(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (listing) {
      form.reset({
        title: listing.title,
        category: listing.category,
        condition: listing.condition,
        description: listing.description ?? "",
        price: Number(listing.price) ?? 0,
        currency: listing.currency ?? "USD",
        location: listing.location,
        contactEmail: listing.contact_email ?? user?.email ?? "",
        contactPhone: listing.contact_phone ?? "",
        status: listing.status,
        imageUrls: listing.images ?? [],
      });
    }
  }, [listing, form, user?.email]);

  const createMutation = useMutation({
    mutationFn: (values: ListingFormValues) =>
      createListing({
        owner_id: user!.id,
        title: values.title,
        category: values.category,
        condition: values.condition,
        description: values.description,
        price: values.price,
        currency: values.currency,
        location: values.location,
        contact_email: values.contactEmail,
        contact_phone: values.contactPhone ?? null,
        status: values.status,
        imageUrls: values.imageUrls?.filter(Boolean),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast({ title: "Listing created", description: "Your listing is now live." });
      navigate("/dashboard/listings");
    },
    onError: (error: Error) => {
      toast({ title: "Error creating listing", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: ListingFormValues) =>
      updateListing(id!, {
        title: values.title,
        category: values.category,
        condition: values.condition,
        description: values.description,
        price: values.price,
        currency: values.currency,
        location: values.location,
        contact_email: values.contactEmail,
        contact_phone: values.contactPhone ?? null,
        status: values.status,
        imageUrls: values.imageUrls?.filter(Boolean),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast({ title: "Listing updated", description: "Changes saved successfully." });
      navigate("/dashboard/listings");
    },
    onError: (error: Error) => {
      toast({ title: "Error updating listing", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: ListingFormValues) => {
    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const formTitle = useMemo(() => (isEdit ? "Edit listing" : "Create listing"), [isEdit]);

  if (listingLoading) {
    return (
      <Card className="flex min-h-[320px] items-center justify-center">
        <Spinner size="lg" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6 space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">{formTitle}</h2>
        <p className="text-sm text-muted-foreground">
          Provide detailed information so buyers can evaluate your listing with confidence.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="14-inch MacBook Pro" {...form.register("title")} />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select onValueChange={(value) => form.setValue("category", value)} value={form.watch("category")}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.category && (
              <p className="text-xs text-destructive">{form.formState.errors.category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition">Condition</Label>
            <Select onValueChange={(value) => form.setValue("condition", value)} value={form.watch("condition")}>
              <SelectTrigger id="condition">
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {conditions.map((condition) => (
                  <SelectItem key={condition} value={condition}>
                    {condition}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.condition && (
              <p className="text-xs text-destructive">{form.formState.errors.condition.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price (USD)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              {...form.register("price", { valueAsNumber: true })}
            />
            {form.formState.errors.price && (
              <p className="text-xs text-destructive">{form.formState.errors.price.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" placeholder="San Francisco, CA" {...form.register("location")} />
            {form.formState.errors.location && (
              <p className="text-xs text-destructive">{form.formState.errors.location.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select onValueChange={(value) => form.setValue("status", value as ListingFormValues["status"])} value={form.watch("status")}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.status && (
              <p className="text-xs text-destructive">{form.formState.errors.status.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={6}
            placeholder="Include device specs, current condition, accessories, and any known issues."
            {...form.register("description")}
          />
          {form.formState.errors.description && (
            <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact email</Label>
            <Input id="contactEmail" type="email" {...form.register("contactEmail")} />
            {form.formState.errors.contactEmail && (
              <p className="text-xs text-destructive">{form.formState.errors.contactEmail.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">Contact phone (optional)</Label>
            <Input id="contactPhone" placeholder="+1 415 555 1234" {...form.register("contactPhone")} />
            {form.formState.errors.contactPhone && (
              <p className="text-xs text-destructive">{form.formState.errors.contactPhone.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Image URLs</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddImage}
              disabled={imageUrls.length >= 5}
            >
              Add image
            </Button>
          </div>

          {imageUrls.length ? (
            <div className="space-y-3">
              {imageUrls.map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Input
                    placeholder="https://"
                    {...form.register(`imageUrls.${index}` as const)}
                    className="flex-1"
                  />
                  <Button type="button" variant="ghost" onClick={() => handleRemoveImage(index)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add up to five image URLs to showcase your listing. Cloud storage or CDN links work best.
            </p>
          )}

          {form.formState.errors.imageUrls && (
            <p className="text-xs text-destructive">{form.formState.errors.imageUrls.message as string}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting && <Spinner size="sm" />}
            {isEdit ? "Save changes" : "Create listing"}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default DashboardListingForm;
