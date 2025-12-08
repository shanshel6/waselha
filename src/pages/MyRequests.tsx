"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ReceivedRequestsTab } from '@/components/my-requests/ReceivedRequestsTab';
import { SentRequestsTab } from '@/components/my-requests/SentRequestsTab';
import { EditRequestModal } from '@/components/my-requests/EditRequestModal';
import TravelerInspectionModal from '@/components/my-requests/TravelerInspectionModal';
import SenderPhotoUploadModal from '@/components/my-requests/SenderPhotoUploadModal';
import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { useUnreadChatCountByTab } from '@/hooks/use-unread-chat-count-by-tab';
import { Badge } from '@/components/ui/badge';
import { useRequestManagement } from '@/hooks/use-request-management'; // Import the new hook

const MyRequests = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const { data: unreadCounts } = useUnreadChatCountByTab();
  
  const {
    // State
    itemToCancel,
    requestToEdit,
    requestForInspection,
    requestForSenderPhotos,
    requestForTrackingUpdate,
    isAcceptedRequest,
    isFirstPartyRequesting,
    isSecondPartyConfirming,
    trackingUpdateStage,
    dialogTitleKey,
    dialogDescriptionKey,

    // Setters
    setItemToCancel,
    setRequestToEdit,
    setRequestForInspection,
    setRequestForSenderPhotos,
    setRequestForTrackingUpdate,

    // Mutations
    updateRequestMutation,
    deleteRequestMutation,
    mutualCancelMutation,
    editRequestMutation,
    reviewChangesMutation,
    trackingUpdateMutation,

    // Handlers
    handleUpdateRequest,
    handleAcceptedRequestCancel,
    handleConfirmCancellation,
    handleEditRequest,
    handleInspectionComplete,
    handleSenderPhotoUpload,
    handleTrackingUpdate,
    handleConfirmTrackingUpdate,
  } = useRequestManagement();

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('myRequests')}</h1>
        <Link to="/place-order">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('placeOrder')}
          </Button>
        </Link>
      </div>
      
      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received" className="relative">
            {t('receivedRequests')}
            {unreadCounts && unreadCounts.received > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-xs">
                {unreadCounts.received}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="relative">
            {t('sentRequests')}
            {unreadCounts && unreadCounts.sent > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-xs">
                {unreadCounts.sent}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="received">
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
        </TabsContent>
        
        <TabsContent value="sent">
          <SentRequestsTab 
            user={user} 
            onCancelRequest={setItemToCancel} 
            deleteRequestMutation={deleteRequestMutation} 
            onCancelAcceptedRequest={handleAcceptedRequestCancel}
            onEditRequest={setRequestToEdit}
            onUploadSenderPhotos={handleSenderPhotoUpload}
            onTrackingUpdate={handleTrackingUpdate}
            trackingUpdateMutation={trackingUpdateMutation}
          />
        </TabsContent>
      </Tabs>
      
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
      
      {/* Tracking Update Confirmation Dialog */}
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
    </div>
  );
};

export default MyRequests;