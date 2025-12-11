import { countries } from './countries';

const ZONES = {
  A: [ // NEAR COUNTRIES (Start price: 5 USD)
    "Iraq", "Turkey", "Iran", "Jordan", "Syria", "Lebanon", "United Arab Emirates", 
    "Qatar", "Bahrain", "Kuwait", "Saudi Arabia", "Oman", "Cyprus", "Armenia", 
    "Georgia", "Azerbaijan", "Egypt"
  ],
  C: [ // FAR COUNTRIES (Start price: 9 USD)
    "China", "Hong Kong", "Japan", "Philippines", "Vietnam", "Taiwan", "Australia", 
    "New Zealand", "United States", "Canada", "Mexico", "Brazil", "Argentina", 
    "Chile", "Colombia"
  ]
  // Zone B is implicitly all other countries in the list, defaulting unlisted to B.
};

const PRICING_TIERS_USD = {
  A: { "1-2": 5.0, "3-5": 4.5, "6-10": 4.0 },
  B: { "1-2": 7.0, "3-5": 6.5, "6-10": 6.0 },
  C: { "1-2": 9.0, "3-5": 8.5, "6-10": 8.0 }
};

const USD_TO_IQD_RATE = 1400;
const MAX_TRIP_WEIGHT_KG = 50; // Max weight a traveler can offer/sender can request for a trip
const MAX_CALCULATOR_WEIGHT_KG = 50; // Max weight for price calculation on the homepage

// New constants for pricing model
export const ITEM_TYPES = {
  regular: 'regular',
  document: 'document',
  fragile: 'fragile',
  urgent: 'urgent',
} as const;
export type ItemType = keyof typeof ITEM_TYPES;

export const ITEM_SIZES = {
  XS: 'XS',
  S: 'S',
  M: 'M',
  L: 'L',
} as const;
export type ItemSize = keyof typeof ITEM_SIZES;

const CATEGORY_MULTIPLIERS: Record<ItemType, number> = {
  regular: 1.0,
  document: 1.5,
  fragile: 1.3,
  urgent: 1.4,
};

const SIZE_ADJUSTMENTS: Record<ItemSize, number> = {
  XS: 0,
  S: 0,
  M: 2,
  L: 4,
};

const getZone = (country: string): keyof typeof PRICING_TIERS_USD => {
  if (ZONES.A.includes(country)) return 'A';
  if (ZONES.C.includes(country)) return 'C';
  // Default to Zone B if country is not listed in A or C (covers Europe, etc.)
  return 'B'; 
};

// Base price (1-2kg tier) logic for Traveler profit estimation (used in AddTrip)
const getBasePricePerKg = (zone: keyof typeof PRICING_TIERS_USD): number => {
  const tiers = PRICING_TIERS_USD[zone];
  return tiers["1-2"];
};

// Function for Senders (Price Calculator, Trip Details)
export const calculateShippingCost = (
  originCountry: string,
  destinationCountry: string,
  weight: number,
  itemType: ItemType,
  itemSize: ItemSize
) => {
  if (weight <= 0 || weight > MAX_CALCULATOR_WEIGHT_KG) {
    return { pricePerKgUSD: 0, totalPriceUSD: 0, totalPriceIQD: 0, error: "Invalid weight" };
  }

  const pricingCountry = (originCountry === 'Iraq' && destinationCountry !== 'Iraq') 
    ? destinationCountry 
    : (destinationCountry === 'Iraq' && originCountry !== 'Iraq') 
    ? originCountry 
    : (originCountry === destinationCountry) 
    ? originCountry
    : destinationCountry;

  const finalZone = getZone(pricingCountry);

  const basePricePerKg = getBasePricePerKg(finalZone);
  const categoryMultiplier = CATEGORY_MULTIPLIERS[itemType];
  const sizeAdjustment = SIZE_ADJUSTMENTS[itemSize];

  const totalPriceUSD = (weight * basePricePerKg) * categoryMultiplier + sizeAdjustment;
  const totalPriceIQD = totalPriceUSD * USD_TO_IQD_RATE;

  return { pricePerKgUSD: basePricePerKg, totalPriceUSD, totalPriceIQD, error: null };
};

// Function for Travelers (Add Trip) - Calculates potential profit based on base price
export const calculateTravelerProfit = (originCountry: string, destinationCountry: string, availableWeight: number) => {
  if (availableWeight <= 0 || availableWeight > MAX_TRIP_WEIGHT_KG) {
    return { pricePerKgUSD: 0, totalPriceUSD: 0, totalPriceIQD: 0, error: "Invalid weight" };
  }

  const pricingCountry = (originCountry === 'Iraq' && destinationCountry !== 'Iraq') 
    ? destinationCountry 
    : (destinationCountry === 'Iraq' && originCountry !== 'Iraq') 
    ? originCountry 
    : destinationCountry;

  const finalZone = getZone(pricingCountry);

  const pricePerKgUSD = getBasePricePerKg(finalZone); 
  const totalPriceUSD = availableWeight * pricePerKgUSD;
  const totalPriceIQD = totalPriceUSD * USD_TO_IQD_RATE;

  return { pricePerKgUSD, totalPriceUSD, totalPriceIQD, error: null };
};

export const zonedCountries = [...new Set([
  ...ZONES.A, 
  ...ZONES.C, 
  ...countries.filter((c: string) => !ZONES.A.includes(c) && !ZONES.C.includes(c))
])].sort();