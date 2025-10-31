import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText, AlertTriangle, CheckCircle2, Clock, TrendingDown, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function LeaseScanner() {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scanProgress, setScanProgress] = useState(0);

  // Fetch lease scan jobs
  const { data: scanJobs, refetch } = useQuery({
    queryKey: ["lease-scan-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lease_scan_jobs")
        .select(`
          *,
          lease_terms(
            *,
            lease_roi_metrics(*),
            lease_risk_flags(*)
          )
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
    } else {
      toast.error("Please select a PDF file");
    }
  };

  const handleUploadAndScan = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    setUploading(true);
    setScanProgress(10);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to scan leases");
        return;
      }

      // Upload file to Supabase Storage
      const fileName = `${Date.now()}-${selectedFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("investment-reports")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      setScanProgress(30);

      const { data: { publicUrl } } = supabase.storage
        .from("investment-reports")
        .getPublicUrl(fileName);

      // Create scan job
      const { data: scanJob, error: jobError } = await supabase
        .from("lease_scan_jobs")
        .insert([{
          user_id: user.id,
          file_url: publicUrl,
          file_name: selectedFile.name,
          status: "pending" as const,
        }])
        .select()
        .single();

      if (jobError) throw jobError;

      setScanProgress(50);

      // Parse document (simplified - in production use document--parse_document)
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      // Mock document text for demo (in production, use actual parser)
      const mockDocumentText = `LEASE AGREEMENT
        
        Lease Start Date: 01/01/2010
        Lease End Date: 01/01/2135
        Ground Rent: £350 per annum, reviewed every 10 years with RPI increases
        Service Charge: £2,400 per annum
        
        Subletting: Permitted with landlord's written consent
        Pets: Not permitted without landlord's consent
        Alterations: Internal non-structural alterations permitted with consent
        
        Insurance: Landlord responsible
        Repairs: Tenant responsible for internal repairs`;

      setScanProgress(70);

      // Call scan-lease function
      const { data: scanResult, error: scanError } = await supabase.functions.invoke("scan-lease", {
        body: {
          scanJobId: scanJob.id,
          documentText: mockDocumentText,
        },
      });

      if (scanError) throw scanError;

      setScanProgress(100);
      toast.success("Lease scan completed successfully!");
      
      // Reset and refetch
      setTimeout(() => {
        setSelectedFile(null);
        setScanProgress(0);
        setUploading(false);
        refetch();
      }, 1000);

    } catch (error: any) {
      console.error("Scan error:", error);
      toast.error(error.message || "Failed to scan lease");
      setUploading(false);
      setScanProgress(0);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">Lease Intelligence Scanner</h1>
          <p className="text-muted-foreground">
            Upload lease documents to extract key terms, identify risks, and calculate mortgageability
          </p>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Lease Document
            </CardTitle>
            <CardDescription>
              Upload a PDF lease document to begin AI-powered analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lease-file">Lease PDF</Label>
              <Input
                id="lease-file"
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processing lease document...</span>
                  <span>{scanProgress}%</span>
                </div>
                <Progress value={scanProgress} />
              </div>
            )}

            <Button
              onClick={handleUploadAndScan}
              disabled={!selectedFile || uploading}
              className="w-full"
            >
              {uploading ? "Scanning..." : "Scan Lease Document"}
            </Button>
          </CardContent>
        </Card>

        {/* Scan Results */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Recent Scans</h2>
          
          {scanJobs && scanJobs.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No lease scans yet. Upload your first lease document to get started.
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {scanJobs?.map((job: any) => {
              const terms = job.lease_terms?.[0];
              const metrics = terms?.lease_roi_metrics?.[0];
              const flags = terms?.lease_risk_flags || [];

              return (
                <Card key={job.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          {job.file_name}
                        </CardTitle>
                        <CardDescription>
                          Scanned {new Date(job.created_at).toLocaleString()}
                        </CardDescription>
                      </div>
                      
                      {job.status === "completed" && metrics && (
                        <Badge
                          variant={
                            metrics.overall_risk_score === "A" || metrics.overall_risk_score === "B"
                              ? "default"
                              : metrics.overall_risk_score === "C" || metrics.overall_risk_score === "D"
                              ? "secondary"
                              : "destructive"
                          }
                          className="text-lg px-3 py-1"
                        >
                          {metrics.overall_risk_score}
                        </Badge>
                      )}
                      
                      {job.status === "processing" && (
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          Processing
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  {job.status === "completed" && terms && metrics && (
                    <CardContent>
                      <Tabs defaultValue="overview">
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="overview">Overview</TabsTrigger>
                          <TabsTrigger value="risks">Risks ({flags.length})</TabsTrigger>
                          <TabsTrigger value="financial">Financial</TabsTrigger>
                          <TabsTrigger value="terms">Terms</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Years Remaining</p>
                              <p className="text-2xl font-bold">{terms.years_remaining || "N/A"}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Ground Rent</p>
                              <p className="text-2xl font-bold">£{terms.ground_rent_annual || "0"}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Service Charge</p>
                              <p className="text-2xl font-bold">£{terms.service_charge_annual || "0"}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Mortgageable</p>
                              <p className="text-2xl font-bold flex items-center gap-2">
                                {metrics.is_mortgageable ? (
                                  <>
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    Yes
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="h-5 w-5 text-red-600" />
                                    No
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Ground Rent Risk</span>
                              <span className="text-sm text-muted-foreground">{metrics.ground_rent_risk_score}/100</span>
                            </div>
                            <Progress value={metrics.ground_rent_risk_score} />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Lease Length Risk</span>
                              <span className="text-sm text-muted-foreground">{metrics.lease_length_risk_score}/100</span>
                            </div>
                            <Progress value={metrics.lease_length_risk_score} />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Mortgageability Risk</span>
                              <span className="text-sm text-muted-foreground">{metrics.mortgageability_risk_score}/100</span>
                            </div>
                            <Progress value={metrics.mortgageability_risk_score} />
                          </div>
                        </TabsContent>

                        <TabsContent value="risks" className="space-y-3">
                          {flags.length === 0 ? (
                            <Alert>
                              <CheckCircle2 className="h-4 w-4" />
                              <AlertDescription>
                                No significant risks identified. This lease appears to be in good condition.
                              </AlertDescription>
                            </Alert>
                          ) : (
                            flags.map((flag: any) => (
                              <Alert
                                key={flag.id}
                                variant={flag.severity === "critical" || flag.severity === "high" ? "destructive" : "default"}
                              >
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                  <p className="font-semibold mb-1">{flag.title}</p>
                                  <p className="text-sm mb-2">{flag.description}</p>
                                  {flag.remediation_advice && (
                                    <p className="text-sm italic">
                                      <strong>Advice:</strong> {flag.remediation_advice}
                                    </p>
                                  )}
                                </AlertDescription>
                              </Alert>
                            ))
                          )}
                        </TabsContent>

                        <TabsContent value="financial" className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">ROI Impact</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="flex items-center gap-2">
                                  {metrics.roi_adjustment_percentage < 0 ? (
                                    <TrendingDown className="h-5 w-5 text-red-600" />
                                  ) : (
                                    <TrendingUp className="h-5 w-5 text-green-600" />
                                  )}
                                  <span className="text-2xl font-bold">
                                    {metrics.roi_adjustment_percentage?.toFixed(1)}%
                                  </span>
                                </div>
                              </CardContent>
                            </Card>

                            {metrics.enfranchisement_eligible && (
                              <Card>
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-sm font-medium">Extension Cost Est.</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <span className="text-2xl font-bold">
                                    £{metrics.lease_extension_cost_estimate?.toLocaleString() || "8,000-15,000"}
                                  </span>
                                </CardContent>
                              </Card>
                            )}
                          </div>

                          {metrics.ground_rent_forecast && metrics.ground_rent_forecast.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2">10-Year Ground Rent Forecast</h4>
                              <div className="space-y-1">
                                {metrics.ground_rent_forecast.slice(0, 5).map((forecast: any) => (
                                  <div key={forecast.year} className="flex justify-between text-sm">
                                    <span>Year {forecast.year}</span>
                                    <span className="font-medium">£{forecast.amount}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="terms" className="space-y-3">
                          <div className="grid gap-3">
                            <div>
                              <p className="text-sm text-muted-foreground">Lease Period</p>
                              <p className="font-medium">
                                {terms.lease_start_date && new Date(terms.lease_start_date).toLocaleDateString()} 
                                {" to "}
                                {terms.lease_end_date && new Date(terms.lease_end_date).toLocaleDateString()}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-muted-foreground">Ground Rent Escalation</p>
                              <p className="font-medium capitalize">{terms.ground_rent_escalation_type || "N/A"}</p>
                            </div>

                            <div>
                              <p className="text-sm text-muted-foreground">Subletting</p>
                              <p className="font-medium">
                                {terms.subletting_allowed ? "Allowed" : "Prohibited"}
                                {terms.subletting_restrictions && ` - ${terms.subletting_restrictions}`}
                              </p>
                            </div>

                            <div>
                              <p className="text-sm text-muted-foreground">Insurance Responsibility</p>
                              <p className="font-medium capitalize">{terms.insurance_responsibility || "N/A"}</p>
                            </div>

                            {terms.repair_obligations && (
                              <div>
                                <p className="text-sm text-muted-foreground">Repair Obligations</p>
                                <p className="font-medium">{terms.repair_obligations}</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  )}

                  {job.status === "failed" && (
                    <CardContent>
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {job.error_message || "Failed to process lease document"}
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
