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

export function saveSession(user: UserSession | null, password?: string): void {
  setLocal('jadwalni_session', user);
  if (user && password) {
    setLocal('jadwalni_creds', { email: user.email, name: user.name, password });
    // Backup credentials to vault for 100% durable login persistence across container restarts
    saveCredentialsToVault(user.id, user.email, user.name, password);
  } else if (!user) {
    localStorage.removeItem('jadwalni_creds');
  }
}

export function saveCredentialsToVault(id: string, email: string, name: string, password?: string): void {
  if (!isClient) return;
  const vault = getLocal<Record<string, any>>('jadwalni_accounts_vault', {});
  const emailLower = email.toLowerCase().trim();
  
  // Find if there's an existing entry with this email to preserve its data
  let keyToUse = id;
  const existingKey = Object.keys(vault).find(k => vault[k].email.toLowerCase().trim() === emailLower);
  if (existingKey) {
    keyToUse = existingKey;
  }

  const existing = vault[keyToUse] || {};
  vault[keyToUse] = {
    ...existing,
    id: keyToUse,
    email: emailLower,
    name: name.trim(),
    password: password !== undefined ? password : (existing.password || ''),
    updatedAt: new Date().toISOString()
  };
  setLocal('jadwalni_accounts_vault', vault);
}

export function saveToVault(id: string, email: string, data: { profile: any; schedules: any[]; errors: any[]; progress: Record<string, string> }): void {
  if (!isClient) return;
  const vault = getLocal<Record<string, any>>('jadwalni_accounts_vault', {});
  const emailLower = email.toLowerCase().trim();
  
  let keyToUse = id;
  const existingKey = Object.keys(vault).find(k => vault[k].email.toLowerCase().trim() === emailLower);
  if (existingKey) {
    keyToUse = existingKey;
  }

  const existing = vault[keyToUse] || {};
  vault[keyToUse] = {
    ...existing,
    id: keyToUse,
    email: emailLower,
    profile: data.profile || existing.profile,
    schedules: data.schedules || existing.schedules,
    errors: data.errors || existing.errors,
    progress: data.progress || existing.progress,
    updatedAt: new Date().toISOString()
  };
  setLocal('jadwalni_accounts_vault', vault);
}

export function updateVaultPassword(email: string, password?: string): void {
  if (!isClient || !password) return;
  const vault = getLocal<Record<string, any>>('jadwalni_accounts_vault', {});
  const emailLower = email.toLowerCase().trim();
  
  const key = Object.keys(vault).find(k => vault[k].email.toLowerCase().trim() === emailLower);
  if (key) {
    vault[key].password = password;
    vault[key].updatedAt = new Date().toISOString();
    setLocal('jadwalni_accounts_vault', vault);
  }
}

export async function attemptVaultLogin(email: string, password?: string): Promise<{ success: boolean; user?: UserSession; error?: string }> {
  if (!isClient) return { success: false };
  const vault = getLocal<Record<string, any>>('jadwalni_accounts_vault', {});
  const emailLower = email.toLowerCase().trim();
  
  const foundKey = Object.keys(vault).find(k => vault[k].email.toLowerCase().trim() === emailLower);
  if (!foundKey) {
    return { success: false };
  }

  const account = vault[foundKey];
  if (account.password !== password) {
    return { success: false, error: "الجيميل أو الباسورد خطأ" };
  }

  // Password matched in vault! Let's auto-restore on server to guarantee server has the account
  try {
    const res = await fetch('/api/auth/auto-restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: account.email,
        password: account.password,
        name: account.name
      })
    });
    
    if (res.ok) {
      const serverResult = await res.json();
      console.log('Account restored on server successfully:', serverResult);
    }
  } catch (err) {
    console.error('Failed to restore vault account to server:', err);
  }

  // Restore client-side data from vault
  if (account.profile) {
    const profiles = getLocal<Record<string, Profile>>('supabase_profiles', {});
    profiles[account.id] = account.profile;
    setLocal('supabase_profiles', profiles);
  }
  if (account.schedules) {
    setLocal('jadwalni_schedules', account.schedules);
  }
  if (account.errors) {
    setLocal('jadwalni_errors', account.errors);
  }
  if (account.progress) {
    Object.entries(account.progress).forEach(([key, val]) => {
      localStorage.setItem(key, val as string);
    });
  }

  // Save back to active session
  const sessionUser = { id: account.id, email: account.email, name: account.name };
  saveSession(sessionUser, account.password);

  // Sync to server to guarantee all data is fully restored there too
  await saveAllToServer();

  return {
    success: true,
    user: sessionUser
  };
}

export async function autoRestoreSessionOnServer(): Promise<void> {
  if (!isClient) return;
  const creds = getLocal<{ email: string; name: string; password?: string } | null>('jadwalni_creds', null);
  if (creds && creds.email && creds.password) {
    try {
      const res = await fetch('/api/auth/auto-restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: creds.email,
          password: creds.password,
          name: creds.name
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.restored) {
          console.log('Session auto-restored successfully on server!');
          // Re-sync all client data to server to restore files!
          await saveAllToServer();
        }
      }
    } catch (e) {
      console.error('Failed to auto-restore session:', e);
    }
  }
}

export function clearUserDataOnLogout(): void {
  if (!isClient) return;
  
  // Clear core schedule, profile, error, and session data
  localStorage.removeItem('jadwalni_session');
  localStorage.removeItem('jadwalni_creds');
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

export function permanentlyDeleteLocalAccountFromVault(email: string): void {
  if (!isClient) return;
  const vault = getLocal<Record<string, any>>('jadwalni_accounts_vault', {});
  const emailLower = email.toLowerCase().trim();
  const key = Object.keys(vault).find(k => vault[k].email.toLowerCase().trim() === emailLower);
  if (key) {
    delete vault[key];
    setLocal('jadwalni_accounts_vault', vault);
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

  // Back up data to local vault for full durability across server state-wipes
  saveToVault(session.id, email, payload.data);

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
