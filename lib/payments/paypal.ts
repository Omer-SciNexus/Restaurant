// PayPal Orders v2 over plain REST; the only calls needed are create, capture and refund.

function apiBase(): string {
  return process.env.PAYPAL_API_BASE ?? "https://api-m.sandbox.paypal.com";
}

async function accessToken(): Promise<string> {
  const credentials = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) throw new Error(`PayPal auth failed: ${response.status}`);
  const body = (await response.json()) as { access_token: string };
  return body.access_token;
}

async function call<T>(path: string, body: unknown, requestId: string): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      // PayPal treats a repeated request id as the same request, so retries are safe.
      "PayPal-Request-Id": requestId,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`PayPal ${path} failed: ${response.status} ${await response.text()}`);
  return (await response.json()) as T;
}

const usd = (cents: number) => ({ currency_code: "USD", value: (cents / 100).toFixed(2) });

export async function createPaypalOrder(amountCents: number, paymentId: string): Promise<{ providerRef: string }> {
  const order = await call<{ id: string }>(
    "/v2/checkout/orders",
    { intent: "CAPTURE", purchase_units: [{ custom_id: paymentId, amount: usd(amountCents) }] },
    `nf-create-${paymentId}`,
  );
  return { providerRef: order.id };
}

export async function capturePaypalOrder(providerRef: string): Promise<{ completed: boolean; captureRef: string | null }> {
  const result = await call<{
    status: string;
    purchase_units?: { payments?: { captures?: { id: string; status: string }[] } }[];
  }>(`/v2/checkout/orders/${providerRef}/capture`, {}, `nf-capture-${providerRef}`);
  const capture = result.purchase_units?.[0]?.payments?.captures?.[0];
  return { completed: result.status === "COMPLETED" && capture?.status === "COMPLETED", captureRef: capture?.id ?? null };
}

export async function refundPaypal(captureRef: string, amountCents: number, requestId: string): Promise<void> {
  await call(`/v2/payments/captures/${captureRef}/refund`, { amount: usd(amountCents) }, requestId);
}

/** Asks PayPal whether a webhook call really came from them. Any failure counts as no. */
export async function verifyPaypalWebhook(headers: Headers, event: unknown, webhookId: string): Promise<boolean> {
  const transmissionId = headers.get("paypal-transmission-id");
  if (!transmissionId) return false;
  try {
    const result = await call<{ verification_status: string }>(
      "/v1/notifications/verify-webhook-signature",
      {
        auth_algo: headers.get("paypal-auth-algo"),
        cert_url: headers.get("paypal-cert-url"),
        transmission_id: transmissionId,
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: webhookId,
        webhook_event: event,
      },
      `nf-verify-${transmissionId}`,
    );
    return result.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}
