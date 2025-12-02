// frontend/src/components/books/EditBookDialog.tsx
import { useState, useEffect } from 'react';
import { booksAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Pencil, Upload, X, Loader2, Image } from 'lucide-react';

interface EditBookDialogProps {
  bookId: string;
  onBookUpdated?: () => void;
}

const GENRES = [
  'Художня література',
  'Наукова фантастика',
  'Фентезі',
  'Детектив',
  'Трилер',
  'Роман',
  'Історична література',
  'Біографія',
  'Наукова література',
  'Філософія',
  'Поезія',
  'Драма',
  'Пригоди',
  'Жахи',
  'Класика',
  'Сучасна література',
  'Дитяча література',
  'Бізнес',
  'Психологія',
  'Саморозвиток',
];

export function EditBookDialog({ bookId, onBookUpdated }: EditBookDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    isbn: '',
    title: '',
    author: '',
    publisher: '',
    publishYear: new Date().getFullYear(),
    description: '',
    genres: [] as string[],
    totalCopies: 1,
    coverImage: '',
  });

  useEffect(() => {
    if (open) {
      loadBookData();
    }
  }, [open, bookId]);

  const loadBookData = async () => {
    try {
      setInitialLoading(true);
      const response = await booksAPI.getOne(bookId);
      const book = response.data;

      setFormData({
        isbn: book.isbn,
        title: book.title,
        author: book.author,
        publisher: book.publisher || '',
        publishYear: book.publishYear || new Date().getFullYear(),
        description: book.description || '',
        genres: book.genres || [],
        totalCopies: book.totalCopies,
        coverImage: book.coverImage || '',
      });

      // Set existing cover image as preview
      if (book.coverImage) {
        const imageUrl = book.coverImage.startsWith('http')
          ? book.coverImage
          : `${import.meta.env.VITE_API_URL?.replace('/api', '')}${book.coverImage}`;
        setImagePreview(imageUrl);
      }
    } catch (error) {
      toast.error('Помилка завантаження даних книги');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Розмір файлу не повинен перевищувати 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Файл має бути зображенням');
        return;
      }

      setImageFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData({ ...formData, coverImage: '' });
  };

  const handleGenreToggle = (genre: string) => {
    setFormData((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.isbn || !formData.title || !formData.author) {
      toast.error("Заповніть обов'язкові поля");
      return;
    }

    if (formData.genres.length === 0) {
      toast.error('Оберіть хоча б один жанр');
      return;
    }

    try {
      setLoading(true);

      const data = new FormData();
      // ISBN не змінюємо при оновленні
      // data.append('isbn', formData.isbn);
      data.append('title', formData.title);
      data.append('author', formData.author);
      data.append('publisher', formData.publisher);
      data.append('publishYear', formData.publishYear.toString());
      data.append('description', formData.description);
      data.append('genres', JSON.stringify(formData.genres));
      data.append('totalCopies', formData.totalCopies.toString());

      // Якщо є новий файл - додаємо
      if (imageFile) {
        data.append('coverImage', imageFile);
      }

      await booksAPI.updateWithImage(bookId, data);

      toast.success('Книгу успішно оновлено! ✅');
      setOpen(false);
      onBookUpdated?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка оновлення книги');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4 mr-2" />
          Редагувати
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редагувати книгу</DialogTitle>
          <DialogDescription>
            Оновіть інформацію про книгу та змініть обкладинку
          </DialogDescription>
        </DialogHeader>

        {initialLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Image upload */}
            <div className="space-y-2">
              <Label>Обкладинка книги</Label>
              <div className="flex gap-4">
                <div className="w-32 h-44 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-muted">
                  {imagePreview ? (
                    <div className="relative w-full h-full">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Image className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <label htmlFor="image-upload-edit">
                    <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-1">
                        Натисніть щоб змінити обкладинку
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG до 5MB
                      </p>
                    </div>
                    <input
                      id="image-upload-edit"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* ISBN and Total Copies */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="isbn">
                  ISBN <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="isbn"
                  value={formData.isbn}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  ISBN не можна змінити після створення
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalCopies">
                  Кількість примірників <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="totalCopies"
                  type="number"
                  min="1"
                  value={formData.totalCopies}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      totalCopies: parseInt(e.target.value),
                    })
                  }
                  required
                />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Назва книги <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            {/* Author */}
            <div className="space-y-2">
              <Label htmlFor="author">
                Автор <span className="text-red-500">*</span>
              </Label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) =>
                  setFormData({ ...formData, author: e.target.value })
                }
                required
              />
            </div>

            {/* Publisher and Year */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="publisher">Видавництво</Label>
                <Input
                  id="publisher"
                  value={formData.publisher}
                  onChange={(e) =>
                    setFormData({ ...formData, publisher: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="publishYear">Рік видання</Label>
                <Input
                  id="publishYear"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={formData.publishYear}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      publishYear: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Опис</Label>
              <Textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            {/* Genres */}
            <div className="space-y-2">
              <Label>
                Жанри <span className="text-red-500">*</span>
              </Label>
              <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => handleGenreToggle(genre)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        formData.genres.includes(genre)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Обрано: {formData.genres.length} жанр(ів)
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Скасувати
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Оновлення...
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4 mr-2" />
                    Оновити книгу
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}