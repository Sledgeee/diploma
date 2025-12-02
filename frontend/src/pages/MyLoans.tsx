import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loansAPI, finesAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  BookOpen,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Loader2,
  RotateCw,
} from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { uk } from 'date-fns/locale';

interface Loan {
  id: string;
  bookId: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE';
  book: {
    id: string;
    title: string;
    author: string;
    coverImage?: string;
  };
  fine?: {
    id: string;
    amount: number;
    status: string;
  };
}

interface Fine {
  id: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'WAIVED';
  reason: string;
  createdAt: string;
  loan: {
    book: {
      title: string;
      author: string;
    };
  };
}

export function MyLoans() {
  const navigate = useNavigate();
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [overdueLoans, setOverdueLoans] = useState<Loan[]>([]);
  const [history, setHistory] = useState<Loan[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [activeRes, overdueRes, historyRes, finesRes] = await Promise.all([
        loansAPI.getMy('ACTIVE'),
        loansAPI.getMy('OVERDUE'),
        loansAPI.getMy('RETURNED'),
        finesAPI.getMy(),
      ]);

      setActiveLoans(activeRes.data);
      setOverdueLoans(overdueRes.data);
      setHistory(historyRes.data);
      setFines(finesRes.data);
    } catch (error) {
      toast.error('Помилка завантаження даних');
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!selectedLoan) return;

    try {
      setActionLoading(selectedLoan.id);
      await loansAPI.return(selectedLoan.id);
      toast.success('Книгу повернено успішно!');
      setReturnDialogOpen(false);
      setSelectedLoan(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка повернення книги');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExtend = async (loanId: string) => {
    try {
      setActionLoading(loanId);
      await loansAPI.extend(loanId, 7);
      toast.success('Термін позики продовжено на 7 днів!');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка продовження терміну');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePayFine = async (fineId: string) => {
    try {
      setActionLoading(fineId);
      await finesAPI.pay(fineId);
      toast.success('Штраф оплачено!');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка оплати штрафу');
    } finally {
      setActionLoading(null);
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    return differenceInDays(new Date(dueDate), new Date());
  };

  const getDueDateColor = (dueDate: string) => {
    const days = getDaysUntilDue(dueDate);
    if (days < 0) return 'text-red-600';
    if (days <= 3) return 'text-orange-600';
    return 'text-green-600';
  };

  const LoanCard = ({ loan, showActions = true }: { loan: Loan; showActions?: boolean }) => {
    const daysUntil = getDaysUntilDue(loan.dueDate);
    const isOverdue = daysUntil < 0;

    return (
      <Card className={isOverdue ? 'border-red-300' : ''}>
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Book cover */}
            <div
              className="w-20 h-28 bg-muted rounded flex-shrink-0 flex items-center justify-center cursor-pointer"
              onClick={() => navigate(`/books/${loan.bookId}`)}
            >
              {loan.book.coverImage ? (
                <img
                  src={import.meta.env.VITE_API_URL?.replace('/api', '') + loan.book.coverImage}
                  alt={loan.book.title}
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3
                className="font-semibold line-clamp-2 cursor-pointer hover:text-primary"
                onClick={() => navigate(`/books/${loan.bookId}`)}
              >
                {loan.book.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {loan.book.author}
              </p>

              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Взято:</span>
                  <span>
                    {format(new Date(loan.borrowDate), 'dd MMM yyyy', {
                      locale: uk,
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {loan.returnDate ? 'Повернено:' : 'Повернути до:'}
                  </span>
                  <span
                    className={
                      loan.returnDate
                        ? ''
                        : getDueDateColor(loan.dueDate) + ' font-semibold'
                    }
                  >
                    {format(
                      new Date(loan.returnDate || loan.dueDate),
                      'dd MMM yyyy',
                      { locale: uk }
                    )}
                  </span>
                  {!loan.returnDate && !isOverdue && daysUntil <= 3 && (
                    <span className="text-xs text-orange-600">
                      (залишилось {daysUntil} дн.)
                    </span>
                  )}
                  {isOverdue && (
                    <span className="text-xs text-red-600 font-semibold">
                      (прострочено на {Math.abs(daysUntil)} дн.)
                    </span>
                  )}
                </div>

                {/* Fine info */}
                {loan.fine && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-600 font-medium">
                      Штраф: {loan.fine.amount} грн
                    </span>
                    {loan.fine.status === 'PENDING' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="ml-auto"
                        onClick={() => handlePayFine(loan.fine!.id)}
                        disabled={actionLoading === loan.fine!.id}
                      >
                        {actionLoading === loan.fine!.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Оплатити'
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              {showActions && (
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedLoan(loan);
                      setReturnDialogOpen(true);
                    }}
                    disabled={actionLoading === loan.id}
                  >
                    {actionLoading === loan.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Повернути
                  </Button>

                  {!isOverdue && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExtend(loan.id)}
                      disabled={actionLoading === loan.id}
                    >
                      <RotateCw className="h-4 w-4 mr-2" />
                      Продовжити
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const FineCard = ({ fine }: { fine: Fine }) => {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold mb-1">{fine.loan.book.title}</h4>
              <p className="text-sm text-muted-foreground mb-2">
                {fine.loan.book.author}
              </p>
              <p className="text-sm text-muted-foreground">{fine.reason}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(fine.createdAt), 'dd MMM yyyy', { locale: uk })}
              </p>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold text-red-600 mb-2">
                {fine.amount} грн
              </div>
              {fine.status === 'PENDING' ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handlePayFine(fine.id)}
                  disabled={actionLoading === fine.id}
                >
                  {actionLoading === fine.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Оплатити'
                  )}
                </Button>
              ) : (
                <span className="text-sm text-green-600 font-medium">
                  {fine.status === 'PAID' ? 'Оплачено' : 'Анульовано'}
                </span>
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

  const totalPendingFines = fines
    .filter((f) => f.status === 'PENDING')
    .reduce((sum, f) => sum + Number(f.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Мої позики</h1>
        <p className="text-muted-foreground">
          Керуйте своїми позиками та відстежуйте терміни повернення
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активних</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLoans.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Прострочено</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {overdueLoans.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всього прочитано</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{history.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Штрафи</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {totalPendingFines} грн
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Активні ({activeLoans.length})
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Прострочені ({overdueLoans.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Історія ({history.length})
          </TabsTrigger>
          <TabsTrigger value="fines">
            Штрафи ({fines.filter((f) => f.status === 'PENDING').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeLoans.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  У вас немає активних позик
                </p>
                <Button
                  className="mt-4"
                  onClick={() => navigate('/books')}
                >
                  Знайти книги
                </Button>
              </CardContent>
            </Card>
          ) : (
            activeLoans.map((loan) => <LoanCard key={loan.id} loan={loan} />)
          )}
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          {overdueLoans.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <p className="text-muted-foreground">
                  У вас немає прострочених книг. Чудова робота! 🎉
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <p className="text-sm text-red-600 font-medium">
                    Будь ласка, поверніть прострочені книги якнайшвидше!
                  </p>
                </div>
              </div>
              {overdueLoans.map((loan) => (
                <LoanCard key={loan.id} loan={loan} />
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {history.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Історія позик порожня
                </p>
              </CardContent>
            </Card>
          ) : (
            history.map((loan) => (
              <LoanCard key={loan.id} loan={loan} showActions={false} />
            ))
          )}
        </TabsContent>

        <TabsContent value="fines" className="space-y-4">
          {fines.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <p className="text-muted-foreground">
                  У вас немає штрафів. Відмінно! 👏
                </p>
              </CardContent>
            </Card>
          ) : (
            fines.map((fine) => <FineCard key={fine.id} fine={fine} />)
          )}
        </TabsContent>
      </Tabs>

      {/* Return confirmation dialog */}
      <AlertDialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Підтвердження повернення</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете повернути книгу "{selectedLoan?.book.title}"?
              {selectedLoan && isPast(new Date(selectedLoan.dueDate)) && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">
                    Увага! Книга прострочена. Буде нараховано штраф.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleReturn}>
              Підтвердити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}