"use client";

import { Heading, Text } from "@/components/ui/Text";

interface MembersTabProps {
  communityId: string;
}

export function MembersTab({ communityId }: MembersTabProps) {
  return (
    <div className="py-8 text-center">
      <Heading size="5" className="text-text-primary mb-2">Members</Heading>
      <Text size="3" theme="secondary">
        Browse community members and filter by wilaya.
      </Text>
      <Text size="2" theme="muted" className="mt-4">
        Coming soon
      </Text>
    </div>
  );
}