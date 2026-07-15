import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Mail, Lock, ArrowRight, ShieldCheck, Sparkles, KeyRound, CheckCircle2 } from 'lucide-react';
import { Page, Profile } from '../types';
import { saveSession, getLocal, setLocal, syncFromServer, getProfile, saveAllToServer, attemptVaultLogin, updateVaultPassword } from '../utils/storage';
import { syncPushSubscription } from '../utils/pushHelper';

interface AuthProps {
  setPage: (page: Page) => void;
  setSession: (session: any) => void;
}

export default function Auth({ setPage, setSession }: AuthProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Forgot password states
  const [codeSent, setCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

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
          // If server login fails (e.g., container recycled and lost database file), 
          // check if we can log in and restore the account from the browser's persistent local vault
          const vaultRes = await attemptVaultLogin(email, password);
          if (vaultRes.success && vaultRes.user) {
            setSession(vaultRes.user);
            setPage('profile');
            setLoading(false);
            return;
          }

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
        // Save session with password so it can be restored on server if wiped
        saveSession(sessionUser, password);
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
        // Save session with password so it can be restored on server if wiped
        saveSession(sessionUser, password);
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

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email) {
      setError('الرجاء إدخال البريد الإلكتروني أولاً');
      return;
    }

    setLoading(true);

    // If the account exists in our local vault, make sure it is restored on the server first
    // so the server doesn't say "user not found" due to a server restart/wipe!
    const vault = getLocal<Record<string, any>>('jadwalni_accounts_vault', {});
    const emailLower = email.toLowerCase().trim();
    const foundKey = Object.keys(vault).find(k => vault[k].email.toLowerCase().trim() === emailLower);
    if (foundKey) {
      const account = vault[foundKey];
      try {
        await fetch('/api/auth/auto-restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: account.email,
            password: account.password,
            name: account.name
          })
        });
      } catch (err) {
        console.error('Silent restore before forgot-password failed:', err);
      }
    }

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'حدث خطأ أثناء طلب استعادة كلمة المرور');
        setLoading(false);
        return;
      }

      setCodeSent(true);
      setCooldown(60); // Start 60s cooldown timer
      setSuccessMessage(data.message || 'تم إرسال كود التحقق السري بنجاح!');
    } catch (err) {
      setError('حدث خطأ في الاتصال بالخادم، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!verificationCode || !newPassword || !confirmNewPassword) {
      setError('الرجاء إدخال كود التحقق، كلمة المرور الجديدة وتأكيدها');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('كلمتا المرور غير متطابقتين، الرجاء التحقق من التطابق');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: verificationCode.trim(),
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'كود التحقق غير صحيح أو منتهي الصلاحية');
        setLoading(false);
        return;
      }

      // Update local vault password as well to stay in sync
      updateVaultPassword(email, newPassword);

      setSuccessMessage('تم إعادة تعيين كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول بها.');
      setCodeSent(false);
      setVerificationCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setActiveTab('login');
    } catch (err) {
      setError('حدث خطأ في الاتصال بالخادم، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-page" className="max-w-md mx-auto px-4 py-16 text-right font-sans">
      
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
        {/* Toggle tabs (Only show if not in forgotten password mode or if we want to switch) */}
        {activeTab !== 'forgot' ? (
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-gray-100 rounded-xl mb-6">
            <button
              id="auth-tab-login"
              onClick={() => { setActiveTab('login'); setError(''); setSuccessMessage(''); }}
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
              onClick={() => { setActiveTab('signup'); setError(''); setSuccessMessage(''); }}
              className={`py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'signup'
                  ? 'bg-brand-blue text-white shadow'
                  : 'text-gray-500 hover:text-brand-blue'
              }`}
            >
              حساب جديد
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <span className="text-sm font-black text-brand-blue flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-brand-gold" />
              <span>استعادة كلمة المرور</span>
            </span>
            <button
              onClick={() => { setActiveTab('login'); setError(''); setSuccessMessage(''); setCodeSent(false); }}
              className="text-xs text-brand-blue font-bold hover:underline cursor-pointer"
            >
              العودة لتسجيل الدخول
            </button>
          </div>
        )}

        {error && (
          <div className="p-3.5 mb-5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold leading-relaxed">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 mb-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-bold leading-relaxed flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {activeTab !== 'forgot' ? (
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
                  <button
                    type="button"
                    onClick={() => { setActiveTab('forgot'); setError(''); setSuccessMessage(''); }}
                    className="text-[10px] text-brand-gold hover:underline cursor-pointer"
                  >
                    نسيت كلمة المرور؟
                  </button>
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
        ) : (
          /* Forgot Password Interface */
          <div className="space-y-4">
            {!codeSent ? (
              <form onSubmit={handleForgotPasswordRequest} className="space-y-4">
                <p className="text-xs text-gray-500 leading-relaxed">
                  أدخل بريدك الإلكتروني المسجل لدينا، وسنقوم بتوليد كود أمان وإرساله للتحقق من هويتك لإعادة تعيين كلمة المرور فوراً.
                </p>
                <div className="space-y-1">
                  <label htmlFor="forgot-email" className="block text-xs font-bold text-gray-700">البريد الإلكتروني المسجل</label>
                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="asser@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-gold transition-all font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-sm font-bold bg-brand-blue text-white hover:bg-brand-blue-dark transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{loading ? 'جاري التحقق...' : 'إرسال كود التحقق'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <p className="text-xs text-gray-500 leading-relaxed">
                  الرجاء إدخال كود الأمان المكون من 6 أرقام وكلمة المرور الجديدة لحسابك.
                </p>
                
                {/* Code Field */}
                <div className="space-y-1">
                  <label htmlFor="reset-code" className="block text-xs font-bold text-gray-700">كود التحقق</label>
                  <input
                    id="reset-code"
                    type="text"
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-gold transition-all font-mono tracking-widest text-center"
                  />
                </div>

                {/* New Password Field */}
                <div className="space-y-1">
                  <label htmlFor="new-password" className="block text-xs font-bold text-gray-700">كلمة المرور الجديدة</label>
                  <input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-gold transition-all font-mono"
                  />
                </div>

                {/* Confirm New Password Field */}
                <div className="space-y-1">
                  <label htmlFor="confirm-new-password" className="block text-xs font-bold text-gray-700">تأكيد كلمة المرور الجديدة</label>
                  <input
                    id="confirm-new-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-gold transition-all font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-sm font-bold bg-brand-gold text-brand-blue hover:bg-brand-gold/95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{loading ? 'جاري الحفظ...' : 'تأكيد وإعادة تعيين كلمة المرور'}</span>
                </button>

                {/* Cooldown and Resend Verification Code */}
                <div className="text-center pt-2">
                  {cooldown > 0 ? (
                    <p className="text-xs text-gray-400 font-bold">
                      إمكانية إعادة إرسال الكود خلال: <span className="font-mono text-brand-gold font-black">{cooldown}</span> ثانية
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleForgotPasswordRequest}
                      disabled={loading}
                      className="text-xs text-brand-blue hover:text-brand-blue-dark font-black hover:underline cursor-pointer transition-all"
                    >
                      لم يصلك الكود؟ اضغط لإعادة إرسال الرمز
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* Informative Security Footer */}
        <div className="flex items-center gap-1.5 justify-center text-[10px] text-gray-400 mt-6 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-gold" />
          <span>تشفير آمن للبيانات وحماية خصوصية الطلاب 100٪</span>
        </div>

      </motion.div>

    </div>
  );
}
