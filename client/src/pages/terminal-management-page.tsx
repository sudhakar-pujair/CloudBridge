import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Terminal, ChevronDown, Upload, Plus, Copy, X, CheckSquare, Square } from "lucide-react";
import { useLocation } from "wouter";

interface EC2Instance {
  instanceId: string;
  name: string;
  privateIp: string;
  publicIp: string;
  state: string;
  instanceType: string;
  region: string;
  keyName: string;
  credentialId: number;
}

interface TerminalOutput {
  timestamp: string;
  type: "input" | "output" | "error" | "system";
  content: string;
  instanceId?: string;
}

interface TerminalSession {
  instanceId: string;
  instance: EC2Instance;
  isConnected: boolean;
  output: TerminalOutput[];
  currentCommand: string;
  ws: WebSocket | null;
  isSelected: boolean;
}

export default function TerminalManagementPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [terminalSessions, setTerminalSessions] = useState<Map<string, TerminalSession>>(new Map());
  const [selectAll, setSelectAll] = useState(false);
  const terminalRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get instances from URL parameters or fetch all
  const { data: allInstances = [], isLoading } = useQuery({
    queryKey: ["/api/ec2-instances/all"],
  });

  // Initialize with instances from URL and auto-connect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const instanceIds = params.get('instances')?.split(',') || [];
    
    if (instanceIds.length > 0 && allInstances.length > 0) {
      const selectedInstances = (allInstances as any[]).filter((inst: any) => 
        instanceIds.includes(inst.instanceId)
      );
      
      const newSessions = new Map<string, TerminalSession>();
      selectedInstances.forEach((instance: any) => {
        newSessions.set(instance.instanceId, {
          instanceId: instance.instanceId,
          instance,
          isConnected: false,
          output: [],
          currentCommand: "",
          ws: null,
          isSelected: false,
        });
      });
      setTerminalSessions(newSessions);
      
      // Auto-connect to all terminals
      selectedInstances.forEach((instance: any) => {
        setTimeout(() => connectToInstance(instance.instanceId), 500);
      });
    }
  }, [allInstances]);

  // Auto-scroll to bottom when new output is added
  useEffect(() => {
    terminalSessions.forEach((session, instanceId) => {
      const terminalRef = terminalRefs.current.get(instanceId);
      if (terminalRef) {
        terminalRef.scrollTop = terminalRef.scrollHeight;
      }
    });
  }, [terminalSessions]);

  // Cleanup WebSockets on unmount
  useEffect(() => {
    return () => {
      terminalSessions.forEach(session => {
        if (session.ws) {
          session.ws.close();
        }
      });
    };
  }, []);

  const addOutput = (instanceId: string, type: TerminalOutput["type"], content: string) => {
    setTerminalSessions(prev => {
      const newSessions = new Map(prev);
      const session = newSessions.get(instanceId);
      if (session) {
        const newOutput = [...session.output, {
          timestamp: new Date().toLocaleTimeString(),
          type,
          content,
          instanceId,
        }];
        newSessions.set(instanceId, { ...session, output: newOutput });
      }
      return newSessions;
    });
  };

  const connectToInstance = (instanceId: string) => {
    const session = terminalSessions.get(instanceId);
    if (!session) {
      toast({
        title: "Connection error",
        description: "Terminal session not found",
        variant: "destructive",
      });
      return;
    }

    // Use the credentialId from the instance, defaulting to 1 if not available
    const credentialId = session.instance.credentialId || 1;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ssh-ws`;
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        setTerminalSessions(prev => {
          const newSessions = new Map(prev);
          const currentSession = newSessions.get(instanceId);
          if (currentSession) {
            newSessions.set(instanceId, { ...currentSession, ws: websocket, isConnected: true });
          }
          return newSessions;
        });
        
        addOutput(instanceId, "system", `Connected to ${session.instance.name} (${session.instance.privateIp})`);
        
        websocket.send(JSON.stringify({
          type: "connect",
          host: session.instance.privateIp,
          username: "ec2-user",
          keyName: session.instance.keyName,
          region: session.instance.region,
          credentialId: credentialId,
          instanceId: instanceId,
        }));
      };

      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.instanceId === instanceId) {
          addOutput(instanceId, data.type || "output", data.message || data.data);
        }
      };

      websocket.onerror = () => {
        addOutput(instanceId, "error", "WebSocket connection error");
        setTerminalSessions(prev => {
          const newSessions = new Map(prev);
          const currentSession = newSessions.get(instanceId);
          if (currentSession) {
            newSessions.set(instanceId, { ...currentSession, isConnected: false, ws: null });
          }
          return newSessions;
        });
      };

      websocket.onclose = () => {
        addOutput(instanceId, "system", "Connection closed");
        setTerminalSessions(prev => {
          const newSessions = new Map(prev);
          const currentSession = newSessions.get(instanceId);
          if (currentSession) {
            newSessions.set(instanceId, { ...currentSession, isConnected: false, ws: null });
          }
          return newSessions;
        });
      };

    } catch (error) {
      addOutput(instanceId, "error", `Failed to connect: ${error}`);
    }
  };

  const sendCommand = (instanceId: string, command: string) => {
    const session = terminalSessions.get(instanceId);
    if (session?.ws && session.isConnected) {
      addOutput(instanceId, "input", `$ ${command}`);
      session.ws.send(JSON.stringify({
        type: "command",
        command: command,
        instanceId: instanceId,
      }));
      
      setTerminalSessions(prev => {
        const newSessions = new Map(prev);
        const currentSession = newSessions.get(instanceId);
        if (currentSession) {
          newSessions.set(instanceId, { ...currentSession, currentCommand: "" });
        }
        return newSessions;
      });
    }
  };

  const toggleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    setTerminalSessions(prev => {
      const newSessions = new Map(prev);
      newSessions.forEach((session, instanceId) => {
        newSessions.set(instanceId, { ...session, isSelected: newSelectAll });
      });
      return newSessions;
    });
  };

  const toggleTerminalSelection = (instanceId: string) => {
    setTerminalSessions(prev => {
      const newSessions = new Map(prev);
      const session = newSessions.get(instanceId);
      if (session) {
        newSessions.set(instanceId, { ...session, isSelected: !session.isSelected });
      }
      return newSessions;
    });
  };

  const disconnectSelected = () => {
    const selectedSessions = Array.from(terminalSessions.values()).filter(session => 
      session.isSelected && session.isConnected
    );
    
    if (selectedSessions.length === 0) {
      toast({
        title: "No terminals selected",
        description: "Please select connected terminals to disconnect",
        variant: "destructive",
      });
      return;
    }

    selectedSessions.forEach(session => {
      if (session.ws) {
        session.ws.close();
      }
      setTerminalSessions(prev => {
        const newSessions = new Map(prev);
        const currentSession = newSessions.get(session.instanceId);
        if (currentSession) {
          newSessions.set(session.instanceId, { ...currentSession, isConnected: false, ws: null });
        }
        return newSessions;
      });
    });

    toast({
      title: "Terminals disconnected",
      description: `Disconnected ${selectedSessions.length} terminal(s)`,
    });
  };

  const duplicateSession = (instanceId: string) => {
    const session = terminalSessions.get(instanceId);
    if (!session) return;

    const newInstanceId = `${instanceId}_duplicate_${Date.now()}`;
    const newSession: TerminalSession = {
      ...session,
      instanceId: newInstanceId,
      isConnected: false,
      output: [],
      currentCommand: "",
      ws: null,
      isSelected: false,
    };

    setTerminalSessions(prev => {
      const newSessions = new Map(prev);
      newSessions.set(newInstanceId, newSession);
      return newSessions;
    });

    // Auto-connect the duplicated session
    setTimeout(() => connectToInstance(newInstanceId), 500);

    toast({
      title: "Session duplicated",
      description: `Created duplicate session for ${session.instance.name}`,
    });
  };

  const closeTerminal = (instanceId: string) => {
    const session = terminalSessions.get(instanceId);
    if (session?.ws) {
      session.ws.close();
    }
    
    setTerminalSessions(prev => {
      const newSessions = new Map(prev);
      newSessions.delete(instanceId);
      return newSessions;
    });
  };

  const exitTerminals = () => {
    // Close all WebSocket connections
    terminalSessions.forEach(session => {
      if (session.ws) {
        session.ws.close();
      }
    });
    
    // Redirect to SSH tab
    setLocation("/");
    
    toast({
      title: "Terminals closed",
      description: "All terminal sessions have been closed",
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const connectedSessions = Array.from(terminalSessions.values()).filter(session => 
      session.isConnected
    );

    if (connectedSessions.length === 0) {
      toast({
        title: "No connected terminals",
        description: "Please wait for terminals to connect before uploading files",
        variant: "destructive",
      });
      return;
    }

    // Simulate file upload command
    const uploadCommand = `scp ${file.name} ./`;
    connectedSessions.forEach(session => {
      addOutput(session.instanceId, "system", `Uploading ${file.name}...`);
      sendCommand(session.instanceId, uploadCommand);
    });

    toast({
      title: "File upload initiated",
      description: `Uploading ${file.name} to ${connectedSessions.length} terminal(s)`,
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getOutputColor = (type: TerminalOutput["type"]) => {
    switch (type) {
      case "error":
        return "text-red-400";
      case "system":
        return "text-yellow-400";
      case "input":
        return "text-blue-400";
      default:
        return "text-green-400";
    }
  };

  const renderTerminalPanel = (session: TerminalSession) => (
    <Card className="h-full flex flex-col" key={session.instanceId}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => toggleTerminalSelection(session.instanceId)}
              className="flex-shrink-0"
            >
              {session.isSelected ? (
                <CheckSquare className="h-4 w-4 text-primary" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            <CardTitle className="flex items-center space-x-2 text-sm">
              <Terminal className="h-4 w-4" />
              <span>{session.instance.name}</span>
            </CardTitle>
          </div>
          <Button
            onClick={() => closeTerminal(session.instanceId)}
            size="sm"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <div 
          ref={(el) => {
            if (el) terminalRefs.current.set(session.instanceId, el);
          }}
          className="h-full bg-gray-900 text-green-400 font-mono text-xs p-4 overflow-auto"
        >
          {session.output.length === 0 ? (
            <div className="text-gray-500">
              Initializing connection to {session.instance.name}...
            </div>
          ) : (
            <div className="space-y-1">
              {session.output.map((output, index) => (
                <div key={index} className="flex">
                  <span className="text-gray-500 text-xs mr-2 flex-shrink-0">
                    [{output.timestamp}]
                  </span>
                  <span className={getOutputColor(output.type)}>
                    {output.content}
                  </span>
                </div>
              ))}
              {session.isConnected && (
                <div className="flex items-center">
                  <span className="text-green-400">$ </span>
                  <span className="bg-green-400 w-2 h-4 ml-1 animate-pulse"></span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Loading...</h1>
          <p className="text-muted-foreground">Initializing terminal management...</p>
        </div>
      </div>
    );
  }

  const sessions = Array.from(terminalSessions.values());
  const selectedCount = sessions.filter(s => s.isSelected).length;

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Top Navigation Bar */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-foreground flex items-center space-x-2">
              <Terminal className="h-5 w-5" />
              <span>Terminal Management</span>
            </h1>
            <div className="text-sm text-muted-foreground">
              {sessions.length} terminal(s) • {selectedCount} selected
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Select All */}
            <Button
              onClick={toggleSelectAll}
              variant="outline"
              size="sm"
            >
              Select All
            </Button>

            {/* Terminal Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Terminal Actions
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  toast({ title: "Connect Host", description: "Feature coming soon" });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Host
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  if (sessions.length > 0) {
                    duplicateSession(sessions[0].instanceId);
                  }
                }}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate Session
                </DropdownMenuItem>
                <DropdownMenuItem onClick={disconnectSelected}>
                  <X className="h-4 w-4 mr-2" />
                  Disconnect Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Exit Terminals */}
            <Button onClick={exitTerminals} variant="destructive" size="sm">
              <X className="h-4 w-4 mr-2" />
              Exit Terminals
            </Button>
          </div>
        </div>
      </div>

      {/* Terminal Panels */}
      <div className="flex-1 p-4">
        {sessions.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Terminal className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No terminals active</h2>
              <p className="text-muted-foreground">Go back to SSH tab to connect to servers</p>
              <Button onClick={() => setLocation("/")} className="mt-4">
                Back to SSH
              </Button>
            </div>
          </div>
        ) : sessions.length === 1 ? (
          renderTerminalPanel(sessions[0])
        ) : sessions.length === 2 ? (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={50}>
              {renderTerminalPanel(sessions[0])}
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={50}>
              {renderTerminalPanel(sessions[1])}
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <ResizablePanelGroup direction="vertical" className="h-full">
            <ResizablePanel defaultSize={50}>
              <ResizablePanelGroup direction="horizontal" className="h-full">
                {sessions.slice(0, Math.ceil(sessions.length / 2)).map((session, index, arr) => (
                  <ResizablePanel key={session.instanceId} defaultSize={100 / arr.length}>
                    {renderTerminalPanel(session)}
                    {index < arr.length - 1 && <ResizableHandle />}
                  </ResizablePanel>
                ))}
              </ResizablePanelGroup>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={50}>
              <ResizablePanelGroup direction="horizontal" className="h-full">
                {sessions.slice(Math.ceil(sessions.length / 2)).map((session, index, arr) => (
                  <ResizablePanel key={session.instanceId} defaultSize={100 / arr.length}>
                    {renderTerminalPanel(session)}
                    {index < arr.length - 1 && <ResizableHandle />}
                  </ResizablePanel>
                ))}
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
}