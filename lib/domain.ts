// Shared vocabulary. These strings match the Prisma enums, and this file is free of
// server imports so client components can use it too.

export const BRAND = {
  name: "Nature Food",
  tagline: "Natural food, nothing hidden.",
} as const;

export const ALLERGENS = ["MILK", "EGGS", "FISH", "SHELLFISH", "TREE_NUTS", "PEANUTS", "WHEAT", "SOY", "SESAME"] as const;
export type Allergen = (typeof ALLERGENS)[number];

export const ALLERGEN_INFO: Record<Allergen, { label: string; icon: string }> = {
  MILK: { label: "Milk", icon: "/images/icons/allergens/milk.png" },
  EGGS: { label: "Eggs", icon: "/images/icons/allergens/eggs.png" },
  FISH: { label: "Fish", icon: "/images/icons/allergens/fish.png" },
  SHELLFISH: { label: "Shellfish", icon: "/images/icons/allergens/shellfish.png" },
  TREE_NUTS: { label: "Tree nuts", icon: "/images/icons/allergens/tree-nuts.png" },
  PEANUTS: { label: "Peanuts", icon: "/images/icons/allergens/peanuts.png" },
  WHEAT: { label: "Wheat", icon: "/images/icons/allergens/wheat.png" },
  SOY: { label: "Soy", icon: "/images/icons/allergens/soy.png" },
  SESAME: { label: "Sesame", icon: "/images/icons/allergens/sesame.png" },
};

export const DIETS = ["VEGAN", "VEGETARIAN", "GLUTEN_FREE", "DAIRY_FREE", "NUT_FREE"] as const;
export type Diet = (typeof DIETS)[number];

export const DIET_INFO: Record<Diet, { label: string; slug: string; icon: string }> = {
  VEGAN: { label: "Vegan", slug: "vegan", icon: "/images/icons/diet/vegan.png" },
  VEGETARIAN: { label: "Vegetarian", slug: "vegetarian", icon: "/images/icons/diet/vegetarian.png" },
  GLUTEN_FREE: { label: "Gluten-free", slug: "gluten-free", icon: "/images/icons/diet/gluten-free.png" },
  DAIRY_FREE: { label: "Dairy-free", slug: "dairy-free", icon: "/images/icons/diet/dairy-free.png" },
  NUT_FREE: { label: "Nut-free", slug: "nut-free", icon: "/images/icons/diet/nut-free.png" },
};

export function dietFromSlug(slug: string): Diet | undefined {
  return DIETS.find((diet) => DIET_INFO[diet].slug === slug);
}

export const ORDER_TYPES = ["PICKUP", "DELIVERY"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
