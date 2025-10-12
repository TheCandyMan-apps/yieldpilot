import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface Alert {
  id: string;
  name: string;
  alert_type: string;
  min_roi?: number;
  min_yield?: number;
  max_price?: number;
  min_price?: number;
  location_filter?: string;
  property_type?: string;
  is_active: boolean;
  last_triggered_at?: string;
  created_at: string;
}

interface AlertMatch {
  id: string;
  alert_id: string;
  deal_id: string;
  matched_at: string;
  is_read: boolean;
  deals_feed: {
    property_address: string;
    price: number;
    yield_percentage?: number;
    roi_percentage?: number;
  };
}

const Alerts = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [matches, setMatches] = useState<AlertMatch[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Form state
  const [newAlert, setNewAlert] = useState({
    name: "",
    alert_type: "yield",
    min_roi: "",
    min_yield: "",
    max_price: "",
    min_price: "",
    location_filter: "",
    property_type: "",
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchAlerts(user.id);
    fetchMatches(user.id);
  };

  const fetchAlerts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      toast.error("Error loading alerts: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("alert_matches")
        .select(`
          *,
          deals_feed (
            property_address,
            price,
            yield_percentage,
            roi_percentage
          )
        `)
        .order("matched_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setMatches(data || []);
    } catch (error: any) {
      console.error("Error loading matches:", error);
    }
  };

  const handleCreateAlert = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const alertData: any = {
        user_id: user.id,
        name: newAlert.name,
        alert_type: newAlert.alert_type,
        is_active: true,
      };

      if (newAlert.min_roi) alertData.min_roi = parseFloat(newAlert.min_roi);
      if (newAlert.min_yield) alertData.min_yield = parseFloat(newAlert.min_yield);
      if (newAlert.max_price) alertData.max_price = parseFloat(newAlert.max_price);
      if (newAlert.min_price) alertData.min_price = parseFloat(newAlert.min_price);
      if (newAlert.location_filter) alertData.location_filter = newAlert.location_filter;
      if (newAlert.property_type) alertData.property_type = newAlert.property_type;

      const { error } = await supabase.from("alerts").insert(alertData);

      if (error) throw error;

      toast.success("Alert created successfully");
      setShowCreateDialog(false);
      setNewAlert({
        name: "",
        alert_type: "yield",
        min_roi: "",
        min_yield: "",
        max_price: "",
        min_price: "",
        location_filter: "",
        property_type: "",
      });
      fetchAlerts(user.id);
    } catch (error: any) {
      toast.error("Error creating alert: " + error.message);
    }
  };

  const toggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("alerts")
        .update({ is_active: !isActive })
        .eq("id", alertId);

      if (error) throw error;

      toast.success(`Alert ${!isActive ? "enabled" : "disabled"}`);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) fetchAlerts(user.id);
    } catch (error: any) {
      toast.error("Error updating alert: " + error.message);
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      const { error } = await supabase.from("alerts").delete().eq("id", alertId);

      if (error) throw error;

      toast.success("Alert deleted");
      const { data: { user } } = await supabase.auth.getUser();
      if (user) fetchAlerts(user.id);
    } catch (error: any) {
      toast.error("Error deleting alert: " + error.message);
    }
  };

  const markMatchAsRead = async (matchId: string) => {
    try {
      const { error } = await supabase
        .from("alert_matches")
        .update({ is_read: true })
        .eq("id", matchId);

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) fetchMatches(user.id);
    } catch (error: any) {
      console.error("Error marking match as read:", error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const unreadMatches = matches.filter((m) => !m.is_read).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Alerts</h1>
            <p className="text-muted-foreground mt-1">
              Get notified when properties match your criteria
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const { data, error } = await supabase.functions.invoke("check-alerts");
                  if (error) throw error;
                  toast.success(data.message || "Alerts checked successfully");
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) fetchMatches(user.id);
                } catch (error: any) {
                  toast.error("Error checking alerts: " + error.message);
                }
              }}
            >
              Check Now
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Alert
                </Button>
              </DialogTrigger>
              <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Alert</DialogTitle>
                <DialogDescription>
                  Set criteria to receive notifications about matching properties
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Alert Name</Label>
                  <Input
                    placeholder="e.g., High Yield Manchester"
                    value={newAlert.name}
                    onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Alert Type</Label>
                  <Select
                    value={newAlert.alert_type}
                    onValueChange={(val) => setNewAlert({ ...newAlert, alert_type: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yield">Yield Based</SelectItem>
                      <SelectItem value="roi">ROI Based</SelectItem>
                      <SelectItem value="price">Price Based</SelectItem>
                      <SelectItem value="location">Location Based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Min Yield %</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 6"
                      value={newAlert.min_yield}
                      onChange={(e) => setNewAlert({ ...newAlert, min_yield: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Min ROI %</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 15"
                      value={newAlert.min_roi}
                      onChange={(e) => setNewAlert({ ...newAlert, min_roi: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Min Price</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 100000"
                      value={newAlert.min_price}
                      onChange={(e) => setNewAlert({ ...newAlert, min_price: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Max Price</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 300000"
                      value={newAlert.max_price}
                      onChange={(e) => setNewAlert({ ...newAlert, max_price: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g., Manchester, M14"
                    value={newAlert.location_filter}
                    onChange={(e) => setNewAlert({ ...newAlert, location_filter: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Property Type</Label>
                  <Select
                    value={newAlert.property_type}
                    onValueChange={(val) => setNewAlert({ ...newAlert, property_type: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any type</SelectItem>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="hmo">HMO</SelectItem>
                      <SelectItem value="land">Land</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAlert} disabled={!newAlert.name}>
                  Create Alert
                </Button>
              </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Unread Matches Badge */}
        {unreadMatches > 0 && (
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="py-4">
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-blue-600 mr-2" />
                <span className="font-semibold">
                  You have {unreadMatches} new property {unreadMatches === 1 ? "match" : "matches"}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Alerts */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Alerts</h2>
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No alerts yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first alert to get notified about matching properties
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Alert
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alerts.map((alert) => (
                <Card key={alert.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center">
                          {alert.name}
                          {alert.is_active ? (
                            <Eye className="h-4 w-4 ml-2 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 ml-2 text-gray-400" />
                          )}
                        </CardTitle>
                        <CardDescription>{alert.alert_type} alert</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={alert.is_active}
                          onCheckedChange={() => toggleAlert(alert.id, alert.is_active)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteAlert(alert.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {alert.min_yield && (
                        <p>• Min Yield: {alert.min_yield}%</p>
                      )}
                      {alert.min_roi && (
                        <p>• Min ROI: {alert.min_roi}%</p>
                      )}
                      {alert.max_price && (
                        <p>• Max Price: £{alert.max_price.toLocaleString()}</p>
                      )}
                      {alert.location_filter && (
                        <p>• Location: {alert.location_filter}</p>
                      )}
                      {alert.property_type && (
                        <p>• Type: {alert.property_type}</p>
                      )}
                      {alert.last_triggered_at && (
                        <p className="text-muted-foreground mt-2">
                          Last triggered: {new Date(alert.last_triggered_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Recent Matches */}
        {matches.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Recent Matches</h2>
            <div className="space-y-4">
              {matches.map((match) => (
                <Card
                  key={match.id}
                  className={match.is_read ? "opacity-60" : "border-blue-500"}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">
                          {match.deals_feed.property_address}
                        </h4>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span>£{match.deals_feed.price.toLocaleString()}</span>
                          {match.deals_feed.yield_percentage && (
                            <span className="text-green-600">
                              {match.deals_feed.yield_percentage.toFixed(2)}% yield
                            </span>
                          )}
                          {match.deals_feed.roi_percentage && (
                            <span className="text-blue-600">
                              {match.deals_feed.roi_percentage.toFixed(2)}% ROI
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(match.matched_at).toLocaleString()}
                        </p>
                      </div>
                      {!match.is_read && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markMatchAsRead(match.id)}
                        >
                          Mark as Read
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Alerts;
