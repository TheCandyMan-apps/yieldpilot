import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, BookOpen, CheckSquare } from "lucide-react";

const resources = [
  {
    icon: FileText,
    title: "Ultimate Property Investment Guide",
    description: "Complete 50-page guide covering everything from first-time buying to portfolio management.",
    type: "PDF Guide",
    size: "2.4 MB"
  },
  {
    icon: CheckSquare,
    title: "Property Viewing Checklist",
    description: "Professional checklist to evaluate properties systematically and spot potential issues.",
    type: "Printable Checklist",
    size: "245 KB"
  },
  {
    icon: BookOpen,
    title: "ROI Calculation Workbook",
    description: "Excel template with formulas to calculate accurate returns on any property investment.",
    type: "Excel Template",
    size: "156 KB"
  },
  {
    icon: FileText,
    title: "UK Property Tax Guide 2025",
    description: "Navigate stamp duty, capital gains tax, and income tax implications for property investors.",
    type: "PDF Guide",
    size: "1.8 MB"
  }
];

const Resources = () => {
  return (
    <section className="py-20 bg-background" id="resources">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Free Investment <span className="text-primary">Resources</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Download expert guides, templates, and checklists to accelerate your investment journey
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {resources.map((resource, index) => {
            const Icon = resource.icon;
            return (
              <Card key={index} className="border-2 hover-scale">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{resource.title}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{resource.type}</span>
                        <span>•</span>
                        <span>{resource.size}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{resource.description}</p>
                  
                  <Button className="w-full group">
                    <Download className="mr-2 h-4 w-4 group-hover:translate-y-1 transition-transform" />
                    Download Free
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Get instant access to all resources when you create a free account
          </p>
          <Button size="lg" variant="outline">
            Sign Up for Free Resources
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Resources;
