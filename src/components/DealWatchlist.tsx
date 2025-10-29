import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Star, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface DealWatchlistProps {
  dealId: string;
  currentPrice?: number;
}

export function DealWatchlist({ dealId, currentPrice }: DealWatchlistProps) {
  const [isWatched, setIsWatched] = useState(false);
  const [watchlistId, setWatchlistId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkWatchlist();
    subscribeToChanges();
  }, [dealId]);

  const checkWatchlist = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    const { data } = await supabase
      .from("watchlist")
      .select("id")
      .eq("user_id", session.session.user.id)
      .eq("deal_id", dealId)
      .maybeSingle();

    if (data) {
      setIsWatched(true);
      setWatchlistId(data.id);
    }
  };

  const subscribeToChanges = () => {
    const channel = supabase
      .channel(`watchlist-${dealId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "watchlist",
          filter: `deal_id=eq.${dealId}`,
        },
        () => {
          checkWatchlist();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleWatchlist = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add properties to your watchlist",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isWatched && watchlistId) {
        // Remove from watchlist
        const { error } = await supabase
          .from("watchlist")
          .delete()
          .eq("id", watchlistId);

        if (error) throw error;

        setIsWatched(false);
        setWatchlistId(null);
        toast({
          title: "Removed from watchlist",
          description: "Property removed from your watchlist",
        });
      } else {
        // Add to watchlist
        const { data, error } = await supabase
          .from("watchlist")
          .insert({
            user_id: session.session.user.id,
            deal_id: dealId,
            price_when_added: currentPrice,
          })
          .select()
          .single();

        if (error) throw error;

        setIsWatched(true);
        setWatchlistId(data.id);
        toast({
          title: "Added to watchlist",
          description: "You'll be notified of price changes and updates",
        });
      }
    } catch (error) {
      console.error("Watchlist error:", error);
      toast({
        title: "Failed to update watchlist",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={isWatched ? "default" : "outline"}
      size="sm"
      onClick={toggleWatchlist}
      disabled={loading}
      className={cn(
        "gap-2",
        isWatched && "bg-yellow-500 hover:bg-yellow-600 text-white"
      )}
    >
      <Star className={cn("h-4 w-4", isWatched && "fill-current")} />
      {isWatched ? "Watching" : "Watch"}
    </Button>
  );
}
