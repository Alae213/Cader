"use node";

/**
 * SofizPay API wrapper for Convex actions.
 * Uses "use node" to enable external HTTP calls.
 * 
 * Key difference from Chargily: NO WEBHOOKS - uses return URL + polling pattern.
 */

export interface MakeCIBTransactionParams {
  account: string;
  amount: number;
  full_name: string;
  phone: string;
  email: string;
  memo?: string;
  return_url?: string;
  redirect?: string;
}

export interface MakeCIBTransactionResult {
  success: boolean;
  url?: string;
  data?: {
    order_number?: string;
    transaction_hash?: string;
  };
  error?: string;
}

export interface VerifyPaymentParams {
  ownerPublicKey: string;
  memo: string;
  expectedAmount: number;
  limit?: number;
}

export interface TransactionData {
  id: string;
  amount: number;
  memo: string;
  status: string;
  created_at: string;
  transaction_hash: string;
  order_number?: string;
  type?: string;
  timestamp?: string;
}

export interface VerifyPaymentResult {
  verified: boolean;
  transaction?: TransactionData;
  error?: string;
}

export interface ValidateKeysParams {
  publicKey: string;
}

export interface ValidateKeysResult {
  valid: boolean;
  error?: string;
}

/**
 * Create a CIB transaction on SofizPay
 * Returns payment URL where user completes their payment
 */
export async function makeCIBTransaction(
  params: MakeCIBTransactionParams
): Promise<MakeCIBTransactionResult> {
  try {
    console.log("SofizPay: Creating CIB transaction with params:", {
      account: params.account,
      amount: params.amount,
      full_name: params.full_name,
      phone: params.phone,
      email: params.email,
    });

    // Build URL with query params
    const baseUrl = 'https://www.sofizpay.com/make-cib-transaction/';
    const urlParams = new URLSearchParams();
    
    urlParams.append('account', params.account);
    urlParams.append('amount', params.amount.toString());
    urlParams.append('full_name', params.full_name);
    urlParams.append('phone', params.phone);
    urlParams.append('email', params.email);
    
    if (params.return_url) {
      urlParams.append('return_url', params.return_url);
    }
    if (params.memo) {
      urlParams.append('memo', params.memo);
    }
    if (params.redirect) {
      urlParams.append('redirect', params.redirect);
    }

    const fullUrl = `${baseUrl}?${urlParams.toString()}`;
    console.log("SofizPay request URL:", fullUrl);

    // Use Convex's built-in fetch
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SofizPay HTTP error:", response.status, errorText);
      return {
        success: false,
        error: `HTTP error ${response.status}: ${errorText}`
      };
    }

    const data = await response.json();
    console.log("SofizPay response:", data);

    // Response format: { success: true, data: { url, order_number, transaction_hash }, ... }
    if (data.success && data.data?.url) {
      return {
        success: true,
        url: data.data.url,
      };
    }

    return {
      success: false,
      error: data.error || "Payment creation failed"
    };
  } catch (error) {
    console.error("SofizPay error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create transaction",
    };
  }
}

/**
 * Verify payment by searching transactions by memo
 */
export async function verifyPaymentByMemo(
  params: VerifyPaymentParams
): Promise<VerifyPaymentResult> {
  try {
    const baseUrl = 'https://www.sofizpay.com/search-transaction-by-memo/';
    const urlParams = new URLSearchParams();
    
    urlParams.append('account', params.ownerPublicKey);
    urlParams.append('memo', params.memo);
    urlParams.append('limit', (params.limit || 10).toString());

    const fullUrl = `${baseUrl}?${urlParams.toString()}`;

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return {
        verified: false,
        error: `HTTP error ${response.status}`
      };
    }

    const data = await response.json();

    if (data.success && data.transactions && data.transactions.length > 0) {
      const tx = data.transactions.find(
        (t: { amount: number }) => Number(t.amount) === params.expectedAmount
      );

      if (tx) {
        return {
          verified: true,
          transaction: {
            id: String(tx.id || ""),
            amount: Number(tx.amount || 0),
            memo: String(tx.memo || ""),
            status: String(tx.status || ""),
            created_at: String(tx.created_at || tx.timestamp || ""),
            transaction_hash: String(tx.transaction_hash || ""),
            order_number: tx.order_number ? String(tx.order_number) : undefined,
          },
        };
      }

      return {
        verified: false,
        error: `Amount mismatch: expected ${params.expectedAmount}`,
      };
    }

    return {
      verified: false,
      error: "No matching transaction found",
    };
  } catch (error) {
    console.error("SofizPay verify error:", error);
    return {
      verified: false,
      error: error instanceof Error ? error.message : "Failed to verify payment",
    };
  }
}

/**
 * Validate SofizPay public key format
 */
export async function validateSofizpayKeys(
  params: ValidateKeysParams
): Promise<ValidateKeysResult> {
  try {
    const { publicKey } = params;

    if (!publicKey || typeof publicKey !== "string") {
      return {
        valid: false,
        error: "Public key is required",
      };
    }

    // Stellar public key format: starts with G, 56 characters
    const stellarPublicKeyRegex = /^G[A-Z0-9]{55}$/;
    if (!stellarPublicKeyRegex.test(publicKey)) {
      return {
        valid: false,
        error: "Invalid public key format. Expected Stellar public key (starts with G, 56 characters)",
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Failed to validate key",
    };
  }
}
