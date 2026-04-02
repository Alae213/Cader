"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

/**
 * Sends a heartbeat every 30 seconds to mark the user as "online"
 * in the given community. Uses the presence table.
 *
 * Also records a streak day on first mount (via recordAppOpen).
 *
 * Automatically stops when the user navigates away or the component unmounts.
 */
export function usePresenceHeartbeat(communityId: string | undefined, isLoggedIn: boolean) {
  const sendHeartbeat = useMutation(api.functions.communities.sendHeartbeat);
  const recordAppOpen = useMutation(api.functions.leaderboard.recordAppOpen);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!communityId || !isLoggedIn) return;

    // Record streak day on first visit (once per mount)
    recordAppOpen({ communityId: communityId as Id<"communities"> }).catch(() => {
      // Silently fail — streak recording is non-critical
    });

    // Send initial heartbeat immediately
    sendHeartbeat({ communityId: communityId as Id<"communities"> }).catch(() => {
      // Silently fail — heartbeat is non-critical
    });

    // Send heartbeat every 30 seconds
    intervalRef.current = setInterval(() => {
      sendHeartbeat({ communityId: communityId as Id<"communities"> }).catch(() => {
        // Silently fail — heartbeat is non-critical
      });
    }, 30_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [communityId, isLoggedIn, sendHeartbeat, recordAppOpen]);
}
