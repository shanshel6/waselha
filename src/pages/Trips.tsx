"use client";

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Plane,
  Package,
  User,
  MapPin,
  Search,
  PlusCircle,
  X,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { countries } from '@/lib/countries';
import CountryFlag from '@/components/CountryFlag';
import { useSession } from '@/integrations/supabase/SessionContextProvider';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import VerifiedBadge from '@/components/VerifiedBadge';

const searchSchema = z.object({
  from_country: z.string().optional(),
  to_country: z.string().optional(),
});

type SearchFilters = z.infer<typeof searchSchema>;

const TRIPS_PER_PAGE = 9;

const TripsListSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: 6 }).map((_, i) => (
      <Card key={i} className="flex flex-col">
        <CardHeader>
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    ))}
  </div>
);

const Trips: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const [filters, setFilters] = useState<SearchFilters>({ from_country: 'Iraq' });
  const [currentPage, setCurrentPage] = useState(1);
  const [showHelper, setShowHelper] = useState(false);

  useEffect(() => {
    const key = 'hasSeenHelper_trips';
    const seen = typeof window !== 'undefined'
      ? window.localStorage.getItem(key)
      : 'true';
    if (!seen) {
      setShowHelper(true);
    }
  }, []);

  const dismissHelper = () => {
    setShowHelper(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('hasSeenHelper_trips', 'true');
    }
  };

  const form = useForm<SearchFilters>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      from_country: 'Iraq',
      to_country: '',
    },
  });

  const offset = (currentPage - 1) * TRIPS_PER_PAGE;

  const {
    data: queryResult,
    isLoading,
    error,
  } = useQuery<{ trips: any[]; count: number }, Error>({
    queryKey: ['trips', filters, user?.id, currentPage],
    queryFn: async () => {
      let tripIdsToExclude: string[] = [];

      if (user) {
        // Find trips where the current user has an active request (pending or accepted)
        const { data: activeRequests } = await supabase
          .from('requests')
          .select('trip_id, status')
          .eq('sender_id', user.id)
          .in('status', ['pending', 'accepted']);

        if (activeRequests) {
          tripIdsToExclude = activeRequests.map((r: any) => r.trip_id);
        }
      }

      let query = supabase
        .from('trips')
        .select(
          `
          *,
          profiles (
            first_name,
            last_name,
            is_verified
          )
        `,
          { count: 'exact' },
        );

      // Filtering logic:
      // 1. Must be approved by admin
      // 2. Must not be deleted by user
      // 3. Trip date must be tomorrow or later
      // 4. Must have available weight (free_kg > 0) <-- This is the key filter
      const today = new Date();
      const tomorrow = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1,
      );
      const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

      query = query
        .eq('is_approved', true)
        .eq('is_deleted_by_user', false)
        .gte('trip_date', tomorrowStr)
        .gt('free_kg', 0);

      if (filters.from_country) {
        query = query.eq('from_country', filters.from_country);
      }

      if (filters.to_country) {
        query = query.eq('to_country', filters.to_country);
      }

      // Exclude trips where the user already has an active request
      if (tripIdsToExclude.length > 0) {
        query = query.not('id', 'in', `(${tripIdsToExclude.join(',')})`);
      }

      const { data, error: qError, count } = await query
        .order('trip_date', { ascending: true })
        .range(offset, offset + TRIPS_PER_PAGE - 1);

      if (qError) {
        throw new Error(qError.message);
      }

      return {
        trips: (data || []) as any[],
        count: count || 0,
      };
    },
    enabled: true,
    keepPreviousData: true,
  });

  const trips = queryResult?.trips || [];
  const totalTrips = queryResult?.count || 0;
  const totalPages = Math.ceil(totalTrips / TRIPS_PER_PAGE);

  const onSubmit = (values: SearchFilters) => {
    setFilters(values);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    form.reset({ from_country: 'Iraq', to_country: '' });
    setFilters({ from_country: 'Iraq' });
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <Pagination className="mt-8">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => handlePageChange(currentPage - 1)}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>

          {startPage > 1 && (
            <>
              <PaginationItem>
                <PaginationLink
                  onClick={() => handlePageChange(1)}
                  className="cursor-pointer"
                >
                  1
                </PaginationLink>
              </PaginationItem>
              {startPage > 2 && (
                <PaginationItem>
                  <span className="px-2 py-1 text-sm">...</span>
                </PaginationItem>
              )}
            </>
          )}

          {pageNumbers.map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                onClick={() => handlePageChange(page)}
                isActive={page === currentPage}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <PaginationItem>
                  <span className="px-2 py-1 text-sm">...</span>
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink
                  onClick={() => handlePageChange(totalPages)}
                  className="cursor-pointer"
                >
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}

          <PaginationItem>
            <PaginationNext
              onClick={() => handlePageChange(currentPage + 1)}
              className={
                currentPage === totalPages
                  ? 'pointer-events-none opacity-50'
                  : 'cursor-pointer'
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  const renderContent = () => {
    if (isLoading && !trips.length) {
      return <TripsListSkeleton />;
    }

    if (error) {
      return (
        <p className="text-red-500">
          {t('errorLoadingTrips')}: {error.message}
        </p>
      );
    }

    if (trips.length > 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip: any) => (
            <Link key={trip.id} to={`/trips/${trip.id}`} className="block h-full group">
              <Card className="flex flex-col transition-all duration-300 h-full group-hover:shadow-xl group-hover:-translate-y-1">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Plane className="h-5 w-5 text-primary" />
                        <CountryFlag country={trip.from_country} showName />
                        <span className="text-lg">←</span>
                        <CountryFlag country={trip.to_country} showName />
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(trip.trip_date), 'PPP')}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{trip.profiles?.first_name || 'N/A'}</span>
                    {trip.profiles?.is_verified && <VerifiedBadge />}
                  </div>
                  <div className="border-t pt-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary/80" />
                    <div>
                      <p className="font-semibold">{trip.free_kg} kg</p>
                      <p className="text-xs text-muted-foreground">
                        {t('availableWeight')}
                      </p>
                    </div>
                  </div>
                  {trip.traveler_location && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {trip.traveler_location}
                    </p>
                  )}
                </CardContent>
                <div className="p-4 pt-0 mt-auto">
                  <div className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 bg-primary text-primary-foreground group-hover:bg-primary/90">
                    {t('viewTripAndRequest')}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      );
    }

    return (
      <Card className="text-center p-8 md:p-12">
        <h3 className="text-xl font-semibold">{t('noTripsFound')}</h3>
        <p className="text-muted-foreground mt-2">
          {t('noTripsFoundDescription')}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
          <Link to="/add-trip">
            <Button size="lg">
              <PlusCircle className="mr-2 h-5 w-5" />
              {t('addTrip')}
            </Button>
          </Link>
          <Link to="/place-order">
            <Button size="lg" variant="outline">
              <Package className="mr-2 h-5 w-5" />
              {t('placeOrder')}
            </Button>
          </Link>
        </div>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)]">
      <div className="flex justify-between items-center mb-4 md:mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">{t('trips')}</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {t('searchDescription')}
          </p>
        </div>
        <Link to="/add-trip">
          <Button size="lg">
            <PlusCircle className="mr-2 h-5 w-5" />
            {t('addTrip')}
          </Button>
        </Link>
      </div>

      {showHelper && (
        <div className="mb-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-3 flex items-start gap-2 text-xs md:text-sm">
          <div className="flex-1">
            <p className="font-semibold">نصيحة سريعة</p>
            <p className="text-muted-foreground mt-1">
              تصفّح الرحلات من هنا، ثم افتح تفاصيل الرحلة واضغط &quot;
              {t('viewTripAndRequest')}&quot; لإرسال طلب إلى المسافر.
              لن تظهر لك الرحلات التي لديك طلب نشط عليها بالفعل.
            </p>
          </div>
          <button
            type="button"
            onClick={dismissHelper}
            className={cn(
              'ml-2 mt-1 text-muted-foreground hover:text-foreground transition-colors',
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Card className="mb-2">
        <CardContent className="p-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end"
            >
              <FormField
                control={form.control}
                name="from_country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fromCountry')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectCountry')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((c) => (
                          <SelectItem
                            key={c}
                            value={c}
                            className="flex items-center"
                          >
                            <CountryFlag country={c} showName />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="to_country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('toCountry')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectCountry')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((c) => (
                          <SelectItem
                            key={c}
                            value={c}
                            className="flex items-center"
                          >
                            <CountryFlag country={c} showName />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <div className="flex gap-2 col-span-1 md:col-span-1 lg:col-span-2">
                <Button type="submit" className="w-full">
                  <Search className="mr-2 h-4 w-4" />
                  {t('searchNow')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetFilters}
                  className="w-full"
                >
                  {t('resetFilters')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {user && (
        <p className="text-xs text-muted-foreground mb-4 px-1">
          لن تظهر الرحلات التي لديك طلب نشط عليها بالفعل، وكذلك الرحلات التي
          موعدها اليوم أو أقرب من 24 ساعة، أو التي نفد منها الوزن المتاح.
        </p>
      )}

      {renderContent()}
      {renderPagination()}

      <div className="mt-12 text-center">
        <Link
          to="/place-order"
          className="text-lg font-semibold text-primary hover:text-primary/80 transition-colors underline underline-offset-4 flex items-center justify-center gap-2"
        >
          <Package className="h-5 w-5" />
          {t('cantFindTrip')} {t('placeOrderLink')}
        </Link>
      </div>
    </div>
  );
};

export default Trips;