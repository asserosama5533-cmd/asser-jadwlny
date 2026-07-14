export interface Profile {
  id: string;
  name: string;
  goal: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  streakCount?: number;
  lastStudyDate?: string; // "YYYY-MM-DD"
  daysUntilExam?: number;
}

export interface StudyDay {
  dayNumber: number; // 1-based calendar day
  dateString: string; // e.g. "2026-07-12"
  isFriday: boolean;
  isStudyDay: boolean;
  studyDayIndex?: number; // 1-based index among study days
  quantBanks: number[]; // e.g. [1, 2]
  verbalSections: number[]; // e.g. [1, 2, 3, 4]
}

export interface Schedule {
  id: string;
  name: string;
  duration: number; // e.g. 30
  durationUnit: 'days' | 'months';
  skipFridays: boolean;
  startDate: string; // "YYYY-MM-DD"
  createdAt: string;
  daysList: StudyDay[];
  totalStudyDays: number;
  totalCalendarDays: number;
  quantRange?: { from: number; to: number };
  verbalRange?: { from: number; to: number };
  scheduleType?: 'both' | 'quant' | 'verbal';
  cycleCount?: number;
  isLoopEnabled?: boolean;
  useSeparateDurations?: boolean;
  quantDuration?: number;
  verbalDuration?: number;
  verbalRestDays?: number;
  studyReminderTime?: string;
}

export interface DailyError {
  id: string;
  scheduleId: string;
  dayNumber?: number; // Associated day number (optional)
  type: 'quant' | 'verbal'; // كمي / لفظي
  itemNumber: number; // رقم البنك أو القسم
  questionNumber: number; // رقم السؤال
  note: string; // الملاحظة
  createdAt: string;
}

export type Page = 'landing' | 'create' | 'schedules' | 'schedule-detail' | 'auth' | 'profile' | 'contact';
