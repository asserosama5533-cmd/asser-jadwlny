import React, { useRef, useState, useEffect } from 'react';
import { domToPng } from 'modern-screenshot';
import { Download, Share2, Sparkles, Star, Edit3, Eye, X, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Schedule, StudyDay } from '../types';
import { getSession, getProfile } from '../utils/storage';

interface SchedulePosterProps {
  schedule: Schedule;
}

export default function SchedulePoster({ schedule }: SchedulePosterProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  // Poster customizable states
  const [title, setTitle] = useState('ثق بالله وهتقفل القدرات');
  const [eventName, setEventName] = useState(schedule.name || 'تقفيل القدرات');
  const [creatorName, setCreatorName] = useState('Asser-jadwlny');
  
  // Notes on notebook lines (updated default motivational / error review points)
  const [notes, setNotes] = useState([
    'مراجعة أخطائك بانتظام تضمن لك الـ 100٪ 🎯',
    'التركيز والاستمرار هما مفتاح النجاح والتميز 💪',
    'التفوق لا يحتاج معجزات، بل يحتاج تنظيماً واجتهاداً 🤍'
  ]);

  // Modal and screen sizing states
  const modalPosterRef = useRef<HTMLDivElement>(null);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(0.85);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 900
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fitWidthScale = Math.min(1, (windowSize.width - 32) / 1200);

  // Set default zoom on mobile to 0.85 (highly readable, scrollable), or 1.0 for tablet/desktop preview
  useEffect(() => {
    if (showMobileModal) {
      const initialScale = windowSize.width < 768 ? 0.85 : 1.0;
      setZoomScale(initialScale);
    }
  }, [showMobileModal, windowSize.width]);

  // Touch event tracking for pinch-to-zoom inside modal
  const touchStartRef = useRef<{ dist: number; scale: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStartRef.current = { dist, scale: zoomScale };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchStartRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const ratio = dist / touchStartRef.current.dist;
      // Clamp between fitWidthScale * 0.8 and 2.5
      const nextScale = Math.max(fitWidthScale * 0.8, Math.min(2.5, touchStartRef.current.scale * ratio));
      setZoomScale(nextScale);
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  // Load profile name if exists
  useEffect(() => {
    const session = getSession();
    if (session) {
      const profile = getProfile(session.id);
      if (profile && profile.name && profile.name !== 'طالب جديد') {
        setCreatorName(profile.name);
      } else {
        setCreatorName('Asser-jadwlny');
      }
    } else {
      setCreatorName('Asser-jadwlny');
    }
  }, []);

  const handleDownload = async () => {
    if (!posterRef.current) return;
    setLoading(true);
    try {
      await document.fonts.ready;
      
      const dataUrl = await domToPng(posterRef.current, {
        scale: 2, // Ultra sharp high resolution
        backgroundColor: '#ffffff'
      });
      
      const link = document.createElement('a');
      link.download = `جدول_القدرات_${eventName.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generating image:', err);
      alert('حدث خطأ أثناء حفظ الصورة، الرجاء المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!posterRef.current) return;
    
    if (navigator.share && navigator.canShare) {
      setLoading(true);
      try {
        const dataUrl = await domToPng(posterRef.current, {
          scale: 2,
          backgroundColor: '#ffffff'
        });
        
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'schedule-poster.png', { type: 'image/png' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `جدولي لاختبار القدرات - ${eventName}`,
            text: `صممت جدولي للمذاكرة عبر منصة جدولني للقدرات من إعداد Asser!`,
          });
        } else {
          handleDownload();
        }
      } catch (err) {
        console.error('Share error:', err);
        handleDownload();
      } finally {
        setLoading(false);
      }
    } else {
      handleDownload();
    }
  };

  const handleModalDownload = async () => {
    if (!modalPosterRef.current) return;
    setLoading(true);
    try {
      await document.fonts.ready;
      const dataUrl = await domToPng(modalPosterRef.current, {
        scale: 2,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `جدول_القدرات_${eventName.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generating image from modal:', err);
      alert('حدث خطأ أثناء حفظ الصورة، الرجاء المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalShare = async () => {
    if (!modalPosterRef.current) return;
    if (navigator.share && navigator.canShare) {
      setLoading(true);
      try {
        const dataUrl = await domToPng(modalPosterRef.current, {
          scale: 2,
          backgroundColor: '#ffffff'
        });
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'schedule-poster.png', { type: 'image/png' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `جدولي لاختبار القدرات - ${eventName}`,
            text: `صممت جدولي للمذاكرة عبر منصة جدولني للقدرات من إعداد Asser!`,
          });
        } else {
          handleModalDownload();
        }
      } catch (err) {
        console.error('Share error:', err);
        handleModalDownload();
      } finally {
        setLoading(false);
      }
    } else {
      handleModalDownload();
    }
  };

  // Group days into calendar weeks matching their actual weekday (Sunday=0, Monday=1, ..., Saturday=6)
  const getWeeks = () => {
    const weeks: (StudyDay | null)[][] = [];
    if (!schedule.daysList || schedule.daysList.length === 0) return weeks;

    let currentWeek: (StudyDay | null)[] = Array(7).fill(null);
    
    schedule.daysList.forEach((day) => {
      const d = new Date(day.dateString);
      const weekdayIndex = d.getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, ..., 6 = Saturday
      
      currentWeek[weekdayIndex] = day;
      
      if (weekdayIndex === 6) {
        weeks.push(currentWeek);
        currentWeek = Array(7).fill(null);
      }
    });
    
    if (currentWeek.some(day => day !== null)) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  };

  const weeksList = getWeeks();

  const updateNote = (index: number, text: string) => {
    setNotes(prev => prev.map((n, i) => i === index ? text : n));
  };

  const renderPosterNode = (ref: React.RefObject<HTMLDivElement | null>) => {
    return (
      <div 
        id="poster-node"
        ref={ref}
        className="w-[1200px] h-[900px] p-8 bg-white text-brand-blue flex flex-col justify-between relative overflow-hidden select-none font-sans shadow-2xl shrink-0 rounded-[10px]"
        style={{ direction: 'rtl' }}
      >
        {/* Decorative Corner Waves & Hand-Drawn Elements */}
        {/* Top-Left Waves */}
        <div className="absolute top-0 left-0 w-44 h-44 overflow-hidden pointer-events-none rounded-tl-[10px] opacity-90">
          <svg className="w-full h-full text-brand-blue" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M-10,45 C15,35 25,15 25,-10" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
            <path d="M-10,30 C20,20 20,-10 20,-10" stroke="#c9a84c" strokeWidth="3" strokeLinecap="round" />
            <path d="M-10,60 C30,50 40,20 40,-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 3" />
          </svg>
        </div>

        {/* Bottom-Right Waves */}
        <div className="absolute bottom-0 right-0 w-44 h-44 overflow-hidden pointer-events-none rounded-br-[10px] opacity-90">
          <svg className="w-full h-full text-brand-blue" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M110,55 C85,65 75,85 75,110" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
            <path d="M110,70 C80,80 80,110 80,110" stroke="#c9a84c" strokeWidth="3" strokeLinecap="round" />
            <path d="M110,40 C70,50 60,80 60,110" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 3" />
          </svg>
        </div>

        {/* Bottom-Left Wave Accents */}
        <div className="absolute bottom-0 left-0 w-32 h-32 overflow-hidden pointer-events-none rounded-bl-[10px] opacity-80">
          <svg className="w-full h-full text-brand-blue" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M-10,75 C25,75 25,110 25,110" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            <path d="M-10,85 C15,85 15,110 15,110" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Top Left Illustration (Stacked Books + Leaves) */}
        <div className="absolute top-12 left-12 flex items-center gap-2">
          <svg className="w-[110px] h-[90px]" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Book 3 (Bottom) */}
            <path d="M20 70C20 64 26 60 40 60H100V75H40C26 75 20 71 20 70Z" fill="#c9a84c" />
            <path d="M20 70H100V73H20V70Z" fill="#ab8e36" />
            <path d="M100 60C100 60 102 62 102 67.5C102 73 100 75 100 75H103C103 75 105 73 105 67.5C105 62 103 60 103 60H100Z" fill="#f1f5f9" />
            
            {/* Book 2 (Middle) */}
            <path d="M15 50C15 44 21 40 35 40H95V55H35C21 55 15 51 15 50Z" fill="#0f1b3d" />
            <path d="M15 50H95V53H15V50Z" fill="#091026" />
            <path d="M95 40C95 40 97 42 97 47.5C97 53 95 55 95 55H98C98 55 100 53 100 47.5C100 42 98 40 98 40H95Z" fill="#f1f5f9" />
            
            {/* Book 1 (Top) */}
            <path d="M25 30C25 24 31 20 45 20H105V35H45C31 35 25 31 25 30Z" fill="#3b82f6" />
            <path d="M25 30H105V33H25V30Z" fill="#2563eb" />
            <path d="M105 20C105 20 107 22 107 27.5C107 33 105 35 105 35H108C108 35 110 33 110 27.5C110 22 108 20 108 20H105Z" fill="#f1f5f9" />
            
            {/* Decorative branch */}
            <path d="M10 82C13 70 22 62 30 58" stroke="#0f1b3d" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M12 74C14 72 17 74 15 77C13 80 9 78 12 74Z" fill="#c9a84c" />
            <path d="M18 66C20 64 23 66 21 69C19 72 15 70 18 66Z" fill="#0f1b3d" />
          </svg>
        </div>

        {/* Top Right Illustration (Desk Lamp + Potted Plant) */}
        <div className="absolute top-10 right-14 flex items-center gap-2">
          <svg className="w-[100px] h-[100px]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Base */}
            <path d="M30 85C30 80 70 80 70 85H30Z" fill="#0f1b3d" />
            {/* Stem */}
            <path d="M50 82C50 82 43 60 55 45" stroke="#0f1b3d" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {/* Shade */}
            <path d="M42 42L62 25L72 35L52 52L42 42Z" fill="#0f1b3d" />
            {/* Bulb */}
            <circle cx="65" cy="32" r="5" fill="#e5c364" />
            {/* Light beam */}
            <path d="M65 32L92 75L48 85L65 32Z" fill="#e5c364" fillOpacity="0.2" />
            {/* Potted plant next to it */}
            <path d="M20 85C20 80 28 80 28 85H20Z" fill="#c9a84c" />
            <path d="M24 80V73" stroke="#0f1b3d" strokeWidth="3" strokeLinecap="round" />
            <path d="M21 76C21 76 19 75 20 73" stroke="#0f1b3d" strokeWidth="2" strokeLinecap="round" />
            <path d="M27 76C27 76 29 75 28 73" stroke="#0f1b3d" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Top Title Banner */}
        <div className="text-center mt-6 relative z-10 space-y-2 max-w-[650px] mx-auto">
          {/* Elegant white hearts on sides */}
          <div className="flex items-center justify-center gap-4">
            <span className="text-3xl filter drop-shadow-md select-none">🤍</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-4xl sm:text-5xl font-black text-brand-blue text-center bg-transparent border-b border-transparent hover:border-brand-gold/30 focus:border-brand-gold focus:outline-none py-1 font-sans w-full cursor-text tracking-normal"
              title="اضغط لتعديل العنوان الرئيسي"
            />
            <span className="text-3xl filter drop-shadow-md select-none">🤍</span>
          </div>
          
          {/* Gold heart in the center below the title */}
          <div className="flex justify-center">
            <svg className="w-8 h-8 text-brand-gold drop-shadow-sm animate-pulse" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        </div>

        {/* Main Content Split: LEFT (Grid of Days) | RIGHT (Action Widgets) */}
        <div className="grid grid-cols-12 gap-8 items-stretch my-6 relative z-10 flex-grow">
          
          {/* LEFT SIDE: CALENDAR GRID (7 Columns) */}
          <div className="col-span-8 flex flex-col justify-between">
            <div className="border-[3px] border-brand-blue rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col h-full">
              {/* Column Headers: RTL الأحد -> السبت */}
              <div className="grid grid-cols-7 bg-brand-blue text-white text-center font-bold text-sm py-3.5 border-b-2 border-brand-blue">
                <div>الأحد</div>
                <div>الاثنين</div>
                <div>الثلاثاء</div>
                <div>الأربعاء</div>
                <div>الخميس</div>
                <div>الجمعة</div>
                <div>السبت</div>
              </div>

              {/* Calendar Rows */}
              <div 
                className="grid flex-grow gap-0" 
                style={{ gridTemplateRows: `repeat(${weeksList.length || 1}, minmax(0, 1fr))` }}
              >
                {weeksList.map((week, wIndex) => {
                  const weekCount = weeksList.length || 1;
                  
                  // Choose cell padding and heights based on the number of weeks to fit into 900px
                  let cellPaddingClass = "p-1.5";
                  let quantFontClass = "text-xs font-black text-blue-900 block leading-tight";
                  let verbalTitleClass = "text-xs font-black text-brand-blue block leading-tight";
                  let verbalRangeClass = "text-[11px] font-black text-slate-700 block leading-tight";
                  let cellGapClass = "space-y-0.5";
                  
                  if (weekCount > 7) {
                    cellPaddingClass = "p-0.5";
                    quantFontClass = "text-[10px] font-black text-blue-900 block leading-tight";
                    verbalTitleClass = "text-[9px] font-black text-brand-blue block leading-tight";
                    verbalRangeClass = "text-[9px] font-black text-slate-700 block leading-tight";
                    cellGapClass = "space-y-0";
                  } else if (weekCount > 5) {
                    cellPaddingClass = "p-1";
                    quantFontClass = "text-[11px] font-black text-blue-900 block leading-tight";
                    verbalTitleClass = "text-[11px] font-black text-brand-blue block leading-tight";
                    verbalRangeClass = "text-[10px] font-black text-slate-700 block leading-tight";
                    cellGapClass = "space-y-0.5";
                  }

                  return (
                    <div 
                      key={wIndex} 
                      className="grid grid-cols-7 border-b border-brand-blue/20 last:border-0"
                    >
                      {week.map((day, dIndex) => {
                        if (!day) {
                          return (
                            <div 
                              key={dIndex} 
                              className="border-r border-brand-blue/15 last:border-0 bg-slate-50/50 flex items-center justify-center" 
                            />
                          );
                        }

                        const hasQuant = day.quantBanks.length > 0;
                        const hasVerbal = day.verbalSections.length > 0;

                        return (
                          <div 
                            key={dIndex}
                            className={`border-r border-brand-blue/15 last:border-0 ${cellPaddingClass} flex flex-col justify-center items-center text-center transition-all relative ${
                              day.isStudyDay 
                                ? 'bg-white hover:bg-slate-50' 
                                : 'bg-amber-500/5'
                            }`}
                          >
                            {day.isStudyDay ? (
                              <div className={`${cellGapClass} w-full`}>
                                {/* Small relative Day Number index in top right */}
                                <span className="absolute top-0.5 right-1 text-[9px] font-bold text-slate-400 font-mono">
                                  {day.studyDayIndex}
                                </span>

                                {/* Quant block */}
                                {hasQuant ? (
                                  <div className={quantFontClass}>
                                    كمي {day.quantBanks[0] === day.quantBanks[day.quantBanks.length - 1] ? day.quantBanks[0] : `${day.quantBanks[0]}-${day.quantBanks[day.quantBanks.length - 1]}`}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-gray-400 block leading-tight">-</div>
                                )}
                                
                                {/* Verbal block */}
                                {hasVerbal ? (
                                  <div className="leading-tight">
                                    <span className={verbalTitleClass}>لفظي</span>
                                    <span className={verbalRangeClass}>
                                      ({day.verbalSections[0] === day.verbalSections[day.verbalSections.length - 1] ? day.verbalSections[0] : `${day.verbalSections[0]}-${day.verbalSections[day.verbalSections.length - 1]}`})
                                    </span>
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-gray-400 block leading-tight">-</div>
                                )}
                              </div>
                            ) : (
                              // Rest Day Style
                              <div className="flex flex-col items-center justify-center py-1">
                                <span className="text-amber-600 text-xs font-black">راحة</span>
                                <span className="text-amber-500 text-[10px]">🤍</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: 2 WIDGETS (الحدث | ملاحظات) - Note card expands to fill the height */}
          <div className="col-span-4 flex flex-col justify-between gap-6">
            
            {/* Card 1: الحدث (Event name) */}
            <div className="border-[3px] border-brand-blue rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col shrink-0">
              <div className="bg-brand-blue text-white text-center text-xs font-black py-2">
                الحدث
              </div>
              <div className="p-4 text-center relative min-h-[75px] flex items-center justify-center">
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="text-2xl font-black text-brand-blue text-center bg-transparent border-b border-transparent hover:border-brand-gold/30 focus:border-brand-gold focus:outline-none w-full"
                  title="اضغط لتعديل الحدث"
                />
                {/* Decorative gold star */}
                <Star className="w-5 h-5 text-brand-gold absolute bottom-2 left-3 fill-brand-gold opacity-90" />
              </div>
            </div>

            {/* Card 2: ملاحظات (Notebook Notes with Left Spiral Rings) - Takes all remaining height */}
            <div className="border-[3px] border-brand-blue rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col relative flex-grow">
              {/* Header */}
              <div className="bg-brand-blue text-white text-center text-xs font-black py-2 shrink-0">
                ملاحظات
              </div>
              
              {/* Spiral notebook wrapper */}
              <div className="relative flex-grow flex">
                {/* Spiral rings on the left border - beautifully distributed */}
                <div className="absolute left-1.5 top-0 bottom-0 w-3 flex flex-col justify-around py-4 z-20 pointer-events-none">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <div key={n} className="w-2.5 h-4 rounded-full border-[1.5px] border-brand-blue bg-white shadow-sm -ml-1" />
                  ))}
                </div>

                {/* Notebook paper body with elegant spacing */}
                <div className="p-6 pl-8 space-y-4 flex-grow flex flex-col justify-around min-h-[300px] bg-gradient-to-b from-white to-slate-50/20">
                  {notes.map((n, i) => (
                    <div 
                      key={i} 
                      className="flex items-start border-b border-dashed border-blue-200 pb-2 pt-1"
                    >
                      <span className="text-sm font-black text-brand-gold ml-2 shrink-0 select-none">📍</span>
                      <input
                        type="text"
                        value={n}
                        onChange={(e) => updateNote(i, e.target.value)}
                        className="w-full text-xs sm:text-sm font-extrabold text-brand-blue/90 text-right bg-transparent border-0 focus:ring-0 focus:outline-none p-0 cursor-text hover:bg-slate-100/30 rounded-md transition-all font-sans"
                        title="اضغط لتعديل هذه الملاحظة"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer Section: Prepared By (إعداد) */}
        <div className="border-t-2 border-brand-blue/20 pt-4 flex justify-between items-center relative z-10 text-xs text-brand-blue/70 font-semibold px-4">
          
          {/* Logo/Copyright */}
          <div>
            أُنشئ وصُمّم عبر منصة <span className="text-brand-blue font-extrabold">جدولني للقدرات</span>
          </div>
          
          {/* Creator name with Graduation cap and heart */}
          <div className="flex flex-col items-end gap-0.5 text-right">
            <div className="flex items-center gap-1.5 text-sm font-black text-brand-blue">
              <span>إعداد:</span>
              <span className="font-sans text-brand-gold text-lg font-black">{creatorName}</span>
              
              {/* Graduation Cap SVG icon */}
              <svg className="w-5 h-5 text-brand-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
              </svg>
            </div>
            <div className="text-[10px] text-gray-400 font-mono tracking-wider font-extrabold pr-8">
              o1v__asser
            </div>
          </div>

        </div>

      </div>
    );
  };

  return (
    <div id="poster-container" className="space-y-6 text-right">
      
      {/* Explanation Banner */}
      <div className="p-4 rounded-xl bg-brand-gold/15 border border-brand-gold/30 text-brand-blue flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-gold animate-bounce" />
          <div className="space-y-0.5">
            <span className="block text-sm font-bold">بوستر جدولك الذهبي - نسخة مطابقة للصورة تماماً!</span>
            <span className="block text-xs text-gray-500">يمكنك تعديل الأهداف، الملاحظات، العنوان، والاسم مباشرة من البوستر أدناه قبل التحميل!</span>
          </div>
        </div>
        
        <div className="flex gap-2.5">
          {typeof navigator !== 'undefined' && navigator.share && (
            <button
              id="btn-poster-share"
              onClick={handleShare}
              disabled={loading}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-brand-blue text-white rounded-xl text-xs font-bold hover:bg-brand-blue-light transition-all cursor-pointer shadow-sm hover:shadow"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>مشاركة</span>
            </button>
          )}
          <button
            id="btn-poster-download"
            onClick={handleDownload}
            disabled={loading}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-brand-gold text-brand-blue rounded-xl text-xs font-bold hover:bg-brand-gold-light transition-all cursor-pointer shadow-sm hover:shadow"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{loading ? 'جاري تصدير الصورة...' : 'حفظ الصورة للجدول'}</span>
          </button>
        </div>
      </div>

      {/* Mobile view action button */}
      <div className="md:hidden block">
        <button
          type="button"
          onClick={() => {
            setShowMobileModal(true);
          }}
          className="w-full flex items-center justify-center gap-2.5 px-5 py-4 bg-brand-blue text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-blue/15 border border-brand-gold/20 hover:bg-brand-blue-light transition-all cursor-pointer"
        >
          <Eye className="w-4 h-4 text-brand-gold animate-pulse" />
          <span>📱 افتح معاينة ملء الشاشة لقراءة وتنزيل الجدول بوضوح</span>
        </button>
      </div>

      {/* Visual Canvas containing the Poster */}
      <div className="overflow-hidden pb-6 flex justify-center w-full">
        <div 
          style={{ 
            width: `${1200 * fitWidthScale}px`, 
            height: `${900 * fitWidthScale}px`,
            position: 'relative',
            overflow: 'hidden'
          }}
          className="shadow-xl rounded-[10px] bg-white shrink-0"
        >
          <div 
            style={{
              transform: `scale(${fitWidthScale})`,
              transformOrigin: 'top left',
              width: '1200px',
              height: '900px',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          >
            {renderPosterNode(posterRef)}
          </div>
        </div>
      </div>

      {/* MOBILE FULL SCREEN PREVIEW MODAL */}
      <AnimatePresence>
        {showMobileModal && (() => {
          const contentWidth = 1200 * zoomScale;
          const contentHeight = 900 * zoomScale;
          const isOverflowed = contentWidth > (windowSize.width - 32) || contentHeight > (windowSize.height - 180);

          return (
            <div className="fixed inset-0 z-[9999] bg-[#091026] flex flex-col justify-between overflow-hidden" style={{ direction: 'rtl' }}>
              
              {/* Header Controls */}
              <div className="bg-[#0f1b3d] border-b border-brand-gold/20 px-4 py-3 flex items-center justify-between gap-4 shrink-0 text-white">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-brand-gold/10 text-brand-gold">
                    <Eye className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black">معاينة ملء الشاشة للجدول</h3>
                    <p className="text-[10px] text-gray-300">تأكد من الجدول بالكامل بوضوح قبل التحميل</p>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setShowMobileModal(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                  title="إغلاق المعاينة"
                >
                  <X className="w-5.5 h-5.5" />
                </button>
              </div>

              {/* Poster Canvas Wrapper with dynamic centering and panning support */}
              <div 
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                  display: 'flex',
                  justifyContent: isOverflowed ? 'flex-start' : 'center',
                  alignItems: isOverflowed ? 'flex-start' : 'center',
                }}
                className="flex-grow overflow-auto p-4 select-none bg-[#091026] relative cursor-grab active:cursor-grabbing min-h-0"
              >
                <div 
                  style={{ 
                    width: `${contentWidth}px`, 
                    height: `${contentHeight}px`,
                    position: 'relative',
                    overflow: 'visible'
                  }}
                  className="shadow-2xl rounded-[10px] bg-white transition-all duration-100 shrink-0"
                >
                  <div 
                    style={{
                      transform: `scale(${zoomScale})`,
                      transformOrigin: 'top left',
                      width: '1200px',
                      height: '900px',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                    }}
                  >
                    {renderPosterNode(modalPosterRef)}
                  </div>
                </div>
              </div>

              {/* Floating Zoom Control Bar */}
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 bg-[#0f1b3d]/95 backdrop-blur-md border border-brand-gold/30 px-3 py-2 rounded-2xl flex items-center gap-2.5 shadow-2xl shrink-0 text-white max-w-[95%]">
                {/* Zoom Out */}
                <button
                  type="button"
                  onClick={() => setZoomScale(prev => Math.max(0.15, prev - 0.15))}
                  className="w-8 h-8 rounded-lg bg-[#091026] hover:bg-[#162550] flex items-center justify-center text-brand-gold font-bold transition-all cursor-pointer select-none text-base"
                >
                  -
                </button>
                
                {/* Slider */}
                <input 
                  type="range"
                  min={Math.max(0.15, fitWidthScale * 0.8).toFixed(2)}
                  max="2.2"
                  step="0.05"
                  value={zoomScale}
                  onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                  className="w-20 sm:w-32 accent-brand-gold cursor-pointer h-1 rounded-lg bg-gray-700 appearance-none"
                />

                {/* Zoom In */}
                <button
                  type="button"
                  onClick={() => setZoomScale(prev => Math.min(2.5, prev + 0.15))}
                  className="w-8 h-8 rounded-lg bg-[#091026] hover:bg-[#162550] flex items-center justify-center text-brand-gold font-bold transition-all cursor-pointer select-none text-base"
                >
                  +
                </button>

                <div className="h-4 w-[1px] bg-white/20 mx-1" />

                {/* Active Percentage Display */}
                <span className="text-[10px] font-mono font-bold text-gray-300 min-w-[32px] text-center">
                  {Math.round(zoomScale * 100)}%
                </span>

                <div className="h-4 w-[1px] bg-white/20 mx-1 hidden xs:block" />

                {/* Preset Buttons */}
                <button
                  type="button"
                  onClick={() => setZoomScale(fitWidthScale)}
                  className={`px-2 py-1 rounded text-[10px] font-black transition-all ${
                    Math.abs(zoomScale - fitWidthScale) < 0.05 ? 'bg-brand-gold text-brand-blue' : 'bg-[#091026] text-gray-300'
                  }`}
                >
                  تلقائي 📱
                </button>

                <button
                  type="button"
                  onClick={() => setZoomScale(1.0)}
                  className={`px-2 py-1 rounded text-[10px] font-black transition-all ${
                    Math.abs(zoomScale - 1.0) < 0.05 ? 'bg-brand-gold text-brand-blue' : 'bg-[#091026] text-gray-300'
                  }`}
                >
                  100% 🔎
                </button>
              </div>

              {/* Bottom Actions */}
              <div className="bg-[#0f1b3d] border-t border-brand-gold/20 p-4 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
                <span className="text-xs text-brand-gold/80 text-center sm:text-right font-medium">
                  💡 اسحب بإصبعك للتمرير في جميع الاتجاهات، أو استخدم قرصة الإصبع (Pinch-to-Zoom) للتكبير والتصغير!
                </span>
                
                <div className="flex gap-2.5 w-full sm:w-auto">
                  {typeof navigator !== 'undefined' && navigator.share && (
                    <button
                      onClick={handleModalShare}
                      disabled={loading}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-3 bg-[#091026] text-white rounded-xl text-xs font-bold hover:bg-[#162550] transition-all cursor-pointer border border-brand-gold/20"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>مشاركة</span>
                    </button>
                  )}
                  <button
                    onClick={handleModalDownload}
                    disabled={loading}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-3 bg-brand-gold text-brand-blue rounded-xl text-xs font-bold hover:bg-brand-gold-light transition-all cursor-pointer shadow-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{loading ? 'جاري تصدير الصورة...' : 'تنزيل كصورة عالية الدقة'}</span>
                  </button>
                </div>
              </div>

            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
