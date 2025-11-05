import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, User, Bell, Shield, Globe, CheckCircle2, XCircle, Mail, Monitor, Smartphone, Globe2, AlertTriangle, Download, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface ActivityLog {
  id: string;
  event_type: string;
  event_description: string;
  ip_address: string | null;
  user_agent: string | null;
  device_info: any;
  created_at: string;
}

interface DeletionRequest {
  id: string;
  scheduled_deletion_at: string;
  reason: string | null;
  data_export_requested: boolean;
}

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [fullName, setFullName] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [marketUpdates, setMarketUpdates] = useState(false);
  const [preferredCurrency, setPreferredCurrency] = useState("GBP");
  const [preferredRegion, setPreferredRegion] = useState("UK");
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [exportData, setExportData] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        setUserEmail(user.email || "");
        setEmailVerified(!!user.email_confirmed_at);

        // Load profile data
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          setFullName(profile.full_name || "");
        }

        // Load activity logs
        const { data: logs } = await supabase
          .from("user_activity_log")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (logs) {
          setActivityLogs(logs);
        }

        // Check for pending deletion request
        const { data: deletion } = await supabase
          .from("account_deletion_requests")
          .select("*")
          .eq("user_id", user.id)
          .is("cancelled_at", null)
          .maybeSingle();

        if (deletion) {
          setDeletionRequest(deletion);
        }

        // Log this session view
        await logActivity(user.id, "settings_viewed", "User viewed settings page");
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };

    loadUserData();
  }, [navigate]);

  const logActivity = async (userId: string, eventType: string, description: string) => {
    try {
      const userAgent = navigator.userAgent;
      const deviceInfo = {
        platform: navigator.platform,
        language: navigator.language,
      };

      await supabase.rpc("log_user_activity_event", {
        p_user_id: userId,
        p_event_type: eventType,
        p_event_description: description,
        p_user_agent: userAgent,
        p_device_info: deviceInfo,
      });
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  };

  const handleResendVerification = async () => {
    try {
      setVerificationLoading(true);
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
      });

      if (error) throw error;

      toast.success("Verification email sent! Please check your inbox.");
    } catch (error) {
      console.error("Error sending verification email:", error);
      toast.error("Failed to send verification email");
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (currentPassword: string, newPassword: string) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Log password change
      if (user) {
        await logActivity(user.id, "password_changed", "User changed their password");
      }

      toast.success("Password updated successfully");
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "login":
      case "signin":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "password_changed":
        return <Shield className="h-4 w-4 text-blue-500" />;
      case "settings_viewed":
        return <User className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Globe2 className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getDeviceIcon = (userAgent: string | null) => {
    if (!userAgent) return <Monitor className="h-4 w-4" />;
    if (userAgent.toLowerCase().includes("mobile") || userAgent.toLowerCase().includes("android") || userAgent.toLowerCase().includes("iphone")) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const handleExportData = async () => {
    try {
      setExportLoading(true);
      
      const { data, error } = await supabase.functions.invoke("export-user-data");

      if (error) throw error;

      // Download the data as JSON
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `yieldpilot-data-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Data exported successfully");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data");
    } finally {
      setExportLoading(false);
    }
  };

  const handleRequestDeletion = async () => {
    try {
      setDeleteLoading(true);

      if (!deletePassword) {
        toast.error("Please enter your password");
        return;
      }

      const { data, error } = await supabase.functions.invoke("request-account-deletion", {
        body: {
          password: deletePassword,
          reason: deleteReason,
          exportData: exportData,
        },
      });

      if (error) throw error;

      toast.success(data.message);
      setDeleteDialogOpen(false);
      setDeletePassword("");
      setDeleteReason("");
      setExportData(false);
      
      // Refresh to show deletion request
      window.location.reload();
    } catch (error) {
      console.error("Error requesting deletion:", error);
      toast.error("Failed to request account deletion");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.functions.invoke("cancel-account-deletion");

      if (error) throw error;

      toast.success("Account deletion cancelled");
      setDeletionRequest(null);
    } catch (error) {
      console.error("Error cancelling deletion:", error);
      toast.error("Failed to cancel deletion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account preferences and settings
          </p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <Globe className="h-4 w-4 mr-2" />
              Preferences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your account details and profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="email"
                      type="email"
                      value={userEmail}
                      disabled
                      className="bg-muted"
                    />
                    {emailVerified ? (
                      <Badge variant="default" className="flex items-center gap-1 whitespace-nowrap">
                        <CheckCircle2 className="h-3 w-3" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1 whitespace-nowrap">
                        <XCircle className="h-3 w-3" />
                        Unverified
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Contact support to change your email address
                  </p>
                </div>

                {!emailVerified && (
                  <Alert>
                    <Mail className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span className="text-sm">
                        Please verify your email address to access all features
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResendVerification}
                        disabled={verificationLoading}
                      >
                        {verificationLoading ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          "Resend Email"
                        )}
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                <Button onClick={handleUpdateProfile} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email updates about your account
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Price Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when property prices change
                    </p>
                  </div>
                  <Switch
                    checked={priceAlerts}
                    onCheckedChange={setPriceAlerts}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Market Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Weekly market insights and trends
                    </p>
                  </div>
                  <Switch
                    checked={marketUpdates}
                    onCheckedChange={setMarketUpdates}
                  />
                </div>

                <Button>Save Preferences</Button>
              </CardContent>
            </Card>

            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Permanently delete your account and all associated data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {deletionRequest ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">
                          Your account is scheduled for deletion
                        </p>
                        <p className="text-sm">
                          Deletion date: {new Date(deletionRequest.scheduled_deletion_at).toLocaleDateString()}
                        </p>
                        <p className="text-sm">
                          You have until then to cancel this request.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelDeletion}
                          disabled={loading}
                          className="mt-2"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Cancelling...
                            </>
                          ) : (
                            "Cancel Deletion"
                          )}
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="flex items-start justify-between p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                      <div className="space-y-1">
                        <p className="font-medium">Delete Account</p>
                        <p className="text-sm text-muted-foreground">
                          Permanently delete your account and all your data. This action cannot be undone.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleExportData}
                        disabled={exportLoading}
                      >
                        {exportLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Exporting...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Export My Data
                          </>
                        )}
                      </Button>

                      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Account
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription className="space-y-4">
                              <p>
                                This will schedule your account for permanent deletion in 30 days.
                                You can cancel this request within that time.
                              </p>
                              
                              <div className="space-y-3 pt-4">
                                <div className="space-y-2">
                                  <Label htmlFor="deletePassword">Confirm your password</Label>
                                  <Input
                                    id="deletePassword"
                                    type="password"
                                    placeholder="Enter your password"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="deleteReason">Reason (optional)</Label>
                                  <Textarea
                                    id="deleteReason"
                                    placeholder="Help us understand why you're leaving..."
                                    value={deleteReason}
                                    onChange={(e) => setDeleteReason(e.target.value)}
                                    rows={3}
                                  />
                                </div>

                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="exportBeforeDelete"
                                    checked={exportData}
                                    onCheckedChange={(checked) => setExportData(checked as boolean)}
                                  />
                                  <label
                                    htmlFor="exportBeforeDelete"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    Export my data before deletion
                                  </label>
                                </div>
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => {
                                e.preventDefault();
                                handleRequestDeletion();
                              }}
                              disabled={deleteLoading || !deletePassword}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deleteLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                "Delete Account"
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                  />
                </div>

                <Button
                  onClick={() => {
                    const newPassword = (document.getElementById("newPassword") as HTMLInputElement)?.value;
                    const confirmPassword = (document.getElementById("confirmPassword") as HTMLInputElement)?.value;
                    
                    if (newPassword !== confirmPassword) {
                      toast.error("Passwords do not match");
                      return;
                    }
                    
                    if (newPassword.length < 8) {
                      toast.error("Password must be at least 8 characters");
                      return;
                    }
                    
                    handleUpdatePassword("", newPassword);
                  }}
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Activity</CardTitle>
                <CardDescription>
                  Recent activity on your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  {activityLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No activity logged yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activityLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                        >
                          <div className="mt-1">{getEventIcon(log.event_type)}</div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm">
                                {log.event_description || log.event_type}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                {getDeviceIcon(log.user_agent)}
                                <span>
                                  {log.user_agent?.includes("Mobile") ? "Mobile" : "Desktop"}
                                </span>
                              </div>
                              {log.ip_address && (
                                <div className="flex items-center gap-1">
                                  <Globe2 className="h-3 w-3" />
                                  <span>{log.ip_address}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Regional Preferences</CardTitle>
                <CardDescription>
                  Set your preferred currency and region
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Preferred Currency</Label>
                  <Select value={preferredCurrency} onValueChange={setPreferredCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region">Preferred Region</Label>
                  <Select value={preferredRegion} onValueChange={setPreferredRegion}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UK">United Kingdom</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="EU">Europe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button>Save Preferences</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
