import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Eye, Calendar, ShieldCheck, RefreshCw, X, Search, 
  Activity, Lock, TrendingUp, Sparkles, CheckCircle2
} from 'lucide-react';

interface AdminAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

interface RecentVisitor {
  id: string;
  name: string;
  date: string;
  time: string;
  timestamp: number;
  isOnline: boolean;
  isRegistered: boolean;
}

interface RegisteredUser {
  id: string;
  name: string;
  createdAt: string;
  schedulesCount: number;
  isOnlineNow: boolean;
}

interface ActiveSession {
  id: string;
  name: string;
  onlineForMinutes: number;
  lastActiveSecondsAgo: number;
  isRegistered: boolean;
}

interface AdminStats {
  activeNow: number;
  totalVisits: number;
  totalUsers: number;
  totalSchedules: number;
  registeredUsers: RegisteredUser[];
  activeSessionsList: ActiveSession[];
  recentVisitors: RecentVisitor[];
  dailyVisits?: Record<string, number>;
  scheduleStats?: {
    total: number;
    both: number;
    quant: number;
    verbal: number;
  };
}

export default function AdminAnalyticsModal({ isOpen, onClose, userEmail }: AdminAnalyticsModalProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'visitors' | 'users' | 'live' | 'schedules'>('visitors');
  const [visitorFilter, setVisitorFilter] = useState<'all' | 'online' | 'today'>('all');
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isOwner = userEmail?.toLowerCase().trim() === 'asserosama5533@gmail.com';

  const fetchStats = async (keyToUse?: string) => {
    setLoading(true);
    setError('');
    try {
      const pin = keyToUse || adminPin || '7070';
      const url = `/api/analytics/admin-stats?email=${encodeURIComponent(userEmail || '')}&adminKey=${encodeURIComponent(pin)}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (res.ok && data.success) {
        setStats(data);
        setIsUnlocked(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('admin_unlocked', 'true');
          localStorage.setItem('admin_key', pin);
          window.dispatchEvent(new Event('admin-status-changed'));
        }
        setLastUpdatedTime(new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else {
        setError(data.error || 'رمز الوصول غير صحيح');
        if (!isOwner) {
          setIsUnlocked(false);
        }
      }
    } catch (e) {
      setError('فشل في الاتصال بالسيرفر وجلب الإحصائيات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStats('7070');
    }
  }, [isOpen, userEmail]);

  // Auto refresh stats every 10 seconds while modal is open
  useEffect(() => {
    if (!isOpen || !isUnlocked) return;
    const interval = setInterval(() => {
      fetchStats('7070');
    }, 10000);
    return () => clearInterval(interval);
  }, [isOpen, isUnlocked]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPin) return;
    fetchStats(adminPin);
  };

  // Filtered visitors
  const filteredVisitors = useMemo(() => {
    if (!stats?.recentVisitors) return [];
    let list = stats.recentVisitors;

    const todayStr = new Date().toLocaleDateString('ar-SA');
    if (visitorFilter === 'online') {
      list = list.filter(v => v.isOnline);
    } else if (visitorFilter === 'today') {
      list = list.filter(v => v.date === todayStr || (Date.now() - v.timestamp < 24 * 60 * 60 * 1000));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(v => v.name.toLowerCase().includes(q));
    }

    return list;
  }, [stats?.recentVisitors, visitorFilter, searchQuery]);

  // Filtered registered students
  const filteredUsers = useMemo(() => {
    if (!stats?.registeredUsers) return [];
    let list = stats.registeredUsers;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(u => u.name.toLowerCase().includes(q));
    }

    return list;
  }, [stats?.registeredUsers, searchQuery]);

  if (!isOpen || !mounted) return null;

  // Calculate today's visits
  const todayKey = new Date().toISOString().split('T')[0];
  const todayVisitsCount = stats?.dailyVisits?.[todayKey] || 0;

  // Calculate highest daily visits for chart scaling
  const dailyVisitsEntries: [string, number][] = Object.entries(stats?.dailyVisits || {}).slice(-7).map(([k, v]) => [k, Number(v) || 0]);
  const maxDailyVisit = Math.max(1, ...dailyVisitsEntries.map(([_, v]) => v));

  const modalContent = (
    <div 
      className="fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 bg-black/80 backdrop-blur-md overflow-hidden" 
      dir="rtl"
      id="admin-analytics-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2 }}
        className="bg-[#0b142b] text-white rounded-2xl md:rounded-3xl shadow-2xl border border-brand-gold/30 w-full max-w-5xl xl:max-w-6xl h-[94vh] md:h-[90vh] max-h-[94vh] md:max-h-[90vh] overflow-hidden flex flex-col text-right relative"
      >
        {/* Header - Completely Responsive for Mobile, Tablet & PC */}
        <div className="p-3.5 sm:p-5 md:px-6 bg-gradient-to-r from-[#0c1633] via-[#162550] to-[#0c1633] border-b border-brand-gold/20 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl sm:rounded-2xl bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center text-brand-gold font-bold shadow-inner shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base md:text-xl font-black tracking-wide text-white truncate">
                  لوحة إحصائيات المنصة الحقيقية
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  مباشر
                </span>
              </div>
              <p className="text-[11px] sm:text-xs md:text-sm text-gray-300 mt-0.5 truncate">
                بيانات حقيقية 100% بالأسماء والتوقيت الفعلي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {lastUpdatedTime && (
              <span className="hidden lg:inline-flex items-center gap-1.5 text-xs text-gray-300 font-mono bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                تحديث: {lastUpdatedTime}
              </span>
            )}

            <button
              onClick={() => fetchStats('7070')}
              disabled={loading}
              className="px-2.5 sm:px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-brand-gold border border-brand-gold/30 transition-all text-xs sm:text-sm flex items-center gap-1.5 font-bold cursor-pointer shadow-xs active:scale-95"
              title="تحديث البيانات الآن"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">تحديث فوري</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer active:scale-95"
              title="إغلاق النافذة"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Body Container */}
        <div className="p-3 sm:p-5 md:p-6 overflow-y-auto space-y-4 md:space-y-6 flex-1 bg-[#0b142b]/95 text-right">

          {!isUnlocked ? (
            /* PIN Verification Form (If locked) */
            <div className="max-w-md mx-auto my-8 sm:my-12 p-6 md:p-8 bg-[#162550] rounded-2xl border border-brand-gold/30 shadow-xl text-center space-y-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-brand-gold/20 text-brand-gold rounded-2xl flex items-center justify-center mx-auto border border-brand-gold/40">
                <Lock className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-black text-white">إحصائيات الأدمن الإدارية</h3>
                <p className="text-xs text-gray-300 mt-1">أدخل كود الأدمن السري للاطلاع على البيانات</p>
              </div>

              <form onSubmit={handlePinSubmit} className="space-y-3 pt-2">
                <input
                  type="password"
                  placeholder="كود الأدمن (7070)"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  className="w-full text-center px-4 py-3 rounded-xl bg-[#0c1633] text-white border border-brand-gold/40 focus:ring-2 focus:ring-brand-gold text-sm font-mono tracking-widest"
                />
                {error && <p className="text-xs text-rose-400 font-bold">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-brand-gold text-brand-blue rounded-xl font-black text-sm hover:bg-brand-gold-light transition-all shadow-md cursor-pointer"
                >
                  {loading ? 'جاري التحقق...' : 'دخول لوحة الإحصائيات'}
                </button>
              </form>
            </div>
          ) : (
            /* MAIN DASHBOARD CONTENT */
            <>
              {/* 4 PRIMARY METRIC CARDS - Responsive Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
                
                {/* Active Now */}
                <div className="bg-[#162550] p-3 sm:p-4 md:p-5 rounded-2xl border border-emerald-500/40 shadow-md relative overflow-hidden group hover:border-emerald-400 transition-all">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 to-teal-400"></div>
                  <div className="flex items-center justify-between text-xs sm:text-sm font-bold mb-1 sm:mb-2">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500"></span>
                      </span>
                      نشط الآن
                    </span>
                    <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white font-mono tracking-tight">
                    {stats?.activeNow ?? 0}
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-300 mt-1">متواجدون حالياً بالموقع</p>
                </div>

                {/* Total Real Visitors */}
                <div className="bg-[#162550] p-3 sm:p-4 md:p-5 rounded-2xl border border-sky-500/40 shadow-md relative overflow-hidden group hover:border-sky-400 transition-all">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-400 to-blue-500"></div>
                  <div className="flex items-center justify-between text-xs sm:text-sm font-bold mb-1 sm:mb-2">
                    <span className="text-sky-300">إجمالي الزوار</span>
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white font-mono tracking-tight">
                    {stats?.totalVisits ?? 0}
                  </div>
                  <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-300 mt-1">
                    <span>حقيقي بالكامل</span>
                    <span className="text-sky-300 bg-sky-500/20 px-1.5 py-0.5 rounded font-bold font-mono">+{todayVisitsCount} اليوم</span>
                  </div>
                </div>

                {/* Registered Students */}
                <div className="bg-[#162550] p-3 sm:p-4 md:p-5 rounded-2xl border border-brand-gold/40 shadow-md relative overflow-hidden group hover:border-brand-gold transition-all">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-gold to-amber-300"></div>
                  <div className="flex items-center justify-between text-xs sm:text-sm font-bold mb-1 sm:mb-2">
                    <span className="text-brand-gold">الطلاب المسجلين</span>
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-brand-gold" />
                  </div>
                  <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white font-mono tracking-tight">
                    {stats?.totalUsers ?? 0}
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-300 mt-1">حساب طالب مسجل بقاعدة البيانات</p>
                </div>

                {/* Total Schedules */}
                <div className="bg-[#162550] p-3 sm:p-4 md:p-5 rounded-2xl border border-purple-500/40 shadow-md relative overflow-hidden group hover:border-purple-400 transition-all">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-400 to-indigo-400"></div>
                  <div className="flex items-center justify-between text-xs sm:text-sm font-bold mb-1 sm:mb-2">
                    <span className="text-purple-300">الجداول المنشأة</span>
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white font-mono tracking-tight">
                    {stats?.totalSchedules ?? 0}
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-300 mt-1">جدول فعلي محفوظ بالسيرفر</p>
                </div>

              </div>

              {/* ACTIVE USERS STRIP */}
              {stats?.activeSessionsList && stats.activeSessionsList.length > 0 && (
                <div className="p-3 sm:p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-2.5 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                    <span className="text-xs sm:text-sm font-black text-emerald-300">المتواجدون حالياً بالموقع:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {stats.activeSessionsList.map((s, idx) => (
                      <span 
                        key={s.id || idx}
                        className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-emerald-900/70 border border-emerald-500/40 text-xs sm:text-sm font-black text-white flex items-center gap-1.5 sm:gap-2 shadow-xs"
                      >
                        <span className="text-emerald-400 font-normal">👤</span>
                        <span>{s.name}</span>
                        <span className="text-[10px] sm:text-[11px] text-emerald-300/90 font-mono bg-emerald-950/60 px-1.5 py-0.5 rounded">
                          {s.onlineForMinutes} دقيقة
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* NAVIGATION TABS & MAIN CONTENT CONTAINER */}
              <div className="bg-[#142145] rounded-2xl md:rounded-3xl border border-brand-gold/20 overflow-hidden shadow-lg">
                
                {/* Tabs Header */}
                <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-brand-gold/15 bg-[#0f1b3d] p-1.5 sm:p-2 gap-1 sm:gap-2">
                  <button
                    onClick={() => { setActiveTab('visitors'); setSearchQuery(''); }}
                    className={`py-2 sm:py-2.5 md:py-3 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
                      activeTab === 'visitors'
                        ? 'bg-brand-gold text-brand-blue shadow-md'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="truncate">سجل الزوار ({stats?.recentVisitors?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
                    className={`py-2 sm:py-2.5 md:py-3 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
                      activeTab === 'users'
                        ? 'bg-brand-gold text-brand-blue shadow-md'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="truncate">الطلاب المسجلين ({stats?.registeredUsers?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('live'); setSearchQuery(''); }}
                    className={`py-2 sm:py-2.5 md:py-3 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
                      activeTab === 'live'
                        ? 'bg-emerald-500 text-slate-900 shadow-md'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="truncate">الجلسات النشطة ({stats?.activeSessionsList?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('schedules'); setSearchQuery(''); }}
                    className={`py-2 sm:py-2.5 md:py-3 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
                      activeTab === 'schedules'
                        ? 'bg-brand-gold text-brand-blue shadow-md'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="truncate">الجداول ({stats?.totalSchedules || 0})</span>
                  </button>
                </div>

                {/* TAB 1: VISITORS LOG */}
                {activeTab === 'visitors' && (
                  <div className="p-3 sm:p-5 md:p-6 space-y-4 sm:space-y-5">
                    
                    {/* Daily Traffic Bar Chart */}
                    {dailyVisitsEntries.length > 0 && (
                      <div className="p-3 sm:p-4 md:p-5 bg-[#192b5c] rounded-2xl border border-sky-500/25 space-y-2.5 shadow-inner">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="text-xs sm:text-sm font-black text-sky-200 flex items-center gap-1.5 sm:gap-2">
                            <TrendingUp className="w-4 h-4 text-sky-400 shrink-0" />
                            حركة الزيارات اليومية الحقيقية
                          </span>
                          <span className="text-[11px] sm:text-xs text-gray-300">
                            زيارات اليوم: <b className="text-brand-gold font-mono font-black text-xs sm:text-sm">+{todayVisitsCount}</b>
                          </span>
                        </div>

                        <div className="grid grid-cols-7 gap-1.5 sm:gap-3 items-end pt-3 h-28 sm:h-32 md:h-36 border-t border-white/10">
                          {dailyVisitsEntries.map(([dateKey, count]) => {
                            const heightPercent = Math.max(20, Math.round((count / maxDailyVisit) * 100));
                            const isToday = dateKey === todayKey;
                            return (
                              <div key={dateKey} className="flex flex-col items-center justify-end h-full gap-1 text-center group">
                                <span className={`text-[9px] sm:text-xs font-mono font-bold ${
                                  isToday ? 'text-brand-gold font-black' : 'text-gray-300'
                                }`}>
                                  {count}
                                </span>
                                <div 
                                  className={`w-full max-w-[50px] rounded-t-md sm:rounded-t-lg transition-all ${
                                    isToday 
                                      ? 'bg-gradient-to-t from-brand-gold to-amber-300 shadow-md ring-2 ring-brand-gold/40' 
                                      : 'bg-sky-500/60 hover:bg-sky-400'
                                  }`}
                                  style={{ height: `${heightPercent}%` }}
                                  title={`${dateKey}: ${count} زيارة`}
                                ></div>
                                <span className={`text-[9px] sm:text-[11px] truncate w-full font-mono ${
                                  isToday ? 'text-brand-gold font-bold' : 'text-gray-400'
                                }`}>
                                  {isToday ? 'اليوم' : dateKey.slice(5)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Filters and Search Bar */}
                    <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                      <div className="flex items-center gap-1 bg-[#0f1b3d] p-1 rounded-xl border border-white/10 overflow-x-auto">
                        <button
                          onClick={() => setVisitorFilter('all')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            visitorFilter === 'all' ? 'bg-brand-gold text-brand-blue shadow-xs' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          الكل ({stats?.recentVisitors?.length || 0})
                        </button>
                        <button
                          onClick={() => setVisitorFilter('online')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            visitorFilter === 'online' ? 'bg-emerald-500 text-slate-900 shadow-xs' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          المتواجدون الآن ({stats?.recentVisitors?.filter(v => v.isOnline).length || 0})
                        </button>
                        <button
                          onClick={() => setVisitorFilter('today')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            visitorFilter === 'today' ? 'bg-sky-500 text-white shadow-xs' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          اليوم
                        </button>
                      </div>

                      <div className="relative w-full sm:w-64 md:w-72">
                        <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="ابحث باسم الزائر..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pr-9 pl-3 py-2 bg-[#0f1b3d] text-white border border-white/15 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none"
                        />
                      </div>
                    </div>

                    {/* Visitors List / Table */}
                    <div className="overflow-x-auto rounded-xl border border-white/10 max-h-80 md:max-h-96 overflow-y-auto">
                      <table className="w-full text-right text-xs sm:text-sm min-w-[460px]">
                        <thead className="bg-[#0f1b3d] text-brand-gold-light font-black sticky top-0 border-b border-white/15 z-10">
                          <tr>
                            <th className="p-2.5 sm:p-3.5">اسم الزائر / الطالب</th>
                            <th className="p-2.5 sm:p-3.5">الحالة الآن</th>
                            <th className="p-2.5 sm:p-3.5">وقت الزيارة</th>
                            <th className="p-2.5 sm:p-3.5">التاريخ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-medium text-gray-200">
                          {filteredVisitors.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="text-center py-8 sm:py-12 text-gray-400 text-xs sm:text-sm">
                                {searchQuery ? 'لا توجد نتائج تطابق بحثك' : 'لا يوجد زوار في السجل حتى الآن'}
                              </td>
                            </tr>
                          ) : (
                            filteredVisitors.map((v, i) => (
                              <tr key={v.id || i} className="hover:bg-white/5 transition-colors">
                                <td className="p-2.5 sm:p-3.5">
                                  <div className="flex items-center gap-2 font-bold text-white">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center text-brand-gold text-xs sm:text-sm font-black shrink-0">
                                      {v.name.charAt(0)}
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-xs sm:text-sm">{v.name}</span>
                                      {v.isRegistered && (
                                        <span className="text-[9px] sm:text-[10px] bg-brand-gold/25 text-brand-gold px-1.5 py-0.5 rounded font-bold">
                                          طالب مسجل 🎓
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                <td className="p-2.5 sm:p-3.5">
                                  {v.isOnline ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                      متواجد الآن
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-medium bg-white/5 text-gray-400">
                                      انتهت الجلسة
                                    </span>
                                  )}
                                </td>

                                <td className="p-2.5 sm:p-3.5 font-mono text-gray-300 text-xs">
                                  {v.time || 'مؤخراً'}
                                </td>

                                <td className="p-2.5 sm:p-3.5 font-mono text-gray-400 text-xs">
                                  {v.date}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                  </div>
                )}

                {/* TAB 2: REGISTERED STUDENTS LIST */}
                {activeTab === 'users' && (
                  <div className="p-3 sm:p-5 md:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                      <div className="text-xs sm:text-sm text-gray-300 font-bold">
                        إجمالي حسابات الطلاب المسجلة فعلياً: <b className="text-brand-gold font-mono font-black text-sm sm:text-base">{stats?.registeredUsers?.length || 0}</b>
                      </div>
                      <div className="relative w-full sm:w-64 md:w-72">
                        <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="ابحث باسم الطالب..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pr-9 pl-3 py-2 bg-[#0f1b3d] text-white border border-white/15 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-white/10 max-h-80 md:max-h-96 overflow-y-auto">
                      <table className="w-full text-right text-xs sm:text-sm min-w-[460px]">
                        <thead className="bg-[#0f1b3d] text-brand-gold-light font-black sticky top-0 border-b border-white/15 z-10">
                          <tr>
                            <th className="p-2.5 sm:p-3.5">اسم الطالب</th>
                            <th className="p-2.5 sm:p-3.5">حالة التواجد</th>
                            <th className="p-2.5 sm:p-3.5">الجداول المنشأة</th>
                            <th className="p-2.5 sm:p-3.5">تاريخ الانضمام</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-medium text-gray-200">
                          {filteredUsers.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="text-center py-8 sm:py-12 text-gray-400 text-xs sm:text-sm">
                                {searchQuery ? 'لا يوجد طلاب يطابقون نتائج البحث' : 'لا يوجد حسابات مسجلة حتى الآن'}
                              </td>
                            </tr>
                          ) : (
                            filteredUsers.map((u, i) => (
                              <tr key={u.id || i} className="hover:bg-white/5 transition-colors">
                                <td className="p-2.5 sm:p-3.5">
                                  <div className="flex items-center gap-2.5 font-black text-white">
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-gold/30 to-brand-gold/10 border border-brand-gold/40 flex items-center justify-center text-brand-gold font-black text-xs sm:text-sm shrink-0">
                                      {u.name.charAt(0)}
                                    </div>
                                    <span className="text-xs sm:text-sm font-bold">{u.name}</span>
                                  </div>
                                </td>

                                <td className="p-2.5 sm:p-3.5">
                                  {u.isOnlineNow ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                      متصل الآن 🟢
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-medium bg-white/5 text-gray-400">
                                      غير متصل
                                    </span>
                                  )}
                                </td>

                                <td className="p-2.5 sm:p-3.5">
                                  <span className="px-2.5 py-1 rounded-lg bg-[#162550] text-brand-gold font-bold border border-brand-gold/25 font-mono text-xs">
                                    {u.schedulesCount} {u.schedulesCount === 1 ? 'جدول' : 'جداول'}
                                  </span>
                                </td>

                                <td className="p-2.5 sm:p-3.5 font-mono text-gray-300 text-xs">
                                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-SA') : 'سابق'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                  </div>
                )}

                {/* TAB 3: LIVE ACTIVE SESSIONS */}
                {activeTab === 'live' && (
                  <div className="p-3 sm:p-5 md:p-6 space-y-4">
                    <div className="text-xs sm:text-sm text-gray-300 font-bold flex items-center justify-between">
                      <span>المتصفحون للموقع في هذه اللحظة بالأسماء:</span>
                      <span className="text-emerald-400 font-mono font-black text-xs sm:text-base">
                        {stats?.activeSessionsList?.length || 0} متصل حالياً
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 max-h-80 md:max-h-96 overflow-y-auto pt-1">
                      {!stats?.activeSessionsList || stats.activeSessionsList.length === 0 ? (
                        <div className="col-span-full text-center py-10 sm:py-12 text-gray-400 text-xs sm:text-sm">
                          لا توجد جلسات أخرى نشطة في هذه اللحظة.
                        </div>
                      ) : (
                        stats.activeSessionsList.map((s, idx) => (
                          <div 
                            key={s.id || idx} 
                            className="p-3.5 sm:p-4 md:p-5 bg-[#162550] rounded-2xl border border-emerald-500/30 flex items-center justify-between gap-2.5 text-xs sm:text-sm shadow-md hover:border-emerald-400/60 transition-all"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-sm sm:text-base shrink-0">
                                {s.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-black text-white text-xs sm:text-sm md:text-base flex items-center gap-1.5">
                                  <span>{s.name}</span>
                                  {s.isRegistered && (
                                    <span className="text-[9px] bg-brand-gold/20 text-brand-gold px-1.5 py-0.2 rounded font-bold">
                                      طالب
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] sm:text-xs text-emerald-400 font-bold mt-0.5">
                                  🟢 متواجد الآن بالموقع
                                </div>
                              </div>
                            </div>

                            <div className="text-left font-mono shrink-0">
                              <div className="text-gray-200 font-bold text-xs">منذ {s.onlineForMinutes} دقيقة</div>
                              <div className="text-gray-400 text-[10px]">قبل {s.lastActiveSecondsAgo} ثانية</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: SCHEDULES ANALYTICS */}
                {activeTab === 'schedules' && (
                  <div className="p-3 sm:p-5 md:p-6 space-y-4 sm:space-y-5">
                    <div className="text-xs sm:text-sm text-gray-300 font-bold">
                      أعداد وتصنيفات الجداول المحفوظة فعلياً على السيرفر (بيانات حقيقية):
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-4">
                      <div className="p-4 sm:p-5 bg-[#162550] rounded-2xl border border-brand-gold/30 text-center space-y-1 shadow-md">
                        <span className="text-xs sm:text-sm text-gray-300 font-bold">جداول شاملة (كمي + لفظي)</span>
                        <div className="text-2xl sm:text-3xl md:text-4xl font-black text-brand-gold font-mono">
                          {stats?.scheduleStats?.both || 0}
                        </div>
                        <span className="text-[10px] sm:text-xs text-gray-400">شامل للقسمين معاً</span>
                      </div>

                      <div className="p-4 sm:p-5 bg-[#162550] rounded-2xl border border-sky-500/30 text-center space-y-1 shadow-md">
                        <span className="text-xs sm:text-sm text-gray-300 font-bold">جداول كمي فقط</span>
                        <div className="text-2xl sm:text-3xl md:text-4xl font-black text-sky-400 font-mono">
                          {stats?.scheduleStats?.quant || 0}
                        </div>
                        <span className="text-[10px] sm:text-xs text-gray-400">تركيز على التأسيس والكمي</span>
                      </div>

                      <div className="p-4 sm:p-5 bg-[#162550] rounded-2xl border border-purple-500/30 text-center space-y-1 shadow-md">
                        <span className="text-xs sm:text-sm text-gray-300 font-bold">جداول لفظي فقط</span>
                        <div className="text-2xl sm:text-3xl md:text-4xl font-black text-purple-400 font-mono">
                          {stats?.scheduleStats?.verbal || 0}
                        </div>
                        <span className="text-[10px] sm:text-xs text-gray-400">تركيز على القسم اللفظي</span>
                      </div>
                    </div>

                    <div className="p-3.5 sm:p-4 md:p-5 bg-[#192b5c] rounded-2xl border border-white/10 text-xs sm:text-sm text-gray-300 space-y-1.5">
                      <div className="font-black text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-brand-gold shrink-0" />
                        <span>توثيق حقيقي للجداول:</span>
                      </div>
                      <p className="leading-relaxed text-[11px] sm:text-xs text-gray-300">
                        • الأرقام المعروضة أعلاه يتم حسابها مباشرة من ملفات الجداول الفعلية المحفوظة لكل طالب.<br />
                        • لا توجد أي نسب تقديرية أو أرقام عشوائية، فقط ما يتم إنشاؤه وحفظه من قِبل الطلاب.<br />
                        • يتم فحص وتحديث الإحصائيات لحظياً وتلقائياً كل 10 ثوانٍ.
                      </p>
                    </div>
                  </div>
                )}

              </div>

            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 md:px-6 bg-[#0c1633] border-t border-brand-gold/15 text-center text-xs sm:text-sm text-gray-400 shrink-0 flex items-center justify-between">
          <span className="font-bold text-gray-300 text-[11px] sm:text-xs md:text-sm truncate">
            منصة جدولني للقدرات - إحصائيات حقيقية ومباشرة
          </span>
          <button
            onClick={onClose}
            className="px-4 sm:px-5 py-2 sm:py-2.5 bg-brand-gold text-brand-blue hover:bg-brand-gold-light rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
          >
            إغلاق النافذة
          </button>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
