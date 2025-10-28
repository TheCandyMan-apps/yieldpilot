import { useState } from 'react';
import { Users, Share2, Lock, Mail, Plus, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DealSyndicateProps {
  dealId: string;
  dealAddress: string;
  dealPrice: number;
}

export function DealSyndicate({ dealId, dealAddress, dealPrice }: DealSyndicateProps) {
  const [open, setOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [equitySplit, setEquitySplit] = useState(50);
  const [invitees, setInvitees] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const addInvitee = () => {
    if (!inviteEmail.trim()) return;
    if (!inviteEmail.includes('@')) {
      toast.error('Invalid email');
      return;
    }
    if (invitees.includes(inviteEmail)) {
      toast.error('Email already added');
      return;
    }
    setInvitees([...invitees, inviteEmail]);
    setInviteEmail('');
  };

  const removeInvitee = (email: string) => {
    setInvitees(invitees.filter(e => e !== email));
  };

  const createSyndicate = async () => {
    if (invitees.length === 0) {
      toast.error('Add at least one investor');
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in');
        return;
      }

      // Create syndicate
      const { data: syndicate, error: syndicateError } = await supabase
        .from('deal_syndicates')
        .insert({
          deal_id: dealId,
          lead_investor_id: user.id,
          total_equity: 100,
          status: 'forming'
        })
        .select()
        .single();

      if (syndicateError) throw syndicateError;

      // Add lead investor as member
      const { error: leadError } = await supabase
        .from('syndicate_members')
        .insert({
          syndicate_id: syndicate.id,
          investor_id: user.id,
          equity_percentage: 100 - equitySplit,
          status: 'confirmed'
        });

      if (leadError) throw leadError;

      // Send invites (in real implementation, this would trigger emails)
      const invitePromises = invitees.map(email => 
        supabase
          .from('syndicate_members')
          .insert({
            syndicate_id: syndicate.id,
            invite_email: email,
            equity_percentage: equitySplit / invitees.length,
            status: 'invited'
          })
      );

      await Promise.all(invitePromises);

      toast.success(`Syndicate created! ${invitees.length} invites sent`);
      setOpen(false);
      setInvitees([]);
      setEquitySplit(50);
    } catch (error: any) {
      console.error('Failed to create syndicate:', error);
      toast.error('Failed to create syndicate');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Users className="h-4 w-4" />
          Co-Invest
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Create Investment Syndicate
          </DialogTitle>
          <DialogDescription>
            Invite investors to co-invest in {dealAddress}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Property Value</span>
              <span className="font-medium">
                {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(dealPrice)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your Equity</span>
              <span className="font-medium">{100 - equitySplit}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Co-Investor Equity</span>
              <span className="font-medium">{equitySplit}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Equity Split for Co-Investors (%)</Label>
            <Slider
              value={[equitySplit]}
              onValueChange={([val]) => setEquitySplit(val)}
              min={10}
              max={90}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              {equitySplit}% split among {invitees.length || 1} co-investor{invitees.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Invite Investors</Label>
            <div className="flex gap-2">
              <Input
                placeholder="investor@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addInvitee()}
              />
              <Button size="icon" onClick={addInvitee}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {invitees.length > 0 && (
            <div className="space-y-2">
              <Label>Invited ({invitees.length})</Label>
              <div className="space-y-1">
                {invitees.map((email) => (
                  <div key={email} className="flex items-center justify-between bg-muted rounded-md px-3 py-2">
                    <span className="text-sm">{email}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInvitee(email)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md text-sm">
            <Lock className="h-4 w-4 mt-0.5 text-blue-600" />
            <p className="text-blue-600 dark:text-blue-400">
              NDA-protected: Invitees must accept terms before viewing full deal details
            </p>
          </div>

          <Button
            onClick={createSyndicate}
            disabled={creating || invitees.length === 0}
            className="w-full"
          >
            {creating ? 'Creating...' : `Send ${invitees.length} Invite${invitees.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
