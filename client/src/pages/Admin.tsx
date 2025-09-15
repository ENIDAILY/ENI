import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, ToggleLeft, ToggleRight, Key, Eye, EyeOff } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  provider: string;
  keyValue: string;
  isActive: boolean;
  lastUsed: string | null;
  usageCount: string;
  createdAt: string;
  updatedAt: string;
}

export default function Admin() {
  const [adminPassword, setAdminPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newKey, setNewKey] = useState({
    name: "",
    provider: "huggingface",
    keyValue: ""
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();

  // Verify admin password
  const verifyPassword = async () => {
    if (!adminPassword.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter the admin password",
        variant: "destructive"
      });
      return;
    }

    try {
      await apiRequest("POST", "/api/admin/keys", { adminPassword });
      setIsAuthenticated(true);
      toast({
        title: "Authentication Successful",
        description: "Welcome to the admin panel"
      });
    } catch (error: any) {
      toast({
        title: "Authentication Failed",
        description: error.message || "Invalid admin password",
        variant: "destructive"
      });
    }
  };

  // Get API keys
  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ["admin", "keys"],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/admin/keys", { adminPassword });
      return await response.json() as ApiKey[];
    },
    enabled: isAuthenticated,
  });

  // Add API key mutation
  const addKeyMutation = useMutation({
    mutationFn: async (keyData: typeof newKey) => {
      const response = await apiRequest("POST", "/api/admin/keys/add", {
        ...keyData,
        adminPassword
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "keys"] });
      setNewKey({ name: "", provider: "huggingface", keyValue: "" });
      setShowAddForm(false);
      toast({
        title: "API Key Added",
        description: "New API key has been added successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Key",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  // Toggle API key status mutation
  const toggleKeyMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest("POST", "/api/admin/keys/update", {
        id,
        isActive,
        adminPassword
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "keys"] });
      toast({
        title: "API Key Updated",
        description: "API key status has been updated"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Key",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  // Delete API key mutation
  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", "/api/admin/keys/delete", {
        id,
        adminPassword
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "keys"] });
      toast({
        title: "API Key Deleted",
        description: "API key has been deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Key",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  // If not authenticated, show login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Key className="h-5 w-5" />
              Admin Panel
            </CardTitle>
            <CardDescription>
              Enter the admin password to manage API keys
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Admin Password</Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && verifyPassword()}
                  placeholder="Enter admin password"
                  data-testid="input-admin-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button 
              onClick={verifyPassword} 
              className="w-full"
              data-testid="button-login"
            >
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">API Key Management</h1>
            <p className="text-muted-foreground">
              Manage Hugging Face and other API keys for image generation
            </p>
          </div>
          <Button
            onClick={() => setShowAddForm(true)}
            data-testid="button-add-key"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add API Key
          </Button>
        </div>

        {/* Add Key Form */}
        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>Add New API Key</CardTitle>
              <CardDescription>
                Add a new API key for AI services (image generation, chat, and text-to-speech)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="key-name">Key Name</Label>
                  <Input
                    id="key-name"
                    value={newKey.name}
                    onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                    placeholder="e.g., HF Token 1"
                    data-testid="input-key-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="key-provider">Provider</Label>
                  <Select
                    value={newKey.provider}
                    onValueChange={(value) => setNewKey({ ...newKey, provider: value })}
                  >
                    <SelectTrigger data-testid="select-provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="huggingface">Hugging Face</SelectItem>
                      <SelectItem value="github">GitHub AI</SelectItem>
                      <SelectItem value="murf">Murf.ai</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="key-value">API Key</Label>
                <Input
                  id="key-value"
                  type="password"
                  value={newKey.keyValue}
                  onChange={(e) => setNewKey({ ...newKey, keyValue: e.target.value })}
                  placeholder="Paste your API key here"
                  data-testid="input-key-value"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => addKeyMutation.mutate(newKey)}
                  disabled={!newKey.name || !newKey.keyValue || addKeyMutation.isPending}
                  data-testid="button-save-key"
                >
                  {addKeyMutation.isPending ? "Adding..." : "Add Key"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  data-testid="button-cancel-add"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* API Keys List */}
        <Card>
          <CardHeader>
            <CardTitle>Existing API Keys</CardTitle>
            <CardDescription>
              Manage your API keys and monitor their usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading API keys...</div>
            ) : !apiKeys || apiKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No API keys found. Add your first API key to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                    data-testid={`key-item-${key.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium" data-testid={`key-name-${key.id}`}>
                          {key.name}
                        </h3>
                        <Badge variant="outline" data-testid={`key-provider-${key.id}`}>
                          {key.provider}
                        </Badge>
                        <Badge
                          variant={key.isActive ? "default" : "secondary"}
                          data-testid={`key-status-${key.id}`}
                        >
                          {key.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        <span data-testid={`key-value-${key.id}`}>{key.keyValue}</span>
                        {key.lastUsed && (
                          <span className="ml-4">
                            Last used: {new Date(key.lastUsed).toLocaleDateString()}
                          </span>
                        )}
                        <span className="ml-4" data-testid={`key-usage-${key.id}`}>
                          Usage: {key.usageCount}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleKeyMutation.mutate({
                          id: key.id,
                          isActive: !key.isActive
                        })}
                        disabled={toggleKeyMutation.isPending}
                        data-testid={`button-toggle-${key.id}`}
                      >
                        {key.isActive ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-delete-${key.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{key.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteKeyMutation.mutate(key.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logout */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
              setIsAuthenticated(false);
              setAdminPassword("");
            }}
            data-testid="button-logout"
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}