import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Play, Trash2, Edit2, Bell, BellOff } from "lucide-react";

interface SavedSearch {
  id: string;
  name: string;
  site: string;
  query: Record<string, any>;
  frequency: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const SavedSearches = () => {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [site, setSite] = useState<string>("both");
  const [location, setLocation] = useState("");
  const [minBeds, setMinBeds] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minYield, setMinYield] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [frequency, setFrequency] = useState<string>("weekly");
  const [active, setActive] = useState(true);

  useEffect(() => {
    loadSearches();
  }, []);

  const loadSearches = async () => {
    try {
      const { data, error } = await supabase
        .from("saved_searches")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSearches(data || []);
    } catch (error: any) {
      toast.error("Failed to load saved searches");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setSite("both");
    setLocation("");
    setMinBeds("");
    setMaxPrice("");
    setMinYield("");
    setPropertyType("");
    setFrequency("weekly");
    setActive(true);
    setEditingId(null);
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const query = {
        location: location || undefined,
        min_beds: minBeds ? parseInt(minBeds) : undefined,
        max_price: maxPrice ? parseFloat(maxPrice) : undefined,
        min_yield: minYield ? parseFloat(minYield) / 100 : undefined,
        property_type: propertyType || undefined,
      };

      const payload = {
        name,
        site,
        query,
        frequency,
        active,
        user_id: user.id,
      };

      if (editingId) {
        const { error } = await supabase
          .from("saved_searches")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Search updated");
      } else {
        const { error } = await supabase
          .from("saved_searches")
          .insert(payload);
        if (error) throw error;
        toast.success("Search saved");
      }

      setDialogOpen(false);
      resetForm();
      loadSearches();
    } catch (error: any) {
      toast.error(error.message);
      console.error(error);
    }
  };

  const handleEdit = (search: SavedSearch) => {
    setEditingId(search.id);
    setName(search.name);
    setSite(search.site);
    setLocation(search.query.location || "");
    setMinBeds(search.query.min_beds?.toString() || "");
    setMaxPrice(search.query.max_price?.toString() || "");
    setMinYield(search.query.min_yield ? (search.query.min_yield * 100).toString() : "");
    setPropertyType(search.query.property_type || "");
    setFrequency(search.frequency);
    setActive(search.active);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this saved search?")) return;

    try {
      const { error } = await supabase
        .from("saved_searches")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Search deleted");
      loadSearches();
    } catch (error: any) {
      toast.error("Failed to delete search");
      console.error(error);
    }
  };

  const handleRunNow = async (search: SavedSearch) => {
    try {
      toast.info("Running search...");
      const { data, error } = await supabase.functions.invoke("search-runner", {
        body: { searchId: search.id },
      });

      if (error) throw error;

      if (data.ok) {
        toast.success(`Found ${data.matches} matches for "${data.searchName}"`);
      } else {
        toast.warning(data.message || "No new matches");
      }
    } catch (error: any) {
      toast.error("Failed to run search");
      console.error(error);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("saved_searches")
        .update({ active: !currentActive })
        .eq("id", id);

      if (error) throw error;
      toast.success(currentActive ? "Alerts disabled" : "Alerts enabled");
      loadSearches();
    } catch (error: any) {
      toast.error("Failed to update search");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Saved Searches</h1>
            <p className="text-muted-foreground mt-1">
              Save your search criteria and get alerts for new matches
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Search
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit" : "Create"} Saved Search</DialogTitle>
                <DialogDescription>
                  Define your search criteria and alert frequency
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Manchester BTL under £200k"
                  />
                </div>

                <div>
                  <Label>Site</Label>
                  <Select value={site} onValueChange={setSite}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Both</SelectItem>
                      <SelectItem value="zoopla">Zoopla</SelectItem>
                      <SelectItem value="rightmove">Rightmove</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Location</Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Manchester, SW1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Min Bedrooms</Label>
                    <Input
                      type="number"
                      value={minBeds}
                      onChange={(e) => setMinBeds(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Max Price (£)</Label>
                    <Input
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Min Yield (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={minYield}
                    onChange={(e) => setMinYield(e.target.value)}
                    placeholder="e.g. 6.5"
                  />
                </div>

                <div>
                  <Label>Alert Frequency</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="instant">Instant</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch checked={active} onCheckedChange={setActive} />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {editingId ? "Update" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : searches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No saved searches yet</p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Search
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {searches.map((search) => (
              <Card key={search.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {search.name}
                        {search.active ? (
                          <Bell className="h-4 w-4 text-green-600" />
                        ) : (
                          <BellOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {search.site} • {search.frequency} alerts
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm mb-4">
                    {search.query.location && (
                      <div>📍 {search.query.location}</div>
                    )}
                    {search.query.min_beds && (
                      <div>🛏️ {search.query.min_beds}+ beds</div>
                    )}
                    {search.query.max_price && (
                      <div>💰 Max £{search.query.max_price.toLocaleString()}</div>
                    )}
                    {search.query.min_yield && (
                      <div>📈 Min {(search.query.min_yield * 100).toFixed(1)}% yield</div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRunNow(search)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Run Now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(search)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleActive(search.id, search.active)}
                    >
                      {search.active ? (
                        <BellOff className="h-4 w-4" />
                      ) : (
                        <Bell className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(search.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SavedSearches;
