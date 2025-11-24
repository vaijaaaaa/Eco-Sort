import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { listingSchema, type ListingFormValues, materialTypes } from "@/lib/validators/listing";
import { createListing, fetchListingById, updateListing } from "@/services/listingService";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Upload, X, ImageIcon, Loader2, Leaf } from "lucide-react";
import { getMaterialInfo, formatCarbonAmount } from "@/services/carbonService";

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
      materialType: undefined,
      weightKg: undefined,
    },
  });
  const imageUrls = form.watch("imageUrls") ?? [];
  const materialType = form.watch("materialType");
  const weightKg = form.watch("weightKg");
  const [uploadingImages, setUploadingImages] = useState<boolean>(false);
  const [estimatedCarbon, setEstimatedCarbon] = useState<number | null>(null);

  // Calculate estimated carbon footprint when material type or weight changes
  useEffect(() => {
    const calculateCarbon = async () => {
      if (materialType && weightKg && weightKg > 0) {
        try {
          const { data, error } = await supabase.rpc("calculate_carbon_footprint", {
            p_material_type: materialType,
            p_weight_kg: weightKg,
          });
          if (!error && data) {
            setEstimatedCarbon(data);
          }
        } catch (error) {
          console.error("Error calculating carbon:", error);
        }
      } else {
        setEstimatedCarbon(null);
      }
    };
    calculateCarbon();
  }, [materialType, weightKg]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const current = form.getValues("imageUrls") ?? [];
    if (current.length + files.length > 5) {
      toast({
        title: "Too many images",
        description: "You can upload maximum 5 images",
        variant: "destructive",
      });
      return;
    }

    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith("image/")) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not an image file`,
            variant: "destructive",
          });
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds 5MB limit`,
            variant: "destructive",
          });
          continue;
        }

        // Create unique filename
        const fileExt = file.name.split(".").pop();
        const fileName = `${user!.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload to Supabase storage
        const { data, error } = await supabase.storage
          .from("listing-images")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) {
          throw error;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("listing-images")
          .getPublicUrl(data.path);

        uploadedUrls.push(publicUrl);
      }

      if (uploadedUrls.length > 0) {
        form.setValue("imageUrls", [...current, ...uploadedUrls]);
        toast({
          title: "Images uploaded",
          description: `Successfully uploaded ${uploadedUrls.length} image(s)`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setUploadingImages(false);
      // Reset input
      event.target.value = "";
    }
  };

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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

        {/* Carbon Footprint Section */}
        <div className="space-y-4 rounded-lg border border-green-200 bg-green-50/50 p-4 dark:border-green-800 dark:bg-green-950/20">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-green-600 dark:text-green-500" />
            <h3 className="font-semibold text-green-900 dark:text-green-100">Carbon Footprint Tracking (Optional)</h3>
          </div>
          <p className="text-sm text-green-700 dark:text-green-300">
            Help buyers understand the environmental impact of reusing this item instead of buying new.
          </p>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="materialType">Material Type</Label>
              <Select 
                onValueChange={(value) => form.setValue("materialType", value as any)} 
                value={form.watch("materialType")}
              >
                <SelectTrigger id="materialType">
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {materialTypes.map((material) => {
                    const info = getMaterialInfo(material);
                    return (
                      <SelectItem key={material} value={material}>
                        <span className="flex items-center gap-2">
                          <span>{info.icon}</span>
                          <span>{info.name}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {form.formState.errors.materialType && (
                <p className="text-xs text-destructive">{form.formState.errors.materialType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="weightKg">Weight (kg)</Label>
              <Input
                id="weightKg"
                type="number"
                step="0.001"
                min="0"
                placeholder="0.5"
                {...form.register("weightKg", { valueAsNumber: true })}
              />
              {form.formState.errors.weightKg && (
                <p className="text-xs text-destructive">{form.formState.errors.weightKg.message}</p>
              )}
            </div>
          </div>

          {estimatedCarbon !== null && estimatedCarbon > 0 && (
            <div className="rounded-md bg-green-100 p-3 dark:bg-green-900/30">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Estimated Carbon Saved: <span className="text-lg font-bold">{formatCarbonAmount(estimatedCarbon)}</span>
              </p>
              <p className="mt-1 text-xs text-green-700 dark:text-green-300">
                By reusing this item instead of manufacturing a new one
              </p>
            </div>
          )}
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
            <Label>Images</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("image-upload")?.click()}
                disabled={imageUrls.length >= 5 || uploadingImages}
                className="gap-2"
              >
                {uploadingImages ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload images
                  </>
                )}
              </Button>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
                disabled={imageUrls.length >= 5 || uploadingImages}
              />
            </div>
          </div>

          {imageUrls.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {imageUrls.map((url, index) => (
                <div key={index} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                  {url ? (
                    <>
                      <img
                        src={url}
                        alt={`Listing image ${index + 1}`}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f0f0f0' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%23999'%3ENo Image%3C/text%3E%3C/svg%3E";
                        }}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute right-2 top-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Invalid URL</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/20 p-8 text-center">
              <ImageIcon className="mb-3 h-12 w-12 text-muted-foreground/50" />
              <p className="mb-1 text-sm font-medium text-foreground">No images uploaded</p>
              <p className="text-xs text-muted-foreground">
                Upload up to 5 images to showcase your listing
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Supported formats: JPG, PNG, GIF (max 5MB each)
              </p>
            </div>
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
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Create listing"}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default DashboardListingForm;
