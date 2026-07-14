import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Mail, Lock, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Page, Profile } from '../types';
import { saveSession, getLocal, setLocal, syncFromServer, getProfile, saveAllToServer } from '../utils/storage';
import { syncPushSubscription } from '../utils/pushHelper';

interface AuthProps {
  setPage: (page: Page) => void;
  setSession: (session: any) => void;
}

export default function Auth({ setPage, setSession }: AuthProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    if (activeTab === 'signup' && !name) {
      setError('الرجاء إدخال اسمك لإنشاء حسابك');
      return;
    }

    setLoading(true);

    try {
      if (activeTab === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password })
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'الجيميل أو الباسورد خطأ');
          setLoading(false);
          return;
        }

        const { user } = await res.json();

        // Sync data from server first to populate local storage
        await syncFromServer(user.email, user.id);
        
        // Retrieve the sync'd profile or auto-create it
        const userProfile = getProfile(user.id);
        const resolvedName = userProfile ? userProfile.name : user.name;

        const sessionUser = { id: user.id, email: user.email, name: resolvedName };
        saveSession(sessionUser);
        setSession(sessionUser);

        // Silently sync push subscription to associate with logged-in user email
        syncPushSubscription();

        setPage('profile');
      } else {
        // Signup
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password, name })
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'حدث خطأ أثناء إنشاء الحساب');
          setLoading(false);
          return;
        }

        const { user } = await res.json();

        const sessionUser = { id: user.id, email: user.email, name: user.name };
        saveSession(sessionUser);
        setSession(sessionUser);

        // Auto-create initial profile and immediately sync to server
        const profiles = getLocal<Record<string, Profile>>('supabase_profiles', {});
        const newProfile: Profile = {
          id: user.id,
          name: user.name,
          goal: 'الحصول على درجة 100٪ في اختبار القدرات',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          streakCount: 0,
          lastStudyDate: '',
        };
        profiles[user.id] = newProfile;
        setLocal('supabase_profiles', profiles);

        await saveAllToServer();

        // Silently sync push subscription to associate with registered user email
        syncPushSubscription();

        setPage('profile');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال بالخادم، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-page" className="max-w-md mx-auto px-4 py-16 text-right">
      
      {/* Back button */}
      <button
        id="btn-auth-back"
        onClick={() => setPage('landing')}
        className="flex items-center gap-2 text-brand-blue/70 hover:text-brand-blue mb-8 text-sm font-bold transition-all cursor-pointer"
      >
        <ArrowRight className="w-4 h-4" />
        <span>العودة للرئيسية</span>
      </button>

      {/* Intro Logo */}
      <div className="text-center space-y-2 mb-8">
        <span className="text-4xl font-extrabold text-brand-gold">جدولني</span>
        <span className="block text-xs font-bold text-gray-500 tracking-[0.2em]">لِلْقُدُرَاتِ</span>
        <h2 className="text-2xl font-black text-brand-blue mt-4">انضم إلى مجتمع المتفوقين</h2>
        <p className="text-xs text-gray-500">حسابك هو بوابتك لتتبع درجاتك وتسجيل أخطائك بدقة عالية</p>
        <p className="text-xs text-brand-gold bg-brand-blue/5 border border-brand-gold/15 py-2.5 px-4 rounded-xl font-bold max-w-sm mx-auto mt-2 leading-relaxed">
          ⚠️ يرجى تسجيل الدخول أو إنشاء حساب أولاً لتتمكن من تصميم جداول المذاكرة ومتابعة خطتك وحفظ تقدمك بنجاح!
        </p>
      </div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-white border border-brand-blue/5 rounded-2xl shadow-xl shadow-brand-blue/5 p-6 sm:p-8"
      >
        {/* Toggle tabs */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-gray-100 rounded-xl mb-6">
          <button
            id="auth-tab-login"
            onClick={() => { setActiveTab('login'); setError(''); }}
            className={`py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'bg-brand-blue text-white shadow'
                : 'text-gray-500 hover:text-brand-blue'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            id="auth-tab-signup"
            onClick={() => { setActiveTab('signup'); setError(''); }}
            className={`py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'signup'
                ? 'bg-brand-blue text-white shadow'
                : 'text-gray-500 hover:text-brand-blue'
            }`}
          >
            حساب جديد
          </button>
        </div>

        {error && (
          <div className="p-3.5 mb-5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          
          {/* Name Field (Signup only) */}
          {activeTab === 'signup' && (
            <div className="space-y-1">
              <label htmlFor="auth-name" className="block text-xs font-bold text-gray-700">الاسم الكامل</label>
              <div className="relative">
                <input
                  id="auth-name"
                  type="text"
                  placeholder="آسر أسامة"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-gold transition-all"
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-1">
            <label htmlFor="auth-email" className="block text-xs font-bold text-gray-700">البريد الإلكتروني</label>
            <div className="relative">
              <input
                id="auth-email"
                type="email"
                placeholder="asser@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-gold transition-all font-mono"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label htmlFor="auth-password" className="block text-xs font-bold text-gray-700">كلمة المرور</label>
              {activeTab === 'login' && (
                <button type="button" className="text-[10px] text-brand-gold hover:underline">نسيت كلمة المرور؟</button>
              )}
            </div>
            <div className="relative">
              <input
                id="auth-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-gold transition-all font-mono"
              />
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            id="btn-auth-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-xl text-sm font-bold bg-brand-blue text-white hover:bg-brand-blue-dark transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {activeTab === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            <span>{loading ? 'جاري التحميل...' : activeTab === 'login' ? 'الدخول للحساب' : 'إنشاء الحساب الجديد'}</span>
          </button>



        </form>

        {/* Informative Security Footer */}
        <div className="flex items-center gap-1.5 justify-center text-[10px] text-gray-400 mt-6 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-gold" />
          <span>تشفير آمن للبيانات وحماية خصوصية الطلاب 100٪</span>
        </div>

      </motion.div>

    </div>
  );
}
