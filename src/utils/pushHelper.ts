// Push notification helpers (Removed as requested)

export async function syncPushSubscription(): Promise<boolean> {
  return false;
}

export async function triggerTestPushNotification(): Promise<{ success: boolean; message: string }> {
  return { success: false, message: "تم إلغاء ميزة التنبيهات بناءً على الطلب." };
}
