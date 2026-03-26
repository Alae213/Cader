"use client";

import { Heading, Text } from "@/components/ui/Text";

interface AnalysisTabProps {
  communityId: string;
}

export function AnalysisTab({ communityId }: AnalysisTabProps) {
  return (
    <div className="py-8 text-center">
      <Heading size="5" className="text-text-primary mb-2">Analysis</Heading>
      <Text size="3" theme="secondary">
        Community analytics and insights for owners.
      </Text>
      <Text size="2" theme="muted" className="mt-4">
        Coming soon
      </Text>
    </div>
  );
}