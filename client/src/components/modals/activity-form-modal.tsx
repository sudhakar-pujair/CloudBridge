import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertActivitySchema, type InsertActivity, type Activity } from "@shared/schema";

interface ActivityFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: Activity | null;
  onSuccess: () => void;
}

export function ActivityFormModal({ open, onOpenChange, activity, onSuccess }: ActivityFormModalProps) {
  const { toast } = useToast();
  const isEditing = !!activity;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<InsertActivity>({
    resolver: zodResolver(insertActivitySchema),
    defaultValues: {
      name: activity?.name || "",
      description: activity?.description || "",
      path: activity?.path || "/opt/scripts/",
      fileName: activity?.fileName || "",
      scriptContent: activity?.scriptContent || "",
    },
  });

  const createActivityMutation = useMutation({
    mutationFn: async (data: InsertActivity) => {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("description", data.description);
      formData.append("path", data.path);
      formData.append("fileName", data.fileName);
      
      if (selectedFile) {
        formData.append("scriptFile", selectedFile);
      } else if (data.scriptContent) {
        formData.append("scriptContent", data.scriptContent);
      }

      const url = isEditing ? `/api/activities/${activity.id}` : "/api/activities";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || `Failed to ${isEditing ? "update" : "create"} activity`);
      }

      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: isEditing ? "Activity updated" : "Activity created",
        description: `Activity has been ${isEditing ? "updated" : "created"} successfully.`,
      });
      onSuccess();
      form.reset();
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-populate the file name if not set
      if (!form.getValues("fileName")) {
        form.setValue("fileName", file.name);
      }
    }
  };

  const handleSubmit = (data: InsertActivity) => {
    if (!selectedFile && !data.scriptContent && !isEditing) {
      toast({
        title: "Script required",
        description: "Please either upload a script file or enter script content",
        variant: "destructive",
      });
      return;
    }
    createActivityMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Activity" : "Add Activity"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name of the Activity</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., System Health Check" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Describe what this activity does..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="path"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Path</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="/opt/scripts/" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fileName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="script.sh" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <FormLabel>Script Upload</FormLabel>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('script-file')?.click()}
                    className="flex-1"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {selectedFile ? selectedFile.name : "Choose script file"}
                  </Button>
                  <input
                    id="script-file"
                    type="file"
                    accept=".sh,.py,.js,.ts,.sql"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>

              <div className="text-center text-muted-foreground">
                OR
              </div>

              <FormField
                control={form.control}
                name="scriptContent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Script Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Enter your script content here..."
                        rows={8}
                        className="font-mono text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createActivityMutation.isPending}>
                {createActivityMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update" : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
