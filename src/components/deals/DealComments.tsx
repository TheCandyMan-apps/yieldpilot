import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Trash2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
}

interface DealCommentsProps {
  dealId: string;
}

export function DealComments({ dealId }: DealCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadComments();
    subscribeToComments();
  }, [dealId]);

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from("deal_comments")
        .select("*")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Failed to load comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToComments = () => {
    const channel = supabase
      .channel(`deal-comments-${dealId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deal_comments",
          filter: `deal_id=eq.${dealId}`,
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const { error } = await supabase.from("deal_comments").insert({
        deal_id: dealId,
        user_id: session.session.user.id,
        comment: newComment,
      });

      if (error) throw error;

      setNewComment("");
      toast({ title: "Comment added" });
    } catch (error) {
      console.error("Failed to add comment:", error);
      toast({
        title: "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("deal_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      toast({ title: "Comment deleted" });
    } catch (error) {
      console.error("Failed to delete comment:", error);
      toast({
        title: "Failed to delete comment",
        variant: "destructive",
      });
    }
  };

  const getInitials = (userId: string) => {
    return userId.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">
          Comments ({comments.length})
        </h3>
      </div>

      <div className="space-y-4 mb-6">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {getInitials(comment.user_id)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">
                  User {comment.user_id.slice(0, 8)}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => deleteComment(comment.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {comment.comment}
              </p>
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No comments yet. Be the first to share your thoughts!
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              addComment();
            }
          }}
          rows={3}
        />
        <Button
          onClick={addComment}
          disabled={!newComment.trim() || submitting}
          size="icon"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Press Cmd/Ctrl + Enter to submit
      </p>
    </Card>
  );
}
