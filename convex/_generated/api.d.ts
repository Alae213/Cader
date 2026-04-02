/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as functions_categories from "../functions/categories.js";
import type * as functions_classrooms from "../functions/classrooms.js";
import type * as functions_communities from "../functions/communities.js";
import type * as functions_explore from "../functions/explore.js";
import type * as functions_feed from "../functions/feed.js";
import type * as functions_index from "../functions/index.js";
import type * as functions_leaderboard from "../functions/leaderboard.js";
import type * as functions_memberships from "../functions/memberships.js";
import type * as functions_migrations from "../functions/migrations.js";
import type * as functions_notifications from "../functions/notifications.js";
import type * as functions_payments from "../functions/payments.js";
import type * as functions_scheduler from "../functions/scheduler.js";
import type * as functions_users from "../functions/users.js";
import type * as functions_webhooks from "../functions/webhooks.js";
import type * as lib_chargily from "../lib/chargily.js";
import type * as lib_email from "../lib/email.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  "functions/categories": typeof functions_categories;
  "functions/classrooms": typeof functions_classrooms;
  "functions/communities": typeof functions_communities;
  "functions/explore": typeof functions_explore;
  "functions/feed": typeof functions_feed;
  "functions/index": typeof functions_index;
  "functions/leaderboard": typeof functions_leaderboard;
  "functions/memberships": typeof functions_memberships;
  "functions/migrations": typeof functions_migrations;
  "functions/notifications": typeof functions_notifications;
  "functions/payments": typeof functions_payments;
  "functions/scheduler": typeof functions_scheduler;
  "functions/users": typeof functions_users;
  "functions/webhooks": typeof functions_webhooks;
  "lib/chargily": typeof lib_chargily;
  "lib/email": typeof lib_email;
  "lib/encryption": typeof lib_encryption;
  "lib/rateLimit": typeof lib_rateLimit;
  seed: typeof seed;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
