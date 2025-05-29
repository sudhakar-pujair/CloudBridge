import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plug, Search, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserPropertiesModal } from "@/components/modals/user-properties-modal";

interface EC2Instance {
  instanceId: string;
  name: string;
  privateIp: string;
  publicIp: string;
  state: string;
  instanceType: string;
  region: string;
  keyName: string;
  systemUser?: string;
  port?: number;
  credentialId?: number;
  accountName?: string;
}

interface AwsCredentials {
  id: number;
  accountName: string;
  accountId: string;
}

export function SSHTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("running");
  const [selectedInstances, setSelectedInstances] = useState<Set<string>>(new Set());
  const [showUserPropertiesModal, setShowUserPropertiesModal] = useState(false);
  const [editingInstance, setEditingInstance] = useState<EC2Instance | null>(null);
  const [instanceProperties, setInstanceProperties] = useState<Map<string, { systemUser: string; port: number }>>(new Map());
  const { toast } = useToast();

  const { data: instances = [], isLoading: instancesLoading } = useQuery<EC2Instance[]>({
    queryKey: ["/api/ec2-instances/all"],
    queryFn: async () => {
      const response = await fetch("/api/ec2-instances/all", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch instances");
      }
      return response.json();
    },
    refetchOnWindowFocus: false,
  });

  const filteredInstances = instances.filter(instance => {
    const matchesSearch = instance.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instance.privateIp.includes(searchQuery) ||
      instance.instanceId.includes(searchQuery);
    
    const matchesState = stateFilter === "all" || instance.state.toLowerCase() === stateFilter.toLowerCase();
    
    return matchesSearch && matchesState;
  });

  const handleInstanceSelect = (instanceId: string, checked: boolean) => {
    const newSelected = new Set(selectedInstances);
    if (checked) {
      newSelected.add(instanceId);
    } else {
      newSelected.delete(instanceId);
    }
    setSelectedInstances(newSelected);
  };

  const handleConnect = () => {
    const instancesToConnect = instances.filter(instance => 
      selectedInstances.has(instance.instanceId)
    );
    
    if (instancesToConnect.length === 0) {
      toast({
        title: "No instances selected",
        description: "Please select at least one instance to connect.",
        variant: "destructive",
      });
      return;
    }

    // Check if all instances have credentials
    const instancesWithoutCredentials = instancesToConnect.filter(instance => !instance.credentialId);
    if (instancesWithoutCredentials.length > 0) {
      toast({
        title: "Missing credentials",
        description: `Some instances don't have associated AWS credentials.`,
        variant: "destructive",
      });
      return;
    }

    // Navigate to terminal management page with selected instances
    const instanceIds = instancesToConnect.map(instance => instance.instanceId).join(',');
    window.location.href = `/terminal-management?instances=${instanceIds}`;

    toast({
      title: "Opening terminal management",
      description: `Connecting to ${instancesToConnect.length} instance(s).`,
    });
  };

  const handleUserClick = (instance: EC2Instance) => {
    setEditingInstance(instance);
    setShowUserPropertiesModal(true);
  };

  const handleSaveUserProperties = (instanceId: string, systemUser: string, port: number) => {
    setInstanceProperties(prev => new Map(prev.set(instanceId, { systemUser, port })));
    toast({
      title: "Properties updated",
      description: "User properties have been saved.",
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">SSH Connections</h2>
        </div>

        <div className="flex space-x-4">
          <div className="w-64 relative">
            <div className="text-sm font-medium text-foreground mb-2">Search Instances</div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search servers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-48">
            <div className="text-sm font-medium text-foreground mb-2">Current State</div>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="stopping">Stopping</SelectItem>
                <SelectItem value="shutting-down">Shutting-down</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
                <SelectItem value="stopped">Stopped</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleConnect} disabled={selectedInstances.size === 0}>
              Connect SSH
            </Button>
          </div>
        </div>
      </div>

      {/* Server List - Full Width */}
      <div className="flex-1 p-6">
        {instancesLoading ? (
          <div className="text-center text-muted-foreground py-8">
            Loading instances...
          </div>
        ) : instances.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No instances found. Please add AWS credentials and EC2 keys in Settings.
          </div>
        ) : filteredInstances.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No instances match your search criteria
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={filteredInstances.length > 0 && filteredInstances.every(instance => 
                      selectedInstances.has(instance.instanceId)
                    )}
                    onCheckedChange={(checked) => {
                      const newSelected = new Set<string>();
                      if (checked) {
                        filteredInstances.forEach(instance => 
                          newSelected.add(instance.instanceId)
                        );
                      }
                      setSelectedInstances(newSelected);
                    }}
                  />
                </TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Instance ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Region</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInstances.map((instance) => {
                const userProps = instanceProperties.get(instance.instanceId);
                const systemUser = userProps?.systemUser || instance.systemUser || 'ec2-user';
                const port = userProps?.port || instance.port || 22;
                
                return (
                  <TableRow key={instance.instanceId}>
                    <TableCell>
                      <Checkbox
                        checked={selectedInstances.has(instance.instanceId)}
                        onCheckedChange={(checked) => 
                          handleInstanceSelect(instance.instanceId, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{instance.name}</div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {instance.instanceId}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1 text-left justify-start"
                        onClick={() => handleUserClick(instance)}
                      >
                        <div className="flex items-center space-x-1">
                          <span className="text-sm">{systemUser}:{port}</span>
                          <Settings className="h-3 w-3 opacity-50" />
                        </div>
                      </Button>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {instance.privateIp || instance.publicIp || 'No IP'}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        instance.state === 'running' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                        instance.state === 'stopped' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                        instance.state === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                      }`}>
                        {instance.state}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {instance.region}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* User Properties Modal */}
      {showUserPropertiesModal && editingInstance && (
        <UserPropertiesModal
          open={showUserPropertiesModal}
          onOpenChange={setShowUserPropertiesModal}
          instance={editingInstance}
          onSave={handleSaveUserProperties}
        />
      )}
    </div>
  );
}