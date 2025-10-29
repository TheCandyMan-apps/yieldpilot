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
