import { getSession } from './storage';

function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function syncPushSubscription(customReminderTimes?: string[], forcePrompt = false): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications are not supported in this browser environment.');
    return false;
  }

  try {
    // 1. Get Permission
    if (Notification.permission !== 'granted') {
      if (!forcePrompt) {
        return false; // Don't prompt unless user explicitly triggered this action
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Notification permission denied by user.');
        return false;
      }
    }

    // 2. Fetch VAPID Public Key from server
    const response = await fetch('/api/push/vapid-public-key');
    if (!response.ok) {
      throw new Error('Failed to fetch VAPID public key');
    }
    const { publicKey } = await response.json();
    const applicationServerKey = urlB64ToUint8Array(publicKey);

    // 3. Get Active Service Worker Registration
    const registration = await navigator.serviceWorker.ready;

    // 4. Subscribe to Push Manager
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
    }

    // 5. Determine user timezone and email
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Riyadh';
    const session = getSession();
    const email = session ? session.email : null;

    // 6. Gather active reminder times
    let reminderTimes: string[] = [];
    if (customReminderTimes) {
      reminderTimes = customReminderTimes;
    } else {
      // Load from localStorage schedules
      const localSchedulesRaw = localStorage.getItem('jadwalni_schedules');
      if (localSchedulesRaw) {
        try {
          const schedules = JSON.parse(localSchedulesRaw);
          if (Array.isArray(schedules)) {
            reminderTimes = schedules
              .map((s: any) => s.studyReminderTime)
              .filter((t: any) => typeof t === 'string' && t.trim() !== '');
          }
        } catch (e) {
          // ignore
        }
      }
    }

    // 7. Send subscription info to our server
    const syncResponse = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscription,
        timezone,
        email,
        reminderTimes
      })
    });

    if (!syncResponse.ok) {
      throw new Error('Failed to synchronize push subscription with server');
    }

    console.log('Successfully synchronized push subscription with server.');
    localStorage.setItem('jadwalni_push_active', 'true');
    return true;
  } catch (err) {
    console.error('Error synchronizing push subscription:', err);
    return false;
  }
}
