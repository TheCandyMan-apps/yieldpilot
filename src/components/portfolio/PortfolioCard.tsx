import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, TrendingUp, Building2, ArrowRight } from 'lucide-react';
import { formatCurrency, formatPercentage, getHealthScoreColor } from '@/lib/portfolioCalculations';
import { useNavigate } from 'react-router-dom';

interface PortfolioCardProps {
  portfolio: any;
  summary?: any;
}

export function PortfolioCard({ portfolio, summary }: PortfolioCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/portfolio/${portfolio.id}`)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{portfolio.name}</CardTitle>
          </div>
          {summary && (
            <Badge variant={getHealthScoreColor(summary.health_score || 0) as any}>
              Health: {summary.health_score || 0}/100
            </Badge>
          )}
        </div>
        {portfolio.description && (
          <p className="text-sm text-muted-foreground">{portfolio.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {summary ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Building2 className="h-4 w-4" />
                  <span>Properties</span>
                </div>
                <p className="text-2xl font-bold">{summary.total_properties}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span>Portfolio Yield</span>
                </div>
                <p className="text-2xl font-bold">{formatPercentage(summary.portfolio_yield)}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Value:</span>
                <span className="font-medium">{formatCurrency(summary.total_value)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Cashflow:</span>
                <span className={`font-medium ${summary.net_monthly_cashflow >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(summary.net_monthly_cashflow)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg DSCR:</span>
                <span className="font-medium">{summary.avg_dscr.toFixed(2)}x</span>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={(e) => {
              e.stopPropagation();
              navigate(`/portfolio/${portfolio.id}`);
            }}>
              View Details
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">No properties added yet</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={(e) => {
              e.stopPropagation();
              navigate(`/portfolio/${portfolio.id}`);
            }}>
              Add Properties
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
