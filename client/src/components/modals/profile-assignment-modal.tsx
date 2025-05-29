import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Profile, type User } from "@shared/schema";

interface ProfileAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  onSuccess: () => void;
}

interface UserWithAssignment extends User {
  isAssigned: boolean;
}

export function ProfileAssignmentModal({ open, onOpenChange, profile, onSuccess }: ProfileAssignmentModalProps) {
  const { toast } = useToast();
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());

  const { data: users = [], isLoading } = useQuery<UserWithAssignment[]>({
    queryKey: ["/api/profiles", profile?.id, "users"],
    enabled: !!profile?.id && open,
    queryFn: async () => {
      const response = await fetch(`/api/profiles/${profile?.id}/users`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      return response.json();
    },
    refetchOnWindowFocus: false,
  });

  const assignMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/profiles/${profile?.id}/assign`, { userId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profile?.id, "users"] });
      toast({
        title: "Success",
        description: "Profile assigned successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Assignment failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unassignMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/profiles/${profile?.id}/users/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profile?.id, "users"] });
      toast({
        title: "Success",
        description: "Profile unassigned successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Unassignment failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUserToggle = (userId: number, isCurrentlyAssigned: boolean) => {
    if (isCurrentlyAssigned) {
      unassignMutation.mutate(userId);
    } else {
      assignMutation.mutate(userId);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    onSuccess();
  };

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Assign Profile: {profile.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground">
                Select users to assign this profile to:
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-2">
                {users.length > 0 ? (
                  users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      <Checkbox
                        checked={user.isAssigned}
                        onCheckedChange={() => handleUserToggle(user.id, user.isAssigned)}
                        disabled={assignMutation.isPending || unassignMutation.isPending}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{user.fullName}</div>
                        <div className="text-sm text-muted-foreground">@{user.username}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                      {user.isAssigned && (
                        <div className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                          Assigned
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No users available for assignment
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}