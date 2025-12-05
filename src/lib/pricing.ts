// Define zones for pricing
const zones = {
  A: ["Iraq", "Turkey", "Iran", "Jordan", "United Arab Emirates", "Qatar", "Saudi Arabia", "Kuwait"],
  B: [
    // Europe
    "United Kingdom", "Germany", "Italy", "France", "Spain", "Netherlands", "Belgium", "Sweden", "Switzerland", "Austria", "Norway", "Denmark", "Finland", "Ireland", "Portugal", "Greece", "Poland", "Czech Republic", "Hungary", "Romania",
    // Asia
    "Malaysia", "Thailand"
  ],
  C: ["China", "Japan", "United States", "Canada", "Australia"]
};

// Define pricing tiers in USD per kg
const pricingTiers = {
  A: { // Near
    "1-2": 5.0,
    "3-5": 4.5,
    "6-10": 4.0,
    ">10": 3.5,
  },
  B: { // Medium
    "1-2": 5.5,
    "3-5": 5.0,
    "6-10": 4.5,
    ">10": 4.0,
  },
  C: { // Far
    "1-2": 6.0,
    "3-5": 5.5,
    "6-10": 5.0,
    ">10": 4.5,
  }
};

// Function to determine the zone of a given country
const getZone = (country: string): keyof typeof pricingTiers | null => {
  if (zones.A.includes(country)) return 'A';
  if (zones.B.includes(country)) return 'B';
  if (zones.C.includes(country)) return 'C';
  return null; // Country not in a defined zone
};

// Function to get the price per kg based on the zone and weight
const getPricePerKg = (zone: keyof typeof pricingTiers, weight: number): number => {
  const tiers = pricingTiers[zone];
  if (weight >= 1 && weight <= 2) return tiers["1-2"];
  if (weight >= 3 && weight <= 5) return tiers["3-5"];
  if (weight >= 6 && weight <= 10) return tiers["6-10"];
  if (weight > 10) return tiers[">10"];
  return 0; // Default case if weight is out of expected range
};

// Main function to calculate the total shipping cost
export const calculateShippingCost = (originCountry: string, destinationCountry: string, weight: number) => {
  const zoneOrigin = getZone(originCountry);
  const zoneDestination = getZone(destinationCountry);

  if (!zoneOrigin || !zoneDestination) {
    return {
      pricePerKgUSD: 0,
      totalPriceUSD: 0,
      error: "Route not supported for calculation.",
    };
  }
  
  if (weight <= 0) {
    return {
      pricePerKgUSD: 0,
      totalPriceUSD: 0,
      error: null,
    };
  }

  // Use the more expensive zone for the calculation to ensure symmetrical pricing
  const finalZone = zoneOrigin > zoneDestination ? zoneOrigin : zoneDestination;

  const pricePerKgUSD = getPricePerKg(finalZone, weight);
  const totalPriceUSD = weight * pricePerKgUSD;

  return {
    pricePerKgUSD,
    totalPriceUSD,
    error: null,
  };
};

// Export a sorted list of countries that have pricing zones
export const zonedCountries = [...new Set([...zones.A, ...zones.B, ...zones.C])].sort();