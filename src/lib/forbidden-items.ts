export interface ForbiddenItemCategory {
  title: string;
  items: string[];
}

export const forbiddenItemsList: ForbiddenItemCategory[] = [
  {
    title: "generallyProhibitedTitle",
    items: [
      "explosives",
      "flammableLiquids",
      "compressedGases",
      "poisons",
      "corrosives",
      "radioactiveMaterials",
    ],
  },
  {
    title: "checkedBaggageProhibitedTitle",
    items: [
      "powerBanks",
      "eCigarettes",
      "spareLithiumBatteries",
    ],
  },
  {
    title: "iraqRestrictionsTitle",
    items: [
      "drones",
      "certainElectronics",
      "politicallySensitive",
    ],
  },
];