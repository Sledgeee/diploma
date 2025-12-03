import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { booksAPI } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, BookOpen, Star, MoreVertical, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { EditBookDialog } from '@/components/books/EditBookDialog';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  coverImage?: string;
  availableCopies: number;
  averageRating: number;
}

export function Books() {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'LIBRARIAN';
  const filesBaseUrl = (import.meta.env.VITE_API_URL || '').replace('/api', '');
  const pageSize = isAdmin ? 10 : 12;

  useEffect(() => {
    loadBooks();
  }, [page, pageSize]);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const response = await booksAPI.getAll(page, pageSize);
      setBooks(response.data.books);
      setTotal(response.data.total);
    } catch (error) {
      toast.error('Помилка завантаження книг');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadBooks();
      return;
    }

    try {
      setLoading(true);
      const response = await booksAPI.search(searchQuery, page, pageSize);
      setBooks(response.data.books);
      setTotal(response.data.total);
    } catch (error) {
      toast.error('Помилка пошуку');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (book: Book) => {
    setBookToDelete(book);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!bookToDelete) return;

    try {
      setDeleting(true);
      await booksAPI.delete(bookToDelete.id);
      toast.success(`Книгу "${bookToDelete.title}" успішно видалено`);
      setDeleteDialogOpen(false);
      setBookToDelete(null);
      
      // Перезавантажуємо список книг
      loadBooks();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка видалення книги');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {editingBookId && (
        <EditBookDialog
          bookId={editingBookId}
          open={!!editingBookId}
          onOpenChange={(open) => {
            if (!open) setEditingBookId(null);
          }}
          onBookUpdated={() => {
            loadBooks();
            setEditingBookId(null);
          }}
        />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Каталог книг</h1>
          <p className="text-muted-foreground">
            Знайдіть свою наступну улюблену книгу
          </p>
        </div>
        
        {isAdmin && (
          <Button onClick={() => navigate('/books/new')}>
            Додати книгу
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Пошук за назвою, автором або ISBN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch}>
          <Search className="h-4 w-4 mr-2" />
          Шукати
        </Button>
      </div>

      {/* Books */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Завантаження...</p>
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Книги не знайдено</p>
        </div>
      ) : (
        <>
          {isAdmin ? (
            <div className="space-y-3">
              {books.map((book) => (
                <Card key={book.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-14 h-20 bg-muted rounded overflow-hidden flex items-center justify-center cursor-pointer"
                      onClick={() => navigate(`/books/${book.id}`)}
                    >
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3
                          className="font-semibold cursor-pointer hover:text-primary"
                          onClick={() => navigate(`/books/${book.id}`)}
                        >
                          {book.title}
                        </h3>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            book.availableCopies > 0
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {book.availableCopies > 0 ? 'Доступна' : 'Недоступна'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {book.author}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ISBN: {book.isbn}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                          <span>{Number(book.averageRating).toFixed(1)}</span>
                        </div>
                        <span className="text-muted-foreground">
                          Доступно: {book.availableCopies}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => {
                              setEditingBookId(book.id);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Редагувати
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(book)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Видалити
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {books.map((book) => (
                <Card key={book.id} className="group relative">
                  <CardContent className="p-4">
                    <div
                      className="cursor-pointer"
                      onClick={() => navigate(`/books/${book.id}`)}
                    >
                      <div className="aspect-[3/4] bg-muted rounded-lg mb-4 flex items-center justify-center">
                        {book.coverImage ? (
                          <img
                            src={filesBaseUrl + book.coverImage}
                            alt={book.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <BookOpen className="h-12 w-12 text-muted-foreground" />
                        )}
                      </div>
                      <h3 className="font-semibold line-clamp-2 mb-1">
                        {book.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {book.author}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                          <span className="text-sm">
                            {Number(book.averageRating).toFixed(1)}
                          </span>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            book.availableCopies > 0
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {book.availableCopies > 0 ? 'Доступна' : 'Недоступна'}
                        </span>
                      </div>
                    </div>

                    {/* Admin Actions */}
                    {isAdmin && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onSelect={() => {
                                  setEditingBookId(book.id);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Редагувати
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(book);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Видалити
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Попередня
            </Button>
            <Button variant="outline" disabled>
              Сторінка {page}
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * pageSize >= total}
            >
              Наступна
            </Button>
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити книгу?</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете видалити книгу{' '}
              <span className="font-semibold">{bookToDelete?.title}</span>?
              <br />
              <br />
              Ця дія незворотна і видалить всі пов'язані дані (позики, резервації,
              відгуки).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
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
