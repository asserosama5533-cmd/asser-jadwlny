import { Schedule, StudyDay } from '../types';

// بنوك الزبدة للكمي (34 بنك مفلترة وخالية من التكرار)
export const ZOBDA_QUANT_BANKS: number[] = Array.from({ length: 34 }, (_, i) => i + 1); // 1 to 34

// التوافق العكسي
export const MOST_FREQUENT_QUANT_BANKS = ZOBDA_QUANT_BANKS;

export const MOST_FREQUENT_VERBAL_SECTIONS: number[] = [
  ...Array.from({ length: 117 }, (_, i) => i + 1), // 1 to 117
  119, 121, 123, 125, 130, 133, 142, 143, 144, 145, 146,
  153, 160, 166, 167, 168, 180, 237, 239, 250, 255, 261, // Individual sections
  ...Array.from({ length: 39 }, (_, i) => i + 263), // 263 to 301
];

export function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function generateSchedule(
  name: string,
  duration: number,
  durationUnit: 'days' | 'months',
  restDays: number[],
  startDateString: string,
  quantFrom: number = 1,
  quantTo: number = 128,
  verbalFrom: number = 1,
  verbalTo: number = 301,
  scheduleType: 'both' | 'quant' | 'verbal' = 'both',
  useSeparateDurations: boolean = false,
  quantDuration: number = 30,
  verbalDuration: number = 5,
  verbalRestDays: number = 0,
  quantMode: 'all' | 'custom' | 'frequent' | 'zobda' = 'all',
  verbalMode: 'all' | 'custom' | 'frequent' = 'all'
): Schedule {
  const startDate = new Date(startDateString);
  let activeStudyDays = 0;
  let totalCalendarDays = 0;

  // Build the list of quant banks based on mode
  let quantBanksList: number[] = [];
  if (quantMode === 'zobda' || quantMode === 'frequent') {
    quantBanksList = [...ZOBDA_QUANT_BANKS];
  } else if (quantMode === 'custom') {
    for (let i = quantFrom; i <= quantTo; i++) {
      quantBanksList.push(i);
    }
  } else {
    for (let i = 1; i <= 128; i++) {
      quantBanksList.push(i);
    }
  }

  // Build the list of verbal sections based on mode
  let verbalSectionsList: number[] = [];
  if (verbalMode === 'frequent') {
    verbalSectionsList = [...MOST_FREQUENT_VERBAL_SECTIONS];
  } else if (verbalMode === 'custom') {
    for (let i = verbalFrom; i <= verbalTo; i++) {
      verbalSectionsList.push(i);
    }
  } else {
    for (let i = 1; i <= 301; i++) {
      verbalSectionsList.push(i);
    }
  }

  if (useSeparateDurations && scheduleType === 'both') {
    activeStudyDays = Math.max(quantDuration, verbalDuration);
    let tempStudyDays = 0;
    let tempCalDays = 0;
    while (tempStudyDays < activeStudyDays) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + tempCalDays);
      const dayOfWeek = d.getDay();
      const isRestDay = restDays.includes(dayOfWeek);
      const isStudyDay = !isRestDay;
      if (isStudyDay) {
        tempStudyDays++;
      }
      tempCalDays++;
    }
    totalCalendarDays = tempCalDays;
  } else {
    totalCalendarDays = durationUnit === 'days' ? duration : duration * 30;
    let tempStudyDays = 0;
    for (let i = 0; i < totalCalendarDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dayOfWeek = d.getDay();
      const isRestDay = restDays.includes(dayOfWeek);
      const isStudyDay = !isRestDay;
      if (isStudyDay) {
        tempStudyDays++;
      }
    }
    activeStudyDays = tempStudyDays > 0 ? tempStudyDays : 1;
  }

  const daysList: StudyDay[] = [];
  let currentStudyDayIndex = 0;

  for (let i = 0; i < totalCalendarDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const isFriday = d.getDay() === 5;
    const dayOfWeek = d.getDay();
    const isRestDay = restDays.includes(dayOfWeek);
    const isStudyDay = !isRestDay;
    const dateString = formatDate(d);

    if (isStudyDay) {
      const quantBanks: number[] = [];
      const verbalSections: number[] = [];

      if (useSeparateDurations && scheduleType === 'both') {
        // Quantitative assignment: split over quantDuration
        if (currentStudyDayIndex < quantDuration) {
          const totalQuant = quantBanksList.length;
          const qStartOffset = Math.floor(currentStudyDayIndex * totalQuant / quantDuration);
          const qEndOffset = Math.floor((currentStudyDayIndex + 1) * totalQuant / quantDuration);
          for (let q = qStartOffset; q < qEndOffset; q++) {
            if (q < quantBanksList.length) {
              quantBanks.push(quantBanksList[q]);
            }
          }
        }

        // Verbal assignment with auto-looping and rest days: split over verbalDuration
        const verbalCycleLength = verbalDuration + verbalRestDays;
        const cyclePos = currentStudyDayIndex % verbalCycleLength;
        if (cyclePos < verbalDuration) {
          const totalVerbal = verbalSectionsList.length;
          const vStartOffset = Math.floor(cyclePos * totalVerbal / verbalDuration);
          const vEndOffset = Math.floor((cyclePos + 1) * totalVerbal / verbalDuration);
          for (let v = vStartOffset; v < vEndOffset; v++) {
            if (v < verbalSectionsList.length) {
              verbalSections.push(verbalSectionsList[v]);
            }
          }
        }
      } else {
        // Standard assignment
        // Quantitative distribution
        if (scheduleType !== 'verbal') {
          const totalQuant = quantBanksList.length;
          const qStartOffset = Math.floor(currentStudyDayIndex * totalQuant / activeStudyDays);
          const qEndOffset = Math.floor((currentStudyDayIndex + 1) * totalQuant / activeStudyDays);
          for (let q = qStartOffset; q < qEndOffset; q++) {
            if (q < quantBanksList.length) {
              quantBanks.push(quantBanksList[q]);
            }
          }
        }

        // Verbal distribution
        if (scheduleType !== 'quant') {
          const totalVerbal = verbalSectionsList.length;
          const vStartOffset = Math.floor(currentStudyDayIndex * totalVerbal / activeStudyDays);
          const vEndOffset = Math.floor((currentStudyDayIndex + 1) * totalVerbal / activeStudyDays);
          for (let v = vStartOffset; v < vEndOffset; v++) {
            if (v < verbalSectionsList.length) {
              verbalSections.push(verbalSectionsList[v]);
            }
          }
        }
      }

      daysList.push({
        dayNumber: i + 1,
        dateString,
        isFriday,
        isStudyDay,
        studyDayIndex: currentStudyDayIndex + 1,
        quantBanks,
        verbalSections,
      });

      currentStudyDayIndex++;
    } else {
      daysList.push({
        dayNumber: i + 1,
        dateString,
        isFriday,
        isStudyDay,
        quantBanks: [],
        verbalSections: [],
      });
    }
  }

  let defaultName = '';
  const isQuantZobda = quantMode === 'zobda' || quantMode === 'frequent';
  if (isQuantZobda && verbalMode === 'frequent') {
    defaultName = `جدول الزبدة كمي (34 بنك) + الأكثر تكراراً لفظي (${MOST_FREQUENT_VERBAL_SECTIONS.length} قسم)`;
  } else if (isQuantZobda) {
    defaultName = `جدول بنوك الزبدة كمي (34 بنك)`;
  } else if (verbalMode === 'frequent') {
    defaultName = `جدول الأكثر تكراراً لفظي (${MOST_FREQUENT_VERBAL_SECTIONS.length} قسم)`;
  } else if (useSeparateDurations && scheduleType === 'both') {
    defaultName = `جدول مخصص (كمي: ${quantDuration} يوم، لفظي: ${verbalDuration} يوم)`;
  } else {
    defaultName = `جدول مذاكرة - ${duration} ${durationUnit === 'days' ? 'يوم' : 'شهر'}`;
  }

  const generatedName = name.trim() || defaultName;

  return {
    id: 'sched_' + Math.random().toString(36).substr(2, 9),
    name: generatedName,
    duration,
    durationUnit,
    skipFridays: restDays.includes(5),
    restDays,
    startDate: startDateString,
    createdAt: new Date().toISOString(),
    daysList,
    totalStudyDays: activeStudyDays,
    totalCalendarDays,
    quantRange: scheduleType !== 'verbal' 
      ? (isQuantZobda ? { from: 1, to: 34 } : { from: quantFrom, to: quantTo })
      : undefined,
    verbalRange: scheduleType !== 'quant' 
      ? (verbalMode === 'frequent' ? { from: 1, to: 301 } : { from: verbalFrom, to: verbalTo })
      : undefined,
    scheduleType,
    quantMode,
    verbalMode,
    cycleCount: 1,
    isLoopEnabled: true,
    useSeparateDurations,
    quantDuration: useSeparateDurations ? quantDuration : undefined,
    verbalDuration: useSeparateDurations ? verbalDuration : undefined,
    verbalRestDays: useSeparateDurations ? verbalRestDays : undefined
  };
}
