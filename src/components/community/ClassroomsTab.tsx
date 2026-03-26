"use client";

import { Heading, Text } from "@/components/ui/Text";

interface ClassroomsTabProps {
  communityId: string;
}

export function ClassroomsTab({ communityId }: ClassroomsTabProps) {
  return (
    <div className="py-8 text-center">
      <Heading size="5" className="text-text-primary mb-2">Classrooms</Heading>
      <Text size="3" theme="secondary">
        Access courses and learning materials.
      </Text>
      <Text size="2" theme="muted" className="mt-4">
        Coming soon
      </Text>
    </div>
  );
}