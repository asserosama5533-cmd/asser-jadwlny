import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Trash2, ArrowLeft, CheckCircle2, ChevronLeft, Plus, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import { Page, Schedule } from '../types';
import { getSchedules, deleteSchedule, getCompletionStats, getSession, getProfile } from '../utils/storage';

interface SchedulesListProps {
  setPage: (page: Page) => void;
  setActiveScheduleId: (id: string) => void;
}

export default function SchedulesList({ setPage, setActiveScheduleId }: SchedulesListProps) {
  const [schedules, setSchedules] = useState<Schedule[]>(() => getSchedules());
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setScheduleToDelete(id);
  };

  const confirmDelete = () => {
    if (scheduleToDelete) {
      deleteSchedule(scheduleToDelete);
      setSchedules(getSchedules());
      setScheduleToDelete(null);
    }
  };

  const handleSelect = (id: string) => {
    setActiveScheduleId(id);
  };

  // Profile and dashboard stats
  const session = getSession();
  const profile = session ? getProfile(session.id) : null;
  const userName = profile?.name || session?.name || 'البطل';
  const streak = profile?.streakCount || 0;
  const daysLeft = profile?.daysUntilExam ?? 38;
  const goal = profile?.goal || '95';
  
  // Progress of the active schedule
  const activeSchedule = schedules[0];
  const stats = activeSchedule ? getCompletionStats(activeSchedule) : null;
  const progressPercent = stats ? stats.progressPercent : 0;
  
  const getBlockProgressString = (pct: number) => {
    const filled = Math.min(10, Math.round(pct / 10));
    const empty = Math.max(0, 10 - filled);
    return '█'.repeat(filled) + '░'.repeat(empty);
  };

  return (
    <div id="schedules-list-page" className="max-w-5xl mx-auto px-4 py-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 text-right">
        <div>
          <h1 className="text-3xl font-extrabold text-brand-blue">جداول المذاكرة الخاصة بك</h1>
          <p className="text-gray-600 mt-1">تتبع خطتك وتحصيلك الدراسي اليومي للوصول لدرجة 100٪</p>
        </div>
        
        <button
          id="btn-create-new-sched"
          onClick={() => setPage('create')}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-gold text-brand-blue font-bold hover:bg-brand-gold-light transition-all shadow-md shadow-brand-gold/10"
        >
          <Plus className="w-5 h-5" />
          <span>إنشاء جدول جديد</span>
        </button>
      </div>

      {/* Dynamic Welcome & Progress Dashboard Card */}
      <div className="mb-10 p-6 sm:p-8 bg-gradient-to-r from-brand-blue to-brand-blue-dark dark:from-[#111e42] dark:to-[#0c1530] text-white rounded-3xl shadow-xl border border-brand-blue/15 relative overflow-hidden text-right">
        {/* Background Decorative Circles */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-brand-gold/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-brand-gold/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-stretch gap-6">
          
          {/* Right Side: Greeting, Stats, and Details */}
          <div className="space-y-4 flex-grow">
            <h2 className="text-2xl font-black flex items-center gap-2 justify-end">
              <span>👋 أهلاً يا {userName}</span>
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              {/* Streak */}
              <div className="flex items-center gap-2.5 justify-end bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl">
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-sm font-bold text-gray-200">يوم متتالي</span>
                    <span className="text-lg font-black text-brand-gold font-mono">{streak}</span>
                  </div>
                  {profile?.bestStreak !== undefined && profile.bestStreak > 0 && (
                    <div className="text-[10px] text-amber-300/90 font-semibold">
                      🏆 الأعلى: {profile.bestStreak} يوم
                    </div>
                  )}
                </div>
                <span className="text-xl shrink-0">🔥</span>
              </div>
              
              {/* Exam Days */}
              <div className="flex items-center gap-2.5 justify-end bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl">
                <span className="text-sm font-bold text-gray-200">باقي {daysLeft} يوم على الاختبار</span>
                <span className="text-xl">📅</span>
              </div>

              {/* Goal */}
              <div className="flex items-center gap-2.5 justify-end bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl">
                <span className="text-sm font-bold text-gray-200">هدفك: {goal}</span>
                <span className="text-xl">🎯</span>
              </div>
            </div>

            {/* Plan Progress Section */}
            <div className="space-y-2 pt-2 text-right">
              <div className="flex justify-between items-center text-xs font-extrabold text-gray-300">
                <span className="font-mono tracking-widest text-brand-gold text-sm">{getBlockProgressString(progressPercent)} {progressPercent}%</span>
                <span>تقدم الخطة</span>
              </div>
              <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-gold rounded-full transition-all duration-500" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Left Side: Start studying prompt button */}
          <div className="flex flex-col justify-center items-center md:items-end shrink-0 md:border-r md:border-white/10 md:pr-6 gap-3">
            <div className="text-center md:text-right">
              <span className="block text-sm text-gray-300 font-bold">⏱️ بدأت المذاكرة؟</span>
              <span className="block text-xs text-gray-400 mt-0.5">سجل تقدّمك وراجع أخطاءك أولاً بأول</span>
            </div>
            
            <button
              id="btn-dashboard-start-study"
              onClick={() => {
                if (schedules.length > 0) {
                  handleSelect(schedules[0].id);
                } else {
                  setPage('create');
                }
              }}
              className="w-full md:w-auto px-6 py-3 rounded-xl bg-brand-gold hover:bg-brand-gold-light text-brand-blue font-black text-sm transition-all shadow-lg shadow-brand-gold/25 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              يلا ابدأ 🚀
            </button>
          </div>

        </div>
      </div>

      {schedules.length === 0 ? (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-12 text-center bg-white border border-brand-blue/5 rounded-2xl shadow-xl shadow-brand-blue/5 max-w-lg mx-auto space-y-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-brand-blue">لا توجد جداول مذاكرة حتى الآن</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              لم تقم بإنشاء أي خطة مذاكرة بعد. صمم خطتك الدراسية المخصصة الآن ودعنا نوزع الـ كمي والـ لفظي بالتساوي من أجلك!
            </p>
          </div>
          <button
            id="btn-empty-state-create"
            onClick={() => setPage('create')}
            className="px-6 py-3 rounded-xl font-bold bg-brand-blue text-white hover:bg-brand-blue-light transition-all"
          >
            صمم جدولك الأول
          </button>
        </motion.div>
      ) : (
        /* Grid list */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {schedules.map((schedule, index) => {
            const stats = getCompletionStats(schedule);
            return (
              <motion.div
                id={`schedule-card-${schedule.id}`}
                key={schedule.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                onClick={() => handleSelect(schedule.id)}
                className="p-6 bg-white border border-brand-blue/5 rounded-2xl shadow-md hover:shadow-xl hover:border-brand-gold/20 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-5 text-right">
                  {/* Title & Delete */}
                  <div className="flex justify-between items-start">
                    <button
                      id={`delete-schedule-${schedule.id}`}
                      onClick={(e) => handleDeleteClick(schedule.id, e)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                      title="حذف الجدول"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div>
                      <h3 className="text-xl font-bold text-brand-blue group-hover:text-brand-gold transition-colors duration-300">
                        {schedule.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>أُنشئ بتاريخ {new Date(schedule.createdAt).toLocaleDateString('ar-SA')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Badges / Duration Info */}
                  <div className="flex flex-wrap gap-2 justify-end">
                    <span className="px-3 py-1 rounded-full bg-brand-blue/5 text-brand-blue text-xs font-bold">
                      {schedule.duration} {schedule.durationUnit === 'days' ? 'يوم' : 'شهر'}
                    </span>
                    {schedule.skipFridays && (
                      <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                        مستبعد منه الجمعة
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                      <bdi dir="ltr">{schedule.totalStudyDays}</bdi> يوم دراسة فعلي
                    </span>
                  </div>

                  {/* Progress info */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-brand-gold"><bdi dir="ltr" className="font-mono">{stats.progressPercent}%</bdi> مكتمل</span>
                      <span className="text-brand-blue">التقدم العام للجدول</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-gold rounded-full transition-all duration-500" 
                        style={{ width: `${stats.progressPercent}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-500 pt-1">
                      <span>اللفظي: {stats.completedVerbal} من {stats.totalVerbal} قسم</span>
                      <span>الكمي: {stats.completedQuant} من {stats.totalQuant} بنك</span>
                    </div>
                  </div>
                </div>

                {/* Footer Link Button */}
                <div className="flex items-center justify-end text-brand-gold font-bold text-sm mt-6 group-hover:translate-x-[-4px] transition-transform duration-300">
                  <span>عرض تفاصيل الجدول اليومية</span>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Prominent Social Accounts for Aser Osama */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="mt-14 p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-[#FFFDF2] to-[#FFFBE6] border-2 border-brand-gold/40 shadow-xl space-y-8 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-48 h-48 bg-brand-gold/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-brand-gold/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-3 relative z-10">
          <h3 className="text-2xl sm:text-3xl font-black text-brand-blue flex items-center gap-3 justify-center tracking-tight">
            <span className="text-xl sm:text-2xl animate-pulse">🤍</span>
            <span>للتواصل والاستفسار تابعني</span>
            <span className="text-xl sm:text-2xl animate-pulse">🤍</span>
          </h3>
          <p className="text-sm sm:text-base text-gray-700 font-bold max-w-xl mx-auto leading-relaxed">
            تابع حساباتي الرسمية للحصول على أهم الشروحات الحصرية والنصائح والملخصات الذهبية للوصول إلى 100٪ في اختبار القدرات!
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 pt-4 relative z-10 max-w-2xl mx-auto">
          {/* Top of Triangle: TikTok */}
          <div className="w-full max-w-[280px]">
            <a
              href="https://www.tiktok.com/@o1v__asser"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-between p-5 rounded-2xl bg-white hover:bg-zinc-50 text-zinc-900 transition-all border-2 border-brand-gold/15 hover:border-zinc-500 hover:scale-[1.04] active:scale-[0.96] shadow-md hover:shadow-xl text-center group gap-4 h-full"
            >
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-[#010101] text-white flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:rotate-12 mb-3 relative">
                  <svg className="w-6 h-6 fill-current text-white drop-shadow-[1.5px_1.5px_0px_#25F4EE] filter" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.94-1.74-.22-.23-.45-.48-.64-.73v7.05c-.06 2.45-1.12 4.88-3 6.39-1.95 1.51-4.6 2.07-7 1.45-2.58-.68-4.75-2.77-5.51-5.32-.82-2.85-.06-6.13 1.95-8.22 1.9-1.96 4.74-2.73 7.37-2.01v4.21c-1.47-.46-3.15-.12-4.31.84-1.2 1-1.68 2.76-1.18 4.24.49 1.41 1.94 2.42 3.44 2.42 1.71-.05 3.12-1.49 3.11-3.2V0h-.6z" />
                  </svg>
                </div>
                <span className="block text-lg font-black text-zinc-900">تيك توك</span>
                <span className="text-xs text-gray-500 font-medium mt-1">مقاطع وشروحات سريعة</span>
              </div>
              <span className="text-xs bg-zinc-950 text-white px-4 py-1.5 rounded-xl font-mono tracking-wider shadow-sm font-extrabold w-full text-center">
                @o1v__asser
              </span>
            </a>
          </div>

          {/* Bottom of Triangle: Telegram & Instagram */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
            {/* Telegram */}
            <a
              href="https://t.me/Asser70"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-between p-5 rounded-2xl bg-white hover:bg-sky-50 text-[#229ED9] transition-all border-2 border-brand-gold/15 hover:border-[#229ED9]/40 hover:scale-[1.04] active:scale-[0.96] shadow-md hover:shadow-xl text-center group gap-4"
            >
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-[#229ED9] text-white flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:rotate-12 mb-3">
                  <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.35-.49.97-.74 3.79-1.64 6.32-2.73 7.59-3.26 3.61-1.53 4.36-1.8 4.85-1.8.11 0 .35.03.51.16.13.1.17.24.19.34z" />
                  </svg>
                </div>
                <span className="block text-lg font-black text-[#1d7fae]">تيليجرام</span>
                <span className="text-xs text-gray-500 font-medium mt-1">مستجدات وملفات المذاكرة</span>
              </div>
              <span className="text-xs bg-[#229ED9] text-white px-4 py-1.5 rounded-xl font-mono tracking-wider shadow-sm font-extrabold w-full text-center">
                @Asser70
              </span>
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/_asser016?igsh=MTd6eGVpZnY0ZjE1bg%3D%3D&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-between p-5 rounded-2xl bg-white hover:bg-pink-50/50 text-pink-600 transition-all border-2 border-brand-gold/15 hover:border-pink-500/40 hover:scale-[1.04] active:scale-[0.96] shadow-md hover:shadow-xl text-center group gap-4"
            >
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:rotate-12 mb-3">
                  <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </div>
                <span className="block text-lg font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">انستقرام</span>
                <span className="text-xs text-gray-500 font-medium mt-1">النصائح واليوميات الذهبية</span>
              </div>
              <span className="text-xs bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 text-white px-4 py-1.5 rounded-xl font-mono tracking-wider shadow-sm font-extrabold w-full text-center">
                @_asser016
              </span>
            </a>
          </div>
        </div>
      </motion.div>

      {/* CUSTOM DELETE CONFIRMATION DIALOG */}
      <AnimatePresence>
        {scheduleToDelete !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            {/* Backdrop Overlay */}
            <div 
              className="fixed inset-0 bg-brand-blue/60 backdrop-blur-sm transition-opacity" 
              onClick={() => setScheduleToDelete(null)}
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 bg-white rounded-2xl text-right overflow-hidden shadow-2xl transform transition-all max-w-md w-full border border-red-150 p-6 space-y-4"
            >
              <div className="text-center space-y-4">
                {/* Warning Icon */}
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-50 text-red-500 border border-red-200 mb-2 animate-bounce">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>

                <h3 className="text-xl font-black text-brand-blue">هل أنت متأكد من حذف هذا الجدول؟</h3>
                <p className="text-sm text-gray-500 leading-relaxed font-bold text-center">
                  يرجى الانتباه يا بطل! سيتم حذف هذا الجدول وجميع إنجازاته بشكل نهائي ولا يمكن التراجع عن هذه الخطوة أبداً. ⚠️
                </p>

                {/* Buttons */}
                <div className="flex gap-3 pt-2 flex-row-reverse">
                  <button
                    id="btn-confirm-delete"
                    type="button"
                    onClick={confirmDelete}
                    className="flex-1 py-3 rounded-xl font-black bg-red-500 text-white hover:bg-red-600 transition-all text-sm cursor-pointer shadow-md shadow-red-500/10 active:scale-[0.98]"
                  >
                    نعم، احذف الجدول ⚠️
                  </button>
                  <button
                    id="btn-cancel-delete"
                    type="button"
                    onClick={() => setScheduleToDelete(null)}
                    className="flex-1 py-3 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all text-sm cursor-pointer"
                  >
                    إلغاء الحفظ
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
