import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { booksAPI } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, BookOpen, Star } from 'lucide-react';
import { toast } from 'sonner';

export function Books() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadBooks();
  }, [page]);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const response = await booksAPI.getAll(page, 12);
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
      const response = await booksAPI.search(searchQuery, page, 12);
      setBooks(response.data.books);
      setTotal(response.data.total);
    } catch (error) {
      toast.error('Помилка пошуку');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Каталог книг</h1>
        <p className="text-muted-foreground">
          Знайдіть свою наступну улюблену книгу
        </p>
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

      {/* Books Grid */}
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {books.map((book) => (
              <Card
                key={book.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/books/${book.id}`)}
              >
                <CardContent className="p-4">
                  <div className="aspect-[3/4] bg-muted rounded-lg mb-4 flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground" />
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
                      <span className="text-sm">{Number(book.averageRating).toFixed(1)}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      book.availableCopies > 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {book.availableCopies > 0 ? 'Доступна' : 'Недоступна'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Попередня
            </Button>
            <Button variant="outline" disabled>
              Сторінка {page}
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(p => p + 1)}
              disabled={page * 12 >= total}
            >
              Наступна
            </Button>
          </div>
        </>
      )}
    </div>
  );
}