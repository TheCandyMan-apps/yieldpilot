import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Save, Bookmark, Trash2, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: any;
  is_shared: boolean;
}

interface FilterPresetsProps {
  currentFilters: any;
  onApplyPreset: (filters: any) => void;
}

export function FilterPresets({ currentFilters, onApplyPreset }: FilterPresetsProps) {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    const { data, error } = await supabase
      .from("filter_presets")
      .select("*")
      .or(`user_id.eq.${session.session.user.id},is_shared.eq.true`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load presets:", error);
      return;
    }

    setPresets(data || []);
  };

  const savePreset = async () => {
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for this preset",
        variant: "destructive",
      });
      return;
    }

    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    const { error } = await supabase.from("filter_presets").insert({
      user_id: session.session.user.id,
      name,
      description,
      filters: currentFilters,
    });

    if (error) {
      console.error("Failed to save preset:", error);
      toast({
        title: "Save failed",
        description: "Could not save filter preset",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Preset saved",
      description: `Filter preset "${name}" has been saved`,
    });

    setName("");
    setDescription("");
    setDialogOpen(false);
    loadPresets();
  };

  const deletePreset = async (id: string) => {
    const { error } = await supabase
      .from("filter_presets")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Failed to delete preset:", error);
      return;
    }

    toast({
      title: "Preset deleted",
      description: "Filter preset has been deleted",
    });

    loadPresets();
  };

  const sharePreset = async (id: string) => {
    const { error } = await supabase
      .from("filter_presets")
      .update({ is_shared: true })
      .eq("id", id);

    if (error) {
      console.error("Failed to share preset:", error);
      return;
    }

    toast({
      title: "Preset shared",
      description: "Filter preset is now visible to all users",
    });

    loadPresets();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Saved Filters</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Save className="h-4 w-4 mr-2" />
              Save Current
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Filter Preset</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Manchester Buy-to-Let"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (optional)</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What makes this filter useful?"
                  rows={3}
                />
              </div>
              <Button onClick={savePreset} className="w-full">
                Save Preset
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-2">
        {presets.length === 0 ? (
          <Card className="p-4 text-center text-sm text-muted-foreground">
            No saved filters yet. Save your current filters to reuse them later.
          </Card>
        ) : (
          presets.map((preset) => (
            <Card key={preset.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => onApplyPreset(preset.filters)}
                    className="text-left w-full hover:text-primary transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Bookmark className="h-4 w-4 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{preset.name}</p>
                        {preset.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {preset.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  {!preset.is_shared && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => sharePreset(preset.id)}
                    >
                      <Share2 className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => deletePreset(preset.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
