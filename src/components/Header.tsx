import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, LogOut, User, Calendar, MessageSquare, PlusCircle, LayoutDashboard, Bell, Sun, Moon } from 'lucide-react';
import { Page, Profile } from '../types';
import { getSession, saveSession, clearUserDataOnLogout, getProfile } from '../utils/storage';
import Logo from './Logo';

interface HeaderProps {
  currentPage: Page;
  setPage: (page: Page) => void;
  session: any;
  setSession: (session: any) => void;
}

export default function Header({ currentPage, setPage, session, setSession }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Admin notification states
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminTitle, setAdminTitle] = useState('');
  const [adminText, setAdminText] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [adminMsg, setAdminMsg] = useState('');

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        
        // Calculate unread count
        const lastRead = Number(localStorage.getItem('last_read_notif_time') || 0);
        const unread = data.filter((n: any) => {
          if (!lastRead) {
            return n.isNew;
          }
          return (n.createdAt || 0) > lastRead;
        });
        setUnreadCount(unread.length);
      }
    } catch (e) {
      console.error("Error fetching notifications:", e);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    setIsAdmin(session?.email?.toLowerCase().trim() === 'asserosama5533@gmail.com');
  }, [session]);

  const handleOpenNotifications = (isOpenNow: boolean) => {
    setShowNotifications(isOpenNow);
    if (isOpenNow) {
      // Mark as read
      setUnreadCount(0);
      const maxCreatedAt = notifications.reduce((max, n) => Math.max(max, n.createdAt || 0), 0);
      localStorage.setItem('last_read_notif_time', String(maxCreatedAt || Date.now()));
    }
  };

  const handlePublishNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminTitle || !adminText || !session?.email) return;

    setIsPublishing(true);
    setAdminMsg('');

    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.email,
          title: adminTitle,
          text: adminText
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Update local state
        setNotifications(prev => [data.notification, ...prev]);
        setAdminTitle('');
        setAdminText('');
        setAdminMsg('🎉 تم نشر الإشعار والتحديث لجميع زوار المنصة بنجاح!');
        setTimeout(() => setAdminMsg(''), 4000);
      } else {
        const err = await res.json();
        setAdminMsg(`❌ فشل النشر: ${err.error || 'خطأ غير معروف'}`);
      }
    } catch (e) {
      setAdminMsg('❌ حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setIsPublishing(false);
    }
  };

  useEffect(() => {
    if (session) {
      setProfile(getProfile(session.id));
    } else {
      setProfile(null);
    }
  }, [session, currentPage]);

  // Dark/Light Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleLogout = () => {
    clearUserDataOnLogout();
    setSession(null);
    setPage('landing');
    setIsOpen(false);
  };

  const navItems = [
    { label: 'الرئيسية', value: 'landing' as Page, icon: LayoutDashboard },
    { label: 'إنشاء جدول', value: 'create' as Page, icon: PlusCircle },
    { label: 'جداولي', value: 'schedules' as Page, icon: Calendar },
    { label: 'ملفي الشخصي', value: 'profile' as Page, icon: User, requiresAuth: true },
    { label: 'اتصل بنا', value: 'contact' as Page, icon: MessageSquare },
  ];

  const handleNavigate = (page: Page) => {
    if (page === 'profile' && !session) {
      setPage('auth');
    } else {
      setPage(page);
    }
    setIsOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header id="main-header" className="sticky top-0 z-50 bg-brand-blue/95 backdrop-blur-md border-b border-brand-gold/15 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo Section */}
          <div 
            id="logo-container" 
            className="flex items-center cursor-pointer group" 
            onClick={() => handleNavigate('landing')}
          >
            <Logo variant="compact" color="gold" className="hover:scale-105 transition-transform duration-300" />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex flex-col items-center">
            <nav id="desktop-nav" className="flex space-x-1 space-x-reverse items-center">
              {navItems.map((item) => {
                if (item.requiresAuth && !session) return null;
                const isActive = currentPage === item.value;
                return (
                  <button
                    id={`nav-item-${item.value}`}
                    key={item.value}
                    onClick={() => handleNavigate(item.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative ${
                      isActive 
                        ? 'text-brand-gold font-bold bg-brand-gold/10' 
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                    {isActive && (
                      <motion.div 
                        layoutId="nav-underline"
                        className="absolute bottom-0 left-2 right-2 h-0.5 bg-brand-gold rounded-full"
                      />
                    )}
                  </button>
                );
              })}
            </nav>
            <span className="text-sm font-black text-brand-gold tracking-widest mt-1 block select-none">
              آسر أسامة 🎓
            </span>
          </div>

          {/* Notification Bell + Auth Button (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            
            {/* Theme Toggle (Desktop) */}
            <button
              id="header-theme-toggle-desktop"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl text-gray-300 hover:text-brand-gold hover:bg-white/5 transition-all duration-300 cursor-pointer"
              title={isDarkMode ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
            >
              {isDarkMode ? <Sun className="w-5.5 h-5.5 text-brand-gold" /> : <Moon className="w-5.5 h-5.5" />}
            </button>

            {/* Notification Bell with Badge */}
            <div className="relative">
              <button
                id="header-bell-button-desktop"
                onClick={() => handleOpenNotifications(!showNotifications)}
                className="relative p-2 rounded-xl text-gray-300 hover:text-brand-gold hover:bg-white/5 transition-all duration-300 cursor-pointer"
                title="الإشعارات والتحديثات"
              >
                <Bell className="w-5.5 h-5.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-brand-gold rounded-full border-2 border-brand-blue animate-pulse" />
                )}
              </button>

              {/* Notification Dropdown Portal/Menu */}
              <AnimatePresence>
                {showNotifications && (
                  <>
                    {/* Click-outside backdrop overlay */}
                    <div className="fixed inset-0 z-40" onClick={() => handleOpenNotifications(false)} />
                    
                    <motion.div
                      id="notifications-dropdown-desktop"
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-brand-gold/15 py-4 z-50 text-right overflow-hidden origin-top-left"
                    >
                      <div className="px-4 pb-3 border-b border-gray-100 flex items-center justify-between flex-row-reverse">
                        <span className="text-sm font-black text-brand-blue">الإشعارات والتحديثات</span>
                        <span className="text-[10px] font-black bg-brand-gold/20 text-brand-blue px-2.5 py-1 rounded-full">الموقع الرسمي</span>
                      </div>

                      {/* Admin Panel Inside Dropdown */}
                      {isAdmin && (
                        <div className="p-4 bg-amber-50/50 border-b border-amber-100 text-right space-y-3">
                          <button
                            type="button"
                            onClick={() => setShowAdminForm(!showAdminForm)}
                            className="w-full py-2 px-3 rounded-lg bg-brand-gold text-brand-blue font-black text-xs hover:bg-brand-gold-light transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>📢 {showAdminForm ? 'إغلاق لوحة النشر' : 'نشر تحديث/إشعار جديد للموقع'}</span>
                          </button>

                          {showAdminForm && (
                            <form onSubmit={handlePublishNotification} className="space-y-3 pt-2">
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-gray-500">عنوان التحديث (مثال: تفعيل الوضع الداكن 🌙):</label>
                                <input
                                  type="text"
                                  value={adminTitle}
                                  onChange={(e) => setAdminTitle(e.target.value)}
                                  placeholder="العنوان باختصار"
                                  className="w-full p-2 border border-gray-200 rounded-lg text-xs font-bold text-brand-blue bg-white focus:outline-none focus:ring-1 focus:ring-brand-gold"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-gray-500">تفاصيل التحديث بالتفصيل:</label>
                                <textarea
                                  value={adminText}
                                  onChange={(e) => setAdminText(e.target.value)}
                                  placeholder="اكتب ماذا أضفت أو عدلت بالتفصيل لكي يظهر للمستخدمين..."
                                  className="w-full p-2 border border-gray-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-gold h-20"
                                  required
                                />
                              </div>
                              {adminMsg && (
                                <p className="text-[10px] font-bold text-emerald-600 leading-relaxed">{adminMsg}</p>
                              )}
                              <button
                                type="submit"
                                disabled={isPublishing}
                                className="w-full py-2 rounded-lg bg-brand-blue text-white hover:bg-brand-blue/90 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
                              >
                                {isPublishing ? 'جاري النشر...' : 'نشر التحديث فوراً 🚀'}
                              </button>
                            </form>
                          )}
                        </div>
                      )}

                      <div className="max-h-[350px] overflow-y-auto divide-y divide-gray-50">
                        {notifications.length === 0 ? (
                          <p className="p-4 text-xs text-center text-gray-400 font-bold">لا توجد إشعارات حالياً</p>
                        ) : (
                          notifications.map((notif) => (
                            <div 
                              key={notif.id} 
                              className={`p-4 transition-all hover:bg-slate-50/80 text-right flex gap-3 ${
                                notif.isNew ? 'bg-brand-gold/5' : ''
                              }`}
                            >
                              <div className="flex-grow space-y-1">
                                <div className="flex items-center justify-between flex-row-reverse">
                                  <h4 className="text-xs font-black text-brand-blue">{notif.title}</h4>
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    {notif.time || (notif.createdAt ? new Date(notif.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) : '')}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">{notif.text}</p>
                              </div>
                              {notif.isNew && (
                                <span className="w-1.5 h-1.5 bg-brand-gold rounded-full self-start mt-1.5 shrink-0" />
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      <div className="px-4 pt-3 border-t border-gray-100 text-center space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 block">
                          نطمح دائماً لتقديم أفضل تجربة مذاكرة لك 🤍
                        </span>
                        <span className="text-sm font-black text-brand-gold block select-none">
                          آسر أسامة 🎓
                        </span>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {session ? (
              <div className="flex items-center gap-3">
                <button
                  id="profile-button-header"
                  onClick={() => handleNavigate('profile')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-brand-blue-light border border-brand-gold/20 text-brand-gold hover:bg-brand-gold/15 hover:border-brand-gold/40 transition-all duration-300"
                >
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="avatar" className="w-5 h-5 rounded object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  <span>{profile?.name || session.name}</span>
                </button>
                <button
                  id="logout-button-header"
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-300"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                id="login-button-header"
                onClick={() => handleNavigate('auth')}
                className="px-6 py-2 rounded-lg text-sm font-semibold bg-brand-gold text-brand-blue hover:bg-brand-gold-light hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-md shadow-brand-gold/10 font-bold"
              >
                دخول / تسجيل
              </button>
            )}
          </div>

          {/* Hamburger Menu & Notification (Mobile) */}
          <div className="flex md:hidden items-center gap-2">

            {/* Theme Toggle (Mobile) */}
            <button
              id="header-theme-toggle-mobile"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl text-gray-300 hover:text-brand-gold hover:bg-white/5 transition-all duration-300 cursor-pointer"
              title={isDarkMode ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
            >
              {isDarkMode ? <Sun className="w-5.5 h-5.5 text-brand-gold" /> : <Moon className="w-5.5 h-5.5" />}
            </button>
            
            {/* Notification Bell (Mobile) */}
            <div className="relative">
              <button
                id="header-bell-button-mobile"
                onClick={() => handleOpenNotifications(!showNotifications)}
                className="relative p-2 rounded-xl text-gray-300 hover:text-brand-gold hover:bg-white/5 transition-all duration-300 cursor-pointer"
                title="الإشعارات والتحديثات"
              >
                <Bell className="w-5.5 h-5.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-brand-gold rounded-full border-2 border-brand-blue animate-pulse" />
                )}
              </button>

              {/* Notification Dropdown Portal/Menu (Mobile: floating absolute aligned to right) */}
              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]" onClick={() => handleOpenNotifications(false)} />
                    
                    <motion.div
                      id="notifications-dropdown-mobile"
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="fixed left-4 right-4 mt-3 max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl border border-brand-gold/15 py-4 z-50 text-right overflow-hidden"
                    >
                      <div className="px-4 pb-3 border-b border-gray-100 flex items-center justify-between flex-row-reverse">
                        <span className="text-sm font-black text-brand-blue">الإشعارات والتحديثات</span>
                        <span className="text-[10px] font-black bg-brand-gold/20 text-brand-blue px-2.5 py-1 rounded-full">الموقع الرسمي</span>
                      </div>

                      {/* Admin Panel Inside Dropdown (Mobile) */}
                      {isAdmin && (
                        <div className="p-4 bg-amber-50/50 border-b border-amber-100 text-right space-y-3">
                          <button
                            type="button"
                            onClick={() => setShowAdminForm(!showAdminForm)}
                            className="w-full py-2 px-3 rounded-lg bg-brand-gold text-brand-blue font-black text-xs hover:bg-brand-gold-light transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>📢 {showAdminForm ? 'إغلاق لوحة النشر' : 'نشر تحديث/إشعار جديد للموقع'}</span>
                          </button>

                          {showAdminForm && (
                            <form onSubmit={handlePublishNotification} className="space-y-3 pt-2">
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-gray-500">عنوان التحديث:</label>
                                <input
                                  type="text"
                                  value={adminTitle}
                                  onChange={(e) => setAdminTitle(e.target.value)}
                                  placeholder="العنوان باختصار"
                                  className="w-full p-2 border border-gray-200 rounded-lg text-xs font-bold text-brand-blue bg-white focus:outline-none focus:ring-1 focus:ring-brand-gold"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-gray-500">تفاصيل التحديث بالتفصيل:</label>
                                <textarea
                                  value={adminText}
                                  onChange={(e) => setAdminText(e.target.value)}
                                  placeholder="اكتب ماذا أضفت أو عدلت بالتفصيل للمستخدمين..."
                                  className="w-full p-2 border border-gray-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-gold h-20"
                                  required
                                />
                              </div>
                              {adminMsg && (
                                <p className="text-[10px] font-bold text-emerald-600 leading-relaxed">{adminMsg}</p>
                              )}
                              <button
                                type="submit"
                                disabled={isPublishing}
                                className="w-full py-2 rounded-lg bg-brand-blue text-white hover:bg-brand-blue/90 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
                              >
                                {isPublishing ? 'جاري النشر...' : 'نشر التحديث فوراً 🚀'}
                              </button>
                            </form>
                          )}
                        </div>
                      )}

                      <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-50">
                        {notifications.length === 0 ? (
                          <p className="p-4 text-xs text-center text-gray-400 font-bold">لا توجد إشعارات حالياً</p>
                        ) : (
                          notifications.map((notif) => (
                            <div 
                              key={notif.id} 
                              className={`p-4 transition-all hover:bg-slate-50/80 text-right flex gap-3 ${
                                notif.isNew ? 'bg-brand-gold/5' : ''
                              }`}
                            >
                              <div className="flex-grow space-y-1">
                                <div className="flex items-center justify-between flex-row-reverse">
                                  <h4 className="text-xs font-black text-brand-blue">{notif.title}</h4>
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    {notif.time || (notif.createdAt ? new Date(notif.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) : '')}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">{notif.text}</p>
                              </div>
                              {notif.isNew && (
                                <span className="w-1.5 h-1.5 bg-brand-gold rounded-full self-start mt-1.5 shrink-0" />
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      <div className="px-4 pt-3 border-t border-gray-100 text-center space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 font-sans block">
                          نطمح دائماً لتقديم أفضل تجربة مذاكرة لك 🤍
                        </span>
                        <span className="text-sm font-black text-brand-gold block select-none">
                          آسر أسامة 🎓
                        </span>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button
              id="mobile-menu-toggle"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-all focus:outline-none"
              aria-label="Toggle menu"
            >
              <motion.div
                animate={{ rotate: isOpen ? 90 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {isOpen ? <X className="w-6 h-6 text-brand-gold" /> : <Menu className="w-6 h-6" />}
              </motion.div>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="mobile-drawer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="md:hidden border-t border-brand-gold/15 bg-brand-blue-dark overflow-hidden"
          >
            <div className="px-4 pt-3 pb-6 space-y-2">
              {navItems.map((item) => {
                if (item.requiresAuth && !session) return null;
                const isActive = currentPage === item.value;
                const Icon = item.icon;
                return (
                  <button
                    id={`mobile-nav-item-${item.value}`}
                    key={item.value}
                    onClick={() => handleNavigate(item.value)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-base font-medium transition-all ${
                      isActive 
                        ? 'text-brand-gold bg-brand-gold/10 border-r-4 border-brand-gold' 
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-brand-gold/80" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <hr className="border-brand-gold/10 my-4" />

              {session ? (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-3 px-4 py-2 text-brand-gold">
                    {profile?.avatarUrl ? (
                      <img src={profile.avatarUrl} alt="avatar" className="w-6 h-6 rounded-md object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                    <span className="font-semibold text-sm">{profile?.name || session.name}</span>
                  </div>
                  <button
                    id="mobile-logout-button"
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-base font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              ) : (
                <button
                  id="mobile-login-button"
                  onClick={() => handleNavigate('auth')}
                  className="w-full py-3 mt-2 rounded-lg text-center font-bold bg-brand-gold text-brand-blue hover:bg-brand-gold-light transition-all"
                >
                  دخول / تسجيل جديد
                </button>
              )}

              <div className="pt-4 text-center border-t border-brand-gold/10 mt-4">
                <span className="text-base font-black text-brand-gold tracking-widest block select-none">
                  آسر أسامة 🎓
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
