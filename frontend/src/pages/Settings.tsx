import { useState } from 'react';
import { authAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Lock, ShieldCheck, Loader2 } from 'lucide-react';

export function Settings() {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Паролі не співпадають');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Пароль має бути не менше 6 символів');
      return;
    }

    try {
      setSaving(true);
      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Пароль змінено успішно');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Помилка зміни пароля',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Налаштування</h1>
        <p className="text-muted-foreground">
          Керуйте безпекою вашого акаунта та змінюйте пароль
        </p>
      </div>

      <Card className="md:w-2/3">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Безпека акаунта</CardTitle>
            <p className="text-sm text-muted-foreground">
              Змініть пароль, щоб посилити безпеку
            </p>
          </div>
          <ShieldCheck className="h-6 w-6 text-primary" />
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Поточний пароль</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    currentPassword: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Новий пароль</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    newPassword: e.target.value,
                  })
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                Мінімум 6 символів, рекомендуємо комбінацію літер та чисел
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Підтвердіть пароль</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    confirmPassword: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                Зберегти новий пароль
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  })
                }
              >
                Скинути
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
