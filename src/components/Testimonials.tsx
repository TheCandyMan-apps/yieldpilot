import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Property Investor",
    content: "YieldPilot saved me 15+ hours of analysis per property. The AI insights helped me identify a deal with 12% ROI that I would have missed!",
    rating: 5,
    initials: "SM"
  },
  {
    name: "James Chen",
    role: "Real Estate Agent",
    content: "Game-changer for my clients. We can now analyze properties during viewings and make informed decisions instantly.",
    rating: 5,
    initials: "JC"
  },
  {
    name: "Emma Rodriguez",
    role: "First-Time Investor",
    content: "As a beginner, YieldPilot gave me the confidence to make my first investment. The detailed analysis is invaluable.",
    rating: 5,
    initials: "ER"
  },
];

const Testimonials = () => {
  return (
    <section className="py-20 bg-accent/30" id="testimonials">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Trusted by <span className="text-primary">Investors</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands of property investors making smarter decisions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="hover-scale border-2">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold">{testimonial.initials}</span>
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
                
                <div className="flex gap-1 mb-4" aria-label={`Rating: ${testimonial.rating} out of 5 stars`}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>

                <p className="text-muted-foreground italic">"{testimonial.content}"</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
