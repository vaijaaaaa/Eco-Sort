import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProfile } from "@/services/profileService";

interface ProfileFormValues {
  fullName: string;
  location: string;
  phone: string;
  bio: string;
  avatarUrl: string;
}

const DashboardProfile = () => {
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProfileFormValues>({
    defaultValues: {
      fullName: profile?.full_name ?? "",
      location: profile?.location ?? "",
      phone: profile?.phone ?? "",
      bio: profile?.bio ?? "",
      avatarUrl: profile?.avatar_url ?? "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        fullName: profile.full_name ?? "",
        location: profile.location ?? "",
        phone: profile.phone ?? "",
        bio: profile.bio ?? "",
        avatarUrl: profile.avatar_url ?? "",
      });
    }
  }, [profile, form]);

  const mutation = useMutation({
    mutationFn: (values: ProfileFormValues) =>
      updateProfile(user!.id, {
        full_name: values.fullName,
        location: values.location || null,
        phone: values.phone || null,
        bio: values.bio || null,
        avatar_url: values.avatarUrl || null,
      }),
    onSuccess: async () => {
      await refreshProfile();
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast({ title: "Profile updated", description: "Your information was saved successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error updating profile", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: ProfileFormValues) => {
    mutation.mutate(values);
  };

  if (!profile) {
    return (
      <Card className="flex min-h-[320px] items-center justify-center">
        <Spinner size="lg" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6 space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Profile</h2>
        <p className="text-sm text-muted-foreground">Update your personal details and contact preferences.</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" placeholder="Alex Johnson" {...form.register("fullName", { required: true })} />
            {form.formState.errors.fullName && (
              <p className="text-xs text-destructive">Full name is required.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ""} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" placeholder="San Francisco, CA" {...form.register("location")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" placeholder="+1 415 555 1234" {...form.register("phone")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="avatarUrl">Avatar URL</Label>
          <Input id="avatarUrl" placeholder="https://" {...form.register("avatarUrl")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            rows={5}
            placeholder="Share your interests, sustainability goals, or expertise."
            {...form.register("bio")}
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="submit" disabled={mutation.isPending} className="gap-2">
            {mutation.isPending && <Spinner size="sm" />}
            Save profile
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default DashboardProfile;
