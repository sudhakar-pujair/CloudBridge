import { useAuth } from "@/hooks/use-auth";
import { Cloud } from "lucide-react";

export function WelcomeTab() {
  const { user } = useAuth();

  const welcomeMessage = user?.role === "Developer" 
    ? "Welcome to the Web based SSH"
    : "Welcome to the Web based SSH and Regular Activities";

  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="text-center">
        <div className="mb-6">
          <Cloud className="h-24 w-24 text-primary mx-auto mb-4" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-4">
          {welcomeMessage}
        </h1>
        <p className="text-muted-foreground max-w-md">
          Securely manage your cloud infrastructure and automate routine tasks 
          from a unified interface.
        </p>
      </div>
    </div>
  );
}
