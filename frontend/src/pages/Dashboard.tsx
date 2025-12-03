import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  statisticsAPI,
  booksAPI,
  loansAPI,
  reservationsAPI,
  finesAPI,
} from '@/services/api';
import {
  BookOpen,
  Users,
  DollarSign,
  Book,
  Clock,
  BellRing,
} from 'lucide-react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

export function Dashboard() {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const filesBaseUrl = (import.meta.env.VITE_API_URL || '').replace('/api', '');
  const [stats, setStats] = useState<any>(null);
  const [popularBooks, setPopularBooks] = useState<any[]>([]);
  const [myLoans, setMyLoans] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [fines, setFines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [popularError, setPopularError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      if (user?.role === 'ADMIN' || user?.role === 'LIBRARIAN') {
        const statsRes = await statisticsAPI.getDashboard();
        setStats(statsRes.data);
      }
      
      const [booksRes, loansRes, reservationsRes, finesRes] = await Promise.allSettled([
        booksAPI.getPopular(5),
        loansAPI.getMy(),
        reservationsAPI.getMy(),
        finesAPI.getMy(),
      ]);

      if (booksRes.status === 'fulfilled') {
        setPopularBooks(booksRes.value.data || []);
        setPopularError(null);
      } else {
        setPopularBooks([]);
        setPopularError('Недоступно');
      }

      if (loansRes.status === 'fulfilled') {
        setMyLoans(loansRes.value.data || []);
      }

      if (reservationsRes.status === 'fulfilled') {
        setReservations(reservationsRes.value.data || []);
      }

      if (finesRes.status === 'fulfilled') {
        setFines(finesRes.value.data || []);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const readerStats = useMemo(() => {
    const activeLoans = myLoans.filter((loan) => loan.status === 'ACTIVE')
      .length;
    const overdueLoans = myLoans.filter((loan) => loan.status === 'OVERDUE')
      .length;
    const readyReservations = reservations.filter(
      (r) => r.status === 'READY',
    ).length;
    const pendingReservations = reservations.filter(
      (r) => r.status === 'PENDING',
    ).length;
    const pendingFines = fines.filter((f) => f.status === 'PENDING').length;
    const pendingFinesAmount = fines
      .filter((f) => f.status === 'PENDING')
      .reduce((sum, fine) => sum + Number(fine.amount || 0), 0);

    const nextDueDate = myLoans
      .filter((loan) => loan.status === 'ACTIVE')
      .map((loan) => loan.dueDate)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

    return {
      activeLoans,
      overdueLoans,
      readyReservations,
      pendingReservations,
      pendingFines,
      pendingFinesAmount,
      nextDueDate,
    };
  }, [fines, myLoans, reservations]);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'LIBRARIAN';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Вітаємо, {user?.firstName}!
        </h1>
        <p className="text-muted-foreground">
          Ось що відбувається у вашій бібліотеці сьогодні
        </p>
      </div>

      {/* Reader quick stats */}
      {!isAdmin && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Активні позики</CardTitle>
              <Book className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{readerStats.activeLoans}</div>
              <p className="text-xs text-muted-foreground">
                {readerStats.overdueLoans} прострочено
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Бронювання</CardTitle>
              <BellRing className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {readerStats.readyReservations}
              </div>
              <p className="text-xs text-muted-foreground">
                {readerStats.pendingReservations} очікує на примірник
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Штрафи</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{readerStats.pendingFines}</div>
              <p className="text-xs text-muted-foreground">
                {readerStats.pendingFinesAmount > 0
                  ? `${readerStats.pendingFinesAmount} грн очікує оплати`
                  : 'немає заборгованостей'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Наступне повернення</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {readerStats.nextDueDate
                  ? format(new Date(readerStats.nextDueDate), 'dd MMM yyyy', {
                      locale: uk,
                    })
                  : 'Немає'}
              </div>
              <p className="text-xs text-muted-foreground">
                слідкуйте за термінами
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats for Admin/Librarian */}
      {isAdmin && stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всього книг</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBooks}</div>
              <p className="text-xs text-muted-foreground">
                {stats.availableBooks} доступно
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Активні позики</CardTitle>
              <Book className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeLoans}</div>
              <p className="text-xs text-muted-foreground">
                {stats.overdueLoans} прострочено
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Користувачі</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeUsers} активних
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Дохід</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRevenue} грн</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingFines} грн очікується
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Popular Books */}
        <Card>
          <CardHeader>
            <CardTitle>Популярні книги</CardTitle>
          </CardHeader>
          <CardContent>
            {popularError ? (
              <p className="text-sm text-muted-foreground">
                Популярні книги недоступні зараз (404)
              </p>
            ) : popularBooks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ще немає популярних книг
              </p>
            ) : (
              <div className="space-y-4">
                {popularBooks.map((book) => (
                  <div
                    key={book.id}
                    className="flex items-center space-x-4 cursor-pointer hover:bg-accent p-2 rounded-lg transition-colors"
                    onClick={() => navigate(`/books/${book.id}`)}
                  >
                    <div className="w-12 h-16 bg-muted rounded overflow-hidden flex items-center justify-center">
                      {book.coverImage ? (
                        <img
                          src={filesBaseUrl + book.coverImage}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BookOpen className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{book.title}</p>
                      <p className="text-xs text-muted-foreground">{book.author}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{book.borrowCount}</p>
                      <p className="text-xs text-muted-foreground">позик</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Active Loans */}
        <Card>
          <CardHeader>
            <CardTitle>Мої активні позики</CardTitle>
          </CardHeader>
          <CardContent>
            {myLoans.filter((loan) => loan.status === 'ACTIVE').length === 0 ? (
              <p className="text-sm text-muted-foreground">
                У вас немає активних позик
              </p>
            ) : (
              <div className="space-y-4">
                {myLoans
                  .filter((loan) => loan.status === 'ACTIVE')
                  .slice(0, 3)
                  .map((loan) => (
                    <div
                      key={loan.id}
                      className="flex items-center space-x-4 p-2 rounded-lg border"
                    >
                      <div className="w-12 h-16 bg-muted rounded overflow-hidden flex items-center justify-center">
                        {loan.book.coverImage ? (
                          <img
                            src={filesBaseUrl + loan.book.coverImage}
                            alt={loan.book.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <BookOpen className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{loan.book.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Повернути до:{' '}
                          {new Date(loan.dueDate).toLocaleDateString('uk-UA')}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
