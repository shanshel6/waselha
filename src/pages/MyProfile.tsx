"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plane, User, Mail, Phone, Briefcase, BadgeCheck, Pencil, MapPin, ShieldAlert } from 'lucide-react';
import { useProfile } from '@/hooks/use-profile';
import { Badge } from '@/components/ui/badge';
import EditNameDialog from '@/components/EditNameDialog';
import EditContactDialog from '@/components/EditContactDialog';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useVerificationStatus } from '@/hooks/use-verification-status';
import UploadAvatar from '@/components/UploadAvatar';

const MyProfile = () => {
  const { t } = useTranslation();
  const { user, isLoading: isSessionLoading } = useSession();
  const { data: profile, isLoading: isLoadingProfile } = useProfile();
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const { data: verificationInfo } = useVerificationStatus();

  if (isSessionLoading || isLoadingProfile) {
    return (
      <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">{t('loadingProfile')}</p>
      </div>
    );
  }

  const roleText = (role: string | null | undefined) => {
    if (role === 'traveler') return t('roleTraveler');
    if (role === 'sender') return t('roleSender');
    if (role === 'both') return t('roleBoth');
    return 'N/A';
  };

  const renderVerificationBadge = () => {
    const status = verificationInfo?.status || 'none';

    if (status === 'approved') {
      return (
        <Badge className="bg-green-500 hover:bg-green-500/90 text-white">
          <BadgeCheck className="h-4 w-4 mr-1" /> {t('verified')}
        </Badge>
      );
    }

    if (status === 'pending') {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <ShieldAlert className="h-3 w-3" />
          {t('pendingVerification')}
        </Badge>
      );
    }

    if (status === 'rejected') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <ShieldAlert className="h-3 w-3" />
          {t('rejected')}
        </Badge>
      );
    }

    return null;
  };

  const status = verificationInfo?.status || 'none';
  const verifyButtonDisabled = status === 'pending';
  const verifyButtonLabel =
    status === 'pending'
      ? 'في انتظار تأكيد التحقق'
      : status === 'rejected'
        ? t('verifyNow')
        : t('verifyNow');

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] bg-background dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t('myProfile')}</h1>
      
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="space-y-4">
          {/* Avatar + upload */}
          <UploadAvatar profile={profile || null} />

          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-3">
              <User className="h-8 w-8 text-primary" />
              <span className="flex items-center gap-2">
                {profile?.first_name} {profile?.last_name}
                {profile && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-muted-foreground hover:text-primary"
                    onClick={() => setIsNameDialogOpen(true)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </span>
            </CardTitle>
            {renderVerificationBadge()}
          </div>
          <CardDescription>
            {t('profileDetails')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" />
                <span className="font-semibold">
                  {t('verifyYourself')}
                </span>
              </div>
              <Link
                to="/verification"
                className={verifyButtonDisabled ? 'pointer-events-none opacity-80' : ''}
              >
                <Button size="sm" disabled={verifyButtonDisabled}>
                  {verifyButtonLabel}
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('verificationInstructions')}
            </p>
          </div>

          <div className="space-y-3 p-4 rounded-lg border bg-card">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">{t('contactInformation')}</h3>
              {profile && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={() => setIsContactDialogOpen(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-2 rounded-md bg-gray-50 dark:bg-gray-800">
                <Mail className="h-5 w-5 text-gray-500" />
                <span className="text-gray-800 dark:text-gray-200 text-sm">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-md bg-gray-50 dark:bg-gray-800">
                <Phone className="h-5 w-5 text-gray-500" />
                <span className="text-gray-800 dark:text-gray-200 text-sm">
                  {profile?.phone || t('noPhoneProvided')}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-3 p-2 rounded-md bg-gray-50 dark:bg-gray-800">
              <MapPin className="h-5 w-5 text-gray-500 flex-shrink-0 mt-1" />
              <span className="text-gray-800 dark:text-gray-200 text-sm">
                {profile?.address || t('noAddressProvided')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2 rounded-md bg-gray-50 dark:bg-gray-800">
            <Briefcase className="h-5 w-5 text-gray-500" />
            <Badge variant="outline">{roleText(profile?.role)}</Badge>
          </div>
          
          <div className="pt-4 border-t">
            <Link to="/my-flights">
              <Button variant="secondary" className="w-full">
                <Plane className="h-4 w-4 mr-2" />
                {t('myFlights')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {profile && (
        <>
          <EditNameDialog 
            profile={profile} 
            isOpen={isNameDialogOpen} 
            onOpenChange={setIsNameDialogOpen} 
          />
          <EditContactDialog
            profile={profile}
            isOpen={isContactDialogOpen}
            onOpenChange={setIsContactDialogOpen}
          />
        </>
      )}
    </div>
  );
};

export default MyProfile;