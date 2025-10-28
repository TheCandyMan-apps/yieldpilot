import DashboardLayout from "@/components/DashboardLayout";
import { InvestorNetwork as InvestorNetworkComponent } from "@/components/network/InvestorNetwork";

export default function InvestorNetwork() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investor Network</h1>
          <p className="text-muted-foreground mt-2">
            Connect with verified property investors and discover co-investment opportunities
          </p>
        </div>

        <InvestorNetworkComponent />
      </div>
    </DashboardLayout>
  );
}
