import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MessageCircle, Send, Loader2, Sparkles } from 'lucide-react';
import { getDealSummaryPrompt, getOptimizationPrompt, getCompliancePrompt, getExitStrategyPrompt, type CopilotAction, type DealContext } from '@/copilot/prompts';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface CopilotPanelProps {
  dealData: any;
  onApplySuggestion?: (suggestion: any) => void;
}

const QUICK_ACTIONS: { label: string; action: string }[] = [
  { label: 'Summarize this deal', action: 'summarize' },
  { label: 'Improve DSCR to 1.3', action: 'optimize_dscr' },
  { label: 'Compliance action plan', action: 'compliance' },
  { label: 'Exit strategies', action: 'exit_strategies' },
];

export function CopilotPanel({ dealData, onApplySuggestion }: CopilotPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (content: string, action?: string) => {
    if (!content.trim() && !action) return;

    const userMessage = content || QUICK_ACTIONS.find(a => a.action === action)?.label || '';
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const dealContext: DealContext = {
        address: dealData.listing?.property_address || 'Unknown',
        price: dealData.listing?.price || 0,
        bedrooms: dealData.listing?.bedrooms,
        property_type: dealData.listing?.property_type,
        kpis: dealData.metrics?.kpis,
        assumptions: dealData.metrics?.assumptions,
        enrichment: dealData.enrichment,
      };

      const { data, error } = await supabase.functions.invoke('copilot', {
        body: {
          messages: newMessages,
          dealContext,
          action,
        },
      });

      if (error) throw error;

      setMessages([...newMessages, { role: 'assistant', content: data.message }]);
    } catch (error: any) {
      console.error('Copilot error:', error);
      toast.error(error.message || 'Failed to get copilot response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    sendMessage('', action);
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <div className="p-4 border-b flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">AI Copilot</h3>
        <Badge variant="secondary" className="ml-auto">Beta</Badge>
      </div>

      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm mb-4">Ask me anything about this deal</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_ACTIONS.map((qa) => (
                <Button
                  key={qa.action}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(qa.action)}
                  disabled={isLoading}
                >
                  {qa.label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about yield, risks, strategies..."
            className="min-h-[60px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
