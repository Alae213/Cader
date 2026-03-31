"use node";

/**
 * Chargily Pay SDK wrapper for Convex actions.
 * This file uses "use node" because the Chargily SDK requires Node.js crypto.
 */

import { ChargilyClient } from "@chargily/chargily-pay";

// Re-export the verifySignature function for webhook verification
export { verifySignature } from "@chargily/chargily-pay";

export interface CheckoutParams {
  apiKey: string;
  mode: 'test' | 'live';
  amount: number; // Amount in centimes
  currency: string;
  description: string;
  successUrl: string;
  failureUrl: string;
  metadata: Record<string, unknown>;
  patient?: {
    email: string;
    first_name: string;
    last_name: string;
  };
}

export interface CheckoutResult {
  id: string;
  checkout_url: string;
  url: string;
}

export interface ValidateKeysParams {
  apiKey: string;
}

export interface ValidateKeysResult {
  valid: boolean;
  error?: string;
}

/**
 * Create a Chargily checkout session
 */
export async function createChargilyCheckout(params: CheckoutParams): Promise<CheckoutResult> {
  const client = new ChargilyClient({
    api_key: params.apiKey,
    mode: params.mode,
  });

  const checkoutData: {
    amount: number;
    currency: string;
    description: string;
    success_url: string;
    failure_url: string;
    metadata: Record<string, unknown>;
    patient?: { email: string; first_name: string; last_name: string };
  } = {
    amount: params.amount,
    currency: params.currency,
    description: params.description,
    success_url: params.successUrl,
    failure_url: params.failureUrl,
    metadata: params.metadata,
  };

  // Add patient info if provided
  if (params.patient) {
    checkoutData.patient = params.patient;
  }

  const checkout = await client.createCheckout(checkoutData);
  
  return {
    id: checkout.id,
    checkout_url: checkout.checkout_url,
    url: checkout.checkout_url,
  };
}

/**
 * Validate Chargily API keys by making a test API call
 */
export async function validateChargilyKeys(params: ValidateKeysParams): Promise<ValidateKeysResult> {
  try {
    // Test the keys by listing checkouts (minimal API call to validate keys)
    const response = await fetch("https://pay.chargily.net/api/v2/checkouts", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "" }));
      return {
        valid: false,
        error: errorData.message || `API returned ${response.status}`,
      };
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Failed to validate keys",
    };
  }
}
