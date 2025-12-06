"use client";

import React from 'react';
import {
  Bomb, Flame, Container, Skull, Biohazard, Radiation, BatteryCharging,
  CigaretteOff, Battery, Drone, CircuitBoard, FileLock, LucideProps, XCircle
} from 'lucide-react';

const icons: { [key: string]: React.FC<LucideProps> } = {
  Bomb,
  Flame,
  Container,
  Skull,
  Biohazard,
  Radiation,
  BatteryCharging,
  CigaretteOff,
  Battery,
  Drone,
  CircuitBoard,
  FileLock
};

interface IconRendererProps extends LucideProps {
  name: string;
}

const IconRenderer: React.FC<IconRendererProps> = ({ name, ...props }) => {
  const IconComponent = icons[name] || XCircle; // Fallback icon
  return <IconComponent {...props} />;
};

export default IconRenderer;