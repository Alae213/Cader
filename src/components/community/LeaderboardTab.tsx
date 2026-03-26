"use client";

import { Heading, Text } from "@/components/ui/Text";

interface LeaderboardTabProps {
  communityId: string;
}

export function LeaderboardTab({ communityId }: LeaderboardTabProps) {
  return (
    <div className="py-8 text-center">
      <Heading size="5" className="text-text-primary mb-2">Leaderboard</Heading>
      <Text size="3" theme="secondary">
        Top contributors and level rankings.
      </Text>
      <Text size="2" theme="muted" className="mt-4">
        Coming soon
      </Text>
    </div>
  );
}