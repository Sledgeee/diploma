import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { statisticsAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import {
  BookOpen,
  Users,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Library,
  Star,
  Calendar,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function Statistics() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<any>(null);
  const [popularGenres, setPopularGenres] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
  const [topReaders, setTopReaders] = useState<any[]>([]);
  const [overdueBooks, setOverdueBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const [dashRes, genresRes, monthlyRes, readersRes, overdueRes] =
        await Promise.all([
          statisticsAPI.getDashboard(),
          statisticsAPI.getPopularGenres(5),
          statisticsAPI.getMonthly(6),
          statisticsAPI.getTopReaders(10),
          statisticsAPI.getOverdueBooks(),
        ]);

      setDashboard(dashRes.data);
      setPopularGenres(genresRes.data);
      setMonthlyStats(monthlyRes.data);
      setTopReaders(readersRes.data);
      setOverdueBooks(overdueRes.data);
    } catch (error) {
      toast.error('Помилка завантаження статистики');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Статистика</h1>
        <p className="text-muted-foreground">
          Огляд роботи бібліотеки та аналітика
        </p>
      </div>

      {/* Dashboard stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всього книг</CardTitle>
            <Library className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.totalBooks}</div>
            <p className="text-xs text-muted-foreground">
              {dashboard.availableBooks} доступно зараз
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Користувачі
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {dashboard.activeUsers} активних
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Активні позики
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.activeLoans}</div>
            <p className="text-xs text-red-600">
              {dashboard.overdueLoans} прострочено
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Дохід</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(dashboard.totalRevenue).toFixed(2)} грн
            </div>
            <p className="text-xs text-muted-foreground">
              {Number(dashboard.pendingFines).toFixed(2)} грн очікується
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Огляд</TabsTrigger>
          <TabsTrigger value="genres">Жанри</TabsTrigger>
          <TabsTrigger value="readers">Читачі</TabsTrigger>
          <TabsTrigger value="overdue">Прострочення</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Динаміка позик за 6 місяців</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="loans"
                    stroke="#3b82f6"
                    name="Позики"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="registrations"
                    stroke="#10b981"
                    name="Реєстрації"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ключові показники</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Відгуків</span>
                  </div>
                  <span className="text-lg font-bold">
                    {dashboard.totalReviews}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Бронювань</span>
                  </div>
                  <span className="text-lg font-bold">
                    {dashboard.pendingReservations}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Всього позик</span>
                  </div>
                  <span className="text-lg font-bold">
                    {dashboard.activeLoans + dashboard.overdueLoans}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Статус позик</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: 'Активні',
                          value: dashboard.activeLoans,
                        },
                        {
                          name: 'Прострочені',
                          value: dashboard.overdueLoans,
                        },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Genres */}
        <TabsContent value="genres" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Топ-5 жанрів</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={popularGenres}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="genre" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="totalBorrows"
                    fill="#3b82f6"
                    name="Позик"
                  />
                  <Bar
                    dataKey="booksCount"
                    fill="#10b981"
                    name="Книг"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Деталі жанрів</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {popularGenres.map((genre, index) => (
                  <div
                    key={genre.genre}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{genre.genre}</p>
                        <p className="text-sm text-muted-foreground">
                          {genre.booksCount} книг · Рейтинг:{' '}
                          {genre.averageRating}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {genre.totalBorrows}
                      </p>
                      <p className="text-xs text-muted-foreground">позик</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Readers */}
        <TabsContent value="readers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Топ-10 читачів</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topReaders.map((reader, index) => (
                  <div
                    key={reader.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => navigate(`/users/${reader.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                          index < 3
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">
                          {reader.firstName} {reader.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {reader.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{reader.booksRead}</p>
                      <p className="text-xs text-muted-foreground">книг</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overdue books */}
        <TabsContent value="overdue" className="space-y-4">
          {overdueBooks.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <p className="text-muted-foreground">
                  Немає прострочених книг! 🎉
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <p className="text-sm text-red-600 font-medium">
                    {overdueBooks.length} книг прострочено
                  </p>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Список прострочених позик</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {overdueBooks.map((item) => (
                      <div
                        key={item.loanId}
                        className="p-4 border border-red-200 rounded-lg bg-red-50/50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold">{item.book.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.book.author}
                            </p>
                            <div className="mt-2 space-y-1">
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  Користувач:
                                </span>{' '}
                                {item.user.firstName} {item.user.lastName}
                              </p>
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  Email:
                                </span>{' '}
                                {item.user.email}
                              </p>
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  Термін повернення:
                                </span>{' '}
                                {format(new Date(item.dueDate), 'dd MMM yyyy', {
                                  locale: uk,
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-red-600">
                              {item.daysOverdue}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              днів
                            </p>
                            {item.fine && (
                              <div className="mt-2 px-2 py-1 bg-red-100 rounded text-sm font-medium text-red-700">
                                {item.fine.amount} грн
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}