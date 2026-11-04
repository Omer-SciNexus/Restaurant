// Which outside services are configured. In development and tests a missing key switches
// to a labelled stand-in, so the whole app runs on a laptop. In production a missing
// payment key is an error, so a stand-in can never take a real order.

const filled = (value: string | undefined) => Boolean(value && value.trim());

export const isProduction = process.env.NODE_ENV === "production";

export const services = {
  get stripe() {
    return filled(process.env.STRIPE_SECRET_KEY);
  },
  get paypal() {
    return filled(process.env.PAYPAL_CLIENT_ID) && filled(process.env.PAYPAL_CLIENT_SECRET);
  },
  get pusher() {
    return filled(process.env.PUSHER_APP_ID) && filled(process.env.PUSHER_SECRET) && filled(process.env.NEXT_PUBLIC_PUSHER_KEY);
  },
  get resend() {
    return filled(process.env.RESEND_API_KEY);
  },
  get twilio() {
    return filled(process.env.TWILIO_ACCOUNT_SID) && filled(process.env.TWILIO_AUTH_TOKEN);
  },
  get google() {
    return filled(process.env.AUTH_GOOGLE_ID) && filled(process.env.AUTH_GOOGLE_SECRET);
  },
  get maps() {
    return filled(process.env.GOOGLE_MAPS_API_KEY);
  },
};

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** The rules clock. NF_FAKE_NOW lets tests and demos run "at lunchtime"; ignored in production. */
export function now(): Date {
  const fake = process.env.NF_FAKE_NOW;
  if (fake && !isProduction) {
    const parsed = new Date(fake);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}
