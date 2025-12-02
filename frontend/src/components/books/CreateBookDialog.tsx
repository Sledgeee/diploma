import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Upload, X, Loader2, Image } from 'lucide-react';

interface CreateBookDialogProps {
  onBookCreated?: () => void;
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

export function CreateBookDialog({ onBookCreated }: CreateBookDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Перевірка розміру (максимум 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Розмір файлу не повинен перевищувати 5MB');
        return;
      }

      // Перевірка типу
      if (!file.type.startsWith('image/')) {
        toast.error('Файл має бути зображенням');
        return;
      }

      setImageFile(file);

      // Створення preview
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

    // Валідація
    if (!formData.isbn || !formData.title || !formData.author) {
      toast.error('Заповніть обов\'язкові поля');
      return;
    }

    if (formData.genres.length === 0) {
      toast.error('Оберіть хоча б один жанр');
      return;
    }

    try {
      setLoading(true);

      const data = new FormData();
      data.append('isbn', formData.isbn);
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

      await booksAPI.createWithImage(data);

      toast.success('Книгу успішно додано до каталогу! 🎉');
      setOpen(false);
      resetForm();
      onBookCreated?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка створення книги');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      isbn: '',
      title: '',
      author: '',
      publisher: '',
      publishYear: new Date().getFullYear(),
      description: '',
      genres: [],
      totalCopies: 1,
    });
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Додати книгу
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Додати нову книгу</DialogTitle>
          <DialogDescription>
            Заповніть інформацію про книгу та завантажте обкладинку
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image upload */}
          <div className="space-y-2">
            <Label>Обкладинка книги</Label>
            <div className="flex gap-4">
              {/* Preview */}
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

              {/* Upload button */}
              <div className="flex-1 space-y-2">
                <label htmlFor="image-upload">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-1">
                      Натисніть щоб завантажити обкладинку
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG до 5MB
                    </p>
                  </div>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* ISBN and Title */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="isbn">
                ISBN <span className="text-red-500">*</span>
              </Label>
              <Input
                id="isbn"
                placeholder="978-0-123456-78-9"
                value={formData.isbn}
                onChange={(e) =>
                  setFormData({ ...formData, isbn: e.target.value })
                }
                required
              />
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
              placeholder="Назва книги"
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
              placeholder="Ім'я автора"
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
                placeholder="Назва видавництва"
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
              placeholder="Короткий опис книги..."
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
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              Скасувати
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Створення...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Створити книгу
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}