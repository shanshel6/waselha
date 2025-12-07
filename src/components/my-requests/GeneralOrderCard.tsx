"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Plane, Trash2, Clock, CheckCircle, XCircle, Pencil, Weight, User } from 'lucide-react';
import { format } from 'date-fns';
import CountryFlag from '@/components/CountryFlag';
import { cn } from '@/lib/utils';

// Re-defining necessary types locally for modularity
interface GeneralOrder {
  id: string;
  user_id: string;
  from_country: string;
  to_country: string;
  description: string;
  is_valuable: boolean;
  insurance_requested: boolean;
  status: 'new' | 'matched' | 'claimed' | 'completed' | 'cancelled';
  claimed_by: string | null;
  created_at: string;
  updated_at: string;
  insurance_percentage: number;
  weight_kg: number;
  type: 'general_order';
}

interface GeneralOrderCardProps {
  order: GeneralOrder;
  onCancelRequest: (order: GeneralOrder) => void;
  deleteRequestMutation: any;
  t: (key: string) => string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'claimed':
    case 'matched': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
    default: return <Clock className="h-4 w-4 text-yellow-500" />;
  }
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'claimed':
    case 'matched': return 'default';
    case 'rejected': return 'destructive';
    default: return 'secondary';
  }
};

const getStatusCardClass = (status: string) => {
  switch (status) {
    case 'claimed': return 'border-green-500/30 bg-green-50 dark:bg-green-900/20';
    case 'rejected': return 'border-red-500/30 bg-red-50 dark:bg-red-900/20';
    case 'matched': return 'border-blue-500/30 bg-blue-50 dark:bg-blue-900/20';
    default: return 'border-yellow-500/30 bg-yellow-50 dark:bg-yellow-900/20';
  }
};

const GeneralOrderCard: React.FC<GeneralOrderCardProps> = ({ 
  order, 
  onCancelRequest, 
  deleteRequestMutation, 
  t 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const isMatched = order.status === 'matched' || order.status === 'claimed';
  const travelerName = order.claimed_by ? t('traveler') : t('waitingForMatch');
  
  return (
    <Card className={cn(getStatusCardClass(order.status), "border-2 border-dashed border-blue-500 bg-blue-50 dark:bg-blue-900/20")}>
      <CardHeader className="p-4 pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(order.status)}
            <div>
              <CardTitle className="text-base font-semibold">
                {t('generalOrderTitle')}
              </CardTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Plane className="h-3 w-3" />
                <CountryFlag country={order.from_country} showName={false} />
                <span className="text-xs">→</span>
                <CountryFlag country={order.to_country} showName={false} />
                {` • ${format(new Date(order.created_at), 'MMM d')}`}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={getStatusVariant(order.status)} className="text-xs">
              {t(`status${order.status.charAt(0).toUpperCase() + order.status.slice(1)}`)}
            </Badge>
            {isMatched && <span className="text-xs text-muted-foreground">{t('matched')}</span>}
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Weight className="h-4 w-4 text-muted-foreground" />
              <span>{order.weight_kg} kg</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{travelerName}</span>
            </div>
          </div>

          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-between text-xs" 
              onClick={() => setDetailsExpanded(!detailsExpanded)}
            >
              <span>{t('viewDetails')}</span>
              {detailsExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
            
            {detailsExpanded && (
              <div className="mt-2 p-3 bg-muted rounded-md space-y-2 text-sm">
                <div>
                  <p className="font-medium">{t('packageContents')}:</p>
                  <p className="text-muted-foreground">{order.description}</p>
                </div>
                {order.insurance_requested && (
                  <div>
                    <p className="font-medium text-blue-600">{t('insuranceCoverage')}:</p>
                    <p className="text-muted-foreground">{order.insurance_percentage}%</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions for General Order */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => onCancelRequest(order)} 
              disabled={deleteRequestMutation.isPending || isMatched}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('cancelRequest')}
            </Button>
            <Button variant="secondary" size="sm" disabled={isMatched}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('editOrder')}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default GeneralOrderCard;