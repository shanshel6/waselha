"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { ReceivedRequestsTab } from '@/components/my-requests/ReceivedRequestsTab';
import { SentRequestsTab } from '@/components/my-requests/SentRequestsTab';
import { EditRequestModal } from '@/components/my-requests/EditRequestModal';
import TravelerInspectionModal from '@/components/my-requests/TravelerInspectionModal';
import SenderPhotoUploadModal from '@/components/my-requests/SenderPhotoUploadModal';
import PaymentProofDialog from '@/components/my-requests/PaymentProofDialog';
import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { useUnreadChatCountByTab } from '@/hooks/use-unread-chat-count-by-tab';
import { Badge } from '@/components/ui/badge';
import { useRequestManagement } from '@/hooks/use-request-management';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const ListSkeleton: React.FC = () => (
  <div className="space-y-3">
    {Array.from({ length: 3 }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </CardContent>
      </Card>
    ))}
  </div>
);

const MyRequests = () => {
  const { t } = useTranslation();
  const { user, isLoading: isSessionLoading } = useSession();
  const { data: unreadCounts, isLoading: isUnreadLoading } = useUnreadChatCountByTab();

  const {
    itemToCancel,
    requestToEdit,
    requestForInspection,
    requestForSenderPhotos,
    requestForTrackingUpdate,
    requestForPayment,
    isAcceptedRequest,
    isFirstPartyRequesting,
    isSecondPartyConfirming,
    trackingUpdateStage,
    dialogTitleKey,
    dialogDescriptionKey,
    setItemToCancel,
    setRequestToEdit,
    setRequestForInspection,
    setRequestForSenderPhotos,
    setRequestForTrackingUpdate,
    setRequestForPayment,
    updateRequestMutation,
    deleteRequestMutation,
    mutualCancelMutation,
    editRequestMutation,
    reviewChangesMutation,
    trackingUpdateMutation,
    submitPaymentProofMutation,
    handleUpdateRequest,
    handleAcceptedRequestCancel,
    handleConfirmCancellation,
    handleEditRequest,
    handleInspectionComplete,
    handleSenderPhotoUpload,
    handleTrackingUpdate,
    handleConfirmTrackingUpdate,
    handleOpenPaymentDialog,
    handleSubmitPaymentProof,
  } = useRequestManagement();

  const isLoadingGlobal = isSessionLoading || isUnreadLoading;

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            {t('myRequests')}
          </h1>
          <p className="text-xs text-muted-foreground md:hidden">
            راقب طلباتك المرسلة والمستلمة، وتابع حالة الطرد خطوة بخطوة.
          </p>
        </div>
        <Link to="/place-order" className="w-full md:w-auto">
          <Button className="w-full md:w-auto justify-center">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('placeOrder')}
          </Button>
        </Link>
      </div>
      
      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received" className="relative text-xs sm:text-sm">
            {t('receivedRequests')}
            {unreadCounts && unreadCounts.received > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {unreadCounts.received}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="relative text-xs sm:text-sm">
            {t('sentRequests')}
            {unreadCounts && unreadCounts.sent > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {unreadCounts.sent}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="received" className="mt-4">
          {isLoadingGlobal || !user ? (
            <ListSkeleton />
          ) : (
            <ReceivedRequestsTab 
              user={user} 
              onUpdateRequest={handleUpdateRequest} 
              updateRequestMutation={updateRequestMutation} 
              onCancelAcceptedRequest={handleAcceptedRequestCancel}
              onReviewChanges={reviewChangesMutation.mutate}
              reviewChangesMutation={reviewChangesMutation}
              onUploadInspectionPhotos={setRequestForInspection}
              onTrackingUpdate={handleTrackingUpdate}
              trackingUpdateMutation={trackingUpdateMutation}
            />
          )}
        </TabsContent>
        
        <TabsContent value="sent" className="mt-4">
          {isLoadingGlobal || !user ? (
            <ListSkeleton />
          ) : (
            <SentRequestsTab 
              user={user} 
              onCancelRequest={setItemToCancel} 
              deleteRequestMutation={deleteRequestMutation} 
              onCancelAcceptedRequest={handleAcceptedRequestCancel}
              onEditRequest={setRequestToEdit}
              onUploadSenderPhotos={handleSenderPhotoUpload}
              onTrackingUpdate={handleTrackingUpdate}
              trackingUpdateMutation={trackingUpdateMutation}
              onOpenPaymentDialog={handleOpenPaymentDialog}
            />
          )}
        </TabsContent>
      </Tabs>
      
      {/* Dialogs */}
      <AlertDialog open={!!itemToCancel} onOpenChange={(open) => !open && setItemToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAcceptedRequest 
                ? (isSecondPartyConfirming 
                    ? t('confirmMutualCancellation') 
                    : t('requestCancellationTitle'))
                : t('areYouSureCancel')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAcceptedRequest 
                ? (isSecondPartyConfirming 
                    ? t('confirmMutualCancellationDescription') 
                    : t('requestCancellationDescription'))
                : t('cannotBeUndone')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToCancel(null)}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCancellation} 
              disabled={deleteRequestMutation.isPending || mutualCancelMutation.isPending || isFirstPartyRequesting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isAcceptedRequest 
                ? (isSecondPartyConfirming 
                    ? t('confirmCancellation') 
                    : t('requestCancellation'))
                : t('confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={!!requestForTrackingUpdate} onOpenChange={(open) => !open && setRequestForTrackingUpdate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(dialogTitleKey)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(dialogDescriptionKey)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRequestForTrackingUpdate(null)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmTrackingUpdate} 
              disabled={trackingUpdateMutation.isPending}
            >
              {t(trackingUpdateStage?.tKey || 'confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {requestToEdit && (
        <EditRequestModal 
          isOpen={!!requestToEdit} 
          onOpenChange={() => setRequestToEdit(null)} 
          request={requestToEdit} 
          onSubmit={handleEditRequest} 
          isSubmitting={editRequestMutation.isPending} 
        />
      )}
      
      {requestForInspection && (
        <TravelerInspectionModal
          request={requestForInspection}
          isOpen={!!requestForInspection}
          onOpenChange={() => setRequestForInspection(null)}
          onInspectionComplete={handleInspectionComplete}
        />
      )}
      
      {requestForSenderPhotos && (
        <SenderPhotoUploadModal
          request={requestForSenderPhotos}
          isOpen={!!requestForSenderPhotos}
          onOpenChange={() => setRequestForSenderPhotos(null)}
        />
      )}

      {/* حوار إثبات الدفع (للمرسل فقط) */}
      {requestForPayment && (
        <PaymentProofDialog
          request={requestForPayment as any}
          isOpen={!!requestForPayment}
          onOpenChange={(open) => {
            if (!open) setRequestForPayment(null);
          }}
          onSubmit={handleSubmitPaymentProof}
          isSubmitting={submitPaymentProofMutation.isPending}
        />
      )}
    </div>
  );
};

export default MyRequests;