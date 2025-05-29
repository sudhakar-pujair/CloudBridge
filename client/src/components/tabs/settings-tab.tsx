import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { UserFormModal } from "@/components/modals/user-form-modal";
import { ProfileFormModal } from "@/components/modals/profile-form-modal";
import { ProfileAssignmentModal } from "@/components/modals/profile-assignment-modal";
import { AwsCredentialsModal } from "@/components/modals/aws-credentials-modal";
import { Ec2KeyModal } from "@/components/modals/ec2-key-modal";
import { useTheme } from "@/lib/theme-provider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, UserPlus, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, Profile, AwsCredentials, Ec2Key } from "@shared/schema";

export function SettingsTab() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  const isAdmin = user?.role === "Administrator";
  const defaultTab = isAdmin ? "users" : "theme";
  
  const [activeSettingsTab, setActiveSettingsTab] = useState(() => {
    const savedTab = localStorage.getItem("activeSettingsTab");
    if (savedTab) {
      // Check if saved tab is accessible to current user
      if (!isAdmin && (savedTab === "users" || savedTab === "profiles" || savedTab === "aws")) {
        return "theme";
      }
      return savedTab;
    }
    return defaultTab;
  });

  const handleTabChange = (tab: string) => {
    setActiveSettingsTab(tab);
    localStorage.setItem("activeSettingsTab", tab);
  };

  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [selectedProfiles, setSelectedProfiles] = useState<Set<number>>(new Set());
  const [selectedCredentials, setSelectedCredentials] = useState<Set<number>>(new Set());
  const [selectedKeys, setSelectedKeys] = useState<Set<number>>(new Set());
  
  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showProfileAssignmentModal, setShowProfileAssignmentModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [assigningProfile, setAssigningProfile] = useState<Profile | null>(null);

  // Data queries
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin,
  });

  const { data: profiles = [] } = useQuery<Profile[]>({
    queryKey: ["/api/profiles"],
  });

  const { data: awsCredentials = [] } = useQuery<AwsCredentials[]>({
    queryKey: ["/api/aws-credentials"],
  });

  const { data: ec2Keys = [] } = useQuery<Ec2Key[]>({
    queryKey: ["/api/ec2-keys"],
  });

  // Delete mutations
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User deleted successfully" });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/profiles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      toast({ title: "Profile deleted successfully" });
    },
  });

  const deleteCredentialsMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/aws-credentials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aws-credentials"] });
      toast({ title: "AWS credentials deleted successfully" });
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/ec2-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ec2-keys"] });
      toast({ title: "EC2 key deleted successfully" });
    },
  });

  // Theme selection
  const themeOptions = [
    { value: "light", label: "Light", description: "Default theme" },
    { value: "dark", label: "Dark", description: "Easier on eyes" },
  ];

  const handleDeleteUsers = () => {
    selectedUsers.forEach(id => deleteUserMutation.mutate(id));
    setSelectedUsers(new Set());
  };

  const handleDeleteProfiles = () => {
    selectedProfiles.forEach(id => deleteProfileMutation.mutate(id));
    setSelectedProfiles(new Set());
  };

  const handleDeleteCredentials = () => {
    selectedCredentials.forEach(id => deleteCredentialsMutation.mutate(id));
    setSelectedCredentials(new Set());
  };

  const handleDeleteKeys = () => {
    selectedKeys.forEach(id => deleteKeyMutation.mutate(id));
    setSelectedKeys(new Set());
  };

  const handleEditUser = () => {
    if (selectedUsers.size !== 1) {
      toast({
        title: "Invalid selection",
        description: "Please select exactly one user to edit.",
        variant: "destructive",
      });
      return;
    }
    const userId = Array.from(selectedUsers)[0];
    const userToEdit = users.find(u => u.id === userId);
    if (userToEdit) {
      setEditingUser(userToEdit);
      setShowUserModal(true);
    }
  };

  const handleEditProfile = () => {
    if (selectedProfiles.size !== 1) {
      toast({
        title: "Invalid selection",
        description: "Please select exactly one profile to edit.",
        variant: "destructive",
      });
      return;
    }
    const profileId = Array.from(selectedProfiles)[0];
    const profileToEdit = profiles.find(p => p.id === profileId);
    if (profileToEdit) {
      setEditingProfile(profileToEdit);
      setShowProfileModal(true);
    }
  };

  const handleAssignProfile = () => {
    if (selectedProfiles.size !== 1) {
      toast({
        title: "Invalid selection",
        description: "Please select exactly one profile to assign.",
        variant: "destructive",
      });
      return;
    }
    const profileId = Array.from(selectedProfiles)[0];
    const profileToAssign = profiles.find(p => p.id === profileId);
    if (profileToAssign) {
      setAssigningProfile(profileToAssign);
      setShowProfileAssignmentModal(true);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="p-6 pb-0">
          <h2 className="text-xl font-semibold text-foreground mb-4">Settings</h2>
          <Tabs value={activeSettingsTab} onValueChange={handleTabChange}>
            <TabsList>
              {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
              {isAdmin && <TabsTrigger value="profiles">Profiles</TabsTrigger>}
              {isAdmin && <TabsTrigger value="aws">AWS Accounts</TabsTrigger>}
              <TabsTrigger value="theme">Theme</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Tabs value={activeSettingsTab} onValueChange={handleTabChange}>
          {/* Users Tab - Only for Admins */}
          {isAdmin && (
            <TabsContent value="users" className="h-full flex flex-col m-0">
              <div className="bg-card border-b border-border p-6">
                <div className="flex space-x-2">
                  <Button onClick={() => setShowUserModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleEditUser}
                    disabled={selectedUsers.size !== 1}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteUsers}
                    disabled={selectedUsers.size === 0}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={users.length > 0 && users.every(user => selectedUsers.has(user.id))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUsers(new Set(users.map(u => u.id)));
                            } else {
                              setSelectedUsers(new Set());
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Access Level</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedUsers);
                              if (checked) {
                                newSelected.add(user.id);
                              } else {
                                newSelected.delete(user.id);
                              }
                              setSelectedUsers(newSelected);
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{user.fullName}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "Administrator" ? "destructive" : "default"}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          )}

          {/* Profiles Tab */}
          <TabsContent value="profiles" className="h-full flex flex-col m-0">
            {isAdmin && (
              <div className="bg-card border-b border-border p-6">
                <div className="flex space-x-2">
                  <Button onClick={() => setShowProfileModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Profile
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleEditProfile}
                    disabled={selectedProfiles.size !== 1}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteProfiles}
                    disabled={selectedProfiles.size === 0}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleAssignProfile}
                    disabled={selectedProfiles.size !== 1}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Assign
                  </Button>
                </div>
              </div>
            )}

            <div className="flex-1 p-6">
              <div className="max-w-4xl">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={profiles.length > 0 && profiles.every(profile => selectedProfiles.has(profile.id))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProfiles(new Set(profiles.map(p => p.id)));
                            } else {
                              setSelectedProfiles(new Set());
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="w-64">Display Name</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedProfiles.has(profile.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedProfiles);
                              if (checked) {
                                newSelected.add(profile.id);
                              } else {
                                newSelected.delete(profile.id);
                              }
                              setSelectedProfiles(newSelected);
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {profile.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {profile.awsTags && typeof profile.awsTags === 'object' 
                            ? Object.entries(profile.awsTags as Record<string, string>)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(', ')
                            : 'No description available'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* AWS Accounts Tab */}
          <TabsContent value="aws" className="h-full flex flex-col m-0">
            <Tabs defaultValue="credentials" className="h-full flex flex-col">
              <div className="bg-card border-b border-border p-6 pb-0">
                <TabsList>
                  <TabsTrigger value="credentials">AWS Credentials</TabsTrigger>
                  <TabsTrigger value="keys">EC2 Keys</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="credentials" className="flex-1 flex flex-col m-0">
                <div className="bg-card border-b border-border p-6">
                  <div className="flex space-x-2">
                    <Button onClick={() => setShowCredentialsModal(true)} disabled={!isAdmin}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Credentials
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleDeleteCredentials}
                      disabled={!isAdmin || selectedCredentials.size === 0}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={awsCredentials.length > 0 && awsCredentials.every(cred => selectedCredentials.has(cred.id))}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCredentials(new Set(awsCredentials.map(c => c.id)));
                              } else {
                                setSelectedCredentials(new Set());
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Account ID</TableHead>
                        <TableHead>Access Key</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {awsCredentials.map((cred) => (
                        <TableRow key={cred.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedCredentials.has(cred.id)}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedCredentials);
                                if (checked) {
                                  newSelected.add(cred.id);
                                } else {
                                  newSelected.delete(cred.id);
                                }
                                setSelectedCredentials(newSelected);
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{cred.accountName}</TableCell>
                          <TableCell>{cred.accountId}</TableCell>
                          <TableCell>{cred.accessKey}</TableCell>
                          <TableCell>
                            <Badge variant={cred.isActive ? "default" : "secondary"}>
                              {cred.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="keys" className="flex-1 flex flex-col m-0">
                <div className="bg-card border-b border-border p-6">
                  <div className="flex space-x-2">
                    <Button onClick={() => setShowKeyModal(true)} disabled={!isAdmin}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add EC2 Key
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleDeleteKeys}
                      disabled={!isAdmin || selectedKeys.size === 0}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={ec2Keys.length > 0 && ec2Keys.every(key => selectedKeys.has(key.id))}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedKeys(new Set(ec2Keys.map(k => k.id)));
                              } else {
                                setSelectedKeys(new Set());
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Key Name</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>AWS Account</TableHead>
                        <TableHead>Uploaded</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ec2Keys.map((key) => {
                        const credential = awsCredentials.find(c => c.id === key.awsCredentialId);
                        return (
                          <TableRow key={key.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedKeys.has(key.id)}
                                onCheckedChange={(checked) => {
                                  const newSelected = new Set(selectedKeys);
                                  if (checked) {
                                    newSelected.add(key.id);
                                  } else {
                                    newSelected.delete(key.id);
                                  }
                                  setSelectedKeys(newSelected);
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{key.keyName}</TableCell>
                            <TableCell>{key.region}</TableCell>
                            <TableCell>{credential?.accountName || 'Unknown'}</TableCell>
                            <TableCell>{new Date(key.createdAt).toLocaleDateString()}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Theme Tab */}
          <TabsContent value="theme" className="h-full p-6 m-0">
            <div className="max-w-2xl">
              <h3 className="text-lg font-medium text-foreground mb-6">Theme Settings</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">Select Theme</label>
                  <div className="grid grid-cols-3 gap-4">
                    {themeOptions.map((option) => (
                      <Card 
                        key={option.value}
                        className={`cursor-pointer transition-all ${
                          theme === option.value 
                            ? "ring-2 ring-primary ring-offset-2" 
                            : "hover:shadow-md"
                        }`}
                        onClick={() => setTheme(option.value as any)}
                      >
                        <CardContent className="p-4">
                          <div className={`border rounded p-3 mb-2 ${
                            option.value === "dark" 
                              ? "bg-gray-900 border-gray-700" 
                              : option.value === "grey"
                              ? "bg-gray-100 border-gray-300"
                              : "bg-white border-gray-200"
                          }`}>
                            <div className="flex space-x-1 mb-2">
                              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            </div>
                            <div className="space-y-1">
                              <div className={`h-2 rounded ${
                                option.value === "dark" 
                                  ? "bg-gray-700" 
                                  : option.value === "grey"
                                  ? "bg-gray-300"
                                  : "bg-gray-200"
                              }`}></div>
                              <div className={`h-2 rounded w-3/4 ${
                                option.value === "dark" 
                                  ? "bg-gray-800" 
                                  : option.value === "grey"
                                  ? "bg-gray-400"
                                  : "bg-gray-100"
                              }`}></div>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-foreground flex items-center justify-center">
                              {option.label}
                              {theme === option.value && <Check className="ml-2 h-4 w-4 text-primary" />}
                            </div>
                            <div className="text-sm text-muted-foreground">{option.description}</div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {showUserModal && (
        <UserFormModal
          open={showUserModal}
          onOpenChange={(open) => {
            setShowUserModal(open);
            if (!open) setEditingUser(null);
          }}
          user={editingUser}
          onSuccess={() => {
            setShowUserModal(false);
            setEditingUser(null);
            setSelectedUsers(new Set());
          }}
        />
      )}

      {showProfileModal && (
        <ProfileFormModal
          open={showProfileModal}
          onOpenChange={(open) => {
            setShowProfileModal(open);
            if (!open) setEditingProfile(null);
          }}
          profile={editingProfile}
          onSuccess={() => {
            setShowProfileModal(false);
            setEditingProfile(null);
            setSelectedProfiles(new Set());
          }}
        />
      )}

      {showProfileAssignmentModal && (
        <ProfileAssignmentModal
          open={showProfileAssignmentModal}
          onOpenChange={(open) => {
            setShowProfileAssignmentModal(open);
            if (!open) setAssigningProfile(null);
          }}
          profile={assigningProfile}
          onSuccess={() => {
            setShowProfileAssignmentModal(false);
            setAssigningProfile(null);
            setSelectedProfiles(new Set());
          }}
        />
      )}

      {showCredentialsModal && (
        <AwsCredentialsModal
          open={showCredentialsModal}
          onOpenChange={setShowCredentialsModal}
          onSuccess={() => {
            setShowCredentialsModal(false);
            setSelectedCredentials(new Set());
          }}
        />
      )}

      {showKeyModal && (
        <Ec2KeyModal
          open={showKeyModal}
          onOpenChange={setShowKeyModal}
          onSuccess={() => {
            setShowKeyModal(false);
            setSelectedKeys(new Set());
          }}
        />
      )}
    </div>
  );
}
