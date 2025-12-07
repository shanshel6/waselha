"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { TRACKING_STAGES, RequestTrackingStatus, getTrackingStage } from '@/lib/tracking-stages';
import { cn } from '@/lib/utils';
import { Check, Clock, Camera, ShieldCheck, Plane, MapPin, PackageCheck } from 'lucide-react';

interface RequestTrackingProps {
  currentStatus: RequestTrackingStatus;
  isRejected: boolean;
}

const iconMap: Record<string, React.ElementType> = {
  Clock,
  CheckCircle: Check,
  Camera,
  ShieldCheck,
  Plane,
  MapPin,
  PackageCheck,
};

const RequestTracking: React.FC<RequestTrackingProps> = ({ currentStatus, isRejected }) => {
  const { t } = useTranslation();
  const currentStage = getTrackingStage(currentStatus);
  const currentOrder = currentStage ? currentStage.order : 0;

  // Filter stages to only show relevant ones (1 to 7)
  const stagesToShow = TRACKING_STAGES.filter(stage => stage.order >= 1 && stage.order <= 7);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{t('trackingStatus')}</h3>
      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />

        {stagesToShow.map((stage, index) => {
          const isCurrent = stage.key === currentStatus;
          const isCompleted = stage.order < currentOrder;
          const isAfterAcceptance = stage.order >= 2;
          
          // If rejected, only show the first stage as active/completed
          const isActive = !isRejected && (isCurrent || isCompleted);
          
          // If rejected, and we are past the first stage, mark as inactive
          if (isRejected && isAfterAcceptance) {
            return null;
          }

          const IconComponent = iconMap[stage.icon] || Clock;

          return (
            <div key={stage.key} className="relative mb-6">
              {/* Status indicator circle */}
              <div className={cn(
                "absolute left-0 top-0 h-6 w-6 rounded-full flex items-center justify-center",
                isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border border-border"
              )}>
                {isCompleted ? <Check className="h-4 w-4" /> : <IconComponent className="h-4 w-4" />}
              </div>
              
              {/* Content */}
              <div className={cn(
                "ml-6 p-2 rounded-md",
                isActive ? "font-medium text-foreground" : "text-muted-foreground"
              )}>
                <p className="text-sm">{t(stage.tKey)}</p>
                {isCurrent && !isRejected && (
                  <p className="text-xs text-primary mt-1">{t('currentStage')}</p>
                )}
                {isRejected && stage.key === 'waiting_approval' && (
                  <p className="text-xs text-destructive mt-1">{t('requestRejected')}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RequestTracking;