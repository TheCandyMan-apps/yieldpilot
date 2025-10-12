import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, MapPin, Calendar } from "lucide-react";

const caseStudies = [
  {
    title: "Manchester Buy-to-Let Success",
    location: "Manchester, UK",
    propertyType: "2-Bed Apartment",
    investment: "£185,000",
    roi: "14.2%",
    date: "March 2024",
    story: "Identified undervalued property in emerging area. Used YieldPilot's market analysis to predict 8% capital growth. Achieved 14.2% ROI through strategic HMO conversion.",
    tags: ["Buy-to-Let", "HMO", "High Yield"]
  },
  {
    title: "London Portfolio Expansion",
    location: "East London, UK",
    propertyType: "3-Bed House",
    investment: "£425,000",
    roi: "11.8%",
    date: "January 2024",
    story: "Leveraged YieldPilot's comparative analysis to identify property 15% below market value. Strategic refurbishment increased rental income by 25%.",
    tags: ["Portfolio", "Refurbishment", "Capital Growth"]
  },
  {
    title: "Birmingham Commercial Investment",
    location: "Birmingham City Centre",
    propertyType: "Retail Unit",
    investment: "£320,000",
    roi: "16.5%",
    date: "November 2023",
    story: "Commercial property analysis revealed strong tenant demand. Long-term lease secured with national retailer, providing stable high-yield returns.",
    tags: ["Commercial", "Long-term Lease", "Stable Income"]
  }
];

const CaseStudies = () => {
  return (
    <section className="py-20 bg-background" id="case-studies">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Real Investment <span className="text-primary">Success Stories</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            See how investors used YieldPilot to identify profitable opportunities
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {caseStudies.map((study, index) => (
            <Card key={index} className="border-2 hover-scale">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                    {study.roi} ROI
                  </Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {study.date}
                  </div>
                </div>
                <CardTitle className="text-xl">{study.title}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {study.location}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-accent/30 rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Property Type</div>
                    <div className="font-semibold">{study.propertyType}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Investment</div>
                    <div className="font-semibold">{study.investment}</div>
                  </div>
                </div>

                <p className="text-muted-foreground">{study.story}</p>

                <div className="flex flex-wrap gap-2">
                  {study.tags.map((tag, tagIndex) => (
                    <Badge key={tagIndex} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CaseStudies;
