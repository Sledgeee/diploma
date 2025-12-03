import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reservationsAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  AlarmClock,
  AlarmClockOff,
  BellRing,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock3,
  Loader2,
  XCircle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';

type ReservationStatus =
  | 'PENDING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

interface Reservation {
  id: string;
  status: ReservationStatus;
  expiryDate: string;
  createdAt: string;
  bookId: string;
  book: {
    id: string;
    title: string;
    author: string;
    coverImage?: string;
  };
}

const statusLabels: Record<ReservationStatus, string> = {
  READY: 'Готово до видачі',
  PENDING: 'В очікуванні',
  COMPLETED: 'Отримано',
  CANCELLED: 'Скасовано',
  EXPIRED: 'Прострочено',
};

const statusBadge: Record<ReservationStatus, string> = {
  READY: 'bg-green-100 text-green-700',
  PENDING: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
  EXPIRED: 'bg-red-100 text-red-700',
};

const FILES_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(
  '/api',
  '',
);

export function MyReservations() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const response = await reservationsAPI.getMy();
      setReservations(response.data);
    } catch (error) {
      toast.error('Не вдалося завантажити бронювання');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      setActionLoading(id);
      await reservationsAPI.cancel(id);
      toast.success('Бронювання скасовано');
      loadReservations();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Не вдалося скасувати бронювання',
      );
    } finally {
      setActionLoading(null);
    }
  };

  const groups = useMemo(() => {
    return {
      ready: reservations.filter((r) => r.status === 'READY'),
      pending: reservations.filter((r) => r.status === 'PENDING'),
      history: reservations.filter((r) =>
        ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(r.status),
      ),
    };
  }, [reservations]);

  const ReservationCard = ({ reservation }: { reservation: Reservation }) => {
    const expiresIn =
      reservation.status === 'READY'
        ? formatDistanceToNow(new Date(reservation.expiryDate), {
            addSuffix: true,
            locale: uk,
          })
        : null;

    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div
              className="w-20 h-28 bg-muted rounded flex-shrink-0 flex items-center justify-center cursor-pointer"
              onClick={() => navigate(`/books/${reservation.bookId}`)}
            >
              {reservation.book.coverImage ? (
                <img
                  src={FILES_BASE_URL + reservation.book.coverImage}
                  alt={reservation.book.title}
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 justify-between">
                <div>
                  <h3
                    className="font-semibold line-clamp-2 cursor-pointer hover:text-primary"
                    onClick={() => navigate(`/books/${reservation.bookId}`)}
                  >
                    {reservation.book.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {reservation.book.author}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${statusBadge[reservation.status]}`}
                >
                  {statusLabels[reservation.status]}
                </span>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Створено:{' '}
                    {format(new Date(reservation.createdAt), 'dd MMM yyyy', {
                      locale: uk,
                    })}
                  </span>
                </div>

                {reservation.status === 'READY' && (
                  <div className="flex items-center gap-2">
                    <AlarmClock className="h-4 w-4 text-green-600" />
                    <span className="text-green-700 font-medium">
                      Заберіть до{' '}
                      {format(new Date(reservation.expiryDate), 'dd MMM yyyy', {
                        locale: uk,
                      })}
                      {expiresIn && (
                        <span className="ml-2 text-xs text-green-700">
                          ({expiresIn})
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {reservation.status === 'PENDING' && (
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-amber-600" />
                    <span className="text-amber-700">
                      Очікує на доступний примірник
                    </span>
                  </div>
                )}

                {reservation.status === 'EXPIRED' && (
                  <div className="flex items-center gap-2">
                    <AlarmClockOff className="h-4 w-4 text-red-600" />
                    <span className="text-red-600">Термін бронювання минув</span>
                  </div>
                )}
              </div>

              {['READY', 'PENDING'].includes(reservation.status) && (
                <div className="flex gap-2 pt-2">
                  {reservation.status === 'READY' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => navigate(`/books/${reservation.bookId}`)}
                    >
                      <BellRing className="h-4 w-4 mr-2" />
                      Отримати
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel(reservation.id)}
                    disabled={actionLoading === reservation.id}
                  >
                    {actionLoading === reservation.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Скасувати
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Мої бронювання</h1>
        <p className="text-muted-foreground">
          Відстежуйте статус бронювань та отримуйте книги, коли вони готові
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Готові</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {groups.ready.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">В очікуванні</CardTitle>
            <Clock3 className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">
              {groups.pending.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Історія</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups.history.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ready" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ready">
            Готові ({groups.ready.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Очікують ({groups.pending.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Історія ({groups.history.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ready" className="space-y-4">
          {groups.ready.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center space-y-2">
                <BellRing className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">
                  Немає готових до видачі бронювань
                </p>
              </CardContent>
            </Card>
          ) : (
            groups.ready.map((reservation) => (
              <ReservationCard key={reservation.id} reservation={reservation} />
            ))
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {groups.pending.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center space-y-2">
                <AlarmClock className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">
                  Немає активних бронювань
                </p>
              </CardContent>
            </Card>
          ) : (
            groups.pending.map((reservation) => (
              <ReservationCard key={reservation.id} reservation={reservation} />
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {groups.history.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center space-y-2">
                <XCircle className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Історія порожня</p>
              </CardContent>
            </Card>
          ) : (
            groups.history.map((reservation) => (
              <ReservationCard key={reservation.id} reservation={reservation} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
