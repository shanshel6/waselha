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
  document: 2.0,
  fragile: 1.3,
  urgent: 1.4,
};

const SIZE_ADJUSTMENTS: Record<ItemSize, number> = {
  XS: 0,
  S: 0,
  M: 2,
  L: 4,
};

const getZone = (country: string): 'A' | 'B' | 'C' => {
  if (ZONES.A.includes(country)) return 'A';
  if (ZONES.C.includes(country)) return 'C';
  // Default to Zone B if country is not listed in A or C (covers Europe, etc.)
  return 'B'; 
};

// New function to determine price per kg based on weight and zone
const getPricePerKg = (weight: number, zone: 'A' | 'B' | 'C'): number => {
    const basePrices = { A: 5.0, B: 7.0, C: 9.0 };
    const basePrice = basePrices[zone];

    if (weight <= 2) { // For 1kg and 2kg
        return basePrice;
    }
    if (weight <= 4) { // For 3kg and 4kg
        return basePrice - 0.5;
    }
    if (weight <= 7) { // For 5kg, 6kg, 7kg
        return basePrice - 1.0;
    }
    // For weights 8kg and above
    return basePrice - 1.5;
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

  const pricePerKgUSD = getPricePerKg(weight, finalZone);
  const categoryMultiplier = CATEGORY_MULTIPLIERS[itemType];
  const sizeAdjustment = SIZE_ADJUSTMENTS[itemSize];

  const totalPriceUSD = (weight * pricePerKgUSD) * categoryMultiplier + sizeAdjustment;
  const totalPriceIQD = totalPriceUSD * USD_TO_IQD_RATE;

  return { pricePerKgUSD, totalPriceUSD, totalPriceIQD, error: null };
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

  const pricePerKgUSD = getPricePerKg(availableWeight, finalZone);
  const totalPriceUSD = availableWeight * pricePerKgUSD;
  const totalPriceIQD = totalPriceUSD * USD_TO_IQD_RATE;

  return { pricePerKgUSD, totalPriceUSD, totalPriceIQD, error: null };
};

export const zonedCountries = [...new Set([
  ...ZONES.A, 
  ...ZONES.C, 
  ...countries.filter((c: string) => !ZONES.A.includes(c) && !ZONES.C.includes(c))
])].sort();