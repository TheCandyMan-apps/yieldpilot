import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, XCircle, Shield } from 'lucide-react';
import { generateComplianceReport, getComplianceColor, getSeverityVariant, type ComplianceReport } from '@/lib/compliance';
import { Separator } from '@/components/ui/separator';

interface ComplianceTabProps {
  listingId: string;
  enrichment?: any;
  propertyData?: any;
}

export function ComplianceTab({ listingId, enrichment, propertyData }: ComplianceTabProps) {
  const [report, setReport] = useState<ComplianceReport | null>(null);

  useEffect(() => {
    const complianceReport = generateComplianceReport(listingId, enrichment, propertyData);
    setReport(complianceReport);
  }, [listingId, enrichment, propertyData]);

  if (!report) return null;

  const StatusIcon = {
    pass: CheckCircle2,
    warn: AlertTriangle,
    fail: XCircle,
  }[report.overall_status];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            UK Landlord Compliance
          </CardTitle>
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${
              report.overall_status === 'pass' ? 'text-success' :
              report.overall_status === 'warn' ? 'text-warning' : 'text-destructive'
            }`} />
            <Badge variant={getComplianceColor(report.overall_status) as any}>
              {report.overall_status.toUpperCase()}
            </Badge>
          </div>
        </div>
        {(report.critical_count > 0 || report.high_count > 0) && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>
              {report.critical_count > 0 && `${report.critical_count} critical issue(s). `}
              {report.high_count > 0 && `${report.high_count} high-priority issue(s).`}
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {report.checks.map((check, idx) => {
          const CheckIcon = {
            pass: CheckCircle2,
            warn: AlertTriangle,
            fail: XCircle,
          }[check.status];

          return (
            <div key={idx}>
              <div className="flex items-start gap-3">
                <CheckIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                  check.status === 'pass' ? 'text-success' :
                  check.status === 'warn' ? 'text-warning' : 'text-destructive'
                }`} />
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-medium text-sm capitalize">
                        {check.check_type.replace(/_/g, ' ')}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">{check.message}</p>
                    </div>
                    <Badge variant={getSeverityVariant(check.severity) as any} className="text-xs">
                      {check.severity}
                    </Badge>
                  </div>
                  
                  {check.action_required && (
                    <Alert>
                      <AlertDescription className="text-sm">
                        <strong>Action:</strong> {check.action_required}
                      </AlertDescription>
                    </Alert>
                  )}

                  {check.metadata && Object.keys(check.metadata).length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      {Object.entries(check.metadata).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium">{key.replace(/_/g, ' ')}:</span> {String(value)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {idx < report.checks.length - 1 && <Separator className="mt-4" />}
            </div>
          );
        })}

        <div className="text-xs text-muted-foreground pt-4">
          Last checked: {new Date(report.checked_at).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}
