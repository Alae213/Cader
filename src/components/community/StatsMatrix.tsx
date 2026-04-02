"use client";

import { Text } from "@/components/ui/Text";

interface StatsMatrixProps {
  memberCount: number;
  onlineCount: number;
  streak: number;
}

export function StatsMatrix({ memberCount, onlineCount, streak }: StatsMatrixProps) {
  return (
    <div className="flex items-center justify-center divide-x divide-bg-elevated py-2">
      {/* Members */}
      <div className="flex-1 text-center px-3 py-1">
        <Text size="4" className="font-semibold text-text-primary">
          {memberCount.toLocaleString()}
        </Text>
        <Text size="1" theme="muted">
          Members
        </Text>
      </div>

      {/* Online */}
      <div className="flex-1 text-center px-3 py-1">
        <Text size="4" className="font-semibold text-text-primary">
          {onlineCount.toLocaleString()}
        </Text>
        <Text size="1" theme="muted">
          Online
        </Text>
      </div>

      {/* Streak */}
      <div className="flex-1 text-center px-3 py-1">
        <Text size="4" className="font-semibold text-text-primary">
          {streak.toLocaleString()}
        </Text>
        <Text size="1" theme="muted">
          {streak === 1 ? "Day" : "Days"}
        </Text>
      </div>
    </div>
  );
}
