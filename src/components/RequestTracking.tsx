"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { TRACKING_STAGES, RequestTrackingStatus, getTrackingStage } from '@/lib/tracking-stages';
import { cn } from '@/lib/utils';
import { Check, Clock, Camera, ShieldCheck, Plane, MapPin, PackageCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
  
  // Determine visible stages based on rejection status
  const visibleStages = isRejected 
    ? stagesToShow.filter(stage => stage.order === 1) // Only show 'waiting_approval'
    : stagesToShow;

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold mb-4">{t('trackingStatus')}</h3>
      <div className="flex justify-between items-center relative w-full overflow-x-auto pb-2">
        
        {visibleStages.map((stage, index) => {
          const isCurrent = stage.key === currentStatus;
          const isCompleted = stage.order < currentOrder;
          
          const isActive = isCurrent || isCompleted;
          
          const IconComponent = iconMap[stage.icon] || Clock;
          const isLast = index === visibleStages.length - 1;

          return (
            <React.Fragment key={stage.key}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center min-w-[80px] text-center relative z-10">
                    {/* Status indicator circle */}
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center transition-colors duration-300",
                      isActive ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground border border-border"
                    )}>
                      {isCompleted ? <Check className="h-4 w-4" /> : <IconComponent className="h-4 w-4" />}
                    </div>
                    
                    {/* Label (optional, for compact view) */}
                    <p className={cn(
                      "text-xs mt-1 max-w-[80px] truncate",
                      isActive ? "font-medium text-foreground" : "text-muted-foreground"
                    )}>
                      {t(stage.tKey)}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t(stage.tKey)}</p>
                  {isCurrent && !isRejected && <p className="text-xs text-primary">{t('currentStage')}</p>}
                  {isRejected && stage.key === 'waiting_approval' && <p className="text-xs text-destructive">{t('requestRejected')}</p>}
                </TooltipContent>
              </Tooltip>

              {/* Connector Line */}
              {!isLast && (
                <div className={cn(
                  "flex-1 h-0.5 mx-[-1px] transition-colors duration-300",
                  stage.order < currentOrder ? "bg-primary" : "bg-border"
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default RequestTracking;