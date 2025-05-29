import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  onSuccess: () => void;
}

const userFormSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["Administrator", "Developer"]),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  skipPasswordChange: z.boolean().optional(),
}).refine((data) => {
  // If not skipping password change and password is provided, require confirmation
  if (!data.skipPasswordChange && data.password && data.confirmPassword !== data.password) {
    return false;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type UserFormData = z.infer<typeof userFormSchema>;

export function UserFormModal({ open, onOpenChange, user, onSuccess }: UserFormModalProps) {
  const { toast } = useToast();
  const [skipPasswordChange, setSkipPasswordChange] = useState(!!user);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      username: user?.username || "",
      email: user?.email || "",
      role: user?.role || "Developer",
      password: "",
      confirmPassword: "",
      skipPasswordChange: !!user,
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const endpoint = user ? `/api/users/${user.id}` : "/api/users";
      const method = user ? "PUT" : "POST";
      
      // Prepare data - remove password fields if skipping password change
      const submitData = { ...data };
      if (skipPasswordChange && user) {
        delete submitData.password;
        delete submitData.confirmPassword;
      }
      delete submitData.skipPasswordChange;

      const res = await apiRequest(method, endpoint, submitData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: user ? "User updated successfully" : "User created successfully",
        description: user ? "User details have been updated." : "New user has been created.",
      });
      onSuccess();
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: user ? "Failed to update user" : "Failed to create user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };

  const handleSkipPasswordChangeToggle = (checked: boolean) => {
    setSkipPasswordChange(checked);
    form.setValue("skipPasswordChange", checked);
    if (checked) {
      form.setValue("password", "");
      form.setValue("confirmPassword", "");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{user ? "Edit User" : "Create User"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Developer">Developer</SelectItem>
                      <SelectItem value="Administrator">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {user && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="skipPasswordChange"
                  checked={skipPasswordChange}
                  onCheckedChange={handleSkipPasswordChangeToggle}
                />
                <Label htmlFor="skipPasswordChange">
                  Do not require password change
                </Label>
              </div>
            )}

            {!skipPasswordChange && (
              <>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {user ? "Update User" : "Create User"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}