import { Schedule, StudyDay } from '../types';

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
  verbalRestDays: number = 0
): Schedule {
  const startDate = new Date(startDateString);
  let activeStudyDays = 0;
  let totalCalendarDays = 0;

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
          const totalQuant = Math.max(1, quantTo - quantFrom + 1);
          const qStartOffset = Math.floor(currentStudyDayIndex * totalQuant / quantDuration);
          const qEndOffset = Math.floor((currentStudyDayIndex + 1) * totalQuant / quantDuration);
          for (let q = qStartOffset; q < qEndOffset; q++) {
            const bankNum = quantFrom + q;
            if (bankNum <= quantTo) {
              quantBanks.push(bankNum);
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
        // Quantitative distribution: Custom range
        if (scheduleType !== 'verbal') {
          const totalQuant = Math.max(1, quantTo - quantFrom + 1);
          const qStartOffset = Math.floor(currentStudyDayIndex * totalQuant / activeStudyDays);
          const qEndOffset = Math.floor((currentStudyDayIndex + 1) * totalQuant / activeStudyDays);
          for (let q = qStartOffset; q < qEndOffset; q++) {
            const bankNum = quantFrom + q;
            if (bankNum <= quantTo) {
              quantBanks.push(bankNum);
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

  const generatedName = name.trim() || (useSeparateDurations && scheduleType === 'both' 
    ? `جدول مخصص (كمي: ${quantDuration} يوم، لفظي: ${verbalDuration} يوم)`
    : `جدول مذاكرة - ${duration} ${durationUnit === 'days' ? 'يوم' : 'شهر'}`);

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
    quantRange: scheduleType !== 'verbal' ? { from: quantFrom, to: quantTo } : undefined,
    verbalRange: scheduleType !== 'quant' ? { from: verbalFrom, to: verbalTo } : undefined,
    scheduleType,
    cycleCount: 1,
    isLoopEnabled: true,
    useSeparateDurations,
    quantDuration: useSeparateDurations ? quantDuration : undefined,
    verbalDuration: useSeparateDurations ? verbalDuration : undefined,
    verbalRestDays: useSeparateDurations ? verbalRestDays : undefined
  };
}
