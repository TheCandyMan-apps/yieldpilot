import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Users, Trash2, Mail } from "lucide-react";

interface Org {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

interface OrgMember {
  org_id: string;
  user_id: string;
  role: string;
  profiles?: {
    full_name: string | null;
  };
}

const Organizations = () => {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  
  const [orgName, setOrgName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    loadOrgs();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      loadMembers(selectedOrg.id);
    }
  }, [selectedOrg]);

  const loadOrgs = async () => {
    try {
      const { data, error } = await supabase
        .from("orgs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrgs(data || []);
      if (data && data.length > 0 && !selectedOrg) {
        setSelectedOrg(data[0]);
      }
    } catch (error: any) {
      toast.error("Failed to load organizations");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from("org_members")
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .eq("org_id", orgId);

      if (error) throw error;
      setMembers(data || []);
    } catch (error: any) {
      console.error("Failed to load members:", error);
    }
  };

  const handleCreateOrg = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("orgs")
        .insert({
          name: orgName,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add owner as member
      await supabase
        .from("org_members")
        .insert({
          org_id: data.id,
          user_id: user.id,
          role: "owner",
        });

      toast.success("Organization created");
      setDialogOpen(false);
      setOrgName("");
      loadOrgs();
    } catch (error: any) {
      toast.error(error.message);
      console.error(error);
    }
  };

  const handleInviteMember = async () => {
    if (!selectedOrg) return;

    try {
      // In a real app, you'd send an email invite
      // For now, we'll show a success message
      toast.info("Invite feature coming soon! For now, users need to sign up and you can add them by user ID.");
      setInviteDialogOpen(false);
      setInviteEmail("");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedOrg) return;
    if (!confirm("Remove this member?")) return;

    try {
      const { error } = await supabase
        .from("org_members")
        .delete()
        .eq("org_id", selectedOrg.id)
        .eq("user_id", userId);

      if (error) throw error;
      toast.success("Member removed");
      loadMembers(selectedOrg.id);
    } catch (error: any) {
      toast.error("Failed to remove member");
      console.error(error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Organizations</h1>
            <p className="text-muted-foreground mt-1">
              Manage team members and shared resources
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Organization
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Organization</DialogTitle>
                <DialogDescription>
                  Create a new organization to collaborate with your team
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Organization Name</Label>
                  <Input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Acme Property Investments"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateOrg}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Your Organizations</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div>Loading...</div>
              ) : orgs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No organizations yet</p>
              ) : (
                <div className="space-y-2">
                  {orgs.map((org) => (
                    <button
                      key={org.id}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedOrg?.id === org.id
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-accent"
                      }`}
                      onClick={() => setSelectedOrg(org)}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">{org.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>
                    {selectedOrg ? selectedOrg.name : "Select an organization"}
                  </CardTitle>
                  <CardDescription>Manage members and permissions</CardDescription>
                </div>
                {selectedOrg && (
                  <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Mail className="h-4 w-4 mr-2" />
                        Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite Team Member</DialogTitle>
                        <DialogDescription>
                          Send an invitation to join your organization
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div>
                          <Label>Email Address</Label>
                          <Input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="colleague@example.com"
                          />
                        </div>
                      </div>

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleInviteMember}>Send Invite</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedOrg ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.user_id}>
                        <TableCell>
                          {member.profiles?.full_name || member.user_id.substring(0, 8)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {member.role !== "owner" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveMember(member.user_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Select an organization to view members
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Organizations;
