import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertProfileSchema, type InsertProfile, type Profile } from "@shared/schema";

interface ProfileFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: Profile | null;
  onSuccess: () => void;
}

interface AwsTag {
  key: string;
  value: string;
}

export function ProfileFormModal({ open, onOpenChange, profile, onSuccess }: ProfileFormModalProps) {
  const { toast } = useToast();
  const isEditing = !!profile;
  const [awsTags, setAwsTags] = useState<AwsTag[]>(() => {
    if (profile?.awsTags) {
      return Object.entries(profile.awsTags as Record<string, string>).map(([key, value]) => ({ key, value }));
    }
    return [{ key: "", value: "" }];
  });

  const form = useForm<InsertProfile>({
    resolver: zodResolver(insertProfileSchema),
    defaultValues: {
      name: profile?.name || "",
      awsTags: profile?.awsTags || {},
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data: InsertProfile) => {
      if (isEditing) {
        const res = await apiRequest("PUT", `/api/profiles/${profile.id}`, data);
        return await res.json();
      } else {
        const res = await apiRequest("POST", "/api/profiles", data);
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      toast({
        title: isEditing ? "Profile updated" : "Profile created",
        description: `Profile has been ${isEditing ? "updated" : "created"} successfully.`,
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addTag = () => {
    setAwsTags([...awsTags, { key: "", value: "" }]);
  };

  const removeTag = (index: number) => {
    if (awsTags.length > 1) {
      setAwsTags(awsTags.filter((_, i) => i !== index));
    }
  };

  const updateTag = (index: number, field: 'key' | 'value', value: string) => {
    const newTags = [...awsTags];
    newTags[index][field] = value;
    setAwsTags(newTags);
  };

  const handleSubmit = (data: InsertProfile) => {
    const tagsObject = awsTags.reduce((acc, tag) => {
      if (tag.key && tag.value) {
        acc[tag.key] = tag.value;
      }
      return acc;
    }, {} as Record<string, string>);

    createProfileMutation.mutate({
      ...data,
      awsTags: tagsObject,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Profile" : "Add Profile"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Production Environment" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>AWS Tags</FormLabel>
              {awsTags.map((tag, index) => (
                <div key={index} className="flex space-x-2">
                  <Input
                    placeholder="Key"
                    value={tag.key}
                    onChange={(e) => updateTag(index, 'key', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Value"
                    value={tag.value}
                    onChange={(e) => updateTag(index, 'value', e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeTag(index)}
                    disabled={awsTags.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTag}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Tag
              </Button>
            </div>

            {awsTags.some(tag => tag.key && tag.value) && (
              <div className="space-y-2">
                <FormLabel>Preview</FormLabel>
                <div className="flex flex-wrap gap-1">
                  {awsTags
                    .filter(tag => tag.key && tag.value)
                    .map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag.key}: {tag.value}
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createProfileMutation.isPending}>
                {createProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
