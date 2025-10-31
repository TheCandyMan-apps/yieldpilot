import { Lock, TrendingUp, Zap, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
}

export function UpgradeModal({ open, onOpenChange, feature }: UpgradeModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Unlock {feature}</DialogTitle>
          <DialogDescription className="text-center">
            Upgrade to Pro to access advanced features and maximize your investment potential
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium">Advanced Analytics</p>
              <p className="text-sm text-muted-foreground">
                Full yield calculations, IRR, and equity multiple projections
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
              <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium">Unlimited Exports</p>
              <p className="text-sm text-muted-foreground">
                Export deal packs with PDF reports and Excel models
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
              <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="font-medium">Real-time Alerts</p>
              <p className="text-sm text-muted-foreground">
                Get notified instantly when new deals match your criteria
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={() => {
              navigate("/billing");
              onOpenChange(false);
            }}
            className="w-full"
          >
            Upgrade to Pro
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}