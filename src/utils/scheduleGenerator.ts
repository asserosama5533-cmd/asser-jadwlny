import { Schedule, StudyDay } from '../types';

export const MOST_FREQUENT_QUANT_BANKS: number[] = [
  ...Array.from({ length: 18 }, (_, i) => i + 1), // 1 to 18
  20, 21, 22,                                     // 20 to 22
  24, 25, 26, 27, 28, 29,                         // 24 to 29
  50, 57, 58, 68, 74, 76, 82, 86, 90, 93, 96, 98,  // Individual banks
  ...Array.from({ length: 23 }, (_, i) => i + 102), // 102 to 124
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
  quantTo: number = 124,
  verbalFrom: number = 1,
  verbalTo: number = 257,
  scheduleType: 'both' | 'quant' | 'verbal' = 'both',
  useSeparateDurations: boolean = false,
  quantDuration: number = 30,
  verbalDuration: number = 5,
  verbalRestDays: number = 0,
  quantMode: 'all' | 'custom' | 'frequent' = 'all'
): Schedule {
  const startDate = new Date(startDateString);
  let activeStudyDays = 0;
  let totalCalendarDays = 0;

  // Build the list of quant banks based on mode
  let quantBanksList: number[] = [];
  if (quantMode === 'frequent') {
    quantBanksList = [...MOST_FREQUENT_QUANT_BANKS];
  } else if (quantMode === 'custom') {
    for (let i = quantFrom; i <= quantTo; i++) {
      quantBanksList.push(i);
    }
  } else {
    for (let i = 1; i <= 124; i++) {
      quantBanksList.push(i);
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
          const totalVerbal = Math.max(1, verbalTo - verbalFrom + 1);
          const vStartOffset = Math.floor(cyclePos * totalVerbal / verbalDuration);
          const vEndOffset = Math.floor((cyclePos + 1) * totalVerbal / verbalDuration);
          for (let v = vStartOffset; v < vEndOffset; v++) {
            const secNum = verbalFrom + v;
            if (secNum <= verbalTo) {
              verbalSections.push(secNum);
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

        // Verbal distribution: Custom range
        if (scheduleType !== 'quant') {
          const totalVerbal = Math.max(1, verbalTo - verbalFrom + 1);
          const vStartOffset = Math.floor(currentStudyDayIndex * totalVerbal / activeStudyDays);
          const vEndOffset = Math.floor((currentStudyDayIndex + 1) * totalVerbal / activeStudyDays);
          for (let v = vStartOffset; v < vEndOffset; v++) {
            const secNum = verbalFrom + v;
            if (secNum <= verbalTo) {
              verbalSections.push(secNum);
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

  const defaultName = quantMode === 'frequent'
    ? `جدول الأكثر تكراراً كمي (62 بنك)`
    : (useSeparateDurations && scheduleType === 'both' 
      ? `جدول مخصص (كمي: ${quantDuration} يوم، لفظي: ${verbalDuration} يوم)`
      : `جدول مذاكرة - ${duration} ${durationUnit === 'days' ? 'يوم' : 'شهر'}`);

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
      ? (quantMode === 'frequent' ? { from: 1, to: 124 } : { from: quantFrom, to: quantTo })
      : undefined,
    verbalRange: scheduleType !== 'quant' ? { from: verbalFrom, to: verbalTo } : undefined,
    scheduleType,
    quantMode,
    cycleCount: 1,
    isLoopEnabled: true,
    useSeparateDurations,
    quantDuration: useSeparateDurations ? quantDuration : undefined,
    verbalDuration: useSeparateDurations ? verbalDuration : undefined,
    verbalRestDays: useSeparateDurations ? verbalRestDays : undefined
  };
}
