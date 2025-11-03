import { Helmet } from "react-helmet";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import blogPropertyTech from "@/assets/blog-property-tech.jpg";
import blogYieldAnalysis from "@/assets/blog-yield-analysis.jpg";
import blogAiInvesting from "@/assets/blog-ai-investing.jpg";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image: string;
  imageAlt: string;
  author: string;
  date: string;
  readTime: string;
  category: string;
  tags: string[];
}

const blogPosts: BlogPost[] = [
  {
    id: "1",
    title: "The Future of Property Investment: How Technology is Revolutionizing UK Real Estate",
    slug: "future-property-investment-technology",
    excerpt: "Discover how modern technology platforms are transforming property investment analysis, making professional-grade tools accessible to every investor.",
    content: "The UK property market has traditionally been opaque, with professional investors having access to data and tools that retail investors could only dream of. But technology is changing everything...",
    image: blogPropertyTech,
    imageAlt: "Modern property investment dashboard showing analytics and property data",
    author: "Sarah Mitchell",
    date: "2024-10-25",
    readTime: "8 min read",
    category: "Technology",
    tags: ["PropTech", "Investment Tools", "Market Analysis", "UK Property"]
  },
  {
    id: "2",
    title: "Maximizing Rental Yields: A Complete Guide to UK Buy-to-Let Analysis",
    slug: "maximizing-rental-yields-uk-guide",
    excerpt: "Learn the proven strategies professional investors use to identify high-yield properties and calculate true returns including all costs and taxes.",
    content: "Understanding rental yields is crucial for buy-to-let success. But gross yield tells only part of the story. This comprehensive guide shows you how to calculate net yield, factor in all costs, and identify properties that will truly deliver returns...",
    image: blogYieldAnalysis,
    imageAlt: "Rental yield calculations and ROI metrics on laptop screen",
    author: "James Thompson",
    date: "2024-10-22",
    readTime: "12 min read",
    category: "Investment Strategy",
    tags: ["Buy-to-Let", "Rental Yields", "ROI", "Investment Analysis"]
  },
  {
    id: "3",
    title: "AI-Powered Property Investment: Finding Off-Market Deals Before the Competition",
    slug: "ai-property-investment-off-market-deals",
    excerpt: "Discover how artificial intelligence and automated scraping can help you identify lucrative off-market opportunities including withdrawn listings, auctions, and planning applications.",
    content: "The best property deals never make it to the major portals. They're snapped up off-market by investors who know where to look. Now, AI technology is leveling the playing field...",
    image: blogAiInvesting,
    imageAlt: "AI technology analyzing real estate data with futuristic interface",
    author: "Dr. Emily Chen",
    date: "2024-10-20",
    readTime: "10 min read",
    category: "AI & Automation",
    tags: ["Artificial Intelligence", "Off-Market", "Property Sourcing", "Automation"]
  },
  {
    id: "4",
    title: "HMO Investment Guide: Higher Returns Through Multi-Let Properties",
    slug: "hmo-investment-guide-uk",
    excerpt: "Houses in Multiple Occupation offer superior yields but require specialized knowledge. Learn licensing requirements, tenant management strategies, and how to maximize HMO returns.",
    content: "HMOs consistently deliver yields 2-3% higher than standard buy-to-lets, but they require careful planning and management. This guide covers everything from licensing to room configuration...",
    image: blogPropertyTech,
    imageAlt: "HMO property layout and room configuration for maximum rental yield",
    author: "Marcus Johnson",
    date: "2024-10-28",
    readTime: "15 min read",
    category: "Investment Strategy",
    tags: ["HMO", "Multi-Let", "High Yield", "Licensing", "Property Management"]
  },
  {
    id: "5",
    title: "UK Property Market Forecast 2025: Regional Hotspots and Emerging Opportunities",
    slug: "uk-property-market-forecast-2025",
    excerpt: "Expert analysis of regional property markets, interest rate impacts, and where savvy investors are finding the best opportunities in 2025.",
    content: "As we head into 2025, the UK property market is showing distinct regional variations. While London prices remain flat, northern cities are experiencing significant growth...",
    image: blogYieldAnalysis,
    imageAlt: "UK property market heat map showing regional investment opportunities",
    author: "Sarah Mitchell",
    date: "2024-10-27",
    readTime: "11 min read",
    category: "Market Analysis",
    tags: ["Market Forecast", "Regional Analysis", "2025 Trends", "Investment Hotspots"]
  },
  {
    id: "6",
    title: "Stamp Duty and Tax Planning for Property Investors: Complete 2024 Guide",
    slug: "stamp-duty-tax-planning-property-investors",
    excerpt: "Navigate the complex UK property tax landscape. Learn strategies to minimize stamp duty, optimize capital gains, and structure investments tax-efficiently.",
    content: "Property taxation in the UK is complex and constantly evolving. Understanding stamp duty rates, additional property surcharges, capital gains tax, and allowable expenses is crucial for maximizing returns...",
    image: blogAiInvesting,
    imageAlt: "Tax calculator and stamp duty planning documents for property investment",
    author: "Rachel Edwards",
    date: "2024-10-26",
    readTime: "14 min read",
    category: "Tax & Legal",
    tags: ["Stamp Duty", "Tax Planning", "Capital Gains", "Property Tax", "UK Tax"]
  },
  {
    id: "7",
    title: "Property Refurbishment ROI: Which Improvements Actually Add Value?",
    slug: "property-refurbishment-roi-guide",
    excerpt: "Data-driven analysis of refurbishment costs versus value added. Learn which renovations deliver the highest returns and which to avoid.",
    content: "Not all refurbishments are created equal. Some improvements deliver 150% ROI while others barely break even. This guide uses market data to show exactly which renovations pay off...",
    image: blogPropertyTech,
    imageAlt: "Before and after property refurbishment showing value increase",
    author: "James Thompson",
    date: "2024-10-24",
    readTime: "10 min read",
    category: "Property Development",
    tags: ["Refurbishment", "ROI", "Property Value", "Renovation", "Value Add"]
  },
  {
    id: "8",
    title: "Building a Balanced Property Portfolio: Diversification Strategies for UK Investors",
    slug: "balanced-property-portfolio-diversification",
    excerpt: "Learn how professional investors spread risk across property types, locations, and investment strategies to build resilient, high-performing portfolios.",
    content: "Portfolio diversification isn't just for stocks and bonds. Property investors who spread their investments across different regions, property types, and strategies consistently outperform...",
    image: blogYieldAnalysis,
    imageAlt: "Diversified property portfolio map showing multiple investment locations",
    author: "Dr. Emily Chen",
    date: "2024-10-23",
    readTime: "13 min read",
    category: "Portfolio Strategy",
    tags: ["Portfolio", "Diversification", "Risk Management", "Investment Strategy"]
  },
  {
    id: "9",
    title: "First-Time Property Investor's Complete Checklist: Avoid These Common Mistakes",
    slug: "first-time-property-investor-checklist",
    excerpt: "Essential guide for first-time investors covering mortgage options, due diligence, hidden costs, and the critical checks experienced investors never skip.",
    content: "Starting your property investment journey can be overwhelming. This comprehensive checklist ensures you cover all bases from mortgage approval to tenant selection...",
    image: blogAiInvesting,
    imageAlt: "New property investor reviewing investment checklist and documents",
    author: "Marcus Johnson",
    date: "2024-10-21",
    readTime: "9 min read",
    category: "Getting Started",
    tags: ["First Time Investor", "Beginner Guide", "Due Diligence", "Investment Checklist"]
  },
  {
    id: "10",
    title: "Commercial vs Residential Property Investment: Which Delivers Better Returns?",
    slug: "commercial-vs-residential-property-investment",
    excerpt: "Comprehensive comparison of commercial and residential property investment including yields, risks, tenant management, and financing options.",
    content: "Commercial property offers higher yields but comes with unique challenges. This detailed comparison helps you decide whether commercial, residential, or a mix is right for your portfolio...",
    image: blogPropertyTech,
    imageAlt: "Commercial office building and residential apartment comparison",
    author: "Sarah Mitchell",
    date: "2024-10-19",
    readTime: "12 min read",
    category: "Investment Strategy",
    tags: ["Commercial Property", "Residential", "Yield Comparison", "Investment Types"]
  },
  {
    id: "11",
    title: "Property Auction Success: How to Win Below-Market Deals at UK Auctions",
    slug: "property-auction-success-guide",
    excerpt: "Master property auctions with strategies for research, bidding, financing, and due diligence. Learn how to secure properties 20-30% below market value.",
    content: "Property auctions offer some of the best opportunities for below-market purchases, but they require different skills than traditional buying. This guide covers everything from auction research to bidding psychology...",
    image: blogYieldAnalysis,
    imageAlt: "Property auction with bidders and auctioneer hammer",
    author: "James Thompson",
    date: "2024-10-18",
    readTime: "11 min read",
    category: "Acquisition Strategy",
    tags: ["Property Auctions", "Below Market Value", "Bidding Strategy", "Auction Finance"]
  },
  {
    id: "12",
    title: "Rental Demand Hotspots: Data-Driven Analysis of UK's Strongest Rental Markets",
    slug: "rental-demand-hotspots-uk-analysis",
    excerpt: "Using employment data, population growth, and rental trends to identify locations with the strongest rental demand and lowest void periods.",
    content: "Strong rental demand is the foundation of successful buy-to-let investment. This data-driven analysis reveals which UK locations offer the best combination of high demand, low voids, and rental growth...",
    image: blogAiInvesting,
    imageAlt: "UK map showing rental demand heat zones and population growth",
    author: "Dr. Emily Chen",
    date: "2024-10-17",
    readTime: "10 min read",
    category: "Market Analysis",
    tags: ["Rental Demand", "Location Analysis", "Occupancy Rates", "Market Data"]
  }
];

