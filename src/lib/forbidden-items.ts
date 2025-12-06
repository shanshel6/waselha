export interface ForbiddenItem {
  key: string; // Translation key
  icon: string; // Lucide icon name
}

export const forbiddenItemsList: ForbiddenItem[] = [
  { key: "explosives", icon: "Bomb" },
  { key: "flammableLiquids", icon: "Flame" },
  { key: "compressedGases", icon: "Container" },
  { key: "poisons", icon: "Skull" },
  { key: "corrosives", icon: "Biohazard" },
  { key: "radioactiveMaterials", icon: "Radiation" },
  { key: "powerBanks", icon: "BatteryCharging" },
  { key: "eCigarettes", icon: "CigaretteOff" }, // Includes vapes
  { key: "spareLithiumBatteries", icon: "Battery" },
  { key: "drones", icon: "CameraOff" },
  { key: "certainElectronics", icon: "CircuitBoard" },
  { key: "politicallySensitive", icon: "FileLock" },
];