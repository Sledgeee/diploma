import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { booksAPI, loansAPI, reservationsAPI, reviewsAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  BookOpen,
  Star,
  Calendar,
  User,
  Building,
  Hash,
  ArrowLeft,
  Trash2,
  Edit,
  BookMarked,
  BellRing,
} from 'lucide-react';
import { toast } from 'sonner';
import { EditBookDialog } from '@/components/books/EditBookDialog';

interface BookDetails {
  id: string;
  title: string;
  author: string;
  isbn: string;
  publisher?: string;
  publishYear?: number;
  description?: string;
  coverImage?: string;
  genres: string[];
  totalCopies: number;
  availableCopies: number;
  averageRating: number;
  borrowCount: number;
  reviews?: Array<{
    id: string;
    rating: number;
    comment?: string;
    createdAt: string;
    user: {
      firstName: string;
      lastName: string;
    };
  }>;
}

export function BookDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [book, setBook] = useState<BookDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [borrowing, setBorrowing] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'LIBRARIAN';

  useEffect(() => {
    if (id) {
      loadBook();
    }
  }, [id]);

  const loadBook = async () => {
    try {
      setLoading(true);
      const response = await booksAPI.getOne(id!);
      setBook(response.data);
    } catch (error) {
      toast.error('Помилка завантаження книги');
      navigate('/books');
    } finally {
      setLoading(false);
    }
  };

  const handleBorrow = async () => {
    if (!book) return;

    try {
      setBorrowing(true);
      await loansAPI.borrow(book.id);
      toast.success('Книгу успішно позичено!');
      loadBook(); // Перезавантажити дані
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка позики книги');
    } finally {
      setBorrowing(false);
    }
  };

  const handleReserve = async () => {
    if (!book) return;

    try {
      setReserving(true);
      await reservationsAPI.create(book.id);
      toast.success('Книгу додано до списку бронювань. Ми сповістимо вас!');
      loadBook();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Не вдалося забронювати книгу',
      );
    } finally {
      setReserving(false);
    }
  };

  const handleDelete = async () => {
    if (!book) return;

    try {
      setDeleting(true);
      await booksAPI.delete(book.id);
      toast.success('Книгу успішно видалено');
      navigate('/books');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка видалення книги');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Завантаження...</p>
      </div>
    );
  }

  if (!book) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/books')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад до каталогу
        </Button>

        {isAdmin && (
          <div className="flex gap-2">
            <EditBookDialog
              bookId={book.id}
              onBookUpdated={loadBook}
              trigger={
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Редагувати
                </Button>
              }
            />
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Видалити
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left: Book Cover & Actions */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="aspect-[3/4] bg-muted rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                {book.coverImage ? (
                  <img
                    src={import.meta.env.VITE_API_URL.replace('/api', '') + book.coverImage}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen className="h-24 w-24 text-muted-foreground" />
                )}
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 mr-1" />
                  <span className="text-lg font-semibold">
                    {Number(book.averageRating).toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">
                    ({book.reviews?.length || 0})
                  </span>
                </div>
                <Badge
                  variant={book.availableCopies > 0 ? 'default' : 'destructive'}
                >
                  {book.availableCopies > 0
                    ? `${book.availableCopies} доступно`
                    : 'Недоступна'}
                </Badge>
              </div>

              {user?.role === 'READER' && (
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    disabled={book.availableCopies === 0 || borrowing}
                    onClick={handleBorrow}
                  >
                    <BookMarked className="h-4 w-4 mr-2" />
                    {borrowing ? 'Позичення...' : 'Позичити книгу'}
                  </Button>

                  {book.availableCopies === 0 && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handleReserve}
                      disabled={reserving}
                    >
                      <BellRing className="h-4 w-4 mr-2" />
                      {reserving ? 'Бронювання...' : 'Забронювати книгу'}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Статистика</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Всього копій:</span>
                <span className="font-medium">{book.totalCopies}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Позик:</span>
                <span className="font-medium">{book.borrowCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Book Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Title & Meta */}
          <div>
            <h1 className="text-3xl font-bold mb-2">{book.title}</h1>
            <div className="space-y-2 text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{book.author}</span>
              </div>
              {book.publisher && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <span>{book.publisher}</span>
                </div>
              )}
              {book.publishYear && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{book.publishYear}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                <span>ISBN: {book.isbn}</span>
              </div>
            </div>
          </div>

          {/* Genres */}
          {book.genres && book.genres.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Жанри</h3>
              <div className="flex flex-wrap gap-2">
                {book.genres.map((genre) => (
                  <Badge key={genre} variant="secondary">
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {book.description && (
            <Card>
              <CardHeader>
                <CardTitle>Опис</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {book.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Reviews */}
          {book.reviews && book.reviews.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Відгуки ({book.reviews.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {book.reviews.map((review) => (
                  <div key={review.id} className="border-b last:border-0 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {review.user.firstName} {review.user.lastName}
                        </span>
                        <div className="flex items-center">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString('uk-UA')}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">
                        {review.comment}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити книгу?</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете видалити книгу{' '}
              <span className="font-semibold">{book.title}</span>?
              <br />
              <br />
              Ця дія незворотна і видалить всі пов'язані дані (позики,
              резервації, відгуки).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Видалення...' : 'Видалити'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
