import { useEffect, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";

export interface AlertNotificationData {
  id: string;
  type: string;
  label: string;
  description: string;
  icon: string;
  color: string;
}

interface AlertNotificationProps {
  notifications: AlertNotificationData[];
  onDismiss: (id: string) => void;
}

export default function AlertNotification({ notifications, onDismiss }: AlertNotificationProps) {
  const { colors } = useTheme();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      {notifications.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
          colors={colors}
        />
      ))}
    </div>
  );
}

function NotificationCard({
  notification,
  onDismiss,
  colors,
}: {
  notification: AlertNotificationData;
  onDismiss: (id: string) => void;
  colors: any;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrada con animación
    setTimeout(() => setIsVisible(true), 10);

    // Auto-ocultar después de 10 segundos
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss(notification.id), 300);
    }, 10000);

    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(notification.id), 300);
  };

  return (
    <div
      className={`notification-card transform transition-all duration-300 ${
        isVisible ? "notification-enter" : "notification-exit"
      }`}
      style={{
        backgroundColor: colors.card,
        borderLeft: `4px solid ${notification.color}`,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      }}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="text-3xl flex-shrink-0">{notification.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-lg" style={{ color: notification.color }}>
              {notification.label}
            </h3>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              aria-label="Cerrar notificación"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            {notification.description}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className="text-xs font-semibold px-2 py-1 rounded"
              style={{
                backgroundColor: `${notification.color}20`,
                color: notification.color,
              }}
            >
              ALARMA ACTIVA
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
