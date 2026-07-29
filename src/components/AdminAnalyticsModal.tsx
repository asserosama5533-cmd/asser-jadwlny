import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Eye, Calendar, ShieldCheck, RefreshCw, X, Search, Activity, Lock, Smartphone } from 'lucide-react';

interface AdminAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

interface AdminStats {
  activeNow: number;
  totalVisits: number;
  totalUsers: number;
  totalSchedules: number;
  registeredUsers: { id: string; name: string; email: string; createdAt: string }[];
  activeSessionsList: { clientId: string; email: string; userAgent: string; onlineForMinutes: number; lastActiveSecondsAgo: number }[];
  dailyVisits?: Record<string, number>;
}

export default function AdminAnalyticsModal({ isOpen, onClose, userEmail }: AdminAnalyticsModalProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'sessions'>('users');

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
      if (isOwner) {
        setIsUnlocked(true);
        fetchStats('asser70');
      } else {
        // Prompt for pin if not logged in as admin
        const savedPin = sessionStorage.getItem('admin_stats_pin');
        if (savedPin) {
          fetchStats(savedPin);
        }
      }
    }
  }, [isOpen, userEmail]);

  // Auto refresh stats every 10 seconds while modal is open
  useEffect(() => {
    if (!isOpen || !isUnlocked) return;
    const interval = setInterval(() => {
      fetchStats();
    }, 10000);
    return () => clearInterval(interval);
  }, [isOpen, isUnlocked]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPin) return;
    sessionStorage.setItem('admin_stats_pin', adminPin);
    fetchStats(adminPin);
  };

  if (!isOpen) return null;

  const maskEmail = (email?: string) => {
    if (!email || email.includes('زائر') || email.includes('غير مسجل')) {
      return email || 'زائر (غير مسجل)';
    }
    const parts = email.split('@');
    if (parts.length < 2) return 'مستخدم مسجل';
    const namePart = parts[0];
    const domainPart = parts[1];
    const maskedName = namePart.length > 2 ? `${namePart.slice(0, 2)}***` : `${namePart.slice(0, 1)}***`;
    return `${maskedName}@${domainPart}`;
  };

  const filteredUsers = stats?.registeredUsers?.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col text-right"
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-brand-blue via-slate-900 to-brand-blue text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center text-brand-gold font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-wide text-white flex items-center gap-2">
                  لوحة إحصائيات الأدمن الإدارية
                  <span className="text-[10px] bg-brand-gold/20 text-brand-gold border border-brand-gold/30 px-2 py-0.5 rounded-full font-mono font-bold">خاص بالأدمن</span>
                </h2>
                <p className="text-xs text-slate-300">متابعة الزوار الحية، مستخدمي المنصة، والجداول المنشأة لحظياً</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isUnlocked && (
                <button
                  onClick={() => fetchStats()}
                  disabled={loading}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all text-xs flex items-center gap-1.5 font-bold"
                  title="تحديث البيانات الآن"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">تحديث فوري</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">

            {!isUnlocked ? (
              /* PIN Verification Form */
              <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-2xl border border-gray-200 shadow-sm text-center space-y-4">
                <div className="w-14 h-14 bg-brand-blue/10 text-brand-blue rounded-2xl flex items-center justify-center mx-auto">
                  <Lock className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">إحصائيات الأدمن محمية</h3>
                  <p className="text-xs text-slate-500 mt-1">الرجاء إدخال كود وصول الأدمن السري للطع الاطلاع على الإحصائيات</p>
                </div>

                <form onSubmit={handlePinSubmit} className="space-y-3 pt-2">
                  <input
                    type="password"
                    placeholder="أدخل كود الأدمن (مثلاً: 7070)"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    className="w-full text-center px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-blue text-sm font-mono tracking-widest"
                  />
                  {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading || !adminPin}
                    className="w-full py-3 bg-brand-blue text-white rounded-xl font-bold text-sm hover:bg-brand-blue/90 transition-all shadow-md disabled:opacity-50"
                  >
                    {loading ? 'جاري التحقق...' : 'دخول لوحة الإحصائيات'}
                  </button>
                </form>
              </div>
            ) : (
              /* Unlocked Dashboard Content */
              <>
                {/* 4 KPI Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  
                  {/* Active Now */}
                  <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
                    <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-2">
                      <span className="flex items-center gap-1.5 text-emerald-700">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        نشط حالياً
                      </span>
                      <Activity className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-3xl font-black text-slate-900 font-mono">
                      {stats?.activeNow ?? 0}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">مستخدمون يتصفحون الآن</p>
                  </div>

                  {/* Total Visits */}
                  <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-sky-500"></div>
                    <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-2">
                      <span className="text-sky-700">إجمالي الزوار</span>
                      <Eye className="w-4 h-4 text-sky-600" />
                    </div>
                    <div className="text-3xl font-black text-slate-900 font-mono">
                      {stats?.totalVisits ?? 0}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">إجمالي الزيارات والزيارات</p>
                  </div>

                  {/* Total Registered Users */}
                  <div className="bg-white p-4 rounded-2xl border border-brand-blue/15 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-brand-blue"></div>
                    <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-2">
                      <span className="text-brand-blue">الحسابات المسجلة</span>
                      <Users className="w-4 h-4 text-brand-blue" />
                    </div>
                    <div className="text-3xl font-black text-slate-900 font-mono">
                      {stats?.totalUsers ?? 0}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">طلاب مسجلين بالمنصة</p>
                  </div>

                  {/* Total Schedules Created */}
                  <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
                    <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-2">
                      <span className="text-amber-700">الجداول المنشأة</span>
                      <Calendar className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-3xl font-black text-slate-900 font-mono">
                      {stats?.totalSchedules ?? 0}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">جدول قدرات تم إنشاؤه</p>
                  </div>

                </div>

                {/* Main Tabs for Detailed Analytics */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
                  
                  {/* Tab Selector */}
                  <div className="flex border-b border-gray-100 bg-slate-100/60 p-1.5 gap-2">
                    <button
                      onClick={() => setActiveTab('users')}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'users'
                          ? 'bg-white text-brand-blue shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      قائمة الطلاب المسجلين ({stats?.registeredUsers?.length || 0})
                    </button>

                    <button
                      onClick={() => setActiveTab('sessions')}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'sessions'
                          ? 'bg-white text-emerald-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Activity className="w-4 h-4" />
                      الجلسات النشطة الآن ({stats?.activeSessionsList?.length || 0})
                    </button>
                  </div>

                  {/* Tab 1: Users List */}
                  {activeTab === 'users' && (
                    <div className="p-4 space-y-4">
                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="ابحث باسم الطالب أو البريد الإلكتروني..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-blue"
                        />
                      </div>

                      <div className="overflow-x-auto max-h-72">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-100 text-slate-600 font-bold">
                            <tr>
                              <th className="p-2.5 rounded-r-lg">اسم الطالب</th>
                              <th className="p-2.5">البريد الإلكتروني</th>
                              <th className="p-2.5 rounded-l-lg">تاريخ التسجيل</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium text-slate-700">
                            {filteredUsers.length === 0 ? (
                              <tr>
                                <td colSpan={3} className="text-center py-6 text-slate-400 text-xs">
                                  {searchQuery ? 'لا يوجد طلاب يطابقون نتائج البحث' : 'لا يوجد حسابات مسجلة حتى الآن'}
                                </td>
                              </tr>
                            ) : (
                              filteredUsers.map((u, i) => (
                                <tr key={u.id || i} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="p-2.5 font-bold text-slate-900">{u.name || 'بدون اسم'}</td>
                                  <td className="p-2.5 font-mono dir-ltr text-slate-600 text-[11px]">{maskEmail(u.email)}</td>
                                  <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-SA') : 'قديم'}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Active Sessions Live */}
                  {activeTab === 'sessions' && (
                    <div className="p-4 space-y-3">
                      <div className="text-xs text-slate-500 mb-2 font-bold flex items-center justify-between">
                        <span>الجلسات التي تتصفح الموقع في هذه اللحظة:</span>
                        <span className="text-emerald-600 font-mono">{stats?.activeSessionsList?.length || 0} أجهزة متصلة</span>
                      </div>

                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {!stats?.activeSessionsList || stats.activeSessionsList.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 text-xs">
                            لا توجد جلسات أخرى نشطة حالياً.
                          </div>
                        ) : (
                          stats.activeSessionsList.map((s, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-gray-200/80 flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                  <Smartphone className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900">{maskEmail(s.email)}</div>
                                  <div className="text-[10px] text-slate-500 font-mono max-w-xs truncate" dir="ltr">
                                    {s.userAgent}
                                  </div>
                                </div>
                              </div>

                              <div className="text-left font-mono text-[11px] shrink-0">
                                <div className="text-emerald-600 font-bold">متصل منذ {s.onlineForMinutes} دقيقة</div>
                                <div className="text-slate-400 text-[10px]">آخر تفاعل قبل {s.lastActiveSecondsAgo} ثانية</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </>
            )}

          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 text-center text-xs text-slate-500 shrink-0 flex items-center justify-between">
            <span className="font-bold text-slate-600">منصة جدولني للقدرات - لوحة المراقبة والإحصائيات الحية</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-all"
            >
              إغلاق
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
