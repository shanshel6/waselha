"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { BadgeCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VerifiedBadgeProps {
  className?: string;
}

const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ className }) => {
  const { t } = useTranslation();
  return (
    <Badge
      variant="outline"
      className={`border-green-500 text-green-600 flex items-center gap-1 text-[11px] ${className || ''}`}
    >
      <BadgeCheck className="h-3 w-3" />
      {t('verified')}
    </Badge>
  );
};

export default VerifiedBadge;