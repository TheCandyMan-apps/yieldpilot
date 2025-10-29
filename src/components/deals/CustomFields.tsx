import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CustomField {
  id: string;
  field_name: string;
  field_value: string | null;
  field_type: string;
}

interface CustomFieldsProps {
  dealId: string;
}

export function CustomFields({ dealId }: CustomFieldsProps) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadFields();
  }, [dealId]);

  const loadFields = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const { data, error } = await supabase
        .from("custom_fields")
        .select("*")
        .eq("deal_id", dealId)
        .eq("user_id", session.session.user.id);

      if (error) throw error;
      setFields(data || []);
    } catch (error) {
      console.error("Failed to load custom fields:", error);
    } finally {
      setLoading(false);
    }
  };

  const addField = async () => {
    if (!newFieldName.trim()) {
      toast({
        title: "Field name required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const { error } = await supabase.from("custom_fields").insert({
        deal_id: dealId,
        user_id: session.session.user.id,
        field_name: newFieldName,
        field_type: newFieldType,
        field_value: "",
      });

      if (error) throw error;

      setNewFieldName("");
      setNewFieldType("text");
      toast({ title: "Field added" });
      loadFields();
    } catch (error) {
      console.error("Failed to add field:", error);
      toast({
        title: "Failed to add field",
        variant: "destructive",
      });
    }
  };

  const updateFieldValue = async (fieldId: string, value: string) => {
    try {
      const { error } = await supabase
        .from("custom_fields")
        .update({ field_value: value })
        .eq("id", fieldId);

      if (error) throw error;
    } catch (error) {
      console.error("Failed to update field:", error);
      toast({
        title: "Failed to update field",
        variant: "destructive",
      });
    }
  };

  const deleteField = async (fieldId: string) => {
    try {
      const { error } = await supabase
        .from("custom_fields")
        .delete()
        .eq("id", fieldId);

      if (error) throw error;

      toast({ title: "Field deleted" });
      loadFields();
    } catch (error) {
      console.error("Failed to delete field:", error);
      toast({
        title: "Failed to delete field",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Custom Fields</h3>

      <div className="space-y-4 mb-6">
        {fields.map((field) => (
          <div key={field.id} className="flex gap-2">
            <div className="flex-1">
              <Label className="text-sm font-medium">{field.field_name}</Label>
              {field.field_type === "text" && (
                <Input
                  value={field.field_value || ""}
                  onChange={(e) => updateFieldValue(field.id, e.target.value)}
                  placeholder={`Enter ${field.field_name}`}
                />
              )}
              {field.field_type === "number" && (
                <Input
                  type="number"
                  value={field.field_value || ""}
                  onChange={(e) => updateFieldValue(field.id, e.target.value)}
                  placeholder={`Enter ${field.field_name}`}
                />
              )}
              {field.field_type === "date" && (
                <Input
                  type="date"
                  value={field.field_value || ""}
                  onChange={(e) => updateFieldValue(field.id, e.target.value)}
                />
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteField(field.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No custom fields yet. Add your own data points below.
          </p>
        )}
      </div>

      <div className="border-t pt-4 space-y-4">
        <h4 className="text-sm font-medium">Add New Field</h4>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Field name (e.g., School Rating)"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
            />
          </div>
          <Select value={newFieldType} onValueChange={setNewFieldType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="date">Date</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={addField} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
