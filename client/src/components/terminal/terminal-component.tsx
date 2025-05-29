import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Terminal, Send, X } from "lucide-react";

interface EC2Instance {
  instanceId: string;
  name: string;
  privateIp: string;
  publicIp: string;
  state: string;
  instanceType: string;
  region: string;
  keyName: string;
}

interface TerminalComponentProps {
  instances: EC2Instance[];
  credentialId?: number;
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
}

export function TerminalComponent({ instances, credentialId }: TerminalComponentProps) {
  const { toast } = useToast();
  const [terminalSessions, setTerminalSessions] = useState<Map<string, TerminalSession>>(new Map());
  const terminalRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // Initialize terminal sessions for all instances
  useEffect(() => {
    const newSessions = new Map<string, TerminalSession>();
    instances.forEach(instance => {
      newSessions.set(instance.instanceId, {
        instanceId: instance.instanceId,
        instance,
        isConnected: false,
        output: [],
        currentCommand: "",
        ws: null,
      });
    });
    setTerminalSessions(newSessions);
  }, [instances]);

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
    if (!session || !credentialId) {
      toast({
        title: "Connection error",
        description: "Missing session or credentials",
        variant: "destructive",
      });
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
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
        
        addOutput(instanceId, "system", `Connecting to ${session.instance.name} (${session.instance.privateIp})...`);
        
        websocket.send(JSON.stringify({
          type: "connect",
          host: session.instance.privateIp,
          username: "ec2-user",
          keyName: session.instance.keyName,
          region: session.instance.region,
          credentialId: credentialId,
          instanceId: instanceId,
        }));

        toast({
          title: "Connecting...",
          description: `Establishing SSH connection to ${session.instance.name}`,
        });
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

  const disconnectFromInstance = (instanceId: string) => {
    const session = terminalSessions.get(instanceId);
    if (session?.ws) {
      session.ws.close();
    }
    setTerminalSessions(prev => {
      const newSessions = new Map(prev);
      const currentSession = newSessions.get(instanceId);
      if (currentSession) {
        newSessions.set(instanceId, { ...currentSession, isConnected: false, ws: null });
      }
      return newSessions;
    });
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

  const handleKeyPress = (instanceId: string, e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const session = terminalSessions.get(instanceId);
      if (session) {
        sendCommand(instanceId, session.currentCommand);
      }
    }
  };

  const updateCommand = (instanceId: string, command: string) => {
    setTerminalSessions(prev => {
      const newSessions = new Map(prev);
      const currentSession = newSessions.get(instanceId);
      if (currentSession) {
        newSessions.set(instanceId, { ...currentSession, currentCommand: command });
      }
      return newSessions;
    });
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
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <Terminal className="h-4 w-4" />
            <span>{session.instance.name}</span>
          </CardTitle>
          <div className="flex space-x-2">
            {!session.isConnected ? (
              <Button 
                onClick={() => connectToInstance(session.instanceId)} 
                size="sm"
                variant="outline"
              >
                Connect
              </Button>
            ) : (
              <Button 
                onClick={() => disconnectFromInstance(session.instanceId)} 
                variant="destructive" 
                size="sm"
              >
                Disconnect
              </Button>
            )}
          </div>
        </div>
        {session.isConnected && (
          <div className="text-xs text-muted-foreground">
            Connected to {session.instance.privateIp}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0 flex flex-col">
        {/* Terminal Output */}
        <div 
          ref={(el) => {
            if (el) terminalRefs.current.set(session.instanceId, el);
          }}
          className="flex-1 bg-gray-900 text-green-400 font-mono text-xs p-4 overflow-auto"
        >
          {session.output.length === 0 ? (
            <div className="text-gray-500">
              Click Connect to establish SSH connection to {session.instance.name}
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

        {/* Command Input */}
        <div className="bg-gray-800 border-t border-gray-600 p-2">
          <div className="flex space-x-2">
            <Input
              ref={(el) => {
                if (el) inputRefs.current.set(session.instanceId, el);
              }}
              value={session.currentCommand}
              onChange={(e) => updateCommand(session.instanceId, e.target.value)}
              onKeyPress={(e) => handleKeyPress(session.instanceId, e)}
              placeholder={session.isConnected ? "Enter command..." : "Not connected"}
              disabled={!session.isConnected}
              className="flex-1 bg-gray-900 border-gray-600 text-green-400 placeholder:text-gray-500"
            />
            <Button
              onClick={() => sendCommand(session.instanceId, session.currentCommand)}
              disabled={!session.isConnected || !session.currentCommand.trim()}
              size="sm"
              variant="outline"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Single terminal layout
  if (instances.length === 1) {
    const session = terminalSessions.get(instances[0].instanceId);
    return (
      <div className="h-screen bg-background p-4">
        {session && renderTerminalPanel(session)}
      </div>
    );
  }

  // Multiple terminals layout with resizable panels
  if (instances.length === 2) {
    const sessions = Array.from(terminalSessions.values());
    return (
      <div className="h-screen bg-background p-4">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={50}>
            {sessions[0] && renderTerminalPanel(sessions[0])}
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={50}>
            {sessions[1] && renderTerminalPanel(sessions[1])}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  }

  // Multiple terminals layout (2x2 grid for 3+ terminals)
  const sessions = Array.from(terminalSessions.values());
  const topSessions = sessions.slice(0, Math.ceil(sessions.length / 2));
  const bottomSessions = sessions.slice(Math.ceil(sessions.length / 2));

  return (
    <div className="h-screen bg-background p-4">
      <ResizablePanelGroup direction="vertical" className="h-full">
        <ResizablePanel defaultSize={50}>
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {topSessions.map((session, index) => (
              <ResizablePanel key={session.instanceId} defaultSize={100 / topSessions.length}>
                {renderTerminalPanel(session)}
                {index < topSessions.length - 1 && <ResizableHandle />}
              </ResizablePanel>
            ))}
          </ResizablePanelGroup>
        </ResizablePanel>
        {bottomSessions.length > 0 && (
          <>
            <ResizableHandle />
            <ResizablePanel defaultSize={50}>
              <ResizablePanelGroup direction="horizontal" className="h-full">
                {bottomSessions.map((session, index) => (
                  <ResizablePanel key={session.instanceId} defaultSize={100 / bottomSessions.length}>
                    {renderTerminalPanel(session)}
                    {index < bottomSessions.length - 1 && <ResizableHandle />}
                  </ResizablePanel>
                ))}
              </ResizablePanelGroup>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}