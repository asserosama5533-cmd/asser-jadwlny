import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Award, Goal, Edit2, Check, BookOpen, Clock, 
  Trash2, AlertTriangle, ListChecks, ChevronDown, ChevronUp,
  Plus, CheckCircle2, Sliders, LayoutDashboard, Bookmark, Info,
  Search, Eye, EyeOff, RefreshCw, HelpCircle, FileText, CheckSquare,
  ArrowRight, ArrowLeft, Smile, Camera, Flame, Calendar
} from 'lucide-react';
import { Page, Schedule, DailyError, Profile, StudyDay } from '../types';
import { 
  getProfile, updateProfile, getSchedules, getDailyErrors, 
  deleteDailyError, addDailyError, getCompletionStats,
  isQuantCompleted, setQuantCompleted, isVerbalCompleted, setVerbalCompleted,
  getTodayDateString, incrementStudyStreak, checkAndUpdateStreakOnLoad, checkAndAutoTriggerStreak,
  clearUserDataOnLogout, permanentlyDeleteLocalAccountFromVault
} from '../utils/storage';

interface ProfilePageProps {
  session: any;
  setPage: (page: Page) => void;
  setActiveScheduleId: (id: string) => void;
  setSession: (session: any) => void;
}

export default function ProfilePage({ session, setPage, setActiveScheduleId, setSession }: ProfilePageProps) {
  // If no session, redirect/login wall (safety check)
  if (!session) {
    return (
      <div className="max-w-md mx-auto my-16 text-center space-y-6 px-4 text-right">
        <div className="w-16 h-16 rounded-full bg-brand-gold/10 text-brand-gold flex items-center justify-center mx-auto">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-brand-blue">يرجى تسجيل الدخول أولاً</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          يتطلب استعراض ملفك الشخصي وإحصائيات التقدم ومفكرة الأخطاء تسجيل الدخول ببريدك الإلكتروني.
        </p>
        <button
          id="profile-login-redirect"
          onClick={() => setPage('auth')}
          className="w-full py-3.5 bg-brand-gold text-brand-blue font-bold rounded-xl hover:bg-brand-gold-light transition-all cursor-pointer"
        >
          تسجيل الدخول / إنشاء حساب
        </button>
      </div>
    );
  }

  const [profile, setProfile] = useState<Profile>(() => {
    return checkAndUpdateStreakOnLoad(session.id);
  });
  const [schedules, setSchedules] = useState<Schedule[]>(() => getSchedules());
  const [errors, setErrors] = useState<DailyError[]>(() => getDailyErrors());
  
  // Tab selector: progress vs revision
  const [activeTab, setActiveTab] = useState<'progress' | 'revision'>('progress');

  // Revision Filters and Search State
  const [revSearch, setRevSearch] = useState('');
  const [revType, setRevType] = useState<'all' | 'quant' | 'verbal'>('all');
  const [revSchedule, setRevSchedule] = useState<'all' | string>('all');
  const [revSort, setRevSort] = useState<'newest' | 'oldest'>('newest');

  // Interactive revision display states
  const [revMode, setRevMode] = useState<'grid' | 'flashcard'>('grid');
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [showFlashcardNote, setShowFlashcardNote] = useState(false);
  const [revealedNotes, setRevealedNotes] = useState<Record<string, boolean>>({});

  // Active schedule selected for accordion progress
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [activeSchedule, setActiveSchedule] = useState<Schedule | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  // Edit profile states
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(profile.name);
  const [tempGoal, setTempGoal] = useState(profile.goal);
  const [tempDaysUntilExam, setTempDaysUntilExam] = useState<string>(profile.daysUntilExam !== undefined ? String(profile.daysUntilExam) : '');

  // Error add states
  const [errType, setErrType] = useState<'quant' | 'verbal'>('quant');
  const [errItemNum, setErrItemNum] = useState<string>('1');
  const [errQuestionNum, setErrQuestionNum] = useState<string>('1');
  const [errNote, setErrNote] = useState('');
  const [errSuccess, setErrSuccess] = useState('');

  // Re-render trigger
  const [progressTrigger, setProgressTrigger] = useState(0);

  // Account Deletion States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteCheckbox, setDeleteCheckbox] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Bulk Range Selection States for Verbal
  const [verbalRangeStart, setVerbalRangeStart] = useState<Record<number, number>>({});
  const [verbalRangeEnd, setVerbalRangeEnd] = useState<Record<number, number>>({});
  const [showRangeForm, setShowRangeForm] = useState<Record<number, boolean>>({});

  const [completedQuants, setCompletedQuants] = useState<Record<number, boolean>>({});
  const [completedVerbals, setCompletedVerbals] = useState<Record<number, boolean>>({});

  useEffect(() => {
    // Refresh stats and schedules
    const currentScheds = getSchedules();
    setSchedules(currentScheds);
    setErrors(getDailyErrors());

    if (currentScheds.length > 0) {
      // Pick the first schedule or keep selected
      const targetId = selectedScheduleId || currentScheds[0].id;
      setSelectedScheduleId(targetId);
      const found = currentScheds.find(s => s.id === targetId) || currentScheds[0];
      setActiveSchedule(found);

      // Prefetch completion statuses for fast rendering
      const qMap: Record<number, boolean> = {};
      const vMap: Record<number, boolean> = {};
      found.daysList.forEach(day => {
        day.quantBanks.forEach(b => {
          qMap[b] = isQuantCompleted(b, found.id);
        });
        day.verbalSections.forEach(s => {
          vMap[s] = isVerbalCompleted(s, found.id);
        });
      });
      setCompletedQuants(qMap);
      setCompletedVerbals(vMap);
    } else {
      setActiveSchedule(null);
    }
  }, [selectedScheduleId, progressTrigger]);

  const handleProfileSave = () => {
    if (!tempName.trim()) return;
    const daysVal = tempDaysUntilExam.trim() !== '' ? parseInt(tempDaysUntilExam, 10) : undefined;
    const updated = updateProfile(
      session.id, 
      tempName.trim(), 
      tempGoal.trim(), 
      profile.avatarUrl,
      daysVal
    );
    setProfile(updated);
    setIsEditing(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 300;
        const maxHeight = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          const updated = updateProfile(session.id, profile.name, profile.goal, compressedBase64);
          setProfile(updated);
        } else {
          const updated = updateProfile(session.id, profile.name, profile.goal, event.target?.result as string);
          setProfile(updated);
        }
      };
      img.onerror = () => {
        alert('فشل تحميل الصورة. يرجى التأكد من اختيار ملف صورة صالح.');
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      alert('فشل في قراءة ملف الصورة.');
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteError = (id: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا الخطأ من قائمتك؟')) {
      deleteDailyError(id);
      setErrors(getDailyErrors());
    }
  };

  const handleAddError = (e: React.FormEvent) => {
    e.preventDefault();
    const itemNum = parseInt(errItemNum);
    const qNum = parseInt(errQuestionNum);
    if (isNaN(itemNum) || isNaN(qNum)) return;

    addDailyError({
      scheduleId: selectedScheduleId || 'default',
      type: errType,
      itemNumber: itemNum,
      questionNumber: qNum,
      note: errNote.trim()
    });

    setErrors(getDailyErrors());
    setErrNote('');
    setErrSuccess('تم إضافة الخطأ بنجاح!');
    setTimeout(() => setErrSuccess(''), 2000);
  };

  const [streakToast, setStreakToast] = useState<{ show: boolean; count: number } | null>(null);

  const checkAutoStreak = () => {
    if (!activeSchedule || !session?.id) return;
    const res = checkAndAutoTriggerStreak(session.id, activeSchedule);
    if (res.triggered) {
      setProfile(getProfile(session.id));
      setStreakToast({ show: true, count: res.streakCount });
      setTimeout(() => setStreakToast(null), 5000);
    }
  };

  const handleToggleQuant = (bankNum: number) => {
    if (!activeSchedule) return;
    const current = !!completedQuants[bankNum];
    setQuantCompleted(bankNum, !current, activeSchedule.id);
    setCompletedQuants(prev => ({ ...prev, [bankNum]: !current }));
    setProgressTrigger(p => p + 1);
    setTimeout(checkAutoStreak, 50);
  };

  const handleToggleVerbal = (secNum: number) => {
    if (!activeSchedule) return;
    const current = !!completedVerbals[secNum];
    setVerbalCompleted(secNum, !current, activeSchedule.id);
    setCompletedVerbals(prev => ({ ...prev, [secNum]: !current }));
    setProgressTrigger(p => p + 1);
    setTimeout(checkAutoStreak, 50);
  };

  const handleBulkToggleVerbalRange = (dayNum: number, sections: number[], completed: boolean) => {
    if (!activeSchedule) return;
    const startVal = verbalRangeStart[dayNum] ?? sections[0];
    const endVal = verbalRangeEnd[dayNum] ?? sections[sections.length - 1];

    const min = Math.min(startVal, endVal);
    const max = Math.max(startVal, endVal);

    const targetSections = sections.filter(sec => sec >= min && sec <= max);

    targetSections.forEach(secNum => {
      setVerbalCompleted(secNum, completed, activeSchedule.id);
    });

    setCompletedVerbals(prev => {
      const next = { ...prev };
      targetSections.forEach(secNum => {
        next[secNum] = completed;
      });
      return next;
    });

    // Reset range selection and close form
    setShowRangeForm(prev => ({ ...prev, [dayNum]: false }));
    setProgressTrigger(p => p + 1);
    setTimeout(checkAutoStreak, 50);
  };

  const getScheduleName = (schedId: string) => {
    const s = schedules.find(x => x.id === schedId);
    return s ? s.name : 'خطة مخصصة';
  };

  const getStudyDayLabel = (schedId: string, dayNum?: number) => {
    if (!dayNum) return '';
    const s = schedules.find(x => x.id === schedId);
    if (!s) return `اليوم ${dayNum}`;
    const day = s.daysList.find(d => d.dayNumber === dayNum);
    if (!day) return `اليوم ${dayNum}`;
    return day.isStudyDay ? `اليوم الدراسي ${day.studyDayIndex}` : 'يوم راحة';
  };

  // Compute filtered errors list
  const filteredErrors = errors.filter(err => {
    // Search filter
    if (revSearch.trim()) {
      const q = revSearch.trim().toLowerCase();
      const matchText = (err.note || '').toLowerCase().includes(q) || 
                        `بنك ${err.itemNumber}`.includes(q) ||
                        `قسم ${err.itemNumber}`.includes(q) ||
                        `سؤال ${err.questionNumber}`.includes(q);
      if (!matchText) return false;
    }
    // Type filter
    if (revType !== 'all') {
      if (err.type !== revType) return false;
    }
    // Schedule filter
    if (revSchedule !== 'all') {
      if (err.scheduleId !== revSchedule) return false;
    }
    return true;
  }).sort((a, b) => {
    if (revSort === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
  });

  // Handle marking an error as resolved (understanding it)
  const handleResolveError = (id: string) => {
    deleteDailyError(id);
    const updatedErrors = getDailyErrors();
    setErrors(updatedErrors);
    
    // Adjust flashcard index if it goes out of range
    if (flashcardIndex >= updatedErrors.length && flashcardIndex > 0) {
      setFlashcardIndex(updatedErrors.length - 1);
    }
  };

  // Toggle note visibility for individual error cards in grid view
  const toggleNoteReveal = (id: string) => {
    setRevealedNotes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Calculate cumulative stats
  const totalSchedulesCount = schedules.length;

  // Average progress across all schedules
  const avgProgress = schedules.length > 0
    ? Math.round(schedules.reduce((acc, s) => acc + getCompletionStats(s).progressPercent, 0) / schedules.length)
    : 0;

  // Sum of completed tasks across all schedules
  const totalCompletedTasks = schedules.reduce((acc, s) => acc + getCompletionStats(s).completedTasks, 0);

  // Streak calculations
  const todayStr = getTodayDateString();
  const isAlreadyDoneToday = profile.lastStudyDate === todayStr;

  // Find today's or current incomplete study day in activeSchedule
  let targetDay = activeSchedule?.daysList.find(d => d.dateString === todayStr && d.isStudyDay);
  let isUsingCurrentIncomplete = false;

  if (!targetDay && activeSchedule) {
    targetDay = activeSchedule.daysList.find(d => {
      if (!d.isStudyDay) return false;
      const dayTotal = d.quantBanks.length + d.verbalSections.length;
      const qDone = d.quantBanks.filter(b => !!completedQuants[b]).length;
      const vDone = d.verbalSections.filter(s => !!completedVerbals[s]).length;
      return (qDone + vDone) < dayTotal;
    });
    isUsingCurrentIncomplete = !!targetDay;
  }

  const targetDayTotal = targetDay ? (targetDay.quantBanks.length + targetDay.verbalSections.length) : 0;
  const targetDayQDone = targetDay ? targetDay.quantBanks.filter(b => !!completedQuants[b]).length : 0;
  const targetDayVDone = targetDay ? targetDay.verbalSections.filter(s => !!completedVerbals[s]).length : 0;
  const targetDayDone = targetDayQDone + targetDayVDone;
  const isTargetDayFullyCompleted = targetDayTotal > 0 && targetDayDone === targetDayTotal;

  const handleFinishedStudyingClick = () => {
    if (!activeSchedule) {
      alert("⚠️ يرجى إنشاء جدول مذاكرة أولاً لتتمكن من تفعيل نظام السلسلة اليومية!");
      return;
    }
    
    if (!targetDay) {
      alert("🎉 لقد أتممت كافة أيام جدول المذاكرة! لا توجد مهام متبقية.");
      return;
    }

    if (!isTargetDayFullyCompleted) {
      const remainingQuants = targetDay.quantBanks.filter(b => !completedQuants[b]).map(b => `بنك كمي ${b}`);
      const remainingVerbals = targetDay.verbalSections.filter(s => !completedVerbals[s]).map(s => `قسم لفظي ${s}`);
      const allRemaining = [...remainingQuants, ...remainingVerbals].join('، ');

      alert(`⚠️ لم تنهِ مذاكرتك لليوم الدراسي ${targetDay.studyDayIndex} بعد!\n\nالمهام المتبقية: ${allRemaining || 'لا يوجد'}.\n\nيرجى إنجازها وتحديدها كمكتملة أولاً لتتمكن من زيادة السلسلة اليومية.`);
      return;
    }

    const { profile: updated } = incrementStudyStreak(session.id);
    setProfile(updated);
    
    alert(`🔥 رائع يا بطل! تم تسجيل مذاكرتك لليوم بنجاح وزيادة الـ Streak إلى (${updated.streakCount}) يوم!\n\nاستمر في الحفاظ على تقدمك اليومي للوصول للـ 100٪ 🎓. سيتم توجيهك الآن إلى تفاصيل جدولك.`);
    
    setActiveScheduleId(activeSchedule.id);
    setPage('schedule-detail');
  };

  const handleDeleteAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    
    if (!deleteCheckbox) {
      setDeleteError('الرجاء تفعيل خيار الموافقة والشروط أولاً');
      return;
    }
    
    if (deleteConfirmationText.trim() !== 'حذف الحساب') {
      setDeleteError('الرجاء كتابة العبارة التأكيدية "حذف الحساب" بشكل صحيح');
      return;
    }
    
    setIsDeletingAccount(true);
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.email })
      });
      
      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error || 'حدث خطأ أثناء حذف الحساب من الخادم');
        setIsDeletingAccount(false);
        return;
      }
      
      // Permanently remove from client's persistent vault
      permanentlyDeleteLocalAccountFromVault(session.email);
      
      // Clear current user's local active session & schedules
      clearUserDataOnLogout();
      
      // Set parent session state to null to log out
      setSession(null);
      
      alert('🎉 تم حذف حسابك وكافة جداول المذاكرة والبيانات المرتبطة به نهائياً وبنجاح! نتمنى لك التوفيق والنجاح دائماً في مسيرتك الدراسية.');
      
      // Redirect to landing
      setPage('landing');
    } catch (err) {
      setDeleteError('فشل الاتصال بالخادم لإتمام الحذف، الرجاء المحاولة لاحقاً');
      setIsDeletingAccount(false);
    }
  };

  return (
    <div id="profile-page" className="max-w-6xl mx-auto px-4 py-10 text-right">
      
      {/* Upper Grid: Profile info & stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        
        {/* Profile Card */}
        <div className="lg:col-span-1 bg-white border border-brand-blue/5 rounded-2xl p-6 shadow-xl shadow-brand-blue/5 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-2xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-8 h-8 text-brand-gold" />
                )}
                
                {/* Camera Badge trigger */}
                <label 
                  htmlFor="avatar-upload-file" 
                  className="absolute -bottom-1 -left-1 w-6 h-6 rounded-lg bg-brand-gold text-brand-blue border-2 border-white flex items-center justify-center cursor-pointer shadow-md hover:bg-brand-gold-light hover:scale-110 active:scale-95 transition-all"
                  title="تغيير الصورة الشخصية"
                >
                  <Camera className="w-3.5 h-3.5" />
                </label>
                <input
                  id="avatar-upload-file"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <div className="flex-grow">
                {isEditing ? (
                  <input
                    id="profile-name-input"
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-gold font-bold text-brand-blue text-right"
                  />
                ) : (
                  <h3 className="text-xl font-black text-brand-blue">{profile.name}</h3>
                )}
                <span className="block text-xs text-gray-500 mt-0.5">{session.email}</span>
              </div>
            </div>

            {/* Goal info */}
            <div className="space-y-2 p-4 rounded-xl bg-brand-blue/5 border border-brand-blue/10">
              <span className="text-xs text-brand-gold font-bold flex items-center gap-1.5">
                <Goal className="w-3.5 h-3.5" />
                <span>هدفي في اختبار القدرات</span>
              </span>
              {isEditing ? (
                <textarea
                  id="profile-goal-input"
                  value={tempGoal}
                  onChange={(e) => setTempGoal(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold text-brand-blue mt-1 text-right"
                />
              ) : (
                <p className="text-sm font-bold text-brand-blue leading-relaxed">{profile.goal}</p>
              )}
            </div>

            {/* Days until Exam info */}
            <div className="space-y-2 p-4 rounded-xl bg-brand-blue/5 border border-brand-blue/10">
              <span className="text-xs text-brand-gold font-bold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>الأيام المتبقية على الاختبار</span>
              </span>
              {isEditing ? (
                <input
                  id="profile-exam-days-input"
                  type="number"
                  min="0"
                  placeholder="مثال: 38"
                  value={tempDaysUntilExam}
                  onChange={(e) => setTempDaysUntilExam(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-gold text-brand-blue mt-1 text-right font-mono"
                />
              ) : (
                <p className="text-sm font-bold text-brand-blue leading-relaxed">
                  {profile.daysUntilExam !== undefined ? `${profile.daysUntilExam} يوم متبقي` : 'لم يتم تحديد عدد الأيام بعد'}
                </p>
              )}
            </div>
          </div>

          {/* Edit Profile Controls */}
          <div className="pt-6 border-t border-gray-100 flex gap-2">
            {isEditing ? (
              <>
                <button
                  id="btn-profile-save"
                  onClick={handleProfileSave}
                  className="flex-grow py-2 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-brand-blue-dark transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>حفظ التعديل</span>
                </button>
                <button
                  id="btn-profile-cancel"
                  onClick={() => {
                    setTempName(profile.name);
                    setTempGoal(profile.goal);
                    setTempDaysUntilExam(profile.daysUntilExam !== undefined ? String(profile.daysUntilExam) : '');
                    setIsEditing(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200 transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </>
            ) : (
              <button
                id="btn-profile-edit"
                onClick={() => setIsEditing(true)}
                className="w-full py-2.5 rounded-xl border border-brand-blue/10 hover:border-brand-gold hover:text-brand-gold text-brand-blue text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>تعديل الاسم والهدف</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Average Progress Card */}
          <div className="p-6 bg-white border border-brand-blue/5 rounded-2xl shadow-xl shadow-brand-blue/5 flex flex-col justify-between text-right">
            <div className="w-10 h-10 rounded-xl bg-brand-gold/10 text-brand-gold flex items-center justify-center mb-4">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm text-gray-500 font-bold block mb-1">متوسط التحصيل العام</span>
              <span className="text-3xl font-black text-brand-blue">
                <bdi dir="ltr" className="font-mono tabular-nums">{avgProgress}%</bdi>
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">متوسط تقدمك عبر كافة جداول المذاكرة</p>
          </div>

          {/* Completed Tasks Card */}
          <div className="p-6 bg-white border border-brand-blue/5 rounded-2xl shadow-xl shadow-brand-blue/5 flex flex-col justify-between text-right">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4">
              <ListChecks className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm text-gray-500 font-bold block mb-1">المهام المنجزة</span>
              <span className="text-3xl font-black text-brand-blue">
                <bdi dir="ltr" className="font-mono tabular-nums">{totalCompletedTasks}</bdi>
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">إجمالي بنوك الكمي وأقسام اللفظي المكتملة</p>
          </div>

          {/* Schedules Count Card */}
          <div className="p-6 bg-white border border-brand-blue/5 rounded-2xl shadow-xl shadow-brand-blue/5 flex flex-col justify-between text-right">
            <div className="w-10 h-10 rounded-xl bg-brand-blue/5 text-brand-blue flex items-center justify-center mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm text-gray-500 font-bold block mb-1">عدد الجداول النشطة</span>
              <span className="text-3xl font-black text-brand-blue">
                <bdi dir="ltr" className="font-mono tabular-nums">{totalSchedulesCount}</bdi>
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">عدد الخطط والخيارات المصممة حتى الآن</p>
          </div>

          {/* Streak Card */}
          <div className={`p-6 border rounded-2xl shadow-xl flex flex-col justify-between text-right relative overflow-hidden transition-all duration-300 ${
            isAlreadyDoneToday 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 shadow-amber-500/5' 
              : isTargetDayFullyCompleted
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 shadow-emerald-500/5'
                : 'bg-white border-brand-blue/5 text-brand-blue shadow-brand-blue/5'
          }`}>
            <div className="flex justify-between items-start">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 ${
                isAlreadyDoneToday
                  ? 'bg-amber-500 text-white animate-pulse'
                  : isTargetDayFullyCompleted
                    ? 'bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/20'
                    : 'bg-amber-100 text-brand-gold'
              }`}>
                <Flame className="w-5 h-5 fill-current" />
              </div>
              
              {/* Mini Status Badge */}
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                isAlreadyDoneToday
                  ? 'bg-amber-500/20 text-amber-700'
                  : isTargetDayFullyCompleted
                    ? 'bg-emerald-500/20 text-emerald-700 animate-bounce'
                    : 'bg-gray-100 text-gray-500'
              }`}>
                {isAlreadyDoneToday 
                  ? 'منجز لليوم 🌟' 
                  : isTargetDayFullyCompleted 
                    ? 'جاهز للتسجيل ⚡' 
                    : 'قيد المذاكرة'}
              </span>
            </div>
            
            <div className="my-2">
              <span className="text-xs text-gray-500 font-bold block mb-0.5">السلسلة اليومية (Streak)</span>
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-brand-blue">
                    <bdi dir="ltr" className="font-mono tabular-nums">{profile.streakCount || 0}</bdi>
                  </span>
                  <span className="text-xs text-gray-500 font-bold">يوم متتالي</span>
                </div>
                {profile.bestStreak !== undefined && profile.bestStreak > 0 && (
                  <div className="text-[11px] font-extrabold text-amber-700 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    🏆 الأعلى: {profile.bestStreak} {profile.bestStreak === 1 ? 'يوم' : 'أيام'}
                  </div>
                )}
              </div>
            </div>
            
            {/* Interactive streak actions */}
            <div className="mt-2 pt-2 border-t border-gray-100/10 space-y-2">
              <button
                id="streak-action-button"
                onClick={handleFinishedStudyingClick}
                className={`w-full py-2 px-3 rounded-xl font-bold text-xs transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                  isAlreadyDoneToday
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isTargetDayFullyCompleted
                      ? 'bg-gradient-to-r from-amber-500 to-brand-gold text-brand-blue shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-95'
                      : 'bg-brand-blue/5 text-brand-blue border border-brand-blue/10 hover:bg-brand-blue/10'
                }`}
                disabled={isAlreadyDoneToday}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isAlreadyDoneToday 
                    ? 'تم تسجيل مذاكرة اليوم تلقائياً 🔥' 
                    : isTargetDayFullyCompleted 
                      ? 'خلّصت مهامي! أضف الـ Streak 🔥' 
                      : 'تلقائي: يتم الاحتساب عند إتمام مهام اليوم'}
                </span>
              </button>
              
              {/* Detailed description */}
              <p className="text-[10px] text-gray-400 leading-normal">
                {isAlreadyDoneToday
                  ? `آخر تسجيل: ${profile.lastStudyDate}`
                  : targetDay
                    ? `مستهدف: اليوم الدراسي ${targetDay.studyDayIndex} (${targetDayDone}/${targetDayTotal} مهام)`
                    : 'لا توجد خطة دراسية نشطة حالياً'}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Main View Header */}
      <div className="border-b border-gray-100 pb-3 mb-6" id="profile-tabs-container">
        <h3 className="text-lg font-black text-brand-blue flex items-center gap-2">
          <Sliders className="w-5 h-5 text-brand-gold" />
          <span>متابعة الخطة اليومية والإنجاز الموحد</span>
        </h3>
      </div>

      {/* Tab Contents */}
      <AnimatePresence mode="wait">
        <motion.div
          key="progress-tab"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start"
        >
            {/* Progress Tracker (Accordion) - 2 Columns */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3 flex-wrap gap-2">
                <h2 className="text-xl font-black text-brand-blue flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-brand-gold" />
                  <span>متابعة خطة التقدم اليومية</span>
                </h2>
                
                {schedules.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-bold">عرض جدول:</span>
                    <select
                      id="profile-schedule-selector"
                      value={selectedScheduleId}
                      onChange={(e) => {
                        setSelectedScheduleId(e.target.value);
                        setExpandedDay(null);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-brand-blue font-bold focus:outline-none focus:ring-1 focus:ring-brand-gold bg-white"
                    >
                      {schedules.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {activeSchedule ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-brand-gold/5 border border-brand-gold/15 text-xs text-brand-blue flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      يمكنك تحديد تقدمك في أي يوم دراسي بالجدول أدناه. سيتم تحديث التقدم العام والمزامنة مع بوستر الجدول تلقائياً!
                    </p>
                  </div>

                  {activeSchedule.daysList.map((day) => {
                    const isExpanded = expandedDay === day.dayNumber;
                    
                    // Calculate completion counts
                    const hasQuant = day.quantBanks.length > 0;
                    const hasVerbal = day.verbalSections.length > 0;
                    
                    const qDone = day.quantBanks.filter(b => !!completedQuants[b]).length;
                    const vDone = day.verbalSections.filter(s => !!completedVerbals[s]).length;
                    
                    const dayTotal = day.quantBanks.length + day.verbalSections.length;
                    const dayDone = qDone + vDone;
                    const isDayDone = day.isStudyDay && dayTotal > 0 && dayDone === dayTotal;

                    return (
                      <div
                        id={`profile-day-accordion-${day.dayNumber}`}
                        key={day.dayNumber}
                        className={`border rounded-2xl bg-white overflow-hidden transition-all ${
                          isDayDone 
                            ? 'border-emerald-500/30' 
                            : isExpanded 
                              ? 'border-brand-gold/30 shadow-md' 
                              : 'border-gray-100 hover:border-gray-200 shadow-sm'
                        }`}
                      >
                        {/* Header */}
                        <div
                          id={`profile-day-header-${day.dayNumber}`}
                          onClick={() => setExpandedDay(isExpanded ? null : day.dayNumber)}
                          className="p-4 flex justify-between items-center cursor-pointer select-none text-right"
                        >
                          <div className="flex items-center gap-2">
                            {day.isStudyDay && dayTotal > 0 && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isDayDone ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-100 text-gray-600'
                              }`}>
                                <bdi dir="ltr">{dayDone}/{dayTotal}</bdi> منجز
                              </span>
                            )}
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </div>

                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                              day.isStudyDay 
                                ? isDayDone 
                                  ? 'bg-emerald-500 text-white' 
                                  : 'bg-brand-blue text-white' 
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              <bdi dir="ltr" className="font-mono tabular-nums">{day.dayNumber}</bdi>
                            </div>
                            <div>
                              <span className="block font-bold text-sm text-brand-blue">
                                {day.isStudyDay ? `اليوم الدراسي ${day.studyDayIndex}` : 'يوم الراحة الإسبوعية'}
                              </span>
                              <span className="block text-[10px] text-gray-400">
                                {new Date(day.dateString).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Body */}
                        {isExpanded && (
                          <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-4">
                            {day.isStudyDay ? (
                              <div className="space-y-4 text-right">
                                {/* Quant */}
                                {hasQuant && (
                                  <div className="space-y-2">
                                    <span className="block text-xs font-bold text-gray-600">القسم الكمي:</span>
                                    <div className="flex flex-wrap gap-1.5 justify-start">
                                      {day.quantBanks.map(bank => {
                                        const completed = !!completedQuants[bank];
                                        return (
                                          <button
                                            id={`profile-chip-quant-${bank}`}
                                            key={bank}
                                            onClick={() => handleToggleQuant(bank)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                              completed
                                                ? 'bg-emerald-500 text-white shadow-sm'
                                                : 'bg-white text-brand-blue border border-gray-200 hover:border-brand-gold'
                                            }`}
                                          >
                                            {completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                                            <span>بنك كمي {bank}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Verbal */}
                                {hasVerbal && (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="block text-xs font-bold text-gray-600">القسم اللفظي:</span>
                                      <button
                                        type="button"
                                        onClick={() => setShowRangeForm(prev => ({ ...prev, [day.dayNumber]: !prev[day.dayNumber] }))}
                                        className="text-[10px] px-2 py-0.5 rounded bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold font-bold transition-all cursor-pointer border border-brand-gold/20"
                                      >
                                        تحديد نطاق جماعي ⚡
                                      </button>
                                    </div>

                                    {showRangeForm[day.dayNumber] && (
                                      <div className="bg-brand-gold/5 border border-brand-gold/10 rounded-xl p-2.5 space-y-2 text-right">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <div className="flex items-center gap-1">
                                            <span className="text-[10px] font-bold text-gray-500">من:</span>
                                            <bdi>
                                              <select
                                                value={verbalRangeStart[day.dayNumber] ?? day.verbalSections[0]}
                                                onChange={(e) => setVerbalRangeStart(prev => ({ ...prev, [day.dayNumber]: parseInt(e.target.value) }))}
                                                className="text-[10px] px-1.5 py-0.5 bg-white border border-gray-200 rounded focus:outline-none"
                                              >
                                                {day.verbalSections.map(sec => (
                                                  <option key={sec} value={sec}>قسم {sec}</option>
                                                ))}
                                              </select>
                                            </bdi>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <span className="text-[10px] font-bold text-gray-500">إلى:</span>
                                            <bdi>
                                              <select
                                                value={verbalRangeEnd[day.dayNumber] ?? day.verbalSections[day.verbalSections.length - 1]}
                                                onChange={(e) => setVerbalRangeEnd(prev => ({ ...prev, [day.dayNumber]: parseInt(e.target.value) }))}
                                                className="text-[10px] px-1.5 py-0.5 bg-white border border-gray-200 rounded focus:outline-none"
                                              >
                                                {day.verbalSections.map(sec => (
                                                  <option key={sec} value={sec}>قسم {sec}</option>
                                                ))}
                                              </select>
                                            </bdi>
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <button
                                              type="button"
                                              onClick={() => handleBulkToggleVerbalRange(day.dayNumber, day.verbalSections, true)}
                                              className="text-[10px] px-2 py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded cursor-pointer"
                                            >
                                              مكتمل
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleBulkToggleVerbalRange(day.dayNumber, day.verbalSections, false)}
                                              className="text-[10px] px-2 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded cursor-pointer"
                                            >
                                              إلغاء
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex flex-wrap gap-1.5 justify-start">
                                      {day.verbalSections.map(sec => {
                                        const completed = !!completedVerbals[sec];
                                        return (
                                          <button
                                            id={`profile-chip-verbal-${sec}`}
                                            key={sec}
                                            onClick={() => handleToggleVerbal(sec)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                              completed
                                                ? 'bg-emerald-500 text-white shadow-sm'
                                                : 'bg-white text-brand-blue border border-gray-200 hover:border-brand-gold'
                                            }`}
                                          >
                                            {completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                                            <span>قسم لفظي {sec}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500 block text-center py-2">يوم راحة الجمعة، استرخِ جيداً 🤍</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center rounded-2xl border border-dashed border-gray-200 bg-white space-y-4">
                  <span className="text-sm text-gray-500 block">لا توجد جداول مذاكرة نشطة لعرضها ومتابعتها.</span>
                  <button
                    id="profile-create-first-sched"
                    onClick={() => setPage('create')}
                    className="px-5 py-2.5 bg-brand-blue text-white font-bold text-xs rounded-xl hover:bg-brand-blue-dark transition-all cursor-pointer"
                  >
                    صمم جدولك الأول
                  </button>
                </div>
              )}
            </div>

            {/* Notebook Mistakes & Quick-Add Form - 1 Column */}
            <div className="space-y-6">
              <h2 className="text-xl font-black text-brand-blue flex items-center gap-2 border-b border-gray-100 pb-3">
                <Bookmark className="w-5 h-5 text-rose-500" />
                <span>دفتر أخطاء القدرات السريع</span>
              </h2>

              {/* Quick-add form */}
              <div className="bg-white p-5 rounded-2xl border border-brand-blue/5 shadow-md">
                <h3 className="text-sm font-black text-brand-blue mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-brand-gold" />
                  <span>إضافة خطأ واجهني للمفكرة</span>
                </h3>

                {errSuccess && (
                  <div className="p-2 mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold text-center">
                    {errSuccess}
                  </div>
                )}

                <form onSubmit={handleAddError} className="space-y-4 text-right">
                  <div className="grid grid-cols-2 gap-2 p-0.5 bg-gray-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setErrType('quant')}
                      className={`py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        errType === 'quant' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-500'
                      }`}
                    >
                      كمي
                    </button>
                    <button
                      type="button"
                      onClick={() => setErrType('verbal')}
                      className={`py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        errType === 'verbal' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-500'
                      }`}
                    >
                      لفظي
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500">البنك / القسم</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={errItemNum}
                        onChange={(e) => setErrItemNum(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-center font-mono text-brand-blue font-bold focus:outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500">رقم السؤال</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={errQuestionNum}
                        onChange={(e) => setErrQuestionNum(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-center font-mono text-brand-blue font-bold focus:outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500">ملاحظتك / الفكرة الصعبة</label>
                    <textarea
                      placeholder="صعوبة السؤال، الفكرة، القانون..."
                      value={errNote}
                      onChange={(e) => setErrNote(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-xs text-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-gold text-right"
                    />
                  </div>

                  <button
                    id="btn-profile-add-err"
                    type="submit"
                    className="w-full py-2 bg-brand-blue text-white text-xs font-bold rounded-xl hover:bg-brand-blue-dark transition-all cursor-pointer"
                  >
                    حفظ بالمفكرة
                  </button>
                </form>
              </div>

              {/* Quick list of mistakes (first few or standard) */}
              <div className="space-y-3">
                {errors.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-gray-50 border border-dashed border-gray-200 text-gray-400 text-xs">
                    مفكرة الأخطاء السريعة خالية حالياً!
                  </div>
                ) : (
                  errors.slice(0, 5).map((err) => (
                    <div
                      id={`error-item-${err.id}`}
                      key={err.id}
                      className="p-4 bg-white border border-red-500/5 rounded-xl shadow-sm flex justify-between items-start text-right gap-3 hover:border-red-500/10 transition-all"
                    >
                      <button
                        id={`delete-error-${err.id}`}
                        onClick={() => handleDeleteError(err.id)}
                        className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0 cursor-pointer"
                        title="حذف الملاحظة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="space-y-1 flex-grow">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs text-brand-blue font-bold">
                            {err.type === 'quant' ? 'بنك' : 'قسم'} <bdi dir="ltr">{err.itemNumber}</bdi> — سؤال <bdi dir="ltr">{err.questionNumber}</bdi>
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                            err.type === 'quant' 
                              ? 'bg-amber-50 text-amber-800 border border-amber-100' 
                              : 'bg-indigo-50 text-indigo-800 border border-indigo-100'
                          }`}>
                            {err.type === 'quant' ? 'كمي' : 'لفظي'}
                          </span>
                        </div>
                        {err.note && (
                          <p className="text-xs text-gray-600 leading-relaxed font-medium italic">
                            " {err.note} "
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {/* View All Button Removed */}
              </div>
            </div>
          </motion.div>
          {/*
          ) : (
          */}
          <div className="hidden">
            {/* VIEW 2: COMPREHENSIVE REVISION DASHBOARD */}
            <motion.div
            key="revision-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6 text-right"
          >
            {/* Top Dashboard Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-500/10 to-brand-gold/10 border border-rose-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-brand-blue flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-rose-500" />
                  <span>المراجعة والتدريب الشامل على أخطاء القدرات</span>
                </h3>
                <p className="text-xs text-gray-600 max-w-xl">
                  تعتبر مراجعة الأخطاء وتثبيت الأفكار الصعبة التي دونتها بالجدول أفضل طريق للوصول لـ 100٪. يمكنك مراجعتها بطريقة منظمة، تصفيتها، وتجربة إخفاء الملاحظات لاختبار فهمك، أو تفعيل وضع البطاقات التعليمية!
                </p>
              </div>

              {/* Micro Stats in Banner */}
              <div className="flex gap-4 self-end sm:self-center">
                <div className="px-4 py-2 rounded-xl bg-white/80 border border-gray-200/50 text-center min-w-[70px]">
                  <span className="block text-[10px] text-gray-400 font-bold">الكل</span>
                  <span className="text-lg font-black text-rose-600 font-mono">{errors.length}</span>
                </div>
                <div className="px-4 py-2 rounded-xl bg-white/80 border border-gray-200/50 text-center min-w-[70px]">
                  <span className="block text-[10px] text-gray-400 font-bold">كمي</span>
                  <span className="text-lg font-black text-amber-600 font-mono">
                    {errors.filter(e => e.type === 'quant').length}
                  </span>
                </div>
                <div className="px-4 py-2 rounded-xl bg-white/80 border border-gray-200/50 text-center min-w-[70px]">
                  <span className="block text-[10px] text-gray-400 font-bold">لفظي</span>
                  <span className="text-lg font-black text-indigo-600 font-mono">
                    {errors.filter(e => e.type === 'verbal').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Smart Filters and Presentation Switch Toolbar */}
            <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                
                {/* 1. Search notes */}
                <div className="space-y-1 md:col-span-1.5">
                  <label className="block text-xs font-bold text-gray-600">البحث في الأخطاء والملاحظات</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="ابحث بكلمة أو برقم البنك/السؤال..."
                      value={revSearch}
                      onChange={(e) => setRevSearch(e.target.value)}
                      className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-gold text-right"
                    />
                  </div>
                </div>

                {/* 2. Filter by Type */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-600">تصفية حسب القسم</label>
                  <select
                    value={revType}
                    onChange={(e) => setRevType(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-brand-blue font-bold focus:outline-none focus:ring-1 focus:ring-brand-gold"
                  >
                    <option value="all">كل الأقسام (كمي + لفظي)</option>
                    <option value="quant">القسم الكمي فقط</option>
                    <option value="verbal">القسم اللفظي فقط</option>
                  </select>
                </div>

                {/* 3. Filter by Schedule */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-600">فلترة حسب الجدول</label>
                  <select
                    value={revSchedule}
                    onChange={(e) => setRevSchedule(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-brand-blue font-bold focus:outline-none focus:ring-1 focus:ring-brand-gold"
                  >
                    <option value="all">جميع الجداول والخطط</option>
                    {schedules.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* 4. Sort selection */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-600">الترتيب الزمني</label>
                  <select
                    value={revSort}
                    onChange={(e) => setRevSort(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-brand-blue font-bold focus:outline-none focus:ring-1 focus:ring-brand-gold"
                  >
                    <option value="newest">من الأحدث للأقدم</option>
                    <option value="oldest">من الأقدم للأحدث</option>
                  </select>
                </div>

              </div>

              {/* Presentation Mode controls */}
              <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
                
                {/* Reset Filters indicator */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-bold">
                    تم العثور على: <bdi dir="ltr" className="font-mono text-rose-500 font-extrabold">{filteredErrors.length}</bdi> خطأ مطابق
                  </span>
                  {(revSearch || revType !== 'all' || revSchedule !== 'all') && (
                    <button
                      onClick={() => {
                        setRevSearch('');
                        setRevType('all');
                        setRevSchedule('all');
                      }}
                      className="text-xs text-brand-gold hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>إعادة ضبط التصفية</span>
                    </button>
                  )}
                </div>

                {/* Modes switch tabs */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500">طريقة عرض المذاكرة والمراجعة:</span>
                  <div className="flex p-1 bg-gray-100 rounded-xl border border-gray-200/50">
                    <button
                      onClick={() => setRevMode('grid')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                        revMode === 'grid' 
                          ? 'bg-white text-brand-blue shadow-sm' 
                          : 'text-gray-500 hover:text-brand-blue'
                      }`}
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span>شبكة الأخطاء</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setRevMode('flashcard');
                        setFlashcardIndex(0);
                        setShowFlashcardNote(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                        revMode === 'flashcard' 
                          ? 'bg-white text-brand-blue shadow-sm' 
                          : 'text-gray-500 hover:text-brand-blue'
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>البطاقات التعليمية التفاعلية (س و ج)</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>

            {/* Display according to active mode */}
            {filteredErrors.length === 0 ? (
              <div className="p-16 text-center rounded-2xl border-2 border-dashed border-gray-200 bg-white space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-100">
                  <Smile className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-black text-brand-blue">لا توجد أخطاء مسجلة ومطابقة للتصفية!</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                  سجل أخطاءك التي تقع فيها بالدراسة اليومية ليتسنى لك التدرب عليها وحلها هنا وتثبيت معلوماتك.
                </p>
              </div>
            ) : revMode === 'grid' ? (
              
              /* PRESENTATION 1: GRID VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredErrors.map((err) => {
                  const isNoteShown = revealedNotes[err.id] || false;
                  return (
                    <motion.div
                      layout
                      id={`rev-card-${err.id}`}
                      key={err.id}
                      className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-brand-gold/10 transition-all p-5 flex flex-col justify-between space-y-4 text-right"
                    >
                      {/* Card Header metadata */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-gray-400 font-bold">
                            {new Date(err.createdAt).toLocaleDateString('ar-SA')}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-brand-blue/70 font-semibold max-w-[130px] truncate" title={getScheduleName(err.scheduleId)}>
                              {getScheduleName(err.scheduleId)}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black ${
                              err.type === 'quant' 
                                ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            }`}>
                              {err.type === 'quant' ? 'كمي' : 'لفظي'}
                            </span>
                          </div>
                        </div>

                        {/* Title details */}
                        <div className="border-b border-gray-50 pb-2.5">
                          <span className="block font-black text-brand-blue text-sm">
                            {err.type === 'quant' ? `بنك كمي ${err.itemNumber}` : `قسم لفظي ${err.itemNumber}`}
                          </span>
                          <span className="block text-xs text-gray-500 font-bold mt-1">
                            سؤال رقم <bdi dir="ltr" className="font-mono text-brand-gold">#{err.questionNumber}</bdi>
                            {err.dayNumber && ` (ضمن أخطاء اليوم ${err.dayNumber})`}
                          </span>
                        </div>
                      </div>

                      {/* Card Body - Note showing / hiding simulation for revision */}
                      <div className="flex-grow space-y-2">
                        {isNoteShown ? (
                          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-150 text-xs text-amber-900 leading-relaxed relative animate-fade-in">
                            <span className="absolute -top-2 right-3 px-1.5 py-0.5 bg-amber-200 text-amber-800 text-[8px] font-bold rounded-md">تذكر الحل / الفكرة</span>
                            <p className="font-bold pt-1">
                              " {err.note || 'لم تدون أي ملاحظات، تذكر فكرة الحل فقط!'} "
                            </p>
                          </div>
                        ) : (
                          <div className="py-4 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                            <span className="text-xs text-gray-400 block mb-1">الملاحظة مخفية لاختبار معلوماتك</span>
                            <span className="text-[10px] text-gray-300 font-medium">حاول تذكر الفكرة أو القانون بنفسك أولاً</span>
                          </div>
                        )}

                        {/* Reveal note button */}
                        <button
                          onClick={() => toggleNoteReveal(err.id)}
                          className="w-full py-1.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-[11px] font-bold text-gray-600 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {isNoteShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-brand-gold" />}
                          <span>{isNoteShown ? 'إخفاء الملاحظة / التنبيه' : 'إظهار الملاحظة وتلميح الحل'}</span>
                        </button>
                      </div>

                      {/* Card Footer action controls */}
                      <div className="pt-3 border-t border-gray-150/60 flex items-center gap-2">
                        <button
                          onClick={() => handleResolveError(err.id)}
                          className="flex-grow py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>تم فهم وتثبيت الخطأ ✅</span>
                        </button>

                        <button
                          onClick={() => handleDeleteError(err.id)}
                          className="p-2 bg-gray-50 border border-gray-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 rounded-xl text-gray-400 transition-all cursor-pointer shrink-0"
                          title="حذف هذا الخطأ نهائياً"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </motion.div>
                  );
                })}
              </div>
            ) : (
              
              /* PRESENTATION 2: IMMERSIVE FLASHCARDS MODE */
              <div className="max-w-xl mx-auto">
                {(() => {
                  const currentErr = filteredErrors[flashcardIndex];
                  if (!currentErr) return null;
                  
                  return (
                    <div className="space-y-6">
                      
                      {/* Active Flashcard Canvas */}
                      <motion.div
                        key={`flashcard-${currentErr.id}`}
                        initial={{ opacity: 0, rotateY: -10, scale: 0.95 }}
                        animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                        className="bg-white border-2 border-brand-gold/15 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-right min-h-[300px] flex flex-col justify-between"
                      >
                        {/* Top decorative line */}
                        <div className="absolute top-0 inset-x-0 h-2 bg-brand-gold rounded-t-3xl" />

                        {/* Top info row */}
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                          <span className="text-xs font-mono font-black text-brand-gold">
                            بطاقة مراجعة <bdi dir="ltr">{flashcardIndex + 1} / {filteredErrors.length}</bdi>
                          </span>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-bold">
                              {getScheduleName(currentErr.scheduleId)}
                            </span>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                              currentErr.type === 'quant' 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-indigo-100 text-indigo-800'
                            }`}>
                              {currentErr.type === 'quant' ? 'كمي (رياضيات)' : 'لفظي (لغة)'}
                            </span>
                          </div>
                        </div>

                        {/* Question Detail */}
                        <div className="space-y-4 flex-grow flex flex-col justify-center py-4">
                          <div className="text-center space-y-2">
                            <h4 className="text-lg sm:text-2xl font-black text-brand-blue">
                              {currentErr.type === 'quant' ? 'بنك الأسئلة الكمي رقم' : 'أقسام المذاكرة اللفظية رقم'}{' '}
                              <span className="text-brand-gold font-mono font-black text-xl sm:text-3xl">{currentErr.itemNumber}</span>
                            </h4>
                            <p className="text-base sm:text-lg font-bold text-gray-500">
                              سؤال رقم <span className="font-mono font-black text-brand-blue text-lg sm:text-xl">#{currentErr.questionNumber}</span>
                              {currentErr.dayNumber && ` (مدرج بجدول اليوم الدراسي ${currentErr.dayNumber})`}
                            </p>
                          </div>

                          {/* Reveal/Hide block */}
                          <div className="pt-6">
                            {showFlashcardNote ? (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-5 rounded-2xl bg-amber-500/5 border-2 border-brand-gold/20 text-brand-blue text-sm leading-relaxed text-center relative"
                              >
                                <span className="absolute -top-3 right-5 px-2 py-0.5 bg-brand-gold text-brand-blue text-[10px] font-black rounded-lg">
                                  تلميح آسر للحل 🤍
                                </span>
                                <p className="font-black text-base mt-1">
                                  " {currentErr.note || 'لم يتم تدوين ملاحظة لهذا الخطأ. حاول مراجعة الفكرة من مصادر التدريب لتثبيتها!'} "
                                </p>
                              </motion.div>
                            ) : (
                              <div className="text-center">
                                <button
                                  onClick={() => setShowFlashcardNote(true)}
                                  className="px-6 py-4 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 text-gray-400 hover:border-brand-gold hover:text-brand-gold transition-all text-sm font-black cursor-pointer mx-auto flex items-center justify-center gap-2"
                                >
                                  <Eye className="w-5 h-5 text-brand-gold animate-bounce" />
                                  <span>انقر لإظهار ملاحظة السؤال وتذكير الحل</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Complete / Remove task option */}
                        <div className="pt-6 border-t border-gray-100 mt-6 flex justify-center">
                          <button
                            onClick={() => {
                              handleResolveError(currentErr.id);
                              setShowFlashcardNote(false);
                            }}
                            className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-extrabold text-xs sm:text-sm hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>تم فهم وتثبيت فكرة هذا السؤال بنجاح! (احذف)</span>
                          </button>
                        </div>

                      </motion.div>

                      {/* Flashcard navigation controls */}
                      <div className="flex items-center justify-between gap-4">
                        <button
                          disabled={flashcardIndex === filteredErrors.length - 1}
                          onClick={() => {
                            setFlashcardIndex(prev => prev + 1);
                            setShowFlashcardNote(false);
                          }}
                          className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-brand-blue hover:border-brand-gold disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-2 bg-white cursor-pointer"
                        >
                          <ArrowRight className="w-4 h-4" />
                          <span>السابق</span>
                        </button>

                        <span className="text-xs text-gray-500 font-bold font-mono">
                          موقع البطاقة: {flashcardIndex + 1} من {filteredErrors.length}
                        </span>

                        <button
                          disabled={flashcardIndex === 0}
                          onClick={() => {
                            setFlashcardIndex(prev => prev - 1);
                            setShowFlashcardNote(false);
                          }}
                          className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-brand-blue hover:border-brand-gold disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-2 bg-white cursor-pointer"
                        >
                          <span>التالي</span>
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  );
                })()}
              </div>
            )}

          </motion.div>
          </div>
          {/*
          )}
          */}
      </AnimatePresence>

      {/* Account Management & Deletion Zone (Safe and secure) */}
      <div id="profile-danger-zone-card" className="mt-12 border border-red-100 rounded-3xl bg-red-50/20 p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-2.5 border-b border-red-100/50 pb-3 flex-row-reverse justify-end">
          <AlertTriangle className="w-5.5 h-5.5 text-red-500" />
          <h3 className="text-base sm:text-lg font-black text-red-700">منطقة الحماية وإدارة الحساب</h3>
        </div>

        {!showDeleteConfirm ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-wrap text-right">
            <div className="space-y-1">
              <span className="block text-sm font-black text-gray-800">حذف الحساب وإلغاء الاشتراك</span>
              <span className="block text-xs text-gray-500 leading-normal font-medium">
                في حال لم تعد ترغب في استخدام المنصة وتريد مسح كامل بياناتك الشخصية وجداولك من خوادمنا نهائياً.
              </span>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 bg-white hover:bg-red-50 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف الحساب نهائياً</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleDeleteAccountSubmit} className="space-y-5">
            <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-xs font-bold text-red-800 leading-relaxed space-y-1 text-right">
              <p className="font-black text-sm">⚠️ تحذير نهائي وصارم:</p>
              <p>
                سيتم مسح حسابك بشكل نهائي ولا رجعة فيه! سيقوم هذا الإجراء بإزالة:
              </p>
              <ul className="list-disc list-inside mt-1.5 space-y-1 pr-2">
                <li>كافة جداول المذاكرة النشطة والتاريخية التي قمت بإنشائها.</li>
                <li>مفكرة أخطاء المذاكرة وسجل الأسئلة الصعبة بالكامل.</li>
                <li>إحصائيات تقدمك العام والسلسلة اليومية (Streak).</li>
                <li>الصورة الشخصية والاسم والهدف المسجل لدينا.</li>
              </ul>
              <p className="mt-2.5 text-red-600 font-extrabold">
                * يرجى العلم بأنه لا يمكن لآسر أسامة أو للدعم الفني استعادة أي جزء من بياناتك بعد إتمام هذه الخطوة أبداً!
              </p>
            </div>

            <div className="space-y-4">
              {/* Checkbox confirmation */}
              <label className="flex items-start gap-2.5 cursor-pointer text-right flex-row-reverse justify-end">
                <input
                  type="checkbox"
                  checked={deleteCheckbox}
                  onChange={(e) => setDeleteCheckbox(e.target.checked)}
                  className="mt-1 accent-red-600 rounded cursor-pointer w-4 h-4 shrink-0"
                />
                <span className="text-xs font-bold text-gray-700 leading-normal select-none">
                  نعم، أوافق وأتفهم تماماً بأن الحذف فوري ولا رجعة فيه لكافة بيانات مستواي.
                </span>
              </label>

              {/* Text confirmation */}
              <div className="space-y-1.5 text-right">
                <label className="block text-xs font-bold text-gray-600">
                  اكتب عبارة <span className="text-red-600 font-black">"حذف الحساب"</span> في الحقل أدناه لتفعيل زر التأكيد:
                </label>
                <input
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder='اكتب العبارة بدقة هنا'
                  className="w-full max-w-md px-3.5 py-2.5 border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-red-500 font-bold text-red-700 text-right bg-white"
                  required
                />
              </div>
            </div>

            {deleteError && (
              <p className="text-xs font-extrabold text-red-600 flex items-center gap-1 flex-row-reverse justify-end">
                <span>⚠️</span>
                <span>{deleteError}</span>
              </p>
            )}

            <div className="flex gap-3 justify-start flex-wrap pt-2">
              <button
                type="submit"
                disabled={!deleteCheckbox || deleteConfirmationText.trim() !== 'حذف الحساب' || isDeletingAccount}
                className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-45 disabled:pointer-events-none"
              >
                {isDeletingAccount ? (
                  <span>جاري تنفيذ الحذف النهائي...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>تأكيد حذف الحساب والبيانات نهائياً 🗑️</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteCheckbox(false);
                  setDeleteConfirmationText('');
                  setDeleteError('');
                }}
                className="px-5 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all cursor-pointer"
              >
                تراجع وإلغاء
              </button>
            </div>
          </form>
        )}
      </div>

      {/* AUTOMATIC STREAK CELEBRATION TOAST */}
      <AnimatePresence>
        {streakToast?.show && (
          <div className="fixed inset-x-0 bottom-8 z-50 flex justify-center px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="bg-gradient-to-r from-amber-500 via-brand-gold to-amber-600 text-brand-blue font-bold rounded-2xl px-6 py-4 shadow-2xl border-2 border-white/30 flex items-center gap-4 max-w-md text-right pointer-events-auto"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-blue text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                <Flame className="w-7 h-7 fill-current animate-bounce" />
              </div>
              <div className="space-y-0.5 flex-grow">
                <span className="block text-sm font-black text-brand-blue">🔥 أسطورة! أتممت مذاكرة اليوم!</span>
                <span className="block text-xs text-brand-blue/90">
                  تم تسجيل الـ Streak وزيادته تلقائياً إلى <strong className="font-mono text-sm underline">{streakToast.count}</strong> {streakToast.count === 1 ? 'يوم' : 'أيام'} متتالية 🎓
                </span>
              </div>
              <button 
                onClick={() => setStreakToast(null)}
                className="mr-auto text-brand-blue/80 hover:text-brand-blue text-xs cursor-pointer focus:outline-none font-bold"
              >
                إغلاق
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
