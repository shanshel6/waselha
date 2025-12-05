const ZONES = {
  A: [ // Near
    "Iraq", "Turkey", "Iran", "Jordan", "Syria", "Lebanon", "United Arab Emirates", 
    "Qatar", "Bahrain", "Kuwait", "Saudi Arabia", "Oman", "Cyprus", "Armenia", 
    "Georgia", "Azerbaijan", "Egypt"
  ],
  B: [ // Medium
    "United Kingdom", "Germany", "France", "Italy", "Spain", "Netherlands", "Belgium", 
    "Switzerland", "Sweden", "Norway", "Denmark", "Poland", "Czech Republic", "Austria", 
    "Greece", "Romania", "Bulgaria", "Hungary", "Croatia", "Morocco", "Algeria", 
    "Tunisia", "India", "Pakistan", "Kazakhstan", "Uzbekistan", "Malaysia", 
    "Thailand", "Singapore", "Indonesia", "South Korea"
  ],
  C: [ // Far
    "China", "Hong Kong", "Japan", "Philippines", "Vietnam", "Taiwan", 
    "Australia", "New Zealand"
  ],
  D: [ // Very Far
    "United States", "Canada", "Mexico", "Brazil", "Argentina", "Chile", "Colombia"
  ]
};

const PRICING_TIERS_USD = {
  A: { "1-2": 5.0, "3-5": 4.5, "6-10": 4.0, ">10": 3.5 },
  B: { "1-2": 6.0, "3-5": 5.5, "6-10": 5.0, ">10": 4.5 },
  C: { "1-2": 8.0, "3-5": 7.5, "6-10": 7.0, ">10": 6.5 },
  D: { "1-2": 9.0, "3-5": 8.5, "6-10": 8.0, ">10": 7.5 }
};

const USD_TO_IQD_RATE = 1400;

const getZone = (country: string): keyof typeof PRICING_TIERS_USD => {
  if (ZONES.A.includes(country)) return 'A';
  if (ZONES.B.includes(country)) return 'B';
  if (ZONES.C.includes(country)) return 'C';
  if (ZONES.D.includes(country)) return 'D';
  return 'B'; // Default to Zone B if country is not listed
};

const getPricePerKg = (zone: keyof typeof PRICING_TIERS_USD, weight: number): number => {
  const tiers = PRICING_TIERS_USD[zone];
  if (weight >= 1 && weight <= 2) return tiers["1-2"];
  if (weight >= 3 && weight <= 5) return tiers["3-5"];
  if (weight >= 6 && weight <= 10) return tiers["6-10"];
  if (weight > 10) return tiers[">10"];
  return 0;
};

export const calculateShippingCost = (originCountry: string, destinationCountry: string, weight: number) => {
  if (weight <= 0) {
    return {
      pricePerKgUSD: 0,
      totalPriceUSD: 0,
      totalPriceIQD: 0,
      error: null,
    };
  }

  const zoneOrigin = getZone(originCountry);
  const zoneDestination = getZone(destinationCountry);

  // Direction doesn't matter, so we pick the more expensive zone for calculation
  const finalZone = zoneOrigin > zoneDestination ? zoneOrigin : zoneDestination;

  const pricePerKgUSD = getPricePerKg(finalZone, weight);
  const totalPriceUSD = weight * pricePerKgUSD;
  const totalPriceIQD = totalPriceUSD * USD_TO_IQD_RATE;

  return {
    pricePerKgUSD,
    totalPriceUSD,
    totalPriceIQD,
    error: null,
  };
};

export const zonedCountries = [...new Set([...ZONES.A, ...ZONES.B, ...ZONES.C, ...ZONES.D])].sort();