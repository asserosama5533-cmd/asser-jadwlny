import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, Calendar, BookOpen, Award, CheckCircle2, 
  ChevronDown, ChevronUp, AlertCircle, Plus, Smile, BookMarked,
  Info, Trash2, Bell, Clock, HelpCircle
} from 'lucide-react';
import { Page, Schedule, StudyDay, DailyError } from '../types';
import { 
  getSchedules, saveSchedule, isQuantCompleted, setQuantCompleted, 
  isVerbalCompleted, setVerbalCompleted, getCompletionStats,
  addDailyError, getDailyErrors, deleteDailyError
} from '../utils/storage';
import SchedulePoster from './SchedulePoster';
import NotificationGuideModal from './NotificationGuideModal';

interface ScheduleDetailProps {
  scheduleId: string;
  setPage: (page: Page) => void;
  session: any;
}

export default function ScheduleDetail({ scheduleId, setPage, session }: ScheduleDetailProps) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);

  // Study reminder states in detail page
  const [detailReminderTime, setDetailReminderTime] = useState<string>('');
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
            const body = schedule 
              ? `يا بطل، حان وقت مذاكرة جدولك "${schedule.name}". همتك عالية والـ 100% بانتظارك! 💪✨`
              : 'يا بطل، حان وقت مذاكرة جدولك اليومي. همتك عالية والـ 100% بانتظارك! 💪✨';
            
            // Register server-side push subscription so they get background notifications
            import('../utils/pushHelper').then(({ syncPushSubscription }) => {
              syncPushSubscription(undefined, true);
            });

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

  const handleUpdateReminder = (time: string) => {
    setDetailReminderTime(time);
    if (!schedule) return;

    const updated = {
      ...schedule,
      studyReminderTime: time || undefined
    };

    setSchedule(updated);
    saveSchedule(updated);

    // Synchronize the updated reminder list with the server-side Web Push subscription
    import('../utils/pushHelper').then(({ syncPushSubscription }) => {
      syncPushSubscription(undefined, time ? true : false);
    });

    // Request permissions if enabling
    if (time && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  };

  const [activeTab, setActiveTab] = useState<'study' | 'poster'>('study');
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [scheduleErrors, setScheduleErrors] = useState<DailyError[]>([]);

  // Schedule Editing States
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editScheduleType, setEditScheduleType] = useState<'both' | 'quant' | 'verbal'>('both');
  
  // Day-specific Editing States
  const [editingDayNumber, setEditingDayNumber] = useState<number | null>(null);
  const [editQuantBanks, setEditQuantBanks] = useState('');
  const [editVerbalSections, setEditVerbalSections] = useState('');
  
  // Quick error modal states
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errType, setErrType] = useState<'quant' | 'verbal'>('quant');
  const [errItemNum, setErrItemNum] = useState<number | ''>(1);
  const [errQuestionNum, setErrQuestionNum] = useState<number | ''>(1);
  const [errNote, setErrNote] = useState('');
  const [errSuccessMsg, setErrSuccessMsg] = useState('');
  const [errDayNum, setErrDayNum] = useState<number | undefined>(undefined);

  // Inline quick error states per day
  const [inlineErrItem, setInlineErrItem] = useState<Record<number, string>>({});
  const [inlineErrQNum, setInlineErrQNum] = useState<Record<number, string>>({});
  const [inlineErrNote, setInlineErrNote] = useState<Record<number, string>>({});

  // Bulk Range Selection States for Verbal
  const [verbalRangeStart, setVerbalRangeStart] = useState<Record<number, number>>({});
  const [verbalRangeEnd, setVerbalRangeEnd] = useState<Record<number, number>>({});
  const [showRangeForm, setShowRangeForm] = useState<Record<number, boolean>>({});

  // Force re-renders when progress is updated
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // In-memory cache for completed quants and verbals to prevent slow localStorage queries during renders
  const [completedQuants, setCompletedQuants] = useState<Record<number, boolean>>({});
  const [completedVerbals, setCompletedVerbals] = useState<Record<number, boolean>>({});

  // Custom Redistribution and Non-blocking alert/confirm modal states
  const [distributeMode, setDistributeMode] = useState<'all' | '2days' | '3days'>('all');
  const [redistributeDayNum, setRedistributeDayNum] = useState<number | null>(null);
  const [redistributeQuantCount, setRedistributeQuantCount] = useState<number>(0);
  const [redistributeVerbalCount, setRedistributeVerbalCount] = useState<number>(0);
  const [redistributeRemainingDays, setRedistributeRemainingDays] = useState<number>(0);
  const [customAlertMsg, setCustomAlertMsg] = useState<string | null>(null);
  const [customSuccessMsg, setCustomSuccessMsg] = useState<string | null>(null);
  const [deleteConfirmDayNum, setDeleteConfirmDayNum] = useState<number | null>(null);

  const activeModalDay = schedule?.daysList.find(d => d.dayNumber === errDayNum);

  useEffect(() => {
    const schedules = getSchedules();
    const found = schedules.find(s => s.id === scheduleId);
    if (found) {
      setSchedule(found);
      setDetailReminderTime(found.studyReminderTime || '');
      setEditName(found.name);
      setEditStartDate(found.startDate);
      setEditScheduleType(found.scheduleType || 'both');
      setStats(getCompletionStats(found));
      setScheduleErrors(getDailyErrors(scheduleId));

      // Prefetch completion lists for very fast rendering without localStorage overhead
      const qMap: Record<number, boolean> = {};
      const vMap: Record<number, boolean> = {};
      found.daysList.forEach(day => {
        day.quantBanks.forEach(b => {
          qMap[b] = isQuantCompleted(b);
        });
        day.verbalSections.forEach(s => {
          vMap[s] = isVerbalCompleted(s);
        });
      });
      setCompletedQuants(qMap);
      setCompletedVerbals(vMap);

      // Initialize default selected inline items for each study day
      const initialItems: Record<number, string> = {};
      found.daysList.forEach(day => {
        if (day.isStudyDay) {
          if (day.quantBanks.length > 0) {
            initialItems[day.dayNumber] = `quant-${day.quantBanks[0]}`;
          } else if (day.verbalSections.length > 0) {
            initialItems[day.dayNumber] = `verbal-${day.verbalSections[0]}`;
          }
        }
      });
      setInlineErrItem(prev => ({ ...initialItems, ...prev }));

      // Expand the first study day by default
      const firstStudyDay = found.daysList.find(d => d.isStudyDay);
      if (firstStudyDay && expandedDay === null) {
        setExpandedDay(firstStudyDay.dayNumber);
      }
    } else {
      setPage('schedules');
    }
  }, [scheduleId, updateTrigger]);

  const handleInlineItemChange = (dayNum: number, value: string) => {
    setInlineErrItem(prev => ({ ...prev, [dayNum]: value }));
  };

  const handleInlineQNumChange = (dayNum: number, value: string) => {
    setInlineErrQNum(prev => ({ ...prev, [dayNum]: value }));
  };

  const handleInlineNoteChange = (dayNum: number, value: string) => {
    setInlineErrNote(prev => ({ ...prev, [dayNum]: value }));
  };

  const handleSaveInlineError = (dayNum: number) => {
    const itemVal = inlineErrItem[dayNum];
    const qNumStr = inlineErrQNum[dayNum];
    const noteVal = inlineErrNote[dayNum] || '';

    if (!itemVal || !qNumStr) {
      alert('يرجى تحديد المهمة وإدخال رقم السؤال أولاً.');
      return;
    }

    const qNum = parseInt(qNumStr);
    if (isNaN(qNum) || qNum <= 0) {
      alert('يرجى إدخال رقم سؤال صحيح.');
      return;
    }

    const [type, itemStr] = itemVal.split('-');
    const itemNum = parseInt(itemStr);

    addDailyError({
      scheduleId: scheduleId,
      dayNumber: dayNum,
      type: type as 'quant' | 'verbal',
      itemNumber: itemNum,
      questionNumber: qNum,
      note: noteVal.trim()
    });

    // Reset inputs for this day
    setInlineErrQNum(prev => ({ ...prev, [dayNum]: '' }));
    setInlineErrNote(prev => ({ ...prev, [dayNum]: '' }));
    setUpdateTrigger(prev => prev + 1);
  };

  if (!schedule || !stats) {
    return (
      <div className="py-20 text-center text-brand-blue font-bold">
        جاري تحميل الجدول...
      </div>
    );
  }

  const handleToggleQuant = (bankNum: number) => {
    const current = !!completedQuants[bankNum];
    setQuantCompleted(bankNum, !current);
    setCompletedQuants(prev => ({ ...prev, [bankNum]: !current }));
    setUpdateTrigger(prev => prev + 1);
  };

  const handleToggleVerbal = (secNum: number) => {
    const current = !!completedVerbals[secNum];
    setVerbalCompleted(secNum, !current);
    setCompletedVerbals(prev => ({ ...prev, [secNum]: !current }));
    setUpdateTrigger(prev => prev + 1);
  };

  const handleBulkToggleVerbalRange = (dayNum: number, sections: number[], completed: boolean) => {
    const startVal = verbalRangeStart[dayNum] ?? sections[0];
    const endVal = verbalRangeEnd[dayNum] ?? sections[sections.length - 1];

    const min = Math.min(startVal, endVal);
    const max = Math.max(startVal, endVal);

    const targetSections = sections.filter(sec => sec >= min && sec <= max);

    targetSections.forEach(secNum => {
      setVerbalCompleted(secNum, completed);
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
    setUpdateTrigger(prev => prev + 1);
  };

  const handleOpenErrorForm = (type: 'quant' | 'verbal', itemNum: number, dayNum?: number) => {
    setErrType(type);
    setErrItemNum(itemNum);
    setErrQuestionNum(1);
    setErrNote('');
    setErrSuccessMsg('');
    setErrDayNum(dayNum);
    setShowErrorModal(true);
  };

  const handleDeleteError = (id: string) => {
    deleteDailyError(id);
    setUpdateTrigger(prev => prev + 1);
  };

  const handleSaveSettings = () => {
    if (!schedule) return;
    if (!editName.trim()) {
      alert('الرجاء إدخال اسم صحيح للجدول.');
      return;
    }

    // If the start date changed, recalculate the date strings for all days sequentially
    let updatedDaysList = [...schedule.daysList];
    if (editStartDate !== schedule.startDate) {
      try {
        const newStart = new Date(editStartDate);
        if (!isNaN(newStart.getTime())) {
          updatedDaysList = schedule.daysList.map((day, idx) => {
            const currentDayDate = new Date(newStart);
            currentDayDate.setDate(newStart.getDate() + idx);
            const y = currentDayDate.getFullYear();
            const m = String(currentDayDate.getMonth() + 1).padStart(2, '0');
            const d = String(currentDayDate.getDate()).padStart(2, '0');
            return {
              ...day,
              dateString: `${y}-${m}-${d}`,
              isFriday: currentDayDate.getDay() === 5
            };
          });
        }
      } catch (e) {
        console.error("Failed to parse or calculate new dates:", e);
      }
    }

    // Handle changing the schedule type if it is different from original
    if (editScheduleType !== schedule.scheduleType) {
      const qFrom = schedule.quantRange?.from || 1;
      const qTo = schedule.quantRange?.to || 124;
      const vFrom = schedule.verbalRange?.from || 1;
      const vTo = schedule.verbalRange?.to || 257;

      const studyDaysIndices = updatedDaysList
        .map((day, idx) => ({ day, idx }))
        .filter(item => item.day.isStudyDay);

      // If no study days are found, use all days
      const targets = studyDaysIndices.length > 0 
        ? studyDaysIndices 
        : updatedDaysList.map((day, idx) => ({ day, idx }));

      const totalStudyDaysCount = targets.length;

      // Initialize all study days with empty tasks for a clean slate
      updatedDaysList = updatedDaysList.map(day => ({
        ...day,
        quantBanks: [],
        verbalSections: []
      }));

      // Now distribute tasks based on the selected type
      targets.forEach((target, currentStudyDayIndex) => {
        const dayIdx = target.idx;
        const originalDay = updatedDaysList[dayIdx];
        let dayQuantBanks: number[] = [];
        let dayVerbalSections: number[] = [];

        if (editScheduleType !== 'verbal') {
          // Add Quant
          if (schedule.useSeparateDurations && editScheduleType === 'both') {
            const quantDuration = schedule.quantDuration || 30;
            if (currentStudyDayIndex < quantDuration) {
              const totalQuant = Math.max(1, qTo - qFrom + 1);
              const qStartOffset = Math.floor(currentStudyDayIndex * totalQuant / quantDuration);
              const qEndOffset = Math.floor((currentStudyDayIndex + 1) * totalQuant / quantDuration);
              for (let q = qStartOffset; q < qEndOffset; q++) {
                const bankNum = qFrom + q;
                if (bankNum <= qTo) dayQuantBanks.push(bankNum);
              }
            }
          } else {
            const totalQuant = Math.max(1, qTo - qFrom + 1);
            const qStartOffset = Math.floor(currentStudyDayIndex * totalQuant / totalStudyDaysCount);
            const qEndOffset = Math.floor((currentStudyDayIndex + 1) * totalQuant / totalStudyDaysCount);
            for (let q = qStartOffset; q < qEndOffset; q++) {
              const bankNum = qFrom + q;
              if (bankNum <= qTo) dayQuantBanks.push(bankNum);
            }
          }
        }

        if (editScheduleType !== 'quant') {
          // Add Verbal
          if (schedule.useSeparateDurations && editScheduleType === 'both') {
            const verbalDuration = schedule.verbalDuration || 5;
            const verbalRestDays = schedule.verbalRestDays || 0;
            const verbalCycleLength = verbalDuration + verbalRestDays;
            const cyclePos = currentStudyDayIndex % verbalCycleLength;
            if (cyclePos < verbalDuration) {
              const totalVerbal = Math.max(1, vTo - vFrom + 1);
              const vStartOffset = Math.floor(cyclePos * totalVerbal / verbalDuration);
              const vEndOffset = Math.floor((cyclePos + 1) * totalVerbal / verbalDuration);
              for (let v = vStartOffset; v < vEndOffset; v++) {
                const secNum = vFrom + v;
                if (secNum <= vTo) dayVerbalSections.push(secNum);
              }
            }
          } else {
            const totalVerbal = Math.max(1, vTo - vFrom + 1);
            const vStartOffset = Math.floor(currentStudyDayIndex * totalVerbal / totalStudyDaysCount);
            const vEndOffset = Math.floor((currentStudyDayIndex + 1) * totalVerbal / totalStudyDaysCount);
            for (let v = vStartOffset; v < vEndOffset; v++) {
              const secNum = vFrom + v;
              if (secNum <= vTo) dayVerbalSections.push(secNum);
            }
          }
        }

        updatedDaysList[dayIdx] = {
          ...originalDay,
          quantBanks: dayQuantBanks,
          verbalSections: dayVerbalSections,
          isStudyDay: dayQuantBanks.length > 0 || dayVerbalSections.length > 0
        };
      });

      // Reindex studyDayIndex for sequential consistency
      let studyIndexCounter = 1;
      updatedDaysList = updatedDaysList.map(day => {
        const isStudy = day.isStudyDay;
        const sIndex = isStudy ? studyIndexCounter++ : undefined;
        return {
          ...day,
          studyDayIndex: sIndex
        };
      });
    }

    const updated: Schedule = {
      ...schedule,
      name: editName.trim(),
      startDate: editStartDate,
      scheduleType: editScheduleType,
      daysList: updatedDaysList,
      totalStudyDays: updatedDaysList.filter(d => d.isStudyDay).length
    };

    saveSchedule(updated);
    setSchedule(updated);
    setStats(getCompletionStats(updated));
    setIsEditingSettings(false);
    setUpdateTrigger(prev => prev + 1);

    if (editScheduleType !== schedule.scheduleType) {
      setCustomSuccessMsg("تم تعديل تركيز الجدول بنجاح! تم إعادة توزيع المهام وتحديث خطتك الدراسية تلقائياً دون ضياع تقدمك. ✨");
    } else {
      setCustomSuccessMsg("تم حفظ معلومات وتعديلات الجدول بنجاح! 💾");
    }
  };

  const handleStartEditDay = (day: StudyDay) => {
    setEditingDayNumber(day.dayNumber);
    setEditQuantBanks(day.quantBanks.join(', '));
    setEditVerbalSections(day.verbalSections.join(', '));
  };

  const handleSaveDayEdits = (dayNumber: number) => {
    if (!schedule) return;

    // Parse quant banks
    const qBanks = editQuantBanks
      .split(',')
      .map(item => parseInt(item.trim()))
      .filter(num => !isNaN(num) && num > 0);

    // Parse verbal sections
    const vSections = editVerbalSections
      .split(',')
      .map(item => parseInt(item.trim()))
      .filter(num => !isNaN(num) && num > 0);

    const updatedDaysList = schedule.daysList.map(day => {
      if (day.dayNumber === dayNumber) {
        return {
          ...day,
          quantBanks: qBanks,
          verbalSections: vSections,
          isStudyDay: qBanks.length > 0 || vSections.length > 0
        };
      }
      return day;
    });

    // Reindex studyDayIndex for sequential consistency
    let studyIndexCounter = 1;
    const reindexedDays = updatedDaysList.map(day => {
      const isStudy = day.isStudyDay;
      const sIndex = isStudy ? studyIndexCounter++ : undefined;
      return {
        ...day,
        studyDayIndex: sIndex
      };
    });

    const updated: Schedule = {
      ...schedule,
      daysList: reindexedDays,
      totalCalendarDays: reindexedDays.length,
      totalStudyDays: reindexedDays.filter(d => d.isStudyDay).length
    };

    saveSchedule(updated);
    setSchedule(updated);
    setEditingDayNumber(null);
    setUpdateTrigger(prev => prev + 1);
  };

  const handleAddNewDay = () => {
    if (!schedule) return;

    const lastDay = schedule.daysList[schedule.daysList.length - 1];
    const newDayNumber = (lastDay?.dayNumber || 0) + 1;
    
    let newDateString = "";
    try {
      const startDateObj = new Date(schedule.startDate);
      startDateObj.setDate(startDateObj.getDate() + newDayNumber - 1);
      const y = startDateObj.getFullYear();
      const m = String(startDateObj.getMonth() + 1).padStart(2, '0');
      const d = String(startDateObj.getDate()).padStart(2, '0');
      newDateString = `${y}-${m}-${d}`;
    } catch (e) {
      const today = new Date();
      newDateString = today.toISOString().split('T')[0];
    }

    const newDay: StudyDay = {
      dayNumber: newDayNumber,
      dateString: newDateString,
      isFriday: new Date(newDateString).getDay() === 5,
      isStudyDay: true,
      studyDayIndex: (schedule.daysList.filter(d => d.isStudyDay).length || 0) + 1,
      quantBanks: [],
      verbalSections: []
    };

    const updated: Schedule = {
      ...schedule,
      daysList: [...schedule.daysList, newDay],
      totalCalendarDays: schedule.totalCalendarDays + 1,
      totalStudyDays: schedule.totalStudyDays + 1
    };

    saveSchedule(updated);
    setSchedule(updated);
    setUpdateTrigger(prev => prev + 1);
  };

  const handleDeleteDay = (dayNumber: number) => {
    if (!schedule) return;
    if (schedule.daysList.length <= 1) {
      setCustomAlertMsg("لا يمكنك حذف اليوم الأخير المتبقي في الجدول!");
      return;
    }

    setDeleteConfirmDayNum(dayNumber);
  };

  const executeDeleteDay = () => {
    if (!schedule || deleteConfirmDayNum === null) return;
    const targetDayNumber = deleteConfirmDayNum;

    const dayToDelete = schedule.daysList.find(day => day.dayNumber === targetDayNumber);
    const quantBanksToDistribute = dayToDelete ? [...dayToDelete.quantBanks] : [];
    const verbalSectionsToDistribute = dayToDelete ? [...dayToDelete.verbalSections] : [];

    // Filter out the deleted day
    const filteredDays = schedule.daysList
      .filter(day => day.dayNumber !== targetDayNumber)
      .map(day => ({
        ...day,
        quantBanks: [...day.quantBanks],
        verbalSections: [...day.verbalSections]
      }));
    
    // Distribute tasks to the remaining active study days
    const remainingStudyDays = filteredDays.filter(d => d.isStudyDay);
    const targets = remainingStudyDays.length > 0 ? remainingStudyDays : filteredDays;

    if (targets.length > 0) {
      if (quantBanksToDistribute.length > 0) {
        let qIdx = 0;
        quantBanksToDistribute.forEach(bank => {
          const targetDay = targets[qIdx % targets.length];
          if (!targetDay.quantBanks.includes(bank)) {
            targetDay.quantBanks = [...targetDay.quantBanks, bank].sort((a, b) => a - b);
          }
          qIdx++;
        });
      }

      if (verbalSectionsToDistribute.length > 0) {
        let vIdx = 0;
        verbalSectionsToDistribute.forEach(sec => {
          const targetDay = targets[vIdx % targets.length];
          if (!targetDay.verbalSections.includes(sec)) {
            targetDay.verbalSections = [...targetDay.verbalSections, sec].sort((a, b) => a - b);
          }
          vIdx++;
        });
      }
    }

    let studyIndexCounter = 1;
    const reindexedDays = filteredDays.map((day, idx) => {
      const dayNum = idx + 1;
      
      let newDateString = day.dateString;
      try {
        const startDateObj = new Date(schedule.startDate);
        startDateObj.setDate(startDateObj.getDate() + idx);
        const y = startDateObj.getFullYear();
        const m = String(startDateObj.getMonth() + 1).padStart(2, '0');
        const d = String(startDateObj.getDate()).padStart(2, '0');
        newDateString = `${y}-${m}-${d}`;
      } catch (e) {
        // use old
      }

      const isStudy = day.isStudyDay;
      const sIndex = isStudy ? studyIndexCounter++ : undefined;

      return {
        ...day,
        dayNumber: dayNum,
        dateString: newDateString,
        studyDayIndex: sIndex
      };
    });

    const updated: Schedule = {
      ...schedule,
      daysList: reindexedDays,
      totalCalendarDays: reindexedDays.length,
      totalStudyDays: reindexedDays.filter(d => d.isStudyDay).length
    };

    saveSchedule(updated);
    setSchedule(updated);
    setDeleteConfirmDayNum(null);
    setUpdateTrigger(prev => prev + 1);
    setCustomSuccessMsg("تم حذف اليوم بنجاح، وتوزيع مهامه وتعديل ترتيب بقية الأيام تلقائياً!");
  };

  const handleToggleRestDay = (dayNumber: number, toRest: boolean) => {
    if (!schedule) return;

    const targetDay = schedule.daysList.find(d => d.dayNumber === dayNumber);
    const quantBanksToDistribute = targetDay && toRest ? [...targetDay.quantBanks] : [];
    const verbalSectionsToDistribute = targetDay && toRest ? [...targetDay.verbalSections] : [];

    const updatedDaysList = schedule.daysList.map(day => {
      if (day.dayNumber === dayNumber) {
        return {
          ...day,
          isStudyDay: !toRest,
          // If converting to rest day, clear its tasks
          quantBanks: toRest ? [] : day.quantBanks,
          verbalSections: toRest ? [] : day.verbalSections
        };
      }
      return {
        ...day,
        quantBanks: [...day.quantBanks],
        verbalSections: [...day.verbalSections]
      };
    });

    // If converting to rest day, distribute its tasks to the other study days
    if (toRest) {
      const otherStudyDays = updatedDaysList.filter(day => day.dayNumber !== dayNumber && day.isStudyDay);
      const targets = otherStudyDays.length > 0 ? otherStudyDays : updatedDaysList.filter(day => day.dayNumber !== dayNumber);

      if (targets.length > 0) {
        if (quantBanksToDistribute.length > 0) {
          let qIdx = 0;
          quantBanksToDistribute.forEach(bank => {
            const destDay = targets[qIdx % targets.length];
            if (!destDay.quantBanks.includes(bank)) {
              destDay.quantBanks = [...destDay.quantBanks, bank].sort((a, b) => a - b);
            }
            qIdx++;
          });
        }

        if (verbalSectionsToDistribute.length > 0) {
          let vIdx = 0;
          verbalSectionsToDistribute.forEach(sec => {
            const destDay = targets[vIdx % targets.length];
            if (!destDay.verbalSections.includes(sec)) {
              destDay.verbalSections = [...destDay.verbalSections, sec].sort((a, b) => a - b);
            }
            vIdx++;
          });
        }
      }
    }

    // Reindex studyDayIndex for sequential consistency
    let studyIndexCounter = 1;
    const reindexedDays = updatedDaysList.map(day => {
      const isStudy = day.isStudyDay;
      const sIndex = isStudy ? studyIndexCounter++ : undefined;
      return {
        ...day,
        studyDayIndex: sIndex
      };
    });

    const updated: Schedule = {
      ...schedule,
      daysList: reindexedDays,
      totalCalendarDays: reindexedDays.length,
      totalStudyDays: reindexedDays.filter(d => d.isStudyDay).length
    };

    saveSchedule(updated);
    setSchedule(updated);
    setUpdateTrigger(prev => prev + 1);

    if (toRest) {
      setCustomSuccessMsg("تم تحويل اليوم إلى إجازة وتوزيع مهامه (البنوك والأقسام) على بقية الأيام بنجاح! 🌴");
    } else {
      setCustomSuccessMsg("تم تحويل اليوم إلى يوم دراسي بنجاح! يمكنك الآن نقل بنوك أو أقسام إليه.");
    }
  };

  const handleAddErrorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!errItemNum || !errQuestionNum) return;

    addDailyError({
      scheduleId: schedule.id,
      dayNumber: errDayNum,
      type: errType,
      itemNumber: Number(errItemNum),
      questionNumber: Number(errQuestionNum),
      note: errNote.trim()
    });

    setErrSuccessMsg('تم تسجيل الخطأ بنجاح! ستجده في قائمة الأخطاء بملفك الشخصي وتحت هذا اليوم.');
    setUpdateTrigger(prev => prev + 1);
    setTimeout(() => {
      setShowErrorModal(false);
      setErrSuccessMsg('');
    }, 2000);
  };

  const handleRedistributeMissedDay = (dayNum: number) => {
    if (!schedule) return;

    // Find the day
    const dayIndex = schedule.daysList.findIndex(d => d.dayNumber === dayNum);
    if (dayIndex === -1) return;

    const day = schedule.daysList[dayIndex];
    
    // Get uncompleted tasks of this day
    const uncompletedQuant = day.quantBanks.filter(b => !isQuantCompleted(b));
    const uncompletedVerbal = day.verbalSections.filter(s => !isVerbalCompleted(s));

    if (uncompletedQuant.length === 0 && uncompletedVerbal.length === 0) {
      setCustomAlertMsg("كل مهام هذا اليوم منجزة بالفعل! لا توجد مهام غير مكتملة لإعادة توزيعها.");
      return;
    }

    // Find remaining study days after dayNum
    const remainingStudyDays = schedule.daysList.filter(d => d.dayNumber > dayNum && d.isStudyDay);

    if (remainingStudyDays.length === 0) {
      setCustomAlertMsg("هذا هو اليوم الدراسي الأخير في الجدول! لا توجد أيام دراسية متبقية لإعادة توزيع المهام عليها.");
      return;
    }

    // Trigger confirmation modal with precise info
    setRedistributeDayNum(dayNum);
    setRedistributeQuantCount(uncompletedQuant.length);
    setRedistributeVerbalCount(uncompletedVerbal.length);
    setRedistributeRemainingDays(remainingStudyDays.length);
  };

  const executeRedistribution = () => {
    if (!schedule || redistributeDayNum === null) return;

    const dayNum = redistributeDayNum;
    const dayIndex = schedule.daysList.findIndex(d => d.dayNumber === dayNum);
    if (dayIndex === -1) return;

    const day = schedule.daysList[dayIndex];
    
    // Get uncompleted tasks of this day
    const uncompletedQuant = day.quantBanks.filter(b => !isQuantCompleted(b));
    const uncompletedVerbal = day.verbalSections.filter(s => !isVerbalCompleted(s));

    // Clone the daysList to mutate it safely
    const updatedDaysList = schedule.daysList.map(d => {
      return {
        ...d,
        quantBanks: [...d.quantBanks],
        verbalSections: [...d.verbalSections]
      };
    });

    const currentDayClone = updatedDaysList.find(d => d.dayNumber === dayNum)!;
    
    // Find all remaining study days after dayNum
    const allRemainingStudyClones = updatedDaysList.filter(d => d.dayNumber > dayNum && d.isStudyDay);
    
    // Apply intelligence distribution mode: spread over all, 3 days or 2 days
    let remainingStudyClones = [...allRemainingStudyClones];
    if (distributeMode === '3days') {
      remainingStudyClones = allRemainingStudyClones.slice(0, 3);
    } else if (distributeMode === '2days') {
      remainingStudyClones = allRemainingStudyClones.slice(0, 2);
    }

    if (remainingStudyClones.length === 0) {
      setRedistributeDayNum(null);
      setCustomAlertMsg("عذراً، لا توجد أيام دراسية متبقية لإعادة التوزيع عليها بالنمط المحدد.");
      return;
    }

    // Remove uncompleted tasks from current day
    currentDayClone.quantBanks = currentDayClone.quantBanks.filter(b => isQuantCompleted(b));
    currentDayClone.verbalSections = currentDayClone.verbalSections.filter(s => isVerbalCompleted(s));

    // Distribute Quant
    uncompletedQuant.forEach((bank, idx) => {
      const target = remainingStudyClones[idx % remainingStudyClones.length];
      if (!target.quantBanks.includes(bank)) {
        target.quantBanks.push(bank);
      }
    });

    // Distribute Verbal
    uncompletedVerbal.forEach((sec, idx) => {
      const target = remainingStudyClones[idx % remainingStudyClones.length];
      if (!target.verbalSections.includes(sec)) {
        target.verbalSections.push(sec);
      }
    });

    // Sort lists to keep them beautiful
    remainingStudyClones.forEach(target => {
      target.quantBanks.sort((a, b) => a - b);
      target.verbalSections.sort((a, b) => a - b);
    });

    // Update the schedule object
    const updatedSchedule: Schedule = {
      ...schedule,
      daysList: updatedDaysList
    };

    // Save to localStorage
    saveSchedule(updatedSchedule);

    // Update state and stats
    setSchedule(updatedSchedule);
    setStats(getCompletionStats(updatedSchedule));
    setUpdateTrigger(prev => prev + 1);

    // Close Confirmation Modal
    setRedistributeDayNum(null);

    // Show Custom Success Message Overlay
    const modeText = distributeMode === 'all' 
      ? 'كامل الأيام المتبقية' 
      : distributeMode === '3days' 
        ? 'الـ 3 أيام القادمة' 
        : 'اليومين القادمين';
    setCustomSuccessMsg(`تم ترحيل المهام وإعادة توزيع الخطة بنجاح على ${modeText} في جدولك! 🤍`);

    // Expand the next study day if any
    if (remainingStudyClones.length > 0) {
      setExpandedDay(remainingStudyClones[0].dayNumber);
    }
  };

  const handleRestartCycle = () => {
    if (!schedule) return;

    // Reset progress for all tasks in this schedule
    schedule.daysList.forEach(day => {
      day.quantBanks.forEach(b => {
        setQuantCompleted(b, false);
      });
      day.verbalSections.forEach(s => {
        setVerbalCompleted(s, false);
      });
    });

    // Increment cycleCount
    const nextCycle = (schedule.cycleCount || 1) + 1;
    const updatedSchedule: Schedule = {
      ...schedule,
      cycleCount: nextCycle
    };

    saveSchedule(updatedSchedule);
    setSchedule(updatedSchedule);
    setStats(getCompletionStats(updatedSchedule));
    setUpdateTrigger(prev => prev + 1);

    // Close any modal
    setRedistributeDayNum(null);

    setCustomSuccessMsg(`تهانينا يا بطل! 🎉 تم تصفير التقدم وبدء دورة المراجعة رقم ${nextCycle} بنجاح. بالتوفيق في رحلتك الجديدة! 🚀`);
  };

  return (
    <div id="schedule-detail-page" className="max-w-6xl mx-auto px-4 py-8">
      
      {/* Back button and title */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-8 text-right">
        <button
          id="btn-back-to-list"
          onClick={() => setPage('schedules')}
          className="flex items-center gap-2 text-brand-blue/70 hover:text-brand-blue text-sm font-bold transition-all cursor-pointer self-start"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لجداولي</span>
        </button>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-end">
          <button
            onClick={() => {
              if (isEditingSettings) {
                handleSaveSettings();
              } else {
                setIsEditingSettings(true);
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-brand-blue font-bold text-xs transition-all flex items-center gap-1 cursor-pointer order-last sm:order-first"
          >
            <span>{isEditingSettings ? '✅ حفظ التغييرات' : '⚙️ تعديل معلومات الجدول'}</span>
          </button>
          
          {isEditingSettings ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-lg font-black text-brand-blue border-b-2 border-brand-gold focus:outline-none px-2 py-1 max-w-xs text-right"
              placeholder="اسم الجدول"
            />
          ) : (
            <h1 className="text-xl sm:text-2xl font-black text-brand-blue">{schedule.name}</h1>
          )}
        </div>
      </div>

      {/* Settings Edit Area */}
      {isEditingSettings && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-brand-gold/5 border-2 border-brand-gold/20 rounded-2xl p-4 mb-8 text-right space-y-4"
        >
          <h3 className="text-sm font-black text-brand-blue">تعديل معلومات وتاريخ بدء الجدول</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600">اسم الجدول الجديد:</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-gold"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600">تاريخ البدء:</label>
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-gold"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600">تركيز الجدول (نوع المذاكرة):</label>
              <select
                value={editScheduleType}
                onChange={(e) => setEditScheduleType(e.target.value as 'both' | 'quant' | 'verbal')}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-gold font-bold text-right"
              >
                <option value="both">📖 كمي ولفظي معاً</option>
                <option value="quant">🔢 كمي فقط (سيحذف اللفظي)</option>
                <option value="verbal">✍️ لفظي فقط (سيحذف الكمي)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              onClick={() => setIsEditingSettings(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={handleSaveSettings}
              className="px-4 py-2 bg-brand-gold hover:bg-brand-gold-light text-brand-blue font-black text-xs rounded-xl transition-all cursor-pointer"
            >
              حفظ التعديلات
            </button>
          </div>
        </motion.div>
      )}

      {/* Progress Card */}
      <div className="bg-white border border-brand-blue/5 rounded-2xl shadow-xl shadow-brand-blue/5 p-6 mb-8 text-right">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          
          {/* Progress Percent circular visual */}
          <div className="flex items-center justify-start md:justify-center gap-4">
            <div className="relative w-20 h-20 flex items-center justify-center rounded-full bg-brand-gold/10 border-2 border-brand-gold/20">
              <span className="text-xl font-extrabold text-brand-blue">
                <bdi dir="ltr" className="font-mono tabular-nums">{stats.progressPercent}%</bdi>
              </span>
            </div>
            <div>
              <span className="block text-xs text-gray-500 font-bold">نسبة التحصيل الحالية</span>
              <span className="block text-lg font-black text-brand-blue">إنجاز رائع، استمر!</span>
            </div>
          </div>

          {/* Progress Bar & Details */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex justify-between items-center text-sm font-bold text-brand-blue">
              <span>الكمي: {stats.completedQuant} من {stats.totalQuant} بنك</span>
              <span>اللفظي: {stats.completedVerbal} من {stats.totalVerbal} قسم</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand-gold rounded-full transition-all duration-500" 
                style={{ width: `${stats.progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>تاريخ البدء: {new Date(schedule.startDate).toLocaleDateString('ar-SA')}</span>
              <span>إجمالي المهام المنجزة: {stats.completedTasks} من {stats.totalTasks}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Study Reminder Settings & Live Test Widget */}
      <div className="bg-white border border-brand-blue/5 rounded-2xl shadow-xl shadow-brand-blue/5 p-6 mb-8 text-right space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="space-y-1">
            <h3 className="text-base font-black text-brand-blue flex items-center gap-2">
              <Bell className="w-5 h-5 text-brand-gold animate-swing" />
              <span>منبه وتذكير المذاكرة اليومي ⏰</span>
            </h3>
            <p className="text-xs text-gray-500 max-w-xl">
              تحديد موعد يومي لإرسال تنبيه مباشر وموثوق لهاتفك أو جهازك، ينبهك لبدء جلستك الدراسية تلقائياً حتى عند إغلاق التطبيق.
            </p>
          </div>
          
          <div className="flex items-center gap-3 self-start sm:self-center">
            <span className="text-xs text-slate-400 font-bold">الحالة:</span>
            <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
              detailReminderTime 
                ? 'bg-green-500/10 text-green-600' 
                : 'bg-amber-500/10 text-amber-600'
            }`}>
              {detailReminderTime ? 'مفعّل ✅' : 'معطّل 😴'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center pt-2">
          {/* Inputs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-grow max-w-xs">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <Clock className="w-4 h-4" />
              </div>
              <input
                type="time"
                value={detailReminderTime}
                onChange={(e) => handleUpdateReminder(e.target.value)}
                className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold text-brand-blue font-bold font-mono text-center"
              />
            </div>
            
            <button
              type="button"
              onClick={() => handleUpdateReminder('')}
              disabled={!detailReminderTime}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                detailReminderTime 
                  ? 'bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              إلغاء المنبه 🔕
            </button>
          </div>

          {/* Test Live Notification Card */}
          <div className="bg-brand-gold/5 border border-brand-gold/15 p-4 rounded-xl flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-right">
                <span className="block text-xs font-black text-brand-blue">اختبر التنبيه على جوالك فوراً! 📱</span>
                <span className="block text-[10px] text-gray-500 leading-normal">
                  لتضمن أن التنبيهات تصل لهاتفك بشكل صحيح حتى مع إغلاق الشاشة، اضغط هنا لتجربة منبه حيّ فوري.
                </span>
              </div>
              <button
                type="button"
                onClick={handleTestNotification}
                disabled={testNotificationState !== 'idle'}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm shrink-0 cursor-pointer ${
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
            <div className="border-t border-brand-gold/10 pt-2.5 flex justify-start">
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-black text-brand-blue/70 hover:text-brand-blue cursor-pointer bg-brand-blue/5 hover:bg-brand-blue/10 px-3 py-1.5 rounded-lg transition-all"
              >
                <HelpCircle className="w-3.5 h-3.5 text-brand-gold animate-pulse" />
                <span>دليل وشرح تفعيل التنبيهات على الآيفون والجوال خطوة بخطوة 💡</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Tabs Selector */}
      <div className="flex border-b border-gray-200 mb-8" id="schedule-tabs-container">
        <button
          id="tab-study-table"
          onClick={() => setActiveTab('study')}
          className={`flex-1 py-4 text-center font-bold text-base border-b-2 transition-all ${
            activeTab === 'study'
              ? 'border-brand-gold text-brand-blue'
              : 'border-transparent text-gray-400 hover:text-brand-blue'
          }`}
        >
          جدول المذاكرة وتتبع الإنجاز
        </button>
        <button
          id="tab-download-poster"
          onClick={() => setActiveTab('poster')}
          className={`flex-1 py-4 text-center font-bold text-base border-b-2 transition-all ${
            activeTab === 'poster'
              ? 'border-brand-gold text-brand-blue'
              : 'border-transparent text-gray-400 hover:text-brand-blue'
          }`}
        >
          بوستر الجدول للتحميل (PNG)
        </button>
      </div>

      {/* Tab content area */}
      <AnimatePresence mode="wait">
        {activeTab === 'study' ? (
          
          /* STUDY TABLE VIEW */
          <motion.div
            key="study-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            {/* Celebration Card for 100% Completion & Auto-loop */}
            {stats.completedTasks === stats.totalTasks && stats.totalTasks > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-r from-brand-blue to-brand-blue-light border-2 border-brand-gold/30 rounded-2xl p-6 text-white text-center space-y-4 shadow-xl relative overflow-hidden"
              >
                {/* Sparkle background elements */}
                <div className="absolute top-2 right-2 opacity-15 text-4xl">✨</div>
                <div className="absolute bottom-2 left-2 opacity-15 text-4xl">🎓</div>
                
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/30 mb-2">
                  <Award className="w-10 h-10 animate-bounce text-brand-gold" />
                </div>

                <h3 className="text-2xl font-black text-brand-gold">تهانينا الحارة يا بطل! 🥳🏆</h3>
                
                <p className="text-sm text-gray-200 leading-relaxed font-bold max-w-lg mx-auto">
                  لقد أتممت جميع مهام المذاكرة وأقسام اللفظي وبنوك الكمي في هذا الجدول بنسبة <span className="text-brand-gold font-extrabold text-lg">100٪</span> بنجاح باهر وبجهد جبار!
                </p>

                {schedule.isLoopEnabled ? (
                  <div className="space-y-3">
                    <p className="text-xs text-brand-gold font-black">
                      [ خاصية التكرار مفعّلة: الدورة الحالية رقم {schedule.cycleCount || 1} ]
                    </p>
                    <button
                      id="btn-trigger-next-loop-cycle"
                      onClick={handleRestartCycle}
                      className="px-6 py-3 bg-brand-gold text-brand-blue font-black rounded-xl hover:bg-brand-gold-light transition-all cursor-pointer shadow-lg hover:scale-[1.02] active:scale-[0.98] text-sm"
                    >
                      تصفير وبدء دورة المراجعة التالية (رقم {(schedule.cycleCount || 1) + 1}) 🔄
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-300 font-bold">
                      هل ترغب في إعادة دراسة هذا الجدول كمراجعة وتثبيت؟ قم بتفعيل خاصية التكرار لبدء دورة جديدة.
                    </p>
                    <button
                      id="btn-enable-loop-and-restart"
                      onClick={() => {
                        const updated: Schedule = {
                          ...schedule,
                          isLoopEnabled: true
                        };
                        saveSchedule(updated);
                        setSchedule(updated);
                        // Trigger actual restart
                        setTimeout(() => {
                          handleRestartCycle();
                        }, 200);
                      }}
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black rounded-xl transition-all cursor-pointer text-sm"
                    >
                      تفعيل التكرار وبدء مراجعة جديدة فوراً 🔄
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Auto Loop Toggle Card */}
            <div className="bg-white border border-gray-200/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-right shadow-sm">
              <div className="space-y-1">
                <span className="text-sm font-black text-brand-blue flex items-center gap-1.5 flex-row-reverse justify-end">
                  <span>خاصية التكرار التلقائي (Loop) للجدول 🔄</span>
                </span>
                <p className="text-xs text-gray-500 leading-relaxed font-bold">
                  عند تفعيل هذا الخيار، بمجرد إنهائك لكامل مهام الجدول بنسبة 100٪، سيقوم الموقع ببدء دورة مراجعة جديدة وتصفير التقدم لتتمكن من إعادة حل البنوك وتثبيت معلوماتك!
                </p>
              </div>
              <button
                id="toggle-loop-btn"
                onClick={() => {
                  const updated: Schedule = {
                    ...schedule,
                    isLoopEnabled: !schedule.isLoopEnabled
                  };
                  saveSchedule(updated);
                  setSchedule(updated);
                  setUpdateTrigger(prev => prev + 1);
                  setCustomSuccessMsg(updated.isLoopEnabled ? "تم تفعيل خاصية التكرار التلقائي للجدول بنجاح! 🔄" : "تم إلغاء تفعيل خاصية التكرار التلقائي.");
                }}
                className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm ${
                  schedule.isLoopEnabled 
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                    : 'bg-gray-150 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {schedule.isLoopEnabled ? "مفعّلة حالياً ✔️" : "تفعيل التكرار التلقائي 🔄"}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-brand-blue/5 border border-brand-blue/10 text-brand-blue text-sm flex items-start gap-3 text-right">
              <Info className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                اضغط على اليوم لعرض البنوك والأقسام المطلوبة لمذاكرتها. عند انتهائك من أي بنك أو قسم، <strong>اضغط على الـ Chip الخاص به</strong> ليتحول للون الأخضر ويتم حفظ تقدمك تلقائياً!
              </p>
            </div>

            {/* Calendar Days Accordion */}
            <div className="space-y-3 text-right">
              {schedule.daysList.map((day) => {
                const isExpanded = expandedDay === day.dayNumber;
                
                // Calculate completion for this day
                const hasQuant = day.quantBanks.length > 0;
                const hasVerbal = day.verbalSections.length > 0;
                
                const qDone = day.quantBanks.filter(b => !!completedQuants[b]).length;
                const vDone = day.verbalSections.filter(s => !!completedVerbals[s]).length;
                
                const totalDayTasks = day.quantBanks.length + day.verbalSections.length;
                const completedDayTasks = qDone + vDone;
                const isDayFullyCompleted = day.isStudyDay && totalDayTasks > 0 && completedDayTasks === totalDayTasks;

                return (
                  <div
                    id={`day-accordion-${day.dayNumber}`}
                    key={day.dayNumber}
                    className={`border rounded-2xl overflow-hidden transition-all bg-white ${
                      isDayFullyCompleted 
                        ? 'border-emerald-500/30 shadow-md shadow-emerald-500/2' 
                        : isExpanded 
                          ? 'border-brand-gold/30 shadow-lg shadow-brand-gold/2' 
                          : 'border-gray-100 hover:border-gray-200 shadow-sm'
                    }`}
                  >
                    {/* Header bar of accordion */}
                    <div
                      id={`day-header-${day.dayNumber}`}
                      onClick={() => setExpandedDay(isExpanded ? null : day.dayNumber)}
                      className="p-5 flex justify-between items-center cursor-pointer select-none"
                    >
                      {/* Arrow indicator */}
                      <div className="flex items-center gap-3">
                        {day.isStudyDay && totalDayTasks > 0 && (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            isDayFullyCompleted 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-brand-blue/5 text-brand-blue'
                          }`}>
                            منجز: <bdi dir="ltr">{completedDayTasks}/{totalDayTasks}</bdi>
                          </span>
                        )}
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>

                      {/* Day Name & Date */}
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                          day.isStudyDay 
                            ? isDayFullyCompleted 
                              ? 'bg-emerald-500 text-white' 
                              : 'bg-brand-blue text-white' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          <bdi dir="ltr" className="font-mono tabular-nums">{day.dayNumber}</bdi>
                        </div>
                        <div>
                          <span className="block font-bold text-brand-blue text-base">
                            {day.isStudyDay ? `اليوم الدراسي رقم ${day.studyDayIndex}` : 'يوم الراحة الإسبوعية'}
                          </span>
                          <span className="block text-xs text-gray-500 font-medium">
                            {new Date(day.dateString).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Accordion Body contents */}
                    {isExpanded && (
                      <motion.div
                        id={`day-body-${day.dayNumber}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-100 bg-gray-50/50 p-6"
                      >
                        {editingDayNumber === day.dayNumber ? (
                          <div className="space-y-4 bg-brand-gold/5 border border-brand-gold/20 rounded-2xl p-5 text-right">
                            <h4 className="text-sm font-black text-brand-blue flex items-center gap-1.5 justify-start">
                              <span>✏️ تعديل مهام اليوم الدراسي رقم {day.dayNumber}</span>
                            </h4>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1 text-right">
                                <label className="block text-xs font-bold text-gray-700">أرقام بنوك الكمي (مفصولة بفاصلة):</label>
                                <input
                                  type="text"
                                  value={editQuantBanks}
                                  onChange={(e) => setEditQuantBanks(e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono text-brand-blue text-left focus:outline-none focus:ring-1 focus:ring-brand-gold"
                                  placeholder="مثال: 1, 2"
                                />
                                <span className="block text-[10px] text-gray-400">اتركها فارغة إذا لم تكن هناك بنوك كمي اليوم.</span>
                              </div>
                              
                              <div className="space-y-1 text-right">
                                <label className="block text-xs font-bold text-gray-700">أرقام أقسام اللفظي (مفصولة بفاصلة):</label>
                                <input
                                  type="text"
                                  value={editVerbalSections}
                                  onChange={(e) => setEditVerbalSections(e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono text-brand-blue text-left focus:outline-none focus:ring-1 focus:ring-brand-gold"
                                  placeholder="مثال: 5, 6, 7"
                                />
                                <span className="block text-[10px] text-gray-400">اتركها فارغة إذا لم تكن هناك أقسام لفظية اليوم.</span>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200/50">
                              <button
                                onClick={() => setEditingDayNumber(null)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                              >
                                إلغاء
                              </button>
                              <button
                                onClick={() => handleSaveDayEdits(day.dayNumber)}
                                className="px-4 py-2 bg-brand-gold hover:bg-brand-gold-light text-brand-blue font-black text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                              >
                                حفظ التعديلات
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Inline Controls Row */}
                            <div className="flex justify-between items-center mb-5 border-b border-gray-200/40 pb-3">
                              <span className="text-xs font-bold text-gray-400">التحكم باليوم الدراسي:</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleStartEditDay(day)}
                                  className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-brand-blue text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <span>✏️ تعديل المهام</span>
                                </button>
                                
                                {day.isStudyDay ? (
                                  <button
                                    onClick={() => handleToggleRestDay(day.dayNumber, true)}
                                    className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                    title="تحويل هذا اليوم إلى يوم إجازة/راحة"
                                  >
                                    <span>😴 تحويل لإجازة</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleToggleRestDay(day.dayNumber, false)}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                    title="تحويل هذا اليوم إلى يوم مذاكرة دراسي"
                                  >
                                    <span>📖 تحويل ليوم دراسي</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDeleteDay(day.dayNumber)}
                                  className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <span>🗑️ حذف اليوم</span>
                                </button>
                              </div>
                            </div>

                            {day.isStudyDay ? (
                              <div className="space-y-6">
                            
                            {/* "فاتني اليوم" Redistribution Banner */}
                            {!isDayFullyCompleted && schedule.daysList.some(d => d.dayNumber > day.dayNumber && d.isStudyDay) && (
                              <div className="bg-amber-500/5 border border-brand-gold/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-right mb-4">
                                <div className="flex items-start gap-3">
                                  <div className="p-2 rounded-lg bg-brand-gold/10 text-brand-gold shrink-0">
                                    <AlertCircle className="w-5 h-5" />
                                  </div>
                                  <div className="space-y-1">
                                    <h4 className="text-sm font-black text-brand-blue">هل فاتتك مهام هذا اليوم؟ ⏱️</h4>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                      لا تقلق! بضغطة زر واحدة، سيقوم الموقع تلقائياً بإعادة توزيع المهام غير المكتملة لليوم على الأيام المتبقية في جدولك.
                                    </p>
                                  </div>
                                </div>
                                <button
                                  id={`btn-missed-day-${day.dayNumber}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleRedistributeMissedDay(day.dayNumber);
                                  }}
                                  className="px-4 py-2 text-xs font-black bg-brand-gold hover:bg-brand-gold-light text-brand-blue rounded-xl transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] shrink-0"
                                >
                                  فاتني اليوم 🤍
                                </button>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              
                              {/* Quantitative (الكمي) */}
                              <div className="space-y-4">
                                <h4 className="text-sm font-black text-brand-blue flex items-center gap-2 border-b border-gray-200/60 pb-2">
                                  <Award className="w-4 h-4 text-brand-gold" />
                                  <span>القسم الكمي (بنوك الأسئلة المخصصة)</span>
                                </h4>
                                
                                {day.quantBanks.length === 0 ? (
                                  <p className="text-xs text-gray-400">لا توجد مهام كمي مخصصة لهذا اليوم.</p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {day.quantBanks.map((bank) => {
                                      const completed = !!completedQuants[bank];
                                      return (
                                        <div key={bank} className="flex items-center animate-fade-in">
                                          <button
                                            id={`chip-quant-${bank}`}
                                            onClick={() => handleToggleQuant(bank)}
                                            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                              completed
                                                ? "bg-emerald-500 text-white border border-emerald-500 shadow-md shadow-emerald-500/15"
                                                : "bg-white text-brand-blue border border-gray-200 hover:border-brand-gold hover:text-brand-gold"
                                            }`}
                                          >
                                            {completed && <CheckCircle2 className="w-4 h-4" />}
                                            <span>بنك كمي {bank}</span>
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                <span className="block text-[11px] text-gray-500">البنك الواحد يحتاج (½ – ١ ساعة) دراسة وحل.</span>
                              </div>

                              {/* Verbal (اللفظي) */}
                              <div className="space-y-4">
                                <h4 className="text-sm font-black text-brand-blue flex items-center justify-between border-b border-gray-200/60 pb-2">
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-brand-gold" />
                                    <span>القسم اللفظي (أقسام المذاكرة)</span>
                                  </div>
                                  {day.verbalSections.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setShowRangeForm(prev => ({ ...prev, [day.dayNumber]: !prev[day.dayNumber] }))}
                                      className="text-[11px] px-2.5 py-1 rounded-lg bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold font-black transition-all flex items-center gap-1 cursor-pointer border border-brand-gold/20"
                                    >
                                      <span>تحديد جماعي مريح ⚡</span>
                                    </button>
                                  )}
                                </h4>

                                {showRangeForm[day.dayNumber] && day.verbalSections.length > 0 && (
                                  <div className="bg-brand-gold/5 border border-brand-gold/10 rounded-xl p-3 space-y-3 animate-fade-in text-right">
                                    <div className="text-[11px] font-black text-brand-blue">
                                      حدد نطاق الأقسام التي أنجزتها ليتم تفعيلها دفعة واحدة:
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold text-gray-500">من قسم:</span>
                                        <select
                                          value={verbalRangeStart[day.dayNumber] ?? day.verbalSections[0]}
                                          onChange={(e) => setVerbalRangeStart(prev => ({ ...prev, [day.dayNumber]: parseInt(e.target.value) }))}
                                          className="text-xs px-2 py-1 bg-white border border-gray-200 rounded-md focus:outline-none"
                                        >
                                          {day.verbalSections.map(sec => (
                                            <option key={sec} value={sec}>قسم {sec}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold text-gray-500">إلى قسم:</span>
                                        <select
                                          value={verbalRangeEnd[day.dayNumber] ?? day.verbalSections[day.verbalSections.length - 1]}
                                          onChange={(e) => setVerbalRangeEnd(prev => ({ ...prev, [day.dayNumber]: parseInt(e.target.value) }))}
                                          className="text-xs px-2 py-1 bg-white border border-gray-200 rounded-md focus:outline-none"
                                        >
                                          {day.verbalSections.map(sec => (
                                            <option key={sec} value={sec}>قسم {sec}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handleBulkToggleVerbalRange(day.dayNumber, day.verbalSections, true)}
                                          className="text-[11px] px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-md shadow-sm transition-all cursor-pointer"
                                        >
                                          تحديد كمكتمل
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleBulkToggleVerbalRange(day.dayNumber, day.verbalSections, false)}
                                          className="text-[11px] px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-md transition-all cursor-pointer"
                                        >
                                          إلغاء التحديد
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {day.verbalSections.length === 0 ? (
                                  <p className="text-xs text-gray-400">لا توجد مهام لفظي مخصصة لهذا اليوم.</p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {day.verbalSections.map((sec) => {
                                      const completed = !!completedVerbals[sec];
                                      return (
                                        <div key={sec} className="flex items-center animate-fade-in">
                                          <button
                                            id={`chip-verbal-${sec}`}
                                            onClick={() => handleToggleVerbal(sec)}
                                            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                              completed
                                                ? "bg-emerald-500 text-white border border-emerald-500 shadow-md shadow-emerald-500/15"
                                                : "bg-white text-brand-blue border border-gray-200 hover:border-brand-gold hover:text-brand-gold"
                                            }`}
                                          >
                                            {completed && <CheckCircle2 className="w-4 h-4" />}
                                            <span>قسم لفظي {sec}</span>
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                <span className="block text-[11px] text-gray-500">القسم الواحد يحتاج (٢ – ١٠ دقائق) دراسة وحل.</span>
                              </div>

                            </div>

                            {/* Section for daily logged errors */}
                            <div className="border-t border-gray-200/60 pt-5 mt-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                <h5 className="text-sm font-black text-rose-600 flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-rose-500" />
                                  <span>أخطاء وأسئلة اليوم الصعبة (سجل أخطاء اليوم {day.studyDayIndex})</span>
                                </h5>
                              </div>

                              {/* INLINE QUICK ADD ERROR FORM */}
                              <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 mb-4 text-right">
                                <span className="block text-xs font-black text-rose-800 mb-3 flex items-center gap-1.5 justify-start">
                                  <AlertCircle className="w-4 h-4 text-rose-500" />
                                  <span>تسجيل خطأ سريع ومباشر لمهام اليوم:</span>
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                                  {/* Item Selector */}
                                  <div className="space-y-1 text-right">
                                    <label className="block text-[11px] font-black text-gray-500">المهمة المرتبطة</label>
                                    <select
                                      id={`inline-err-item-${day.dayNumber}`}
                                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-brand-blue font-bold focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                                      value={inlineErrItem[day.dayNumber] || ''}
                                      onChange={(e) => handleInlineItemChange(day.dayNumber, e.target.value)}
                                    >
                                      {day.quantBanks.map(q => (
                                        <option key={`q-${q}`} value={`quant-${q}`}>بنك كمي {q}</option>
                                      ))}
                                      {day.verbalSections.map(v => (
                                        <option key={`v-${v}`} value={`verbal-${v}`}>قسم لفظي {v}</option>
                                      ))}
                                    </select>
                                  </div>
                                  
                                  {/* Question Number */}
                                  <div className="space-y-1 text-right">
                                    <label className="block text-[11px] font-black text-gray-500">رقم السؤال</label>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      placeholder="سؤال #"
                                      id={`inline-err-qnum-${day.dayNumber}`}
                                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-brand-blue font-mono font-bold focus:outline-none focus:ring-1 focus:ring-rose-500 text-center"
                                      value={inlineErrQNum[day.dayNumber] || ''}
                                      onChange={(e) => handleInlineQNumChange(day.dayNumber, e.target.value)}
                                    />
                                  </div>

                                  {/* Note */}
                                  <div className="space-y-1 sm:col-span-2 flex gap-2 items-end text-right">
                                    <div className="flex-grow space-y-1">
                                      <label className="block text-[11px] font-black text-gray-500">ملاحظة الخطأ (اختياري)</label>
                                      <input
                                        type="text"
                                        placeholder="مثال: نسيت قاعدة التناسب العكسي..."
                                        id={`inline-err-note-${day.dayNumber}`}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-brand-blue focus:outline-none focus:ring-1 focus:ring-rose-500 text-right"
                                        value={inlineErrNote[day.dayNumber] || ''}
                                        onChange={(e) => handleInlineNoteChange(day.dayNumber, e.target.value)}
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveInlineError(day.dayNumber)}
                                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shrink-0 cursor-pointer shadow-sm hover:shadow"
                                    >
                                      سجل الخطأ
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {scheduleErrors.filter(e => e.dayNumber === day.dayNumber).length === 0 ? (
                                <div className="text-center py-4 bg-white rounded-xl border border-dashed border-gray-200 text-xs text-gray-400">
                                  لا توجد أخطاء مسجلة لهذا اليوم حتى الآن. سجل خطأ مباشرة من النموذج أعلاه للرجوع إليه لاحقاً!
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {scheduleErrors.filter(e => e.dayNumber === day.dayNumber).map((err) => (
                                    <div 
                                      key={err.id}
                                      className="p-3.5 rounded-xl bg-white border border-rose-100 hover:border-rose-200 shadow-sm flex justify-between items-start gap-3 transition-all text-right"
                                    >
                                      <div className="space-y-1.5 flex-grow">
                                        <div className="flex items-center gap-2 flex-row-reverse justify-end">
                                          <span className="text-xs font-bold text-brand-blue">
                                            {err.type === 'quant' ? `بنك كمي ${err.itemNumber}` : `قسم لفظي ${err.itemNumber}`} - سؤال <bdi dir="ltr">#{err.questionNumber}</bdi>
                                          </span>
                                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                            err.type === 'quant' 
                                              ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                              : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                          }`}>
                                            {err.type === 'quant' ? 'كمي' : 'لفظي'}
                                          </span>
                                        </div>
                                        {err.note && (
                                          <p className="text-xs text-gray-500 leading-relaxed italic bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                                            " {err.note} "
                                          </p>
                                        )}
                                      </div>
                                      <button
                                        id={`btn-del-err-${err.id}`}
                                        onClick={() => handleDeleteError(err.id)}
                                        className="text-gray-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-all cursor-pointer shrink-0 self-center"
                                        title="حذف هذا الخطأ"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                          </div>
                        ) : (
                          /* Rest Day Relaxation State */
                          <div className="p-4 text-center rounded-xl bg-amber-500/5 border border-amber-500/15 flex flex-col items-center justify-center space-y-2 text-amber-800">
                            <Smile className="w-8 h-8 text-amber-600" />
                            <span className="font-bold text-base">يوم راحة مستقطع لشحن طاقتك!</span>
                            <span className="text-xs text-gray-500 max-w-md">
                              وفقًا لخيارك، يوم الجمعة مخصص للراحة واستعادة النشاط. تجنب المذاكرة الشاقة اليوم لتستعد بقوة للأسبوع القادم.
                            </span>
                          </div>
                        )}
                        </>
                        )}
                      </motion.div>
                    )}
                  </div>
                );
              })}
              
              {/* Button to add a new day to the schedule */}
              <div className="flex justify-center pt-4 animate-fade-in">
                <button
                  id="btn-add-new-day"
                  onClick={handleAddNewDay}
                  className="px-6 py-3 bg-brand-blue/5 hover:bg-brand-blue/10 border-2 border-dashed border-brand-blue/20 hover:border-brand-blue/40 text-brand-blue font-black text-sm rounded-2xl transition-all cursor-pointer flex items-center gap-2 shadow-sm hover:scale-[1.01] active:scale-[0.99]"
                >
                  <span>➕ إضافة يوم جديد للجدول</span>
                </button>
              </div>
            </div>

            {/* Accumulated Errors Log for this Schedule */}
            <div className="bg-white border border-brand-blue/5 rounded-2xl shadow-xl shadow-brand-blue/5 p-6 mt-8 text-right">
              <div className="flex items-center gap-2.5 border-b border-gray-100 pb-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <BookMarked className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-brand-blue">سجل الأخطاء والأسئلة الصعبة المتراكمة للجدول</h3>
                  <p className="text-xs text-gray-500 mt-0.5">هنا تجد جميع الأخطاء التي قمت بتسجيلها أثناء مذاكرتك للرجوع إليها وتثبيتها دفعة واحدة!</p>
                </div>
              </div>

              {scheduleErrors.length === 0 ? (
                <div className="text-center py-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-gray-400 text-sm">
                  لا توجد أخطاء مسجلة في هذا الجدول حتى الآن. أثناء تتبعك للجدول اليومي، يمكنك النقر على زر التنبيه بجانب أي بنك أو قسم لتسجيل الأسئلة الصعبة لتظهر لك مجمعة هنا! 🎯
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-right border-collapse text-sm">
                    <thead>
                      <tr className="bg-brand-blue text-white font-bold text-xs sm:text-sm">
                        <th className="p-3 text-center rounded-tr-lg">اليوم الدراسي</th>
                        <th className="p-3 text-center">القسم</th>
                        <th className="p-3 text-center">رقم البنك / القسم</th>
                        <th className="p-3 text-center">رقم السؤال</th>
                        <th className="p-3 text-right">الملاحظة المكتوبة</th>
                        <th className="p-3 text-center rounded-tl-lg">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {scheduleErrors.map((err) => (
                        <tr key={err.id} className="hover:bg-slate-50 transition-all font-medium text-gray-700">
                          <td className="p-3 text-center font-bold text-brand-blue">
                            يوم {err.dayNumber || '-'}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs font-black ${
                              err.type === 'quant' 
                                ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            }`}>
                              {err.type === 'quant' ? 'كمي' : 'لفظي'}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono text-xs font-bold text-gray-900">
                            {err.type === 'quant' ? 'بنك' : 'قسم'} {err.itemNumber}
                          </td>
                          <td className="p-3 text-center font-mono text-xs font-black text-rose-600">
                            سؤال #{err.questionNumber}
                          </td>
                          <td className="p-3 text-right text-xs text-gray-600 font-medium italic">
                            {err.note ? `"${err.note}"` : <span className="text-gray-300">لا توجد ملاحظة</span>}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteError(err.id)}
                              className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          
          /* POSTER VIEW */
          <motion.div
            key="poster-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <SchedulePoster schedule={schedule} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* QUICK LOG ERROR MODAL */}
      <AnimatePresence>
        {showErrorModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              
              {/* Overlay */}
              <div 
                className="fixed inset-0 bg-brand-blue/60 backdrop-blur-sm transition-opacity" 
                onClick={() => setShowErrorModal(false)}
              />

              {/* Center align helper */}
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="inline-block align-bottom bg-white rounded-2xl text-right overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-brand-gold/15"
              >
                <div className="bg-white px-6 pt-6 pb-4 sm:p-6 text-right">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                      <BookMarked className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-brand-blue" id="modal-title">تسجيل خطأ يومي جديد</h3>
                      <p className="text-xs text-gray-500 mt-0.5">سجل أسئلتك الصعبة لمراجعتها لاحقاً بملفك الشخصي</p>
                    </div>
                  </div>

                  {errSuccessMsg ? (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold text-center">
                      {errSuccessMsg}
                    </div>
                  ) : (
                    <form onSubmit={handleAddErrorSubmit} className="space-y-4">
                      
                      {activeModalDay ? (
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-700">المهمة المرتبطة بالخطأ</label>
                            <select
                              value={`${errType}-${errItemNum}`}
                              onChange={(e) => {
                                const [type, numStr] = e.target.value.split('-');
                                setErrType(type as 'quant' | 'verbal');
                                setErrItemNum(parseInt(numStr) || 1);
                              }}
                              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-brand-blue font-bold text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-gold text-right"
                            >
                              {activeModalDay.quantBanks.map(q => (
                                <option key={`modal-q-${q}`} value={`quant-${q}`}>بنك كمي {q}</option>
                              ))}
                              {activeModalDay.verbalSections.map(v => (
                                <option key={`modal-v-${v}`} value={`verbal-${v}`}>قسم لفظي {v}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-700">رقم السؤال</label>
                            <input
                              type="number"
                              min="1"
                              value={errQuestionNum}
                              onChange={(e) => {
                                const val = e.target.value;
                                setErrQuestionNum(val === '' ? '' : parseInt(val) || '');
                              }}
                              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-brand-blue font-mono text-sm text-center font-bold"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Error Type */}
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-700">نوع الخطأ</label>
                            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl border border-gray-200">
                              <button
                                type="button"
                                onClick={() => setErrType('quant')}
                                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                                  errType === 'quant'
                                    ? 'bg-brand-blue text-white shadow'
                                    : 'text-gray-600'
                                }`}
                              >
                                قسم كمي (رياضيات)
                              </button>
                              <button
                                type="button"
                                onClick={() => setErrType('verbal')}
                                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                                  errType === 'verbal'
                                    ? 'bg-brand-blue text-white shadow'
                                    : 'text-gray-600'
                                }`}
                              >
                                قسم لفظي (لغة عربية)
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            {/* Item Number */}
                            <div className="space-y-1">
                              <label className="block text-xs font-bold text-gray-700">رقم البنك / القسم</label>
                              <input
                                type="number"
                                min="1"
                                value={errItemNum}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setErrItemNum(val === '' ? '' : parseInt(val) || '');
                                }}
                                className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-brand-blue font-mono text-sm text-center"
                              />
                            </div>

                            {/* Question Number */}
                            <div className="space-y-1">
                              <label className="block text-xs font-bold text-gray-700">رقم السؤال</label>
                              <input
                                type="number"
                                min="1"
                                value={errQuestionNum}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setErrQuestionNum(val === '' ? '' : parseInt(val) || '');
                                }}
                                className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-brand-blue font-mono text-sm text-center"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {/* Error Note */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-700">ملاحظة الخطأ / تذكير لك</label>
                        <textarea
                          placeholder="مثال: السؤال يحتاج لاستبعاد الخيارات، أو تذكر علاقة الترادف"
                          value={errNote}
                          onChange={(e) => setErrNote(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold transition-all"
                        />
                      </div>

                      {/* Buttons */}
                      <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <button
                          type="submit"
                          className="flex-1 py-3 rounded-xl font-bold bg-brand-gold text-brand-blue hover:bg-brand-gold-light transition-all text-sm cursor-pointer"
                        >
                          حفظ الخطأ
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowErrorModal(false)}
                          className="px-5 py-3 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all text-sm cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>

                    </form>
                  )}
                </div>
              </motion.div>

            </div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM REDISTRIBUTION CONFIRMATION DIALOG */}
      <AnimatePresence>
        {redistributeDayNum !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            {/* Backdrop Overlay */}
            <div 
              className="fixed inset-0 bg-brand-blue/60 backdrop-blur-sm transition-opacity" 
              onClick={() => setRedistributeDayNum(null)}
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 bg-white rounded-2xl text-right overflow-hidden shadow-2xl transform transition-all max-w-md w-full border border-brand-gold/15 p-6 space-y-4"
            >
              <div className="text-center space-y-4">
                {/* Warning Icon */}
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-amber-50 text-brand-gold border border-brand-gold/20 mb-2">
                  <AlertCircle className="w-8 h-8 text-brand-gold" />
                </div>

                <h3 className="text-xl font-black text-brand-blue">إعادة توزيع خطتك الدراسية ⏱️</h3>
                
                {/* Distribute Mode Selector */}
                <div className="bg-gray-50/85 rounded-xl p-4 text-right space-y-3 border border-gray-150">
                  <span className="block text-xs font-black text-brand-blue">نمط إعادة التوزيع الذكي:</span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <button
                      id="btn-mode-all"
                      type="button"
                      onClick={() => setDistributeMode('all')}
                      className={`py-2 px-1 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                        distributeMode === 'all' 
                          ? 'bg-brand-blue text-white border-brand-blue' 
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      كامل الجدول
                    </button>
                    <button
                      id="btn-mode-3days"
                      type="button"
                      onClick={() => setDistributeMode('3days')}
                      className={`py-2 px-1 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                        distributeMode === '3days' 
                          ? 'bg-brand-blue text-white border-brand-blue' 
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      الـ 3 أيام القادمة
                    </button>
                    <button
                      id="btn-mode-2days"
                      type="button"
                      onClick={() => setDistributeMode('2days')}
                      className={`py-2 px-1 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                        distributeMode === '2days' 
                          ? 'bg-brand-blue text-white border-brand-blue' 
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      اليومين القادمين
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold leading-relaxed text-center">
                    {distributeMode === 'all' && "سيتم التوزيع بالتساوي على كل الأيام الدراسية المتبقية لتكون خطة خفيفة جداً."}
                    {distributeMode === '3days' && "سيتم التوزيع بشكل مكثف على الـ 3 أيام القادمة فقط لإنهاء المهام المتأخرة بسرعة."}
                    {distributeMode === '2days' && "سيتم التوزيع بشكل مكثف جداً على اليومين القادمين فقط لتدارك ما فاتك فوراً."}
                  </p>
                </div>

                <div className="bg-gray-50/80 rounded-xl p-4 text-right space-y-3 border border-gray-100">
                  <p className="text-sm text-gray-700 leading-relaxed font-medium">
                    هل أنت متأكد يا بطل؟ سيقوم الموقع تلقائياً بترحيل وإعادة توزيع:
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-white p-2.5 rounded-lg border border-gray-150">
                      <span className="block text-xl font-black text-brand-blue">{redistributeQuantCount}</span>
                      <span className="block text-xs text-gray-500 font-bold">بنوك كمي</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-gray-150">
                      <span className="block text-xl font-black text-brand-blue">{redistributeVerbalCount}</span>
                      <span className="block text-xs text-gray-500 font-bold">أقسام لفظي</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed text-center font-bold">
                    سيتم توزيعها على الـ <span className="text-brand-gold font-extrabold">{distributeMode === 'all' ? redistributeRemainingDays : distributeMode === '3days' ? Math.min(3, redistributeRemainingDays) : Math.min(2, redistributeRemainingDays)} أيام</span> المتبقية في جدولك لتضمن عدم تفويت أي تجميعة بفضل الله! 💯
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    id="btn-confirm-redistribution"
                    type="button"
                    onClick={executeRedistribution}
                    className="flex-1 py-3 rounded-xl font-black bg-brand-gold text-brand-blue hover:bg-brand-gold-light transition-all text-sm cursor-pointer shadow-md shadow-brand-gold/10 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    أعد التوزيع الآن 🤍
                  </button>
                  <button
                    id="btn-cancel-redistribution"
                    type="button"
                    onClick={() => setRedistributeDayNum(null)}
                    className="px-5 py-3 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all text-sm cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM DAY DELETION CONFIRMATION DIALOG */}
      <AnimatePresence>
        {deleteConfirmDayNum !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            {/* Backdrop Overlay */}
            <div 
              className="fixed inset-0 bg-brand-blue/60 backdrop-blur-sm transition-opacity" 
              onClick={() => setDeleteConfirmDayNum(null)}
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 bg-white rounded-2xl text-right overflow-hidden shadow-2xl transform transition-all max-w-md w-full border border-red-100 p-6 space-y-4"
            >
              <div className="text-center space-y-4">
                {/* Trash/Warning Icon */}
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-rose-50 text-rose-600 border border-rose-100 mb-2">
                  <Trash2 className="w-8 h-8 text-rose-600" />
                </div>

                <h3 className="text-lg font-black text-brand-blue">تأكيد حذف اليوم 🗑️</h3>
                
                <p className="text-sm text-gray-600 leading-relaxed font-bold text-center">
                  هل أنت متأكد يا بطل من رغبتك في حذف <span className="text-rose-600 font-extrabold">اليوم رقم {deleteConfirmDayNum}</span> من الجدول نهائياً؟
                </p>
                
                <div className="bg-rose-50/50 rounded-xl p-3 text-right border border-rose-100 text-xs font-semibold text-rose-800 leading-relaxed">
                  ⚠️ تنبيه: سيتم حذف هذا اليوم نهائياً، وستتم إعادة ترتيب وتواريخ بقية أيام الجدول تلقائياً وبشكل متسلسل لضمان استمرارية خطتك الدراسية دون فجوات.
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    id="btn-confirm-day-delete"
                    type="button"
                    onClick={executeDeleteDay}
                    className="flex-grow py-3 rounded-xl font-black bg-rose-600 text-white hover:bg-rose-700 transition-all text-sm cursor-pointer shadow-md shadow-rose-600/10"
                  >
                    نعم، احذف اليوم
                  </button>
                  <button
                    id="btn-cancel-day-delete"
                    type="button"
                    onClick={() => setDeleteConfirmDayNum(null)}
                    className="px-5 py-3 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all text-sm cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM ALERT DIALOG */}
      <AnimatePresence>
        {customAlertMsg !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            {/* Backdrop Overlay */}
            <div 
              className="fixed inset-0 bg-brand-blue/60 backdrop-blur-sm transition-opacity" 
              onClick={() => setCustomAlertMsg(null)}
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 bg-white rounded-2xl text-right overflow-hidden shadow-2xl transform transition-all max-w-md w-full border border-brand-gold/15 p-6"
            >
              <div className="text-center space-y-4">
                {/* Info Icon */}
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-amber-50 text-brand-gold border border-brand-gold/20 mb-2">
                  <Info className="w-8 h-8 text-brand-gold" />
                </div>

                <h3 className="text-lg font-black text-brand-blue">تنبيه هام 💡</h3>
                <p className="text-sm text-gray-600 leading-relaxed font-bold text-center">
                  {customAlertMsg}
                </p>

                {/* Buttons */}
                <div className="pt-2">
                  <button
                    id="btn-close-alert"
                    type="button"
                    onClick={() => setCustomAlertMsg(null)}
                    className="w-full py-3 rounded-xl font-bold bg-brand-blue text-white hover:bg-brand-blue/90 transition-all text-sm cursor-pointer"
                  >
                    موافق
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM SUCCESS TOAST / OVERLAY */}
      <AnimatePresence>
        {customSuccessMsg !== null && (
          <div className="fixed inset-x-0 top-6 z-50 flex justify-center px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="bg-emerald-500 text-white font-bold rounded-2xl px-6 py-4 shadow-2xl border border-emerald-400 flex items-center gap-3 max-w-md text-right pointer-events-auto"
            >
              <div className="p-1.5 rounded-lg bg-white/20">
                <Smile className="w-5 h-5 text-white" />
              </div>
              <div className="space-y-0.5 flex-grow">
                <span className="block text-sm font-black text-white">عمل رائع ومكتمل! ✨</span>
                <span className="block text-xs text-white/90">{customSuccessMsg}</span>
              </div>
              <button 
                onClick={() => setCustomSuccessMsg(null)}
                className="mr-auto text-white/80 hover:text-white text-xs cursor-pointer focus:outline-none font-bold"
              >
                إغلاق
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Guide Modal */}
      <NotificationGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

    </div>
  );
}
