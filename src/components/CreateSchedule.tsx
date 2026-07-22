import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Check, Sliders, FileText, ArrowRight, Sparkles, Bell, Clock, HelpCircle } from 'lucide-react';
import { Page, Schedule } from '../types';
import { generateSchedule } from '../utils/scheduleGenerator';
import { saveSchedule } from '../utils/storage';
import NotificationGuideModal from './NotificationGuideModal';
import { syncPushSubscription } from '../utils/pushHelper';

interface CreateScheduleProps {
  setPage: (page: Page) => void;
  setActiveScheduleId: (id: string) => void;
}

export default function CreateSchedule({ setPage, setActiveScheduleId }: CreateScheduleProps) {
  const [name, setName] = useState('');
  const [duration, setDuration] = useState<number>(30);
  const [durationUnit, setDurationUnit] = useState<'days' | 'days'>('days');
  const [durationUnitVal, setDurationUnitVal] = useState<'days' | 'months'>('days');
  const [restDays, setRestDays] = useState<number[]>([5]); // Default to Friday (5) as rest day

  const toggleRestDay = (dayIndex: number) => {
    if (restDays.includes(dayIndex)) {
      setRestDays(restDays.filter(d => d !== dayIndex));
    } else {
      setRestDays([...restDays, dayIndex]);
    }
  };

  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [error, setError] = useState('');

  // Separate durations state
  const [useSeparateDurations, setUseSeparateDurations] = useState(false);
  const [quantDuration, setQuantDuration] = useState<number>(30);
  const [verbalDuration, setVerbalDuration] = useState<number>(5);
  const [verbalRestDays, setVerbalRestDays] = useState<number>(0); // 0, 1, or 2 days
  const [studyReminderTime, setStudyReminderTime] = useState<string>(''); // e.g. "16:00"

  // State for notification testing
  const [testNotificationState, setTestNotificationState] = useState<'idle' | 'requesting' | 'countdown' | 'sent'>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const handleTestNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setIsGuideOpen(true);
      return;
    }

    setTestNotificationState('requesting');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setIsGuideOpen(true);
        setTestNotificationState('idle');
        return;
      }

      setTestNotificationState('countdown');
      setCountdown(3);
      
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setTestNotificationState('sent');
            
            // Trigger actual service worker or standard notification
            const title = '📖 حان وقت المذاكرة والتميز! 🚀';
            const body = 'يا بطل، حان وقت مذاكرة جدولك اليومي. همتك عالية والـ 100% بانتظارك! 💪✨';
            
            // Register server-side push subscription so they get background notifications
            syncPushSubscription(undefined, true);

            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, {
                  body: body,
                  icon: '/favicon.ico',
                  badge: '/favicon.ico',
                  vibrate: [200, 100, 200]
                } as any);
              }).catch(() => {
                new Notification(title, { body });
              });
            } else {
              new Notification(title, { body });
            }

            // Reset back to idle after 3 seconds
            setTimeout(() => {
              setTestNotificationState('idle');
            }, 3000);

            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      setTestNotificationState('idle');
    }
  };

  // Custom Ranges State
  const [quantMode, setQuantMode] = useState<'all' | 'custom' | 'frequent'>('all');
  const [quantFrom, setQuantFrom] = useState<number | ''>(1);
  const [quantTo, setQuantTo] = useState<number | ''>(124);

  const [verbalMode, setVerbalMode] = useState<'all' | 'custom'>('all');
  const [verbalFrom, setVerbalFrom] = useState<number | ''>(1);
  const [verbalTo, setVerbalTo] = useState<number | ''>(257);
  const [scheduleType, setScheduleType] = useState<'both' | 'quant' | 'verbal'>('both');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (restDays.length >= 7) {
      setError('لا يمكنك اختيار جميع أيام الأسبوع كأيام راحة! يجب أن يكون هناك يوم مذاكرة واحد على الأقل في الأسبوع لإنتاج الخطة.');
      return;
    }

    let qDuration = duration;
    let vDuration = duration;

    if (useSeparateDurations && scheduleType === 'both') {
      if (!quantDuration || quantDuration <= 0) {
        setError('الرجاء إدخال مدة صحيحة للكمي أكبر من صفر');
        return;
      }
      if (!verbalDuration || verbalDuration <= 0) {
        setError('الرجاء إدخال مدة صحيحة للفظي أكبر من صفر');
        return;
      }
      if (quantDuration > 365 || verbalDuration > 365) {
        setError('الرجاء إدخال مدة أقل من ٣٦٥ يوماً لضمان كفاءة التوزيع');
        return;
      }
      qDuration = quantDuration;
      vDuration = verbalDuration;
    } else {
      if (!duration || duration <= 0) {
        setError('الرجاء إدخال مدة صحيحة أكبر من صفر');
        return;
      }

      if (duration > 365 && durationUnitVal === 'days') {
        setError('الرجاء إدخال مدة أقل من ٣٦٥ يوماً لضمان كفاءة التوزيع');
        return;
      }

      if (duration > 12 && durationUnitVal === 'months') {
        setError('الرجاء إدخال مدة أقل من ١٢ شهراً');
        return;
      }
    }

    // Custom Ranges Validation
    const qFrom = quantMode === 'all' ? 1 : (quantFrom === '' ? 0 : quantFrom);
    const qTo = quantMode === 'all' ? 124 : (quantTo === '' ? 0 : quantTo);
    const vFrom = verbalMode === 'all' ? 1 : (verbalFrom === '' ? 0 : verbalFrom);
    const vTo = verbalMode === 'all' ? 257 : (verbalTo === '' ? 0 : verbalTo);

    if (quantMode === 'custom') {
      if (!qFrom || qFrom < 1 || qFrom > 124) {
        setError('رقم بنك الكمي المبدئي يجب أن يكون بين 1 و 124');
        return;
      }
      if (!qTo || qTo < 1 || qTo > 124) {
        setError('رقم بنك الكمي النهائي يجب أن يكون بين 1 و 124');
        return;
      }
      if (qFrom > qTo) {
        setError('رقم بنك البدء للكمي لا يمكن أن يكون أكبر من رقم بنك الانتهاء');
        return;
      }
    }

    if (verbalMode === 'custom') {
      if (!vFrom || vFrom < 1 || vFrom > 257) {
        setError('رقم قسم اللفظي المبدئي يجب أن يكون بين 1 و 257');
        return;
      }
      if (!vTo || vTo < 1 || vTo > 257) {
        setError('رقم قسم اللفظي النهائي يجب أن يكون بين 1 و 257');
        return;
      }
      if (vFrom > vTo) {
        setError('رقم قسم البدء للفظي لا يمكن أن يكون أكبر من رقم قسم الانتهاء');
        return;
      }
    }

    // Generate schedule
    const newSchedule = generateSchedule(
      name.trim(),
      duration,
      durationUnitVal,
      restDays,
      startDate,
      qFrom,
      qTo,
      vFrom,
      vTo,
      scheduleType,
      useSeparateDurations && scheduleType === 'both',
      qDuration,
      vDuration,
      verbalRestDays,
      quantMode
    );

    // Save
    if (studyReminderTime) {
      newSchedule.studyReminderTime = studyReminderTime;
    }

    saveSchedule(newSchedule);

    // Synchronize the updated reminder list with the server-side Web Push subscription
    syncPushSubscription(undefined, studyReminderTime ? true : false);

    // If reminder time is set, prompt for notification permission
    if (studyReminderTime && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    // Navigate to schedules or detail
    setActiveScheduleId(newSchedule.id);
  };

  return (
    <div id="create-schedule-page" className="max-w-3xl mx-auto px-4 py-12">
      
      {/* Back button */}
      <button
        id="btn-back-to-landing"
        onClick={() => setPage('landing')}
        className="flex items-center gap-2 text-brand-blue/70 hover:text-brand-blue mb-8 text-sm font-medium transition-all"
      >
        <ArrowRight className="w-4 h-4" />
        <span>العودة للرئيسية</span>
      </button>

      {/* Header */}
      <div className="text-center space-y-4 mb-10">
        <h1 className="text-3xl font-extrabold text-brand-blue">صمم جدولك الذكي للقدرات</h1>
        <p className="text-gray-600 max-w-lg mx-auto">
          أدخل مدة المذاكرة المطلوبة، وسيقوم النظام بتوزيع الـ ١٢٤ بنكاً كمياً والـ ٢٥٧ قسماً لفظياً بالتساوي عبر أيام خطتك بذكاء فائق.
        </p>
      </div>

      {/* Main form card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="bg-white border border-brand-blue/5 rounded-2xl shadow-xl shadow-brand-blue/5 p-8 sm:p-10"
      >
        <form onSubmit={handleSubmit} className="space-y-8 text-right">
          
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-semibold">
              {error}
            </div>
          )}

          {/* Schedule Name */}
          <div className="space-y-2">
            <label htmlFor="schedule-name" className="block text-sm font-bold text-brand-blue flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-gold" />
              <span>اسم الجدول (اختياري)</span>
            </label>
            <input
              id="schedule-name"
              type="text"
              placeholder="مثال: خطة المئة في شهرين، جدول الـ 30 يوم"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold text-brand-blue transition-all"
            />
          </div>

          {/* Duration Config */}
          {(!useSeparateDurations || scheduleType !== 'both') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Duration Number */}
              <div className="space-y-2">
                <label htmlFor="schedule-duration" className="block text-sm font-bold text-brand-blue flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-brand-gold" />
                  <span>المدة المطلوبة للمذاكرة</span>
                </label>
                <div className="relative">
                  <input
                    id="schedule-duration"
                    type="number"
                    min="1"
                    max="365"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold text-brand-blue font-mono transition-all"
                  />
                </div>
              </div>

              {/* Duration Unit */}
              <div className="space-y-2">
                <label htmlFor="schedule-unit" className="block text-sm font-bold text-brand-blue flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-gold" />
                  <span>وحدة المدة</span>
                </label>
                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1.5 rounded-xl border border-gray-200">
                  <button
                    id="unit-days"
                    type="button"
                    onClick={() => setDurationUnitVal('days')}
                    className={`py-2 rounded-lg text-sm font-bold transition-all ${
                      durationUnitVal === 'days'
                        ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/15'
                        : 'text-gray-600 hover:text-brand-blue'
                    }`}
                  >
                    أيام
                  </button>
                  <button
                    id="unit-months"
                    type="button"
                    onClick={() => setDurationUnitVal('months')}
                    className={`py-2 rounded-lg text-sm font-bold transition-all ${
                      durationUnitVal === 'months'
                        ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/15'
                        : 'text-gray-600 hover:text-brand-blue'
                    }`}
                  >
                    شهور
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* Schedule Type Selection Block */}
          <div className="space-y-3 text-right">
            <label className="block text-sm font-bold text-brand-blue flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-gold" />
              <span>نوع الجدول الدراسي (توزيع المواد)</span>
            </label>
            <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1.5 rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => setScheduleType('both')}
                className={`py-3 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  scheduleType === 'both'
                    ? 'bg-brand-blue text-white shadow-md'
                    : 'text-gray-600 hover:text-brand-blue'
                }`}
              >
                كمي ولفظي معاً
              </button>
              <button
                type="button"
                onClick={() => setScheduleType('quant')}
                className={`py-3 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  scheduleType === 'quant'
                    ? 'bg-brand-blue text-white shadow-md'
                    : 'text-gray-600 hover:text-brand-blue'
                }`}
              >
                كمي فقط 🔢
              </button>
              <button
                type="button"
                onClick={() => setScheduleType('verbal')}
                className={`py-3 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  scheduleType === 'verbal'
                    ? 'bg-brand-blue text-white shadow-md'
                    : 'text-gray-600 hover:text-brand-blue'
                }`}
              >
                لفظي فقط 📚
              </button>
            </div>
          </div>

          {/* CUSTOM SEPARATE DURATIONS OPTION */}
          {scheduleType === 'both' && (
            <div className="space-y-4">
              <div 
                id="checkbox-separate-durations"
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  useSeparateDurations 
                    ? 'bg-brand-blue/5 border-brand-gold/30' 
                    : 'bg-gray-50/50 border-gray-100 hover:bg-gray-50'
                }`}
                onClick={() => setUseSeparateDurations(!useSeparateDurations)}
              >
                <div className="flex items-center h-5 mt-0.5">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                    useSeparateDurations 
                      ? 'bg-brand-gold border-brand-gold text-brand-blue' 
                      : 'bg-white border-gray-300'
                  }`}>
                    {useSeparateDurations && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="block text-sm font-bold text-brand-blue">إنهاء الكمي واللفظي بمدد مختلفة (تكرار تلقائي للفظي) 🔄</span>
                  <span className="block text-xs text-gray-500 leading-relaxed">
                    مثال: تريد مذاكرة الكمي في 30 يوم واللفظي في 5 أيام. سينتهي اللفظي أولاً ويكرر نفسه تلقائياً (Loop) طوال الـ 30 يوماً! ويمكنك تفعيل أيام راحة مخصصة للفظي قبل أن يعيد التكرار.
                  </span>
                </div>
              </div>

              {useSeparateDurations && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-amber-50/40 border border-brand-gold/15"
                >
                  {/* Quant Duration */}
                  <div className="space-y-1 text-right">
                    <label className="block text-xs font-bold text-brand-blue mb-1">أيام إنهاء الكمي</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={quantDuration}
                      onChange={(e) => setQuantDuration(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-bold text-center font-mono focus:ring-1 focus:ring-brand-gold focus:outline-none"
                    />
                  </div>

                  {/* Verbal Duration */}
                  <div className="space-y-1 text-right">
                    <label className="block text-xs font-bold text-brand-blue mb-1">أيام إنهاء اللفظي</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={verbalDuration}
                      onChange={(e) => setVerbalDuration(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-bold text-center font-mono focus:ring-1 focus:ring-brand-gold focus:outline-none"
                    />
                  </div>

                  {/* Verbal Rest Days */}
                  <div className="space-y-1 text-right">
                    <label className="block text-xs font-bold text-brand-blue mb-1">راحة اللفظي بعد كل تكرار</label>
                    <select
                      value={verbalRestDays}
                      onChange={(e) => setVerbalRestDays(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs font-bold text-center focus:ring-1 focus:ring-brand-gold focus:outline-none"
                    >
                      <option value={0}>بدون راحة (تكرار فوراً) 🔄</option>
                      <option value={1}>يوم واحد راحة لللفظي ☕</option>
                      <option value={2}>يومين راحة لللفظي 🏖️</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Custom Ranges Selection Section */}
          <div className="border-t border-b border-gray-100 py-6 my-6 space-y-6 text-right">
            <h3 className="text-md font-extrabold text-brand-blue flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-gold" />
              <span>تخصيص نطاق بنوك الكمي واللفظي (اختياري)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Quant Selection Block */}
              {(scheduleType === 'both' || scheduleType === 'quant') && (
                <div className="space-y-3 p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="block text-sm font-bold text-brand-blue">بنوك الكمي</span>
                    {quantMode === 'frequent' && (
                      <span className="text-[10px] font-black text-amber-800 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/20">
                        🔥 62 بنك مختار
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 bg-gray-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setQuantMode('all')}
                      className={`py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                        quantMode === 'all'
                          ? 'bg-brand-blue text-white shadow-md'
                          : 'text-gray-600 hover:text-brand-blue'
                      }`}
                    >
                      الكل (1 - 124)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuantMode('frequent')}
                      className={`py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                        quantMode === 'frequent'
                          ? 'bg-amber-500 text-brand-blue shadow-md font-black'
                          : 'text-amber-800 hover:text-brand-blue font-bold'
                      }`}
                    >
                      🔥 الأكثر تكراراً
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuantMode('custom')}
                      className={`py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                        quantMode === 'custom'
                          ? 'bg-brand-blue text-white shadow-md'
                          : 'text-gray-600 hover:text-brand-blue'
                      }`}
                    >
                      نطاق مخصص 🎯
                    </button>
                  </div>

                  {quantMode === 'frequent' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-3.5 rounded-xl bg-amber-50/80 border border-brand-gold/30 text-right space-y-2 text-xs text-brand-blue mt-2"
                    >
                      <div className="flex items-center justify-between border-b border-brand-gold/20 pb-1.5">
                        <div className="flex items-center gap-1.5 font-black text-amber-900">
                          <Sparkles className="w-3.5 h-3.5 text-brand-gold fill-current" />
                          <span>بنوك الكمي الأكثر تكراراً بالمحوسب:</span>
                        </div>
                        <span className="bg-brand-gold text-brand-blue px-2 py-0.5 rounded-md font-mono font-black text-[11px]">
                          إجمالي 62 بنك ✅
                        </span>
                      </div>

                      <div className="space-y-1 text-[11px] font-bold text-gray-700 leading-relaxed">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-gold shrink-0"></span>
                          <span>• البنوك من 1 إلى 18</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-gold shrink-0"></span>
                          <span>• البنوك من 20 إلى 22</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-gold shrink-0"></span>
                          <span>• البنوك من 24 إلى 29</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-gold shrink-0"></span>
                          <span>• البنوك من 102 إلى 124</span>
                        </div>
                        <div className="flex items-start gap-1.5 text-amber-900 font-extrabold bg-white/70 p-2 rounded-lg border border-brand-gold/20 mt-1">
                          <span className="shrink-0 text-amber-700">• بنوك منفردة:</span>
                          <span className="font-mono dir-ltr text-amber-900 font-black">
                            50, 57, 58, 68, 74, 76, 82, 86, 90, 93, 96, 98
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {quantMode === 'custom' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="grid grid-cols-2 gap-3 pt-2"
                    >
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500">من بنك</label>
                        <input
                          type="number"
                          min="1"
                          max="124"
                          value={quantFrom}
                          onChange={(e) => {
                            const val = e.target.value;
                            setQuantFrom(val === '' ? '' : parseInt(val) || '');
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs text-center font-mono font-bold focus:outline-none focus:ring-1 focus:ring-brand-gold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500">إلى بنك</label>
                        <input
                          type="number"
                          min="1"
                          max="124"
                          value={quantTo}
                          onChange={(e) => {
                            const val = e.target.value;
                            setQuantTo(val === '' ? '' : parseInt(val) || '');
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs text-center font-mono font-bold focus:outline-none focus:ring-1 focus:ring-brand-gold"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Verbal Selection Block */}
              {(scheduleType === 'both' || scheduleType === 'verbal') && (
                <div className="space-y-3 p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                  <span className="block text-sm font-bold text-brand-blue">أقسام اللفظي</span>
                  <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setVerbalMode('all')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        verbalMode === 'all'
                          ? 'bg-brand-blue text-white shadow-md'
                          : 'text-gray-600 hover:text-brand-blue'
                      }`}
                    >
                      الكل (1 - 257)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerbalMode('custom')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        verbalMode === 'custom'
                          ? 'bg-brand-blue text-white shadow-md'
                          : 'text-gray-600 hover:text-brand-blue'
                      }`}
                    >
                      نطاق مخصص 🎯
                    </button>
                  </div>

                  {verbalMode === 'custom' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="grid grid-cols-2 gap-3 pt-2"
                    >
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500">من قسم</label>
                        <input
                          type="number"
                          min="1"
                          max="257"
                          value={verbalFrom}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVerbalFrom(val === '' ? '' : parseInt(val) || '');
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs text-center font-mono font-bold focus:outline-none focus:ring-1 focus:ring-brand-gold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500">إلى قسم</label>
                        <input
                          type="number"
                          min="1"
                          max="257"
                          value={verbalTo}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVerbalTo(val === '' ? '' : parseInt(val) || '');
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs text-center font-mono font-bold focus:outline-none focus:ring-1 focus:ring-brand-gold"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Start Date Selection */}
          <div className="space-y-2">
            <label htmlFor="schedule-start-date" className="block text-sm font-bold text-brand-blue flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-gold" />
              <span>تاريخ بداية المذاكرة</span>
            </label>
            <input
              id="schedule-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold text-brand-blue font-mono transition-all"
            />
          </div>

          {/* Custom Rest Days Option */}
          <div className="space-y-4 text-right">
            <label className="block text-sm font-bold text-brand-blue flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-gold" />
              <span>تحديد أيام الراحة الأسبوعية المخصصة (اختياري)</span>
            </label>
            <p className="text-xs text-gray-500 leading-relaxed">
              اختر الأيام التي ترغب في اعتبارها أيام راحة خالية من المذاكرة (يمكنك اختيار يوم أو أكثر). سيقوم النظام بتوزيع المنهج بذكاء على الأيام المتبقية فقط.
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {[
                { name: 'الأحد', val: 0 },
                { name: 'الاثنين', val: 1 },
                { name: 'الثلاثاء', val: 2 },
                { name: 'الأربعاء', val: 3 },
                { name: 'الخميس', val: 4 },
                { name: 'الجمعة', val: 5 },
                { name: 'السبت', val: 6 },
              ].map((day) => {
                const isSelected = restDays.includes(day.val);
                return (
                  <button
                    key={day.val}
                    type="button"
                    onClick={() => toggleRestDay(day.val)}
                    className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all border cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-brand-gold border-brand-gold text-brand-blue shadow-md shadow-brand-gold/10'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-brand-blue/30 hover:bg-gray-50'
                    }`}
                  >
                    <span>{day.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-brand-blue/15 text-brand-blue font-black' : 'bg-gray-150 text-gray-500'
                    }`}>
                      {isSelected ? 'راحة ☕' : 'مذاكرة 📖'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notifications and Study Reminder */}
          <div className="space-y-3 text-right border-t border-gray-100 pt-6">
            <label className="block text-sm font-bold text-brand-blue flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-gold animate-swing" />
              <span>ضبط منبه وتذكير المذاكرة اليومي ⏰</span>
            </label>
            <p className="text-xs text-gray-500 leading-relaxed">
              حدد الوقت المفضل لمذاكرتك، وسيقوم الموقع بإرسال تنبيه على جهازك/هاتفك (الأندرويد والآيفون) لتذكيرك ببدء الحصة اليومية حتى لو كنت خارج المتصفح! 📱
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <input
                type="time"
                value={studyReminderTime}
                onChange={(e) => setStudyReminderTime(e.target.value)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold text-brand-blue font-bold font-mono text-center"
              />
              <span className="text-xs text-brand-gold font-bold bg-brand-blue/5 border border-brand-gold/20 px-3 py-1.5 rounded-lg">
                {studyReminderTime ? `⏰ تذكير المذاكرة مفعّل في الساعة ${studyReminderTime}` : '😴 المنبه غير مفعّل (اختر وقتاً لتنشيط التنبيهات)'}
              </span>
            </div>

            {/* Interactive Test Notification Button */}
            <div className="bg-brand-gold/5 border border-brand-gold/20 p-4 rounded-xl flex flex-col gap-4 text-right">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="block text-xs font-black text-brand-blue">هل تود اختبار التنبيهات على هاتفك؟ 🤔</span>
                  <span className="block text-[11px] text-gray-500">
                    اضغط على الزر الجانبي، وسيصلك تنبيه حقيقي على شاشة هاتفك (أندرويد / آيفون) لتتأكد من عمل الميزة بشكل ممتاز!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={testNotificationState !== 'idle'}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-md shrink-0 cursor-pointer ${
                    testNotificationState === 'idle'
                      ? 'bg-brand-blue text-white hover:bg-brand-blue-light'
                      : testNotificationState === 'requesting'
                      ? 'bg-slate-200 text-slate-500 cursor-wait'
                      : testNotificationState === 'countdown'
                      ? 'bg-brand-gold text-brand-blue font-mono animate-pulse'
                      : 'bg-green-500 text-white'
                  }`}
                >
                  {testNotificationState === 'idle' && '🔔 تجربة التنبيه الآن'}
                  {testNotificationState === 'requesting' && 'جاري طلب الإذن...'}
                  {testNotificationState === 'countdown' && `سيصلك التنبيه خلال ${countdown} ثوانٍ...`}
                  {testNotificationState === 'sent' && '✅ تم إرسال التنبيه!'}
                </button>
              </div>

              {/* Guide Link Button */}
              <div className="border-t border-brand-gold/10 pt-3 flex justify-start">
                <button
                  type="button"
                  onClick={() => setIsGuideOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-black text-brand-blue/70 hover:text-brand-blue cursor-pointer bg-brand-blue/5 hover:bg-brand-blue/10 px-3 py-1.5 rounded-lg transition-all"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-brand-gold animate-pulse" />
                  <span>دليل وشرح تفعيل التنبيهات للأندرويد والآيفون خطوة بخطوة 💡</span>
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="btn-generate-schedule"
            type="submit"
            className="w-full py-4 rounded-xl text-lg font-bold bg-brand-gold text-brand-blue hover:bg-brand-gold-light hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 shadow-lg shadow-brand-gold/15 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            <span>جدولني</span>
          </button>

        </form>
      </motion.div>

      {/* Guide Modal */}
      <NotificationGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

    </div>
  );
}
