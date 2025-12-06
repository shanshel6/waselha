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

const getZone = (country: string): keyof typeof PRICING_TIERS_USD => {
  if (ZONES.A.includes(country)) return 'A';
  if (ZONES.C.includes(country)) return 'C';
  // Default to Zone B if country is not listed in A or C (covers Europe, etc.)
  return 'B'; 
};

// Tiered pricing logic for Senders (used in TripDetails and PriceCalculator)
const getTieredPricePerKg = (zone: keyof typeof PRICING_TIERS_USD, weight: number): number => {
  const tiers = PRICING_TIERS_USD[zone];
  if (weight >= 1 && weight <= 2) return tiers["1-2"];
  if (weight >= 3 && weight <= 5) return tiers["3-5"];
  // For weights 6kg and above (up to 50kg), use the 6-10kg tier rate.
  if (weight >= 6) return tiers["6-10"]; 
  return 0; 
};

// Base price (1-2kg tier) logic for Traveler profit estimation (used in AddTrip)
const getBasePricePerKg = (zone: keyof typeof PRICING_TIERS_USD): number => {
  const tiers = PRICING_TIERS_USD[zone];
  return tiers["1-2"];
};

// Function for Senders (Price Calculator, Trip Details)
export const calculateShippingCost = (originCountry: string, destinationCountry: string, weight: number) => {
  // We use MAX_CALCULATOR_WEIGHT_KG here, relying on Zod validation in TripDetails to enforce MAX_TRIP_WEIGHT_KG.
  if (weight <= 0 || weight > MAX_CALCULATOR_WEIGHT_KG) {
    return { pricePerKgUSD: 0, totalPriceUSD: 0, totalPriceIQD: 0, error: "Invalid weight" };
  }

  // Pricing is based ONLY on the non-Iraq country involved in the trip.
  const pricingCountry = (originCountry === 'Iraq' && destinationCountry !== 'Iraq') 
    ? destinationCountry 
    : (destinationCountry === 'Iraq' && originCountry !== 'Iraq') 
    ? originCountry 
    : (originCountry === destinationCountry) 
    ? originCountry // Should only happen if Iraq is selected for both, which is prevented in UI
    : destinationCountry; // Fallback

  const finalZone = getZone(pricingCountry);

  const pricePerKgUSD = getTieredPricePerKg(finalZone, weight);
  const totalPriceUSD = weight * pricePerKgUSD;
  const totalPriceIQD = totalPriceUSD * USD_TO_IQD_RATE;

  return { pricePerKgUSD, totalPriceUSD, totalPriceIQD, error: null };
};

// Function for Travelers (Add Trip) - Calculates potential profit based on base price
export const calculateTravelerProfit = (originCountry: string, destinationCountry: string, availableWeight: number) => {
  if (availableWeight <= 0 || availableWeight > MAX_TRIP_WEIGHT_KG) {
    return { pricePerKgUSD: 0, totalPriceUSD: 0, totalPriceIQD: 0, error: "Invalid weight" };
  }

  // Pricing is based ONLY on the non-Iraq country involved in the trip.
  const pricingCountry = (originCountry === 'Iraq' && destinationCountry !== 'Iraq') 
    ? destinationCountry 
    : (destinationCountry === 'Iraq' && originCountry !== 'Iraq') 
    ? originCountry 
    : destinationCountry;

  const finalZone = getZone(pricingCountry);

  // Use the base price (1-2kg tier) for profit estimation
  const pricePerKgUSD = getBasePricePerKg(finalZone); 
  const totalPriceUSD = availableWeight * pricePerKgUSD;
  const totalPriceIQD = totalPriceUSD * USD_TO_IQD_RATE;

  return { pricePerKgUSD, totalPriceUSD, totalPriceIQD, error: null };
};

// Re-generate zonedCountries list based on new ZONES definition
// This list should contain all countries available in the UI selectors.
export const zonedCountries = [...new Set([
  ...ZONES.A, 
  ...ZONES.C, 
  // Include all countries from src/lib/countries.ts that are not explicitly A or C (these are Zone B)
  ...countries.filter((c: string) => !ZONES.A.includes(c) && !ZONES.C.includes(c))
])].sort();