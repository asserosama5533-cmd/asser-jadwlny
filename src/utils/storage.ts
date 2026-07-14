import { Profile, Schedule, DailyError } from '../types';

// Helper to get or set items in localStorage safely
const isClient = typeof window !== 'undefined';

export function getLocal<T>(key: string, fallback: T): T {
  if (!isClient) return fallback;
  const val = localStorage.getItem(key);
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

export function setLocal<T>(key: string, value: T): void {
  if (!isClient) return;
  localStorage.setItem(key, JSON.stringify(value));
}

// 1. Auth Simulation
export interface UserSession {
  id: string;
  email: string;
  name: string;
}

export function getSession(): UserSession | null {
  return getLocal<UserSession | null>('jadwalni_session', null);
}

export function saveSession(user: UserSession | null): void {
  setLocal('jadwalni_session', user);
}

export function clearUserDataOnLogout(): void {
  if (!isClient) return;
  
  // Clear core schedule, profile, error, and session data
  localStorage.removeItem('jadwalni_session');
  localStorage.removeItem('jadwalni_schedules');
  localStorage.removeItem('jadwalni_errors');
  localStorage.removeItem('supabase_profiles');

  // Clear all progress keys (q: and v: keys)
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('q:') || key.startsWith('v:'))) {
      localStorage.removeItem(key);
    }
  }
}

// 1.5 Server Syncing Core
export async function saveAllToServer(): Promise<void> {
  const session = getSession();
  if (!session || !session.email) return;

  const email = session.email;

  // Gather all progress keys (q: and v: keys)
  const progress: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('q:') || key.startsWith('v:'))) {
        const val = localStorage.getItem(key);
        if (val) {
          progress[key] = val;
        }
      }
    }
  }

  const payload = {
    email,
    data: {
      profile: getProfile(session.id),
      schedules: getSchedules(),
      errors: getDailyErrors(),
      progress
    }
  };

  try {
    await fetch('/api/user-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error('Failed to sync to server:', err);
  }
}

export async function syncFromServer(email: string, userId: string): Promise<void> {
  try {
    const res = await fetch(`/api/user-data?email=${encodeURIComponent(email)}`);
    if (!res.ok) return;
    const result = await res.json();
    if (result) {
      const uData = result.data || result;
      
      // Save profile
      if (uData.profile) {
        const profiles = getLocal<Record<string, Profile>>('supabase_profiles', {});
        profiles[userId] = uData.profile;
        setLocal('supabase_profiles', profiles);
      }

      // Save schedules
      if (uData.schedules) {
        setLocal('jadwalni_schedules', uData.schedules);
      }

      // Save errors
      if (uData.errors) {
        setLocal('jadwalni_errors', uData.errors);
      }

      // Save progress
      if (uData.progress && typeof window !== 'undefined') {
        // Clear old progress keys first to avoid contamination
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('q:') || key.startsWith('v:'))) {
            localStorage.removeItem(key);
          }
        }
        // Set new progress keys
        Object.entries(uData.progress).forEach(([key, val]) => {
          localStorage.setItem(key, val as string);
        });
      }
    }
  } catch (err) {
    console.error('Failed to sync from server:', err);
  }
}

// Simulated profiles database
export function getProfile(userId: string): Profile {
  const profiles = getLocal<Record<string, Profile>>('supabase_profiles', {});
  if (profiles[userId]) {
    const p = profiles[userId];
    if (p.streakCount === undefined) p.streakCount = 0;
    if (p.lastStudyDate === undefined) p.lastStudyDate = '';
    return p;
  }
  
  // Default profile if not exists
  const emailPrefix = getSession()?.email.split('@')[0] || 'طالب جديد';
  const newProfile: Profile = {
    id: userId,
    name: emailPrefix,
    goal: 'الحصول على درجة 100٪ في اختبار القدرات',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    streakCount: 0,
    lastStudyDate: '',
  };
  profiles[userId] = newProfile;
  setLocal('supabase_profiles', profiles);
  saveAllToServer();
  return newProfile;
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function incrementStudyStreak(userId: string): Profile {
  const profiles = getLocal<Record<string, Profile>>('supabase_profiles', {});
  const profile = getProfile(userId);
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  let newStreak = profile.streakCount || 0;
  const lastDate = profile.lastStudyDate || '';

  if (lastDate === today) {
    // Already updated today, do nothing
    return profile;
  } else if (lastDate === yesterday) {
    // Consecutive day
    newStreak = newStreak + 1;
  } else {
    // Streak broken or brand new
    newStreak = 1;
  }

  const updated: Profile = {
    ...profile,
    streakCount: newStreak,
    lastStudyDate: today,
    updatedAt: new Date().toISOString(),
  };

  profiles[userId] = updated;
  setLocal('supabase_profiles', profiles);
  saveAllToServer();
  return updated;
}

export function checkAndUpdateStreakOnLoad(userId: string): Profile {
  const profiles = getLocal<Record<string, Profile>>('supabase_profiles', {});
  const profile = getProfile(userId);
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  const lastDate = profile.lastStudyDate || '';
  let streak = profile.streakCount || 0;

  // If last study date exists and is neither today nor yesterday, the streak is broken and should be reset to 0
  if (lastDate && lastDate !== today && lastDate !== yesterday) {
    streak = 0;
    const updated: Profile = {
      ...profile,
      streakCount: streak,
      updatedAt: new Date().toISOString(),
    };
    profiles[userId] = updated;
    setLocal('supabase_profiles', profiles);
    saveAllToServer();
    return updated;
  }

  return profile;
}

export function updateProfile(userId: string, name: string, goal: string, avatarUrl?: string, daysUntilExam?: number): Profile {
  const profiles = getLocal<Record<string, Profile>>('supabase_profiles', {});
  const existing = getProfile(userId);
  const updated: Profile = {
    ...existing,
    name,
    goal,
    ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    ...(daysUntilExam !== undefined ? { daysUntilExam } : {}),
    updatedAt: new Date().toISOString(),
  };
  profiles[userId] = updated;
  setLocal('supabase_profiles', profiles);

  // Propagate name to active session
  const session = getSession();
  if (session && session.id === userId) {
    session.name = name;
    saveSession(session);
  }

  // Propagate name to registered users list to persist across logout/login
  const users = getLocal<any[]>('jadwalni_users', []);
  const uIdx = users.findIndex(u => u.id === userId);
  if (uIdx !== -1) {
    users[uIdx].name = name;
    setLocal('jadwalni_users', users);
  }

  saveAllToServer();
  return updated;
}

// 2. Schedules Storage
export function getSchedules(): Schedule[] {
  return getLocal<Schedule[]>('jadwalni_schedules', []);
}

export function saveSchedule(schedule: Schedule): void {
  const schedules = getSchedules();
  // Ensure no duplicates
  const filtered = schedules.filter(s => s.id !== schedule.id);
  setLocal('jadwalni_schedules', [schedule, ...filtered]);
  saveAllToServer();
}

export function deleteSchedule(id: string): void {
  const schedules = getSchedules();
  setLocal('jadwalni_schedules', schedules.filter(s => s.id !== id));
  saveAllToServer();
}

// 3. Progress Storage
// Keys: q:{n} for quant, v:{n} for verbal
export function isQuantCompleted(bankNumber: number): boolean {
  if (!isClient) return false;
  return localStorage.getItem(`q:${bankNumber}`) === 'completed';
}

export function setQuantCompleted(bankNumber: number, completed: boolean): void {
  if (!isClient) return;
  if (completed) {
    localStorage.setItem(`q:${bankNumber}`, 'completed');
  } else {
    localStorage.removeItem(`q:${bankNumber}`);
  }
  saveAllToServer();
}

export function isVerbalCompleted(sectionNumber: number): boolean {
  if (!isClient) return false;
  return localStorage.getItem(`v:${sectionNumber}`) === 'completed';
}

export function setVerbalCompleted(sectionNumber: number, completed: boolean): void {
  if (!isClient) return;
  if (completed) {
    localStorage.setItem(`v:${sectionNumber}`, 'completed');
  } else {
    localStorage.removeItem(`v:${sectionNumber}`);
  }
  saveAllToServer();
}

// 4. Daily Errors Storage
export function getDailyErrors(scheduleId?: string): DailyError[] {
  const errors = getLocal<DailyError[]>('jadwalni_errors', []);
  if (scheduleId) {
    return errors.filter(e => e.scheduleId === scheduleId);
  }
  return errors;
}

export function addDailyError(error: Omit<DailyError, 'id' | 'createdAt'>): DailyError {
  const errors = getDailyErrors();
  const newErr: DailyError = {
    ...error,
    id: 'err_' + Math.random().toString(36).substr(2, 9),
    createdAt: new Date().toISOString(),
  };
  setLocal('jadwalni_errors', [newErr, ...errors]);
  saveAllToServer();
  return newErr;
}

export function deleteDailyError(id: string): void {
  const errors = getDailyErrors();
  setLocal('jadwalni_errors', errors.filter(e => e.id !== id));
  saveAllToServer();
}

// Calculation stats
export function getCompletionStats(schedule: Schedule) {
  // Extract all unique banks and verbal sections that are actually in this schedule
  const uniqueQuantBanks = new Set<number>();
  const uniqueVerbalSections = new Set<number>();

  schedule.daysList.forEach(day => {
    if (day.isStudyDay) {
      day.quantBanks.forEach(b => uniqueQuantBanks.add(b));
      day.verbalSections.forEach(s => uniqueVerbalSections.add(s));
    }
  });

  const quantBanksList = Array.from(uniqueQuantBanks);
  const verbalSectionsList = Array.from(uniqueVerbalSections);

  const totalQuant = quantBanksList.length;
  const totalVerbal = verbalSectionsList.length;

  let completedQuant = 0;
  quantBanksList.forEach(b => {
    if (isQuantCompleted(b)) completedQuant++;
  });

  let completedVerbal = 0;
  verbalSectionsList.forEach(s => {
    if (isVerbalCompleted(s)) completedVerbal++;
  });

  const completedTasks = completedQuant + completedVerbal;
  const totalTasks = totalQuant + totalVerbal;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    completedQuant,
    totalQuant,
    completedVerbal,
    totalVerbal,
    completedTasks,
    totalTasks,
    progressPercent,
  };
}
