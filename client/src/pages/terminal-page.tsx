import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { TerminalComponent } from "@/components/terminal/terminal-component";

export default function TerminalPage() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split('?')[1] || '');
  const instanceId = params.get('instanceId');
  const credentialId = params.get('credentialId');

  // Fetch all instances to find the specific one
  const { data: instances = [], isLoading } = useQuery({
    queryKey: ["/api/ec2-instances/all"],
  });

  if (!instanceId || !credentialId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Missing Parameters</h1>
          <p className="text-muted-foreground">Instance ID and Credential ID are required.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Loading...</h1>
          <p className="text-muted-foreground">Fetching instance information...</p>
        </div>
      </div>
    );
  }

  // Find the specific instance
  const instance = (instances as any[]).find((inst: any) => inst.instanceId === instanceId);
  
  if (!instance) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Instance Not Found</h1>
          <p className="text-muted-foreground">Could not find instance with ID: {instanceId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background">
      <TerminalComponent 
        instances={[instance]} 
        credentialId={parseInt(credentialId)} 
      />
    </div>
  );
}