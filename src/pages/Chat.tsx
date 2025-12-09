"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import { showError } from '@/utils/toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Send, Plane, User, MessageSquare, DollarSign, Phone, AlertTriangle, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateShippingCost } from '@/lib/pricing';
import VerifiedBadge from '@/components/VerifiedBadge';

const messageSchema = z.object({
  content: z.string().min(1),
});

// ... باقي النوعيات كما هي ...

// أترك بقية الكود كما في ملفك، مع تغيير واحد على priceDisplay:

// داخل Chat component، بعد حساب final price:
const priceDisplay = priceCalculation 
  ? `$${priceCalculation.totalPriceUSD.toFixed(2)}`
  : t('calculatingPrice');

// وبقية الملف تبقى كما في نسختك الحالية.