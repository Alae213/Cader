import { cronJobs } from "convex/server";
import { api, internal } from "./_generated/api";

const crons = cronJobs();

// Check subscription expiry every 6 hours
crons.interval(
  "checkExpiringSubscriptions",
  { hours: 6 },
  api.functions.communities.checkExpiringSubscriptions,
);

// Award delayed points every 5 minutes
crons.interval(
  "awardDelayedPoints",
  { minutes: 5 },
  api.functions.scheduler.awardDelayedPoints,
);

export default crons;
