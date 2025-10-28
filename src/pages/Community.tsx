import DashboardLayout from "@/components/DashboardLayout";
import { DiscussionForum } from "@/components/community/DiscussionForum";

const Community = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Community</h1>
          <p className="text-muted-foreground mt-1">
            Connect with fellow property investors
          </p>
        </div>

        <DiscussionForum />
      </div>
    </DashboardLayout>
  );
};

export default Community;
