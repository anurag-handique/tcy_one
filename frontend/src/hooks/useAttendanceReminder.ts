import * as React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useUIStore } from '@/stores/uiStore';
import { sendDesktopNotification } from '@/lib/desktopNotification';
import { toast } from 'sonner';

/**
 * Enterprise Evening Auto-Reminder Hook
 * Automatically reminds employees to punch out if they are still clocked in after shift end time.
 */
export function useAttendanceReminder() {
  const { currentUser } = useAuthStore();
  const { attendance, attendancePolicy, addNotification } = useDataStore();
  const { setPunchModalOpen } = useUIStore();

  React.useEffect(() => {
    if (!currentUser?.id) return;

    const checkEveningReminder = () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const reminderKey = `evening_punch_reminder_${todayStr}_${currentUser.id}`;

      // Check if already reminded today
      if (sessionStorage.getItem(reminderKey)) {
        return;
      }

      // Check if user is currently clocked in today
      const todayAtt = attendance.find(
        (a) => a.employee_id === currentUser.id && a.date === todayStr
      );

      const isClockedIn = Boolean(todayAtt?.clock_in && !todayAtt?.clock_out);
      if (!isClockedIn) return;

      // Parse policy end time (e.g., "18:30" -> 18 hours, 30 mins)
      const endTimeStr = attendancePolicy?.office_end_time || '18:30';
      const [endH, endM] = endTimeStr.split(':').map(Number);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const endMinutes = (endH || 18) * 60 + (endM || 30);

      // If current time >= office_end_time, trigger prompt
      if (currentMinutes >= endMinutes) {
        sessionStorage.setItem(reminderKey, 'true');

        // 1. In-App Sonner Notification with direct Punch Out action
        toast.info(`🔔 Shift Reminder: It's past ${endTimeStr}`, {
          description: "You're still clocked in. Don't forget to punch out to record your hours accurately!",
          duration: 10000,
          action: {
            label: 'Punch Out Now',
            onClick: () => setPunchModalOpen(true, 'out'),
          },
        });

        // 2. Cross-platform Native OS Desktop Alert
        sendDesktopNotification('🔔 Evening Punch-Out Reminder', {
          body: `It is past ${endTimeStr}. Remember to punch out of TCY One if your shift has completed!`,
          tag: `punch-out-reminder-${todayStr}`,
          onClick: () => {
            window.focus();
            setPunchModalOpen(true, 'out');
          },
        });

        // 3. Store in internal notification center
        addNotification({
          employee_id: currentUser.id,
          title: '🔔 Shift Completion Reminder',
          message: `It is past standard office end time (${endTimeStr}). Please ensure you clock out before leaving.`,
          type: 'attendance',
          action_url: '/attendance',
        });
      }
    };

    // Run check immediately on mount and every 60 seconds
    checkEveningReminder();
    const interval = setInterval(checkEveningReminder, 60000);

    return () => clearInterval(interval);
  }, [currentUser?.id, attendance, attendancePolicy, setPunchModalOpen, addNotification]);
}
