import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, FileJson } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EnhancedExportProps {
  data: any[];
  filename: string;
  type?: "deals" | "forecasts" | "portfolio";
}

export function EnhancedExport({ data, filename, type = "deals" }: EnhancedExportProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const exportToCSV = () => {
    try {
      setLoading(true);
      const headers = Object.keys(data[0] || {});
      const csv = [
        headers.join(","),
        ...data.map((row) =>
          headers.map((header) => JSON.stringify(row[header] || "")).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Downloaded ${data.length} rows as CSV`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToJSON = () => {
    try {
      setLoading(true);
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.json`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Downloaded ${data.length} records as JSON`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    // For Excel export, we'd use a library like xlsx
    // For now, just show CSV as "Excel compatible"
    exportToCSV();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={loading || data.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          <FileJson className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
