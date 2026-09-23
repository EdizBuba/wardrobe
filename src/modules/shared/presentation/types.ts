export type Location = {
  id: string;
  name: string;
  type: "HOME" | "PARENTS_HOME" | "TRAVEL" | "STORAGE" | "OTHER";
  isDefault: boolean;
};
export type ImageRef = { id: string };
export type Item = {
  id: string;
  userId: string;
  name: string;
  category: string;
  status: string;
  condition: string;
  locationId: string;
  location: Location;
  images: ImageRef[];
  brand: string | null;
  size: string | null;
  primaryColor: string | null;
  colors: string[];
  seasons: string[];
  purchaseDate: string | null;
  purchasePriceCents: number | null;
  currency: string;
  sourceUrl: string | null;
  notes: string | null;
  favorite: boolean;
  archivedAt: string | null;
};
export type Availability = {
  status: string;
  reasons: { itemId: string; itemName: string; code: string; value?: string }[];
  availableCount: number;
  totalCount: number;
};
export type Variant = {
  id: string;
  name: string;
  isDefault: boolean;
  items: { item: Item; wardrobeItemId: string }[];
  styleTags: string[];
  seasonTags: string[];
  occasionTags: string[];
  availability: Availability;
};
export type Outfit = {
  id: string;
  name: string;
  description: string | null;
  favorite: boolean;
  archivedAt: string | null;
  variants: Variant[];
};
export type Plan = {
  id: string;
  outfitVariantId: string;
  plannedDate: string;
  slot: string;
  note: string | null;
  variant: Variant & { outfit: Outfit };
  availability: Availability;
  wearLog: { id: string } | null;
  conflicts: { sharedItemIds: string[] }[];
};
export type WearLog = {
  id: string;
  outfitVariantId: string;
  wornDate: string;
  outfitName: string;
  variantName: string;
  note: string | null;
  items: { wardrobeItemId: string; itemName: string }[];
};
export type Me = {
  user: { id: string; name: string; email: string; emailVerified: boolean };
  preference: {
    timezone: string;
    theme: "light" | "dark" | "system";
    defaultLocationId: string | null;
  };
};
