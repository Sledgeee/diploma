import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle, Trash2, Wifi, WifiOff } from 'lucide-react';
// Date formatting utility
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export function NotificationBell() {
  const { connected, notifications, unreadCount, clearNotifications, removeNotification } = useNotifications();
  const [open, setOpen] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'loan-reminder':
        return '📚';
      case 'overdue':
        return '⚠️';
      case 'fine':
        return '💰';
      case 'reservation-ready':
        return '✅';
      case 'reservation-expired':
        return '⏰';
      case 'system':
        return '🔔';
      case 'new-book':
        return '📖';
      default:
        return '📬';
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-orange-600 bg-orange-50';
      case 'success':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          {/* Connection indicator */}
          <div className="absolute -bottom-1 -right-1">
            {connected ? (
              <Wifi className="h-3 w-3 text-green-600" />
            ) : (
              <WifiOff className="h-3 w-3 text-red-600" />
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Сповіщення</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {connected ? (
                <span className="flex items-center gap-1 text-green-600">
                  <Wifi className="h-3 w-3" />
                  Online
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-600">
                  <WifiOff className="h-3 w-3" />
                  Offline
                </span>
              )}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              Немає нових сповіщень
            </p>
          </div>
        ) : (
          <>
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((notification, index) => (
                <DropdownMenuItem
                  key={index}
                  className={`flex-col items-start p-3 cursor-default focus:bg-accent ${getSeverityColor(notification.severity)}`}
                  onSelect={(e) => e.preventDefault()}
                >
                  <div className="flex items-start justify-between w-full gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                        <span className="font-semibold text-sm">
                          {notification.title}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {notification.message}
                      </p>
                      {notification.bookTitle && (
                        <p className="text-xs font-medium">
                          📖 {notification.bookTitle}
                        </p>
                      )}
                      {notification.amount && (
                        <p className="text-xs font-medium text-red-600">
                          💰 {notification.amount} грн
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(new Date(notification.timestamp))}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(index);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center cursor-pointer"
              onClick={() => {
                clearNotifications();
                setOpen(false);
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Очистити всі
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}