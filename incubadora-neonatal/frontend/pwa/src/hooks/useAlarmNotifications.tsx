import { useEffect, useRef, useState } from "react";
import { useBluetooth } from "../contexts/BluetoothContext";
import type { AlertNotificationData } from "../components/AlertNotification";

// Información de alertas (mismo mapeo que en AlertsPage)
const ALERT_INFO: Record<string, { label: string; description: string; color: string; icon: string }> = {
    ST: {
        label: "Sobretemperatura",
        description: "Habitáculo >40°C o neonato >37°C",
        color: "#ef4444",
        icon: "🔥",
    },
    FF: {
        label: "Falla de Flujo",
        description: "Velocidad de giro <250 rpm",
        color: "#f59e0b",
        icon: "💨",
    },
    FS: {
        label: "Falla de Sensor",
        description: "Algún sensor no está midiendo correctamente",
        color: "#8b5cf6",
        icon: "⚠️",
    },
    FP: {
        label: "Falla de Programa",
        description: "El programa se estancó en una tarea",
        color: "#dc2626",
        icon: "💥",
    },
    PI: {
        label: "Postura Incorrecta",
        description: "El neonato está en posición incorrecta",
        color: "#ec4899",
        icon: "🔄",
    },
};

export function useAlarmNotifications() {
    const { currentAlarms, isConnected } = useBluetooth();
    const [notifications, setNotifications] = useState<AlertNotificationData[]>([]);
    const previousAlarmsRef = useRef(currentAlarms);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Función para reproducir sonido de alarma
    const playAlarmSound = () => {
        try {
            // Crear AudioContext si no existe
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            const audioContext = audioContextRef.current;
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Configurar tono de alarma (frecuencia 800Hz, tipo cuadrado)
            oscillator.type = "square";
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);

            // Configurar volumen con fade in/out
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);

            // Reproducir por 0.5 segundos
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.error("[useAlarmNotifications] Error playing alarm sound:", error);
        }
    };

    // Monitorear cambios en alarmas
    useEffect(() => {
        if (!isConnected) return;

        const previousAlarms = previousAlarmsRef.current;
        const newNotifications: AlertNotificationData[] = [];

        // Detectar nuevas alarmas comparando estado anterior con actual
        Object.keys(currentAlarms).forEach((alarmType) => {
            const key = alarmType as keyof typeof currentAlarms;
            const isActive = currentAlarms[key];
            const wasActive = previousAlarms[key];

            // Si la alarma se activó (cambió de false a true)
            if (isActive && !wasActive) {
                const info = ALERT_INFO[alarmType];
                if (info) {
                    const notification: AlertNotificationData = {
                        id: `alarm-${alarmType}-${Date.now()}`,
                        type: alarmType,
                        label: info.label,
                        description: info.description,
                        icon: info.icon,
                        color: info.color,
                    };
                    newNotifications.push(notification);
                }
            }
        });

        // Si hay nuevas alarmas, mostrar notificaciones y reproducir sonido
        if (newNotifications.length > 0) {
            setNotifications((prev) => [...prev, ...newNotifications]);
            playAlarmSound();
        }

        // Actualizar referencia al estado anterior
        previousAlarmsRef.current = currentAlarms;
    }, [currentAlarms, isConnected]);

    // Función para descartar notificación
    const dismissNotification = (id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    return {
        notifications,
        dismissNotification,
    };
}
