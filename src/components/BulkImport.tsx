import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export function BulkImport() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isCSV = file.name.endsWith('.csv');
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (!isCSV && !isExcel) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV or Excel file",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      if (isCSV) {
        Papa.parse(file, {
          header: true,
          complete: async (results) => {
            await processRows(results.data);
          },
          error: (error) => {
            console.error("CSV parsing error:", error);
            toast({
              title: "Failed to parse CSV",
              description: error.message,
              variant: "destructive",
            });
            setImporting(false);
          },
        });
      } else {
        // For Excel, we'd need to use a library like xlsx
        toast({
          title: "Excel support coming soon",
          description: "Please use CSV format for now",
        });
        setImporting(false);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import failed",
        description: "An error occurred during import",
        variant: "destructive",
      });
      setImporting(false);
    }
  };

  const processRows = async (rows: any[]) => {
    const results: ImportResult = {
      total: rows.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast({
        title: "Not authenticated",
        description: "Please sign in to import properties",
        variant: "destructive",
      });
      setImporting(false);
      return;
    }

    for (const row of rows) {
      try {
        // Validate required fields
        if (!row.property_address || !row.price) {
          results.failed++;
          results.errors.push(`Row missing required fields: ${JSON.stringify(row)}`);
          continue;
        }

        // Create listing
        const { error } = await supabase.from("listings").insert({
          user_id: session.session.user.id,
          property_address: row.property_address,
          price: parseFloat(row.price),
          bedrooms: row.bedrooms ? parseInt(row.bedrooms) : null,
          bathrooms: row.bathrooms ? parseInt(row.bathrooms) : null,
          property_type: row.property_type || null,
          city: row.city || null,
          postcode: row.postcode || null,
          region: row.region || "UK",
          currency: row.currency || "GBP",
          listing_url: row.listing_url || null,
        });

        if (error) {
          results.failed++;
          results.errors.push(`${row.property_address}: ${error.message}`);
        } else {
          results.success++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`${row.property_address}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    setResult(results);
    setImporting(false);

    toast({
      title: "Import complete",
      description: `${results.success} properties imported, ${results.failed} failed`,
    });
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Bulk Property Import</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          Upload a CSV file with property data. Required columns: property_address, price.
          Optional: bedrooms, bathrooms, city, postcode, property_type, listing_url
        </p>

        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            disabled={importing}
            className="hidden"
            id="bulk-import-input"
          />
          <label
            htmlFor="bulk-import-input"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            {importing ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm">Importing properties...</p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Click to upload CSV or Excel file</p>
                <p className="text-xs text-muted-foreground">or drag and drop</p>
              </>
            )}
          </label>
        </div>

        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Success</p>
                  <p className="text-lg font-semibold">{result.success}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <XCircle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Failed</p>
                  <p className="text-lg font-semibold">{result.failed}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <FileSpreadsheet className="h-4 w-4" />
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-semibold">{result.total}</p>
                </div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="p-3 bg-destructive/10 rounded-md">
                <p className="text-sm font-medium mb-2">Errors:</p>
                <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
                  {result.errors.slice(0, 5).map((error, i) => (
                    <p key={i} className="text-muted-foreground">• {error}</p>
                  ))}
                  {result.errors.length > 5 && (
                    <p className="text-muted-foreground">...and {result.errors.length - 5} more</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const csv = `property_address,price,bedrooms,bathrooms,city,postcode,property_type,region,currency
"123 Main St, London",250000,3,2,"London","SW1A 1AA","residential","UK","GBP"
"456 Oak Ave, Manchester",180000,2,1,"Manchester","M1 1AA","residential","UK","GBP"`;
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'sample-import.csv';
              a.click();
              window.URL.revokeObjectURL(url);
            }}
          >
            Download Sample CSV
          </Button>
        </div>
      </div>
    </Card>
  );
}
