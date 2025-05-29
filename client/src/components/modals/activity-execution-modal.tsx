import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Play, X, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Activity } from "@shared/schema";

interface ActivityExecutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: Activity;
  onClose: () => void;
}

interface ExecutionLog {
  timestamp: string;
  type: "info" | "success" | "error" | "warning";
  message: string;
}

export function ActivityExecutionModal({ open, onOpenChange, activity, onClose }: ActivityExecutionModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedScript, setSelectedScript] = useState("");
  const [parameters, setParameters] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [executionStatus, setExecutionStatus] = useState<"idle" | "running" | "success" | "error">("idle");

  // Mock available scripts - in real app, this would fetch from the user's directory
  const availableScripts = [
    `${activity.path}${activity.fileName}`,
    `/home/${user?.username}/${activity.fileName}`,
    `/home/${user?.username}/scripts/${activity.fileName}`,
  ];

  const addLog = (type: ExecutionLog["type"], message: string) => {
    setExecutionLogs(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
    }]);
  };

  const handleRunScript = async () => {
    if (!selectedScript) {
      toast({
        title: "No script selected",
        description: "Please select a script to execute",
        variant: "destructive",
      });
      return;
    }

    setIsExecuting(true);
    setExecutionStatus("running");
    setExecutionLogs([]);

    try {
      addLog("info", `Starting execution of ${selectedScript}`);
      addLog("info", `Parameters: ${parameters || "None"}`);
      
      // Simulate script execution - in real app, this would use WebSocket to backend
      setTimeout(() => {
        addLog("info", "Initializing script environment...");
      }, 500);

      setTimeout(() => {
        addLog("info", "Executing script commands...");
      }, 1000);

      setTimeout(() => {
        addLog("success", "✓ Script executed successfully");
        addLog("info", "Exit code: 0");
        setExecutionStatus("success");
        setIsExecuting(false);
        
        toast({
          title: "Execution complete",
          description: "Script executed successfully",
        });
      }, 3000);

    } catch (error) {
      addLog("error", `Execution failed: ${error}`);
      setExecutionStatus("error");
      setIsExecuting(false);
      
      toast({
        title: "Execution failed",
        description: "An error occurred while executing the script",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = () => {
    switch (executionStatus) {
      case "running":
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getLogIcon = (type: ExecutionLog["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "error":
        return <XCircle className="h-3 w-3 text-red-500" />;
      case "warning":
        return <Clock className="h-3 w-3 text-yellow-500" />;
      default:
        return <div className="h-3 w-3 rounded-full bg-blue-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <DialogTitle>Run Activity: {activity.name}</DialogTitle>
              {getStatusIcon()}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Select Script</Label>
              <Select value={selectedScript} onValueChange={setSelectedScript}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose script to execute" />
                </SelectTrigger>
                <SelectContent>
                  {availableScripts.map((script) => (
                    <SelectItem key={script} value={script}>
                      {script}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center space-x-2 px-3 py-2 border rounded-md bg-muted/30">
                {getStatusIcon()}
                <span className="text-sm capitalize">
                  {executionStatus === "idle" ? "Ready" : executionStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Parameters</Label>
            <Textarea
              value={parameters}
              onChange={(e) => setParameters(e.target.value)}
              placeholder="Enter parameters or input values (one per line)..."
              rows={3}
              disabled={isExecuting}
            />
          </div>

          <Card className="flex-1 flex flex-col">
            <div className="p-3 border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Execution Output</h4>
                <Button
                  onClick={handleRunScript}
                  disabled={isExecuting || !selectedScript}
                  size="sm"
                >
                  {isExecuting ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-pulse" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Run Script
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <CardContent className="flex-1 p-0">
              <div className="h-64 overflow-auto bg-gray-900 text-green-400 font-mono text-sm p-4">
                {executionLogs.length === 0 ? (
                  <div className="text-gray-500">
                    Output will appear here when you run the script...
                  </div>
                ) : (
                  <div className="space-y-1">
                    {executionLogs.map((log, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="flex-shrink-0 mt-1">
                          {getLogIcon(log.type)}
                        </div>
                        <div className="flex-1">
                          <span className="text-gray-400 text-xs mr-2">
                            [{log.timestamp}]
                          </span>
                          <span className={
                            log.type === "error" ? "text-red-400" :
                            log.type === "success" ? "text-green-400" :
                            log.type === "warning" ? "text-yellow-400" :
                            "text-green-400"
                          }>
                            {log.message}
                          </span>
                        </div>
                      </div>
                    ))}
                    {isExecuting && (
                      <div className="flex items-center space-x-2 animate-pulse">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span>Executing...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
