import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { account, amount, full_name, phone, email, memo, return_url, redirect } = body;

    if (!account || !amount || !full_name || !phone || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Build URL with query params
    const baseUrl = 'https://www.sofizpay.com/make-cib-transaction/';
    const urlParams = new URLSearchParams();
    
    urlParams.append('account', account);
    urlParams.append('amount', amount.toString());
    urlParams.append('full_name', full_name);
    urlParams.append('phone', phone);
    urlParams.append('email', email);
    
    if (return_url) {
      urlParams.append('return_url', return_url);
    }
    if (memo) {
      urlParams.append('memo', memo);
    }
    if (redirect) {
      urlParams.append('redirect', redirect);
    }

    const fullUrl = `${baseUrl}?${urlParams.toString()}`;

    // Make the external API call from Next.js server
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `HTTP error ${response.status}: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.success && data.data?.url) {
      return NextResponse.json({
        success: true,
        paymentUrl: data.data.url,
        memo,
        amount
      });
    }

    return NextResponse.json(
      { success: false, error: data.error || "Payment creation failed" },
      { status: 500 }
    );

  } catch (error) {
    console.error("SofizPay checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
