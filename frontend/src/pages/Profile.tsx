import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { usersAPI, authAPI } from '@/services/api';
import { fetchCurrentUser } from '@/store/slices/authSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Calendar,
  BookOpen,
  Award,
  DollarSign,
  Loader2,
  Edit,
  Save,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

export function Profile() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getProfile();
      setProfile(response.data);
      setFormData({
        firstName: response.data.firstName || '',
        lastName: response.data.lastName || '',
        phone: response.data.phone || '',
        address: response.data.address || '',
      });
    } catch (error) {
      toast.error('Помилка завантаження профілю');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await usersAPI.updateProfile(formData);
      await dispatch(fetchCurrentUser());
      toast.success('Профіль оновлено!');
      setEditing(false);
      loadProfile();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка оновлення профілю');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
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
      toast.success('Пароль змінено успішно!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setChangingPassword(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Помилка зміни пароля');
    } finally {
      setSaving(false);
    }
  };

  const getUserInitials = () => {
    if (!profile) return 'U';
    return `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();
  };

  const getRoleName = (role: string) => {
    const roles: Record<string, string> = {
      ADMIN: 'Адміністратор',
      LIBRARIAN: 'Бібліотекар',
      READER: 'Читач',
    };
    return roles[role] || role;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Мій профіль</h1>
        <p className="text-muted-foreground">
          Керуйте своїм профілем та налаштуваннями
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile card */}
        <Card className="md:col-span-1">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-2xl">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>

              <div>
                <h2 className="text-xl font-bold">
                  {profile.firstName} {profile.lastName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {profile.email}
                </p>
              </div>

              <div className="w-full pt-4 space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Роль</span>
                  </div>
                  <span className="text-sm font-medium">
                    {getRoleName(profile.role)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Реєстрація</span>
                  </div>
                  <span className="text-sm font-medium">
                    {format(new Date(profile.createdAt), 'dd MMM yyyy', {
                      locale: uk,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info and stats */}
        <div className="md:col-span-2 space-y-6">
          {/* Statistics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Активні позики
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {profile._count?.loans || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Відгуки</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {profile._count?.reviews || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Баланс</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Number(profile.balance).toFixed(2)} грн
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Personal info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Особиста інформація</CardTitle>
                {!editing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Редагувати
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(false);
                        setFormData({
                          firstName: profile.firstName || '',
                          lastName: profile.lastName || '',
                          phone: profile.phone || '',
                          address: profile.address || '',
                        });
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Скасувати
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveProfile}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Зберегти
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Ім'я</Label>
                  {editing ? (
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{profile.firstName}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Прізвище</Label>
                  {editing ? (
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{profile.lastName}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.email}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    Не можна змінити
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                {editing ? (
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+380..."
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.phone || 'Не вказано'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Адреса</Label>
                {editing ? (
                  <Input
                    id="address"
                    placeholder="Вулиця, місто"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.address || 'Не вказано'}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Password change */}
          <Card>
            <CardHeader>
              <CardTitle>Безпека</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!changingPassword ? (
                <Button
                  variant="outline"
                  onClick={() => setChangingPassword(true)}
                >
                  Змінити пароль
                </Button>
              ) : (
                <>
                  <div className="space-y-4">
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
                      />
                    </div>

                    <Separator />

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
                      />
                      <p className="text-xs text-muted-foreground">
                        Мінімум 6 символів
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">
                        Підтвердіть пароль
                      </Label>
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
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleChangePassword}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Змінити пароль
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setChangingPassword(false);
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: '',
                        });
                      }}
                    >
                      Скасувати
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
