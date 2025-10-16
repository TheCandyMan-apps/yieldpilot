import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Home, 
  TrendingUp, 
  Briefcase, 
  Calculator, 
  BarChart3, 
  Users, 
  CreditCard,
  Menu,
  X,
  LogOut,
  User,
  Bell,
  MapPin,
  Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Deal Feed", href: "/deals", icon: TrendingUp },
    { name: "Area Heatmap", href: "/area-insights", icon: MapPin },
    { name: "Portfolio", href: "/portfolio", icon: Briefcase },
    { name: "Simulator", href: "/simulator", icon: Calculator },
    { name: "Insights", href: "/insights", icon: BarChart3 },
    { name: "Alerts", href: "/alerts", icon: Bell },
    { name: "Your Profile", href: "/investor-profile", icon: Brain },
    { name: "Community", href: "/community", icon: Users },
    { name: "Billing", href: "/billing", icon: CreditCard },
  ];

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-card border-r border-border transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">YieldPilot</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center space-x-3 px-4 py-3 mb-2 rounded-lg bg-muted">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Investor</p>
                <p className="text-xs text-muted-foreground truncate">Free Plan</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center h-16 px-4 bg-card border-b border-border lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div className="flex items-center ml-4">
            <TrendingUp className="h-6 w-6 text-primary mr-2" />
            <span className="font-bold text-lg">YieldPilot</span>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
