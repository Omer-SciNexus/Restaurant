// PLACEHOLDER BRANCHES. The country and city are still an open question in the plan, so
// these use invented addresses around one US city and 555-01xx phone numbers, which are
// reserved for fiction. Replace them, with real timezones and tax rates, once confirmed.

const weekdays = [{ open: "07:00", close: "21:00" }];
const weekend = [{ open: "08:00", close: "21:00" }];
export const STANDARD_HOURS = {
  mon: weekdays,
  tue: weekdays,
  wed: weekdays,
  thu: weekdays,
  fri: weekdays,
  sat: weekend,
  sun: weekend,
};

export const BRANCHES = [
  { slug: "downtown", name: "Downtown", address: "100 Placeholder Avenue", lat: 30.2672, lng: -97.7431, phone: "+1 512 555 0101" },
  { slug: "riverside", name: "Riverside", address: "210 Placeholder Street", lat: 30.2442, lng: -97.7262, phone: "+1 512 555 0102" },
  { slug: "north-loop", name: "North Loop", address: "320 Placeholder Lane", lat: 30.3172, lng: -97.7224, phone: "+1 512 555 0103" },
  { slug: "south-congress", name: "South Congress", address: "430 Placeholder Road", lat: 30.2469, lng: -97.7506, phone: "+1 512 555 0104" },
  { slug: "east-side", name: "East Side", address: "540 Placeholder Court", lat: 30.2640, lng: -97.7180, phone: "+1 512 555 0105" },
  { slug: "westlake", name: "Westlake", address: "650 Placeholder Drive", lat: 30.2953, lng: -97.8007, phone: "+1 512 555 0106" },
  { slug: "the-domain", name: "The Domain", address: "760 Placeholder Way", lat: 30.4021, lng: -97.7253, phone: "+1 512 555 0107" },
  { slug: "mueller", name: "Mueller", address: "870 Placeholder Place", lat: 30.2988, lng: -97.7051, phone: "+1 512 555 0108" },
  { slug: "barton-hills", name: "Barton Hills", address: "980 Placeholder Terrace", lat: 30.2520, lng: -97.7820, phone: "+1 512 555 0109" },
  { slug: "hyde-park", name: "Hyde Park", address: "1090 Placeholder Square", lat: 30.3060, lng: -97.7290, phone: "+1 512 555 0110" },
].map((branch) => ({
  ...branch,
  city: "Austin, TX",
  timezone: "America/Chicago",
  openingHours: STANDARD_HOURS,
  deliveryRadiusKm: 2,
  // Placeholders for three open questions: delivery fee, minimum order and tax rate.
  deliveryFeeCents: 399,
  minOrderCents: 1500,
  taxRateBps: 825,
  tableCapacityPerSlot: 20,
}));
