import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, TrendingUp, Globe, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  marketData?: any;
}

const EXAMPLE_QUESTIONS = [
  "What's the best city in Turkey for gross yields?",
  "Compare net returns for Dubai vs London at £500k budget",
  "Which UK cities have yields above 8%?",
  "Show me the top 5 markets for buy-to-let in Europe",
];

export function MarketIntelligence() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendQuery = async (question: string) => {
    if (!question.trim()) return;

    const userMessage: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to use Market Intelligence",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("market-intelligence", {
        body: { question }
      });

      if (error) {
        if (error.message?.includes('429') || error.message?.includes('Daily limit')) {
          toast({
            title: "Daily limit reached",
            description: "Upgrade your plan for more queries",
            variant: "destructive",
          });
        } else if (error.message?.includes('403')) {
          toast({
            title: "Premium feature",
            description: "Upgrade to access Market Intelligence",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        setMessages((prev) => prev.slice(0, -1)); // Remove user message on error
        return;
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.answer,
        marketData: data.marketData,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Market intelligence query failed:", error);
      toast({
        title: "Query failed",
        description: "Please try again",
        variant: "destructive",
      });
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (question: string) => {
    setInput(question);
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Market Intelligence</h3>
          <Badge variant="secondary" className="ml-auto">
            AI-Powered
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          Ask questions about global real estate markets. Get data-driven insights with transparent calculations.
        </p>

        {messages.length === 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs font-medium text-muted-foreground">Example questions:</p>
            <div className="grid gap-2">
              {EXAMPLE_QUESTIONS.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="justify-start text-left h-auto py-2 px-3"
                  onClick={() => handleExampleClick(q)}
                >
                  <TrendingUp className="h-3 w-3 mr-2 flex-shrink-0" />
                  <span className="text-xs">{q}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        <ScrollArea className="h-[400px] mb-4">
          <div className="space-y-4 pr-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-4 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  
                  {msg.marketData && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs font-medium mb-2">📊 Data Summary:</p>
                      <div className="text-xs space-y-1 opacity-90">
                        <p>• {msg.marketData.totalDeals} active deals analyzed</p>
                        {msg.marketData.citySummary?.length > 0 && (
                          <p>• Top city: {msg.marketData.citySummary[0].city} ({msg.marketData.citySummary[0].avgGrossYield}% avg yield)</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-4 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Analyzing market data...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendQuery(input);
              }
            }}
            placeholder="Ask about any market... (e.g., 'What's the best city in Spain for yields?')"
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={() => sendQuery(input)}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          💡 Tip: Ask specific questions about cities, price ranges, or compare multiple markets
        </p>
      </Card>
    </div>
  );
}
