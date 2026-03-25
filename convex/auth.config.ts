import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: process.env.CLERK_FRONTEND_API_URL || "https://magical-mud-123.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
