import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Settings } from "lucide-react";
import { z } from "zod";

interface UserPropertiesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: {
    instanceId: string;
    name: string;
    systemUser?: string;
    port?: number;
  } | null;
  onSave: (instanceId: string, systemUser: string, port: number) => void;
}

const formSchema = z.object({
  systemUser: z.string().min(1, "System user is required"),
  port: z.number().min(1).max(65535, "Port must be between 1 and 65535"),
});

type FormData = z.infer<typeof formSchema>;

export function UserPropertiesModal({ open, onOpenChange, instance, onSave }: UserPropertiesModalProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      systemUser: instance?.systemUser || "ec2-user",
      port: instance?.port || 22,
    },
  });

  const handleSubmit = (data: FormData) => {
    if (instance) {
      onSave(instance.instanceId, data.systemUser, data.port);
      onOpenChange(false);
    }
  };

  if (!instance) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Set Properties</span>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              <div className="font-medium">Instance: {instance.name}</div>
              <div>ID: {instance.instanceId}</div>
            </div>

            <FormField
              control={form.control}
              name="systemUser"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System User</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="ec2-user" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Port</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="number" 
                      placeholder="22"
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Save
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}