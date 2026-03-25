"use client";

import { useParams } from "next/navigation";
import { CommunityShell } from "@/components/layout/CommunityShell";
import { TabNav } from "@/components/layout/TabNav";
import { Heading, Text } from "@/components/ui/Text";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

// Mock data - in production, this would come from Convex
const mockCommunity = {
  id: "1",
  name: "Programming",
  slug: "programming",
  description: "Learn programming from scratch to advanced. Join thousands of Algerian developers building the future.",
  memberCount: 1247,
  isVerified: true,
};

export default function CommunityPage() {
  const params = useParams();
  const communitySlug = params.communitySlug as string;

  // In production, fetch from Convex using communitySlug
  const community = mockCommunity;

  return (
    <CommunityShell community={community}>
      {/* Feed Tab Content (default) */}
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                <span className="font-medium text-white">AH</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Text size="2" theme="secondary">Ahmed Hassan</Text>
                  <Text size="1" theme="muted">· 2 hours ago</Text>
                </div>
                <Text size="3" className="mt-1">
                  Just launched a new course on React Native! 🚀 
                  Building mobile apps has never been easier. 
                  Check it out and let me know what you think!
                </Text>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="secondary">React Native</Badge>
                  <Badge variant="accent">Course</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-success flex items-center justify-center">
                <span className="font-medium text-white">SA</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Text size="2" theme="secondary">Sara Amrani</Text>
                  <Text size="1" theme="muted">· 5 hours ago</Text>
                </div>
                <Text size="3" className="mt-1">
                  📢 New session this Friday! We'll be covering 
                  TypeScript best practices and how to improve your 
                  code quality. Don't miss it!
                </Text>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="warning">Live Session</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-chargily flex items-center justify-center">
                <span className="font-medium text-white">OM</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Text size="2" theme="secondary">Omar Bouali</Text>
                  <Text size="1" theme="muted">· Yesterday</Text>
                </div>
                <Text size="3" className="mt-1">
                  Just hit 1000 points on the leaderboard! 🎉 
                  Thanks to everyone who's been supporting my learning journey.
                  Never stop coding! 💻
                </Text>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="success">Achievement</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CommunityShell>
  );
}
