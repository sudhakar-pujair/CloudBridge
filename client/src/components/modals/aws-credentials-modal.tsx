import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertAwsCredentialsSchema, type InsertAwsCredentials } from "@shared/schema";

interface AwsCredentialsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AwsCredentialsModal({ open, onOpenChange, onSuccess }: AwsCredentialsModalProps) {
  const { toast } = useToast();

  const form = useForm<InsertAwsCredentials>({
    resolver: zodResolver(insertAwsCredentialsSchema),
    defaultValues: {
      accountName: "",
      accountId: "",
      accessKey: "",
      secretKey: "",
    },
  });

  const createCredentialsMutation = useMutation({
    mutationFn: async (data: InsertAwsCredentials) => {
      const res = await apiRequest("POST", "/api/aws-credentials", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aws-credentials"] });
      toast({
        title: "AWS credentials added",
        description: "AWS credentials have been successfully added.",
      });
      onSuccess();
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertAwsCredentials) => {
    createCredentialsMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add AWS Credentials</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="accountName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Production Account" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AWS Account ID</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="123456789012" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accessKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Key ID</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="AKIA..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="secretKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secret Access Key</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} placeholder="Enter secret key" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCredentialsMutation.isPending}>
                {createCredentialsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Credentials
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
