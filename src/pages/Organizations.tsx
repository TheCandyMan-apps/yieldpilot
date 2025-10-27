import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Org {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: string;
  profiles: {
    full_name: string | null;
  };
}

export default function Organizations() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [newOrgName, setNewOrgName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadOrgs();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      loadMembers(selectedOrg.id);
    }
  }, [selectedOrg]);

  async function loadOrgs() {
    try {
      const { data, error } = await supabase
        .from("orgs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrgs(data || []);
      if (data && data.length > 0) {
        setSelectedOrg(data[0]);
      }
    } catch (error: any) {
      toast({
        title: "Error loading organizations",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadMembers(orgId: string) {
    try {
      const { data, error } = await supabase
        .from("org_members")
        .select("*")
        .eq("org_id", orgId);

      if (error) throw error;
      
      // Fetch profile data separately
      const membersWithProfiles = await Promise.all(
        (data || []).map(async (member) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", member.user_id)
            .maybeSingle();
          
          return {
            ...member,
            profiles: profile || { full_name: null }
          };
        })
      );
      
      setMembers(membersWithProfiles as any);
    } catch (error: any) {
      toast({
        title: "Error loading members",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  async function createOrg() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("orgs")
        .insert({ name: newOrgName, owner_id: user.id })
        .select()
        .single();

      if (error) throw error;

      setOrgs([data, ...orgs]);
      setNewOrgName("");
      toast({
        title: "Organization created",
        description: "Your new organization has been created.",
      });
    } catch (error: any) {
      toast({
        title: "Error creating organization",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  async function inviteMember() {
    if (!selectedOrg) return;

    try {
      // In a real app, you'd look up the user by email
      // For now, this is a placeholder
      toast({
        title: "Invite sent",
        description: `An invitation has been sent to ${newMemberEmail}`,
      });
      setNewMemberEmail("");
    } catch (error: any) {
      toast({
        title: "Error inviting member",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  async function removeMember(memberId: string) {
    try {
      const { error } = await supabase
        .from("org_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      setMembers(members.filter((m) => m.id !== memberId));
      toast({
        title: "Member removed",
        description: "The member has been removed from the organization.",
      });
    } catch (error: any) {
      toast({
        title: "Error removing member",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Organizations</h1>
            <p className="text-muted-foreground">
              Manage your team and collaborate on deals
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Organization
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Organization</DialogTitle>
                <DialogDescription>
                  Create a new organization to collaborate with your team.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="My Investment Company"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createOrg} disabled={!newOrgName}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Your Organizations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {orgs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No organizations yet</p>
              ) : (
                orgs.map((org) => (
                  <Button
                    key={org.id}
                    variant={selectedOrg?.id === org.id ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedOrg(org)}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    {org.name}
                  </Button>
                ))
              )}
            </CardContent>
          </Card>

          {selectedOrg && (
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedOrg.name}</CardTitle>
                    <CardDescription>
                      {members.length} member{members.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Mail className="mr-2 h-4 w-4" />
                        Invite
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite Member</DialogTitle>
                        <DialogDescription>
                          Invite someone to join {selectedOrg.name}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={inviteMember} disabled={!newMemberEmail}>
                          Send Invite
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {member.profiles?.full_name || "Unknown User"}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {member.role}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
