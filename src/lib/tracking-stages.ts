export type RequestTrackingStatus = 
  | 'waiting_approval'
  | 'item_accepted'
  | 'payment_done'
  | 'sender_photos_uploaded'
  | 'traveler_inspection_complete'
  | 'traveler_on_the_way'
  | 'delivered'
  | 'completed';

export interface TrackingStage {
  key: RequestTrackingStatus;
  tKey: string; // Translation key
  icon: string; // Lucide icon name
  order: number;
}

export const TRACKING_STAGES: TrackingStage[] = [
  { key: 'waiting_approval', tKey: 'trackingWaitingApproval', icon: 'Clock', order: 1 },
  { key: 'item_accepted', tKey: 'trackingItemAccepted', icon: 'CheckCircle', order: 2 },
  { key: 'payment_done', tKey: 'trackingPaymentDone', icon: 'Wallet', order: 3 },
  { key: 'sender_photos_uploaded', tKey: 'trackingSenderPhotosUploaded', icon: 'Camera', order: 4 },
  { key: 'traveler_inspection_complete', tKey: 'trackingTravelerInspectionComplete', icon: 'ShieldCheck', order: 5 },
  { key: 'traveler_on_the_way', tKey: 'trackingTravelerOnTheWay', icon: 'Plane', order: 6 },
  { key: 'delivered', tKey: 'trackingDelivered', icon: 'MapPin', order: 7 },
  { key: 'completed', tKey: 'trackingCompleted', icon: 'PackageCheck', order: 8 },
];

export const getTrackingStage = (status: RequestTrackingStatus) => {
  return TRACKING_STAGES.find(stage => stage.key === status);
};

export const getNextStage = (currentStatus: RequestTrackingStatus): RequestTrackingStatus | null => {
  const currentStage = getTrackingStage(currentStatus);
  if (!currentStage) return null;
  
  const nextStage = TRACKING_STAGES.find(stage => stage.order === currentStage.order + 1);
  return nextStage ? nextStage.key : null;
};