import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { StickyNote, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface DealNote {
  id: string;
  note: string;
  created_at: string;
  updated_at: string;
}

interface DealNotesProps {
  listingId: string;
}

export function DealNotes({ listingId }: DealNotesProps) {
  const [notes, setNotes] = useState<DealNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [listingId]);

  const loadNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('deal_notes')
        .select('*')
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      console.error('Failed to load notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to add notes');
        return;
      }

      const { error } = await supabase
        .from('deal_notes')
        .insert({
          listing_id: listingId,
          user_id: user.id,
          note: newNote.trim()
        });

      if (error) throw error;

      toast.success('Note added');
      setNewNote('');
      loadNotes();
    } catch (error: any) {
      console.error('Failed to add note:', error);
      toast.error('Failed to add note');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('deal_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      toast.success('Note deleted');
      loadNotes();
    } catch (error: any) {
      console.error('Failed to delete note:', error);
      toast.error('Failed to delete note');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-primary" />
          Private Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Note */}
        <div className="space-y-2">
          <Textarea
            placeholder="Add a private note about this deal..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[100px]"
          />
          <Button 
            onClick={handleAddNote} 
            disabled={adding || !newNote.trim()}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </div>

        {/* Notes List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No notes yet. Add your first note above.
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <Card key={note.id} className="border-l-4 border-l-primary">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm whitespace-pre-wrap flex-1">{note.note}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteNote(note.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(note.created_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
