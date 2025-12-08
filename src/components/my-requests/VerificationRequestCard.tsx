"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';
import { format } from 'date-fns';

interface VerificationRequest {
  id: string;
  user_id: string;
  status: string;
  id_front_url: string;
  id_back_url: string;
  photo_id_url: string;
  residential_card_url?: string;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string;
  } | null;
}

interface VerificationRequestCardProps {
  request: VerificationRequest;
}

const VerificationRequestCard: React.FC<VerificationRequestCardProps> = ({ request }) => {
  const displayName = request.profiles?.first_name || request.profiles?.last_name
    ? `${request.profiles?.first_name ?? ''} ${request.profiles?.last_name ?? ''}`.trim()
    : request.profiles?.email ?? 'User';

  return (
    <Card className="border-2 border-dashed">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <User className="h-4 w-4" />
          {displayName}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-2">
          <img src={request.id_front_url} alt="ID Front" className="w-full h-24 object-cover rounded" />
          <img src={request.id_back_url} alt="ID Back" className="w-full h-24 object-cover rounded" />
        </div>
      </CardContent>
    </Card>
  );
};

export default VerificationRequestCard;