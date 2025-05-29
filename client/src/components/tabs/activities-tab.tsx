import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ActivityFormModal } from "@/components/modals/activity-form-modal";
import { ActivityExecutionModal } from "@/components/modals/activity-execution-modal";
import { Plus, Edit, Trash2, Play, FileText, Database, Fan } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Activity } from "@shared/schema";

export function ActivitiesTab() {
  const [selectedActivities, setSelectedActivities] = useState<Set<number>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const { toast } = useToast();

  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/activities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Activity deleted",
        description: "The activity has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleActivitySelect = (activityId: number, checked: boolean) => {
    const newSelected = new Set(selectedActivities);
    if (checked) {
      newSelected.add(activityId);
    } else {
      newSelected.delete(activityId);
    }
    setSelectedActivities(newSelected);
  };

  const handleEdit = () => {
    if (selectedActivities.size !== 1) {
      toast({
        title: "Invalid selection",
        description: "Please select exactly one activity to edit.",
        variant: "destructive",
      });
      return;
    }

    const activityId = Array.from(selectedActivities)[0];
    const activity = activities.find(a => a.id === activityId);
    if (activity) {
      setSelectedActivity(activity);
      setShowEditModal(true);
    }
  };

  const handleDelete = () => {
    if (selectedActivities.size === 0) {
      toast({
        title: "No selection",
        description: "Please select activities to delete.",
        variant: "destructive",
      });
      return;
    }

    selectedActivities.forEach(id => {
      deleteActivityMutation.mutate(id);
    });
    setSelectedActivities(new Set());
  };

  const handleRunActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowExecutionModal(true);
  };

  const getActivityIcon = (fileName: string) => {
    if (fileName.includes('health') || fileName.includes('check')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    if (fileName.includes('backup') || fileName.includes('db')) {
      return <Database className="h-5 w-5 text-blue-500" />;
    }
    if (fileName.includes('cleanup') || fileName.includes('log')) {
      return <Fan className="h-5 w-5 text-yellow-500" />;
    }
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading activities...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Regular Activities</h2>
          <div className="flex space-x-2">
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Activity
            </Button>
            <Button 
              variant="outline" 
              onClick={handleEdit}
              disabled={selectedActivities.size !== 1}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={selectedActivities.size === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Activities Grid */}
      <div className="flex-1 bg-card p-6 overflow-auto">
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No activities found</h3>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first regular activity.
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Activity
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map((activity) => (
              <Card key={activity.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedActivities.has(activity.id)}
                        onCheckedChange={(checked) => 
                          handleActivitySelect(activity.id, checked as boolean)
                        }
                      />
                      <CardTitle className="text-base">{activity.name}</CardTitle>
                    </div>
                    {getActivityIcon(activity.fileName)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                  
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Path:</span> {activity.path}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">File:</span> {activity.fileName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Created:</span> {new Date(activity.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => handleRunActivity(activity)}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Run Activity
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <ActivityFormModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
          onSuccess={() => {
            setShowAddModal(false);
            queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
          }}
        />
      )}

      {showEditModal && selectedActivity && (
        <ActivityFormModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          activity={selectedActivity}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedActivity(null);
            queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
          }}
        />
      )}

      {showExecutionModal && selectedActivity && (
        <ActivityExecutionModal
          open={showExecutionModal}
          onOpenChange={setShowExecutionModal}
          activity={selectedActivity}
          onClose={() => {
            setShowExecutionModal(false);
            setSelectedActivity(null);
          }}
        />
      )}
    </div>
  );
}