const Blog = () => {
  // JSON-LD structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "YieldPilot Property Investment Blog",
    "description": "Expert insights on UK property investment, rental yields, market analysis, and PropTech innovations",
    "url": "https://yieldpilot.com/blog",
    "blogPost": blogPosts.map(post => ({
      "@type": "BlogPosting",
      "headline": post.title,
      "image": post.image,
      "datePublished": post.date,
      "dateModified": post.date,
      "author": {
        "@type": "Person",
        "name": post.author
      },
      "publisher": {
        "@type": "Organization",
        "name": "YieldPilot",
        "logo": {
          "@type": "ImageObject",
          "url": "https://yieldpilot.com/logo.png"
        }
      },
      "description": post.excerpt,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `https://yieldpilot.com/blog/${post.slug}`
      }
    }))
  };

  return (
    <>
      <Helmet>
        {/* Primary Meta Tags */}
        <title>Property Investment Blog | Expert UK Real Estate Insights - YieldPilot</title>
        <meta 
          name="title" 
          content="Property Investment Blog | Expert UK Real Estate Insights - YieldPilot" 
        />
        <meta 
          name="description" 
          content="Discover expert insights on UK property investment, rental yields, off-market deals, and PropTech innovations. Professional analysis and strategies for buy-to-let investors." 
        />
        
        {/* Keywords */}
        <meta 
          name="keywords" 
          content="UK property investment, rental yields, buy-to-let, PropTech, property analysis, real estate blog, investment strategy, off-market properties" 
        />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://yieldpilot.com/blog" />
        <meta property="og:title" content="Property Investment Blog | Expert UK Real Estate Insights" />
        <meta property="og:description" content="Expert insights on UK property investment, rental yields, and market analysis" />
        <meta property="og:image" content={blogPropertyTech} />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://yieldpilot.com/blog" />
        <meta property="twitter:title" content="Property Investment Blog | YieldPilot" />
        <meta property="twitter:description" content="Expert insights on UK property investment and rental yields" />
        <meta property="twitter:image" content={blogPropertyTech} />
        
        {/* Canonical */}
        <link rel="canonical" href="https://yieldpilot.com/blog" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        
        {/* Hero Section */}
        <section className="pt-32 pb-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center space-y-4 animate-fade-in">
              <Badge variant="secondary" className="mb-4">
                Latest Insights
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Property Investment Blog
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Expert insights, market analysis, and proven strategies for UK property investors
              </p>
            </div>
          </div>
        </section>

        {/* Blog Posts Grid */}
        <main className="pb-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <article className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogPosts.map((post, index) => (
                <Card 
                  key={post.id} 
                  className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Featured Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={post.image} 
                      alt={post.imageAlt}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <Badge 
                      variant="secondary" 
                      className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm"
                    >
                      {post.category}
                    </Badge>
                  </div>

                  <CardHeader>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <time dateTime={post.date}>
                          {new Date(post.date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </time>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{post.readTime}</span>
                      </div>
                    </div>
                    
                    <CardTitle className="line-clamp-2 hover:text-primary transition-colors">
                      <Link to={`/blog/${post.slug}`}>
                        {post.title}
                      </Link>
                    </CardTitle>
                    
                    <CardDescription className="line-clamp-3">
                      {post.excerpt}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-4">
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2">
                        {post.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Author & Read More */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{post.author}</span>
                        </div>
                        <Link 
                          to={`/blog/${post.slug}`}
                          className="flex items-center gap-1 text-sm font-medium text-primary hover:gap-2 transition-all"
                        >
                          Read More
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </article>

            {/* Newsletter CTA */}
            <section className="mt-16 text-center">
              <Card className="max-w-2xl mx-auto bg-gradient-to-br from-primary/10 to-primary-glow/10 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-2xl">Stay Updated</CardTitle>
                  <CardDescription>
                    Get the latest property investment insights delivered to your inbox weekly
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 max-w-md mx-auto">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="flex-1 px-4 py-2 rounded-md border border-input bg-background"
                      aria-label="Email address for newsletter"
                    />
                    <button className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity">
                      Subscribe
                    </button>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Blog;
