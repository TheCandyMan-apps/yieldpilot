import { useState } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RiskResult {
  severity: 'low' | 'medium' | 'high';
  category: string;
  message: string;
  line_ref?: string;
}

export function DocumentUpload({ listingId }: { listingId: string }) {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [risks, setRisks] = useState<RiskResult[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, images, and text files are supported');
      return;
    }

    setUploading(true);
    setRisks([]);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        setAnalyzing(true);
        setUploading(false);

        const { data, error } = await supabase.functions.invoke('riskparse', {
          body: {
            listing_id: listingId,
            document: base64,
            filename: file.name,
            doc_type: file.type.includes('pdf') ? 'lease' : 'epc'
          }
        });

        setAnalyzing(false);

        if (error) {
          toast.error('Failed to analyze document');
          return;
        }

        setRisks(data.risks || []);
        toast.success(`Analyzed ${file.name} - found ${data.risks?.length || 0} items`);
      };

      reader.onerror = () => {
        setUploading(false);
        toast.error('Failed to read file');
      };
    } catch (error) {
      setUploading(false);
      setAnalyzing(false);
      toast.error('Upload failed');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Document Risk Analysis
        </CardTitle>
        <CardDescription>
          Upload EPC, lease, or insurance documents for AI-powered risk detection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
          <input
            type="file"
            id="doc-upload"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.txt"
            onChange={handleFileUpload}
            disabled={uploading || analyzing}
          />
          <label htmlFor="doc-upload" className="cursor-pointer">
            {uploading || analyzing ? (
              <Loader2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-spin" />
            ) : (
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            )}
            <p className="font-medium mb-1">
              {uploading ? 'Uploading...' : analyzing ? 'Analyzing...' : 'Click to upload'}
            </p>
            <p className="text-sm text-muted-foreground">
              PDF, JPG, PNG or TXT up to 10MB
            </p>
          </label>
        </div>

        {risks.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Detected Issues ({risks.length})
            </h4>
            {risks.map((risk, idx) => (
              <Alert key={idx} variant={risk.severity === 'high' ? 'destructive' : 'default'}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getSeverityColor(risk.severity)}>
                        {risk.severity}
                      </Badge>
                      <span className="text-sm font-medium">{risk.category}</span>
                    </div>
                    <AlertDescription>{risk.message}</AlertDescription>
                    {risk.line_ref && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Reference: {risk.line_ref}
                      </p>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {risks.length === 0 && !uploading && !analyzing && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
            <p>No documents analyzed yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
