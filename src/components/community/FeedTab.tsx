"use client";

import { Heading, Text } from "@/components/ui/Text";

interface FeedTabProps {
  communityId: string;
}

export function FeedTab({ communityId }: FeedTabProps) {
  return (
    <div className="py-8 text-center">
      <Heading size="5" className="text-text-primary mb-2">Feed</Heading>
      <Text size="3" theme="secondary">
        Community posts and discussions will appear here.
      </Text>
      <Text size="2" theme="muted" className="mt-4">
        Coming soon
      </Text>
    </div>
  );
}