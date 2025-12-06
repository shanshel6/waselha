const ZONES = {
  A: [ // NEAR COUNTRIES (Start price: 5 USD)
    "Iraq", "Turkey", "Iran", "Jordan", "Syria", "Lebanon", "United Arab Emirates", 
    "Qatar", "Bahrain", "Kuwait", "Saudi Arabia", "Oman", "Cyprus", "Armenia", 
    "Georgia", "Azerbaijan", "Egypt"
  ],
  B: [ // MEDIUM DISTANCE (Start price: 7 USD)
    "United Kingdom", "Germany", "France", "Italy", "Spain", "Netherlands", "Belgium", 
    "Switzerland", "Sweden", "Norway", "Denmark", "Poland", "Czech Republic", "Austria", 
    "Greece", "Romania", "Bulgaria", "Hungary", "Croatia", "Slovakia", "Slovenia", 
    "Lithuania", "Latvia", "Estonia", "Finland", "Iceland", "Ireland", "Luxembourg", 
    "Malta", "Monaco", "Montenegro", "North Macedonia", "Portugal", "Serbia", 
    "Ukraine", "Belarus", "Moldova", "Bosnia and Herzegovina", "Albania", 
    "Malaysia", "Thailand", "Singapore", "Indonesia", "India", "Pakistan", 
    "Kazakhstan", "Uzbekistan", "Morocco", "Algeria", "Tunisia", "Bangladesh",
    "Nepal", "Sri Lanka", "Myanmar", "Vietnam", "Laos", "Cambodia", "Philippines",
    "South Korea", "North Korea", "Taiwan", "Mongolia", "Kyrgyzstan", "Tajikistan",
    "Turkmenistan", "Yemen", "Libya", "Sudan", "South Sudan", "Eritrea", "Ethiopia",
    "Somalia", "Djibouti", "Kenya", "Tanzania", "Uganda", "Rwanda", "Burundi",
    "Congo (Kinshasa)", "Congo (Brazzaville)", "Central African Republic", "Chad",
    "Niger", "Nigeria", "Benin", "Togo", "Ghana", "Ivory Coast", "Burkina Faso",
    "Mali", "Mauritania", "Senegal", "Gambia", "Guinea-Bissau", "Guinea", "Sierra Leone",
    "Liberia", "Cabo Verde", "Sao Tome and Principe", "Equatorial Guinea", "Gabon",
    "Cameroon", "Angola", "Zambia", "Zimbabwe", "Botswana", "Namibia", "South Africa",
    "Lesotho", "Eswatini", "Mozambique", "Malawi", "Madagascar", "Comoros", "Seychelles",
    "Mauritius", "Fiji", "Samoa", "Tonga", "Tuvalu", "Kiribati", "Marshall Islands",
    "Micronesia", "Palau", "Nauru", "Vanuatu", "Solomon Islands", "Papua New Guinea",
    "Timor-Leste", "Haiti", "Dominican Republic", "Cuba", "Jamaica", "Trinidad and Tobago",
    "Barbados", "Saint Lucia", "Saint Vincent and the Grenadines", "Grenada", 
    "Saint Kitts and Nevis", "Dominica", "Antigua and Barbuda", "Bahamas", "Belize",
    "Costa Rica", "El Salvador", "Guatemala", "Honduras", "Nicaragua", "Panama",
    "Uruguay", "Paraguay", "Bolivia", "Ecuador", "Peru", "Venezuela", "Guyana",
    "Suriname", "Russia" // Added Russia and other unlisted countries to B
  ],
  C: [ // FAR COUNTRIES (Start price: 9 USD)
    "China", "Hong Kong", "Japan", "Australia", "New Zealand",
    "United States", "Canada", "Mexico", "Brazil", "Argentina", "Chile", "Colombia"
  ]
};

const PRICING_TIERS_USD = {
  A: { "1-2": 5.0, "3-5": 4.5, "6-10": 4.0, ">10": 3.5 },
  B: { "1-2": 7.0, "3-5": 6.5, "6-10": 6.0, ">10": 5.5 },
  C: { "1-2": 9.0, "3-5": 8.5, "6-10": 8.0, ">10": 7.5 }
};

const USD_TO_IQD_RATE = 1400;

const getZone = (country: string): keyof typeof PRICING_TIERS_USD => {
  if (ZONES.A.includes(country)) return 'A';
  if (ZONES.C.includes(country)) return 'C';
  // Default to Zone B if country is not listed in A or C
  return 'B'; 
};

// Tiered pricing logic for Senders (used in TripDetails and PriceCalculator)
const getTieredPricePerKg = (zone: keyof typeof PRICING_TIERS_USD, weight: number): number => {
  const tiers = PRICING_TIERS_USD[zone];
  if (weight >= 1 && weight <= 2) return tiers["1-2"];
  if (weight >= 3 && weight <= 5) return tiers["3-5"];
  if (weight >= 6 && weight <= 10) return tiers["6-10"];
  if (weight > 10) return tiers[">10"];
  return 0;
};

// Base price (1-2kg tier) logic for Traveler profit estimation (used in AddTrip)
const getBasePricePerKg = (zone: keyof typeof PRICING_TIERS_USD): number => {
  const tiers = PRICING_TIERS_USD[zone];
  return tiers["1-2"];
};

// Function for Senders (Price Calculator, Trip Details)
export const calculateShippingCost = (originCountry: string, destinationCountry: string, weight: number) => {
  if (weight <= 0 || weight > 30) {
    return { pricePerKgUSD: 0, totalPriceUSD: 0, totalPriceIQD: 0, error: "Invalid weight" };
  }

  // Pricing is based ONLY on the destination country (the non-Iraq country)
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
  if (availableWeight <= 0 || availableWeight > 30) {
    return { pricePerKgUSD: 0, totalPriceUSD: 0, totalPriceIQD: 0, error: "Invalid weight" };
  }

  // Pricing is based ONLY on the destination country (the non-Iraq country)
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
export const zonedCountries = [...new Set([...ZONES.A, ...ZONES.B, ...ZONES.C])].sort();