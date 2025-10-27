import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, FileText, FileSpreadsheet } from "lucide-react";

interface ExportButtonProps {
  listingIds: string[];
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export const ExportButton = ({ listingIds, variant = "outline", size = "default" }: ExportButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleExport = async (format: "csv" | "pdf") => {
    if (listingIds.length === 0) {
      toast.error("No listings selected");
      return;
    }

    try {
      setLoading(true);
      toast.info(`Generating ${format.toUpperCase()} export...`);

      const { data, error } = await supabase.functions.invoke("export-pack", {
        body: { listingIds, format },
      });

      if (error) throw error;

      if (data.error) {
        // Plan limit error
        toast.error(data.error);
        return;
      }

      if (format === "csv" && typeof data === "string") {
        // Download CSV
        const blob = new Blob([data], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `yieldpilot-export-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV downloaded");
      } else if (format === "pdf") {
        // PDF generation placeholder (needs client-side implementation or playwright)
        toast.info("PDF generation coming soon");
      }
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(error.message || "Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={loading || listingIds.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF (Pro)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
