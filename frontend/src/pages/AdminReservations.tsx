import { useEffect, useMemo, useState } from 'react';
import { reservationsAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, User, BookOpen, AlarmClock, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { toast } from 'sonner';

type ReservationStatus = 'PENDING' | 'READY' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

interface AdminReservation {
  id: string;
  status: ReservationStatus;
  expiryDate: string;
  createdAt: string;
  book: {
    id: string;
    title: string;
    author: string;
    coverImage?: string;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

const statusLabels: Record<ReservationStatus, string> = {
  READY: 'Готово',
  PENDING: 'Очікує',
  COMPLETED: 'Завершено',
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

export function AdminReservations() {
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const filesBaseUrl = (import.meta.env.VITE_API_URL || '').replace('/api', '');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (status?: ReservationStatus) => {
    try {
      setLoading(true);
      const res = await reservationsAPI.getAll(1, 50, status);
      setReservations(res.data.reservations || res.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не вдалося завантажити бронювання');
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo(() => {
    return {
      ready: reservations.filter((r) => r.status === 'READY'),
      pending: reservations.filter((r) => r.status === 'PENDING'),
      expired: reservations.filter((r) => r.status === 'EXPIRED'),
      completed: reservations.filter((r) => r.status === 'COMPLETED'),
    };
  }, [reservations]);

  const handleStatus = async (id: string, status: ReservationStatus, label: string) => {
    try {
      setActionLoading(id);
      await reservationsAPI.updateStatus(id, status);
      toast.success(label);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка оновлення статусу');
    } finally {
      setActionLoading(null);
    }
  };

  const ReservationRow = ({ reservation }: { reservation: AdminReservation }) => (
    <div className="flex items-start gap-4 p-3 border rounded-lg">
      <div className="w-12 h-16 bg-muted rounded overflow-hidden flex items-center justify-center">
        {reservation.book.coverImage ? (
          <img
            src={filesBaseUrl + reservation.book.coverImage}
            alt={reservation.book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <BookOpen className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-semibold truncate">{reservation.book.title}</p>
            <p className="text-xs text-muted-foreground">{reservation.book.author}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${statusBadge[reservation.status]}`}>
            {statusLabels[reservation.status]}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <User className="h-3 w-3" />
          <span>
            {reservation.user.firstName} {reservation.user.lastName} ({reservation.user.email})
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Створено: {format(new Date(reservation.createdAt), 'dd MMM yyyy, HH:mm', { locale: uk })}
        </p>
        {reservation.status === 'READY' && (
          <p className="text-xs text-green-700 mt-1">
            Забрати до {format(new Date(reservation.expiryDate), 'dd MMM yyyy', { locale: uk })}
          </p>
        )}

        <div className="flex gap-2 mt-2 flex-wrap">
          {reservation.status === 'PENDING' && (
            <Button
              size="sm"
              onClick={() => handleStatus(reservation.id, 'READY', 'Позначено готовою')}
              disabled={actionLoading === reservation.id}
            >
              {actionLoading === reservation.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Готово
            </Button>
          )}
          {reservation.status === 'READY' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatus(reservation.id, 'EXPIRED', 'Позначено простроченим')}
                disabled={actionLoading === reservation.id}
              >
                {actionLoading === reservation.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <AlarmClock className="h-4 w-4 mr-2" />
                )}
                Прострочено
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleStatus(reservation.id, 'CANCELLED', 'Бронювання скасовано')}
                disabled={actionLoading === reservation.id}
              >
                {actionLoading === reservation.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Скасувати
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Управління бронюваннями</h1>
          <p className="text-muted-foreground">
            Переглядайте активні та очікувані бронювання користувачів
          </p>
        </div>
        <Button variant="outline" onClick={() => loadData()}>
          Оновити
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Готові</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{grouped.ready.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Очікують</CardTitle>
            <AlarmClock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{grouped.pending.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Прострочені</CardTitle>
            <AlarmClock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{grouped.expired.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Завершені</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{grouped.completed.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Бронювання користувачів</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="ready" className="space-y-4">
            <TabsList>
            <TabsTrigger value="ready" onClick={() => loadData('READY')}>
              Готові ({grouped.ready.length})
            </TabsTrigger>
              <TabsTrigger value="pending" onClick={() => loadData('PENDING')}>
                Очікують ({grouped.pending.length})
              </TabsTrigger>
              <TabsTrigger value="expired" onClick={() => loadData('EXPIRED')}>
                Прострочені ({grouped.expired.length})
              </TabsTrigger>
              <TabsTrigger value="completed" onClick={() => loadData('COMPLETED')}>
                Завершені ({grouped.completed.length})
              </TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <TabsContent value="ready" className="space-y-3">
                  {grouped.ready.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Немає готових бронювань</p>
                  ) : (
                    grouped.ready.map((r) => <ReservationRow key={r.id} reservation={r} />)
                  )}
                </TabsContent>

                <TabsContent value="pending" className="space-y-3">
                  {grouped.pending.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Немає очікуючих бронювань</p>
                  ) : (
                    grouped.pending.map((r) => <ReservationRow key={r.id} reservation={r} />)
                  )}
                </TabsContent>

                <TabsContent value="expired" className="space-y-3">
                  {grouped.expired.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Немає прострочених бронювань</p>
                  ) : (
                    grouped.expired.map((r) => <ReservationRow key={r.id} reservation={r} />)
                  )}
                </TabsContent>

                <TabsContent value="completed" className="space-y-3">
                  {grouped.completed.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Немає завершених бронювань</p>
                  ) : (
                    grouped.completed.map((r) => <ReservationRow key={r.id} reservation={r} />)
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
