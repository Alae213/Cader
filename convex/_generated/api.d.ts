/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as functions_categories from "../functions/categories.js";
import type * as functions_classrooms from "../functions/classrooms.js";
import type * as functions_communities from "../functions/communities.js";
import type * as functions_feed from "../functions/feed.js";
import type * as functions_index from "../functions/index.js";
import type * as functions_leaderboard from "../functions/leaderboard.js";
import type * as functions_memberships from "../functions/memberships.js";
import type * as functions_notifications from "../functions/notifications.js";
import type * as functions_payments from "../functions/payments.js";
import type * as functions_users from "../functions/users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "functions/categories": typeof functions_categories;
  "functions/classrooms": typeof functions_classrooms;
  "functions/communities": typeof functions_communities;
  "functions/feed": typeof functions_feed;
  "functions/index": typeof functions_index;
  "functions/leaderboard": typeof functions_leaderboard;
  "functions/memberships": typeof functions_memberships;
  "functions/notifications": typeof functions_notifications;
  "functions/payments": typeof functions_payments;
  "functions/users": typeof functions_users;
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
