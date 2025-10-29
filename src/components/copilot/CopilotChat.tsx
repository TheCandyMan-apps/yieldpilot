import { useState } from 'react';
import { MessageSquare, Send, Sparkles, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface CopilotChatProps {
  context?: any;
  listingId?: string;
}

export function CopilotChat({ context, listingId }: CopilotChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('copilot-advisor', {
        body: {
          question: input,
          context: {
            ...context,
            listingId
          }
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer,
        timestamp: data.timestamp
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Copilot error:', error);
      toast.error('Failed to get response from copilot');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            className="rounded-full h-14 w-14 shadow-lg"
            onClick={() => setIsOpen(true)}
          >
            <Sparkles className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-h-[600px]">
          <Card className="shadow-2xl border-2">
              <CardHeader className="border-b bg-gradient-to-r from-primary/10 to-primary/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <CardTitle>YieldPilot Copilot</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                {/* Messages */}
                <div className="h-96 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary/50" />
                      <p>Ask me anything about this property</p>
                      <p className="text-xs mt-2">Example: "What's the 3-year ROI projection?"</p>
                    </div>
                  )}
                  
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {loading && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Ask about yield, risks, ROI..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="resize-none min-h-[60px]"
                      disabled={loading}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!input.trim() || loading}
                      size="icon"
                      className="shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
    </>
  );
}
