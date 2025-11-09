import { z } from "zod";

export const listingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  category: z.string().min(2, "Choose a category"),
  condition: z.string().min(2, "Specify the condition"),
  description: z.string().min(20, "Provide a meaningful description"),
  price: z
    .number({ invalid_type_error: "Enter a valid price" })
    .min(0, "Price must be positive"),
  currency: z.string().default("USD"),
  location: z.string().min(2, "Location is required"),
  contactEmail: z.string().email("Provide a valid contact email"),
  contactPhone: z
    .string()
    .optional()
    .transform((value) => (value ? value.trim() : value)),
  status: z.enum(["available", "pending", "sold"]).default("available"),
  imageUrls: z
    .array(z.string().url("Provide a valid image URL"))
    .max(5, "Up to 5 images allowed")
    .default([]),
});

export type ListingFormValues = z.infer<typeof listingSchema>;
