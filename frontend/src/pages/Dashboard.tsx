import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { statisticsAPI, booksAPI, loansAPI } from '@/services/api';
import { BookOpen, Users, TrendingUp, DollarSign, Book } from 'lucide-react';

export function Dashboard() {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [popularBooks, setPopularBooks] = useState<any[]>([]);
  const [myLoans, setMyLoans] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (user?.role === 'ADMIN' || user?.role === 'LIBRARIAN') {
        const statsRes = await statisticsAPI.getDashboard();
        setStats(statsRes.data);
      }
      
      const [booksRes, loansRes] = await Promise.all([
        booksAPI.getPopular(5),
        loansAPI.getMy(),
      ]);
      
      setPopularBooks(booksRes.data);
      setMyLoans(loansRes.data.filter((loan: any) => loan.status === 'ACTIVE').slice(0, 3));
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

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
            <div className="space-y-4">
              {popularBooks.map((book) => (
                <div
                  key={book.id}
                  className="flex items-center space-x-4 cursor-pointer hover:bg-accent p-2 rounded-lg transition-colors"
                  onClick={() => navigate(`/books/${book.id}`)}
                >
                  <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-muted-foreground" />
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
          </CardContent>
        </Card>

        {/* My Active Loans */}
        <Card>
          <CardHeader>
            <CardTitle>Мої активні позики</CardTitle>
          </CardHeader>
          <CardContent>
            {myLoans.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                У вас немає активних позик
              </p>
            ) : (
              <div className="space-y-4">
                {myLoans.map((loan) => (
                  <div
                    key={loan.id}
                    className="flex items-center space-x-4 p-2 rounded-lg border"
                  >
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
