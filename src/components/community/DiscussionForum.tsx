import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Eye, MessageCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Discussion {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  views: number;
  reply_count: number;
  created_at: string;
}

const categories = [
  'General Discussion',
  'Deal Analysis',
  'Market Insights',
  'Financing',
  'Property Management',
  'Tax & Legal',
  'Success Stories'
];

export function DiscussionForum() {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [open, setOpen] = useState(false);
  const [newDiscussion, setNewDiscussion] = useState({
    title: '',
    content: '',
    category: 'General Discussion'
  });

  useEffect(() => {
    loadDiscussions();
  }, [selectedCategory]);

  const loadDiscussions = async () => {
    try {
      let query = supabase
        .from('community_discussions')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setDiscussions(data || []);
    } catch (error: any) {
      console.error('Failed to load discussions:', error);
      toast.error('Failed to load discussions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDiscussion = async () => {
    if (!newDiscussion.title.trim() || !newDiscussion.content.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to create a discussion');
        return;
      }

      const { error } = await supabase
        .from('community_discussions')
        .insert({
          user_id: user.id,
          title: newDiscussion.title,
          content: newDiscussion.content,
          category: newDiscussion.category
        });

      if (error) throw error;

      toast.success('Discussion created!');
      setOpen(false);
      setNewDiscussion({ title: '', content: '', category: 'General Discussion' });
      loadDiscussions();
    } catch (error: any) {
      console.error('Failed to create discussion:', error);
      toast.error('Failed to create discussion');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'General Discussion': 'bg-blue-500/10 text-blue-500',
      'Deal Analysis': 'bg-green-500/10 text-green-500',
      'Market Insights': 'bg-purple-500/10 text-purple-500',
      'Financing': 'bg-orange-500/10 text-orange-500',
      'Property Management': 'bg-pink-500/10 text-pink-500',
      'Tax & Legal': 'bg-red-500/10 text-red-500',
      'Success Stories': 'bg-yellow-500/10 text-yellow-500'
    };
    return colors[category] || 'bg-gray-500/10 text-gray-500';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>Community Forum</CardTitle>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Discussion
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Start a Discussion</DialogTitle>
                <DialogDescription>
                  Share your thoughts, ask questions, or start a conversation with the community
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    value={newDiscussion.category}
                    onValueChange={(val) => setNewDiscussion({ ...newDiscussion, category: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="What's on your mind?"
                    value={newDiscussion.title}
                    onChange={(e) => setNewDiscussion({ ...newDiscussion, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Content</label>
                  <Textarea
                    placeholder="Share your thoughts..."
                    value={newDiscussion.content}
                    onChange={(e) => setNewDiscussion({ ...newDiscussion, content: e.target.value })}
                    className="min-h-[200px]"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateDiscussion}>
                    Post Discussion
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>Connect with fellow investors and share insights</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Discussions List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : discussions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No discussions yet. Be the first to start a conversation!
          </div>
        ) : (
          <div className="space-y-3">
            {discussions.map((discussion) => (
              <Card key={discussion.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        ?
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold hover:text-primary">
                          {discussion.title}
                        </h4>
                        <Badge className={getCategoryColor(discussion.category)}>
                          {discussion.category}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {discussion.content}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {discussion.views} views
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {discussion.reply_count} replies
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(discussion.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
