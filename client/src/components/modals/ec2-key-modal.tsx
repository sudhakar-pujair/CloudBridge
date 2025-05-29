import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertEc2KeySchema, type InsertEc2Key, type AwsCredentials } from "@shared/schema";
import { z } from "zod";

interface Ec2KeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const formSchema = insertEc2KeySchema.omit({ pemFileContent: true }).extend({
  pemFile: z.any().optional(),
});

type FormData = z.infer<typeof formSchema>;

const AWS_REGIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-east-2", label: "US East (Ohio)" },
  { value: "us-west-1", label: "US West (N. California)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "us-gov-east-1", label: "AWS GovCloud (US-East)" },
  { value: "us-gov-west-1", label: "AWS GovCloud (US-West)" },
  { value: "eu-west-1", label: "Europe (Ireland)" },
  { value: "eu-west-2", label: "Europe (London)" },
  { value: "eu-west-3", label: "Europe (Paris)" },
  { value: "eu-central-1", label: "Europe (Frankfurt)" },
  { value: "eu-central-2", label: "Europe (Zurich)" },
  { value: "eu-north-1", label: "Europe (Stockholm)" },
  { value: "eu-south-1", label: "Europe (Milan)" },
  { value: "eu-south-2", label: "Europe (Spain)" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
  { value: "ap-southeast-3", label: "Asia Pacific (Jakarta)" },
  { value: "ap-southeast-4", label: "Asia Pacific (Melbourne)" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
  { value: "ap-northeast-2", label: "Asia Pacific (Seoul)" },
  { value: "ap-northeast-3", label: "Asia Pacific (Osaka)" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai)" },
  { value: "ap-south-2", label: "Asia Pacific (Hyderabad)" },
  { value: "ap-east-1", label: "Asia Pacific (Hong Kong)" },
  { value: "ca-central-1", label: "Canada (Central)" },
  { value: "ca-west-1", label: "Canada (Calgary)" },
  { value: "sa-east-1", label: "South America (São Paulo)" },
  { value: "af-south-1", label: "Africa (Cape Town)" },
  { value: "me-south-1", label: "Middle East (Bahrain)" },
  { value: "me-central-1", label: "Middle East (UAE)" },
  { value: "il-central-1", label: "Israel (Tel Aviv)" },
];

export function Ec2KeyModal({ open, onOpenChange, onSuccess }: Ec2KeyModalProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: awsCredentials = [] } = useQuery<AwsCredentials[]>({
    queryKey: ["/api/aws-credentials"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      keyName: "",
      region: "",
      awsCredentialId: 0,
    },
  });

  const createKeyMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!selectedFile) {
        throw new Error("PEM file is required");
      }

      const formData = new FormData();
      formData.append("keyName", data.keyName);
      formData.append("region", data.region);
      formData.append("awsCredentialId", data.awsCredentialId.toString());
      formData.append("pemFile", selectedFile);

      const res = await fetch("/api/ec2-keys", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to upload EC2 key");
      }

      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ec2-keys"] });
      toast({
        title: "EC2 key added",
        description: "EC2 key has been successfully uploaded.",
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
      if (!file.name.endsWith('.pem')) {
        toast({
          title: "Invalid file type",
          description: "Please select a .pem file",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = (data: FormData) => {
    if (!selectedFile) {
      toast({
        title: "File required",
        description: "Please select a PEM file to upload",
        variant: "destructive",
      });
      return;
    }
    createKeyMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add EC2 Key</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="awsCredentialId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AWS Account</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select AWS account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {awsCredentials.map((cred) => (
                        <SelectItem key={cred.id} value={cred.id.toString()}>
                          {cred.accountName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>EC2 Region</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AWS_REGIONS.map((region) => (
                        <SelectItem key={region.value} value={region.value}>
                          {region.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="keyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key Pair Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., production-key" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>PEM File</FormLabel>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('pem-file')?.click()}
                  className="flex-1"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {selectedFile ? selectedFile.name : "Choose PEM file"}
                </Button>
                <input
                  id="pem-file"
                  type="file"
                  accept=".pem"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              {!selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Upload the .pem file for this key pair
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createKeyMutation.isPending || !selectedFile}>
                {createKeyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Key
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
