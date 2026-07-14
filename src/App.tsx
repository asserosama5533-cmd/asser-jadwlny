import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Page } from './types';
import { Instagram, Send, Video } from 'lucide-react';
import Header from './components/Header';
import Landing from './components/Landing';
import CreateSchedule from './components/CreateSchedule';
import SchedulesList from './components/SchedulesList';
import ScheduleDetail from './components/ScheduleDetail';
import Auth from './components/Auth';
import ProfilePage from './components/ProfilePage';
import ContactPage from './components/ContactPage';
import { getSession } from './utils/storage';
import { syncPushSubscription } from './utils/pushHelper';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [activeScheduleId, setActiveScheduleId] = useState<string>('');
  const [session, setSession] = useState<any>(null);

  // Sync session on mount
  useEffect(() => {
    const activeSession = getSession();
    setSession(activeSession);
    if (activeSession) {
      import('./utils/storage').then(({ syncFromServer }) => {
        syncFromServer(activeSession.email, activeSession.id);
      });
    }
  }, []);

  // Register Service Worker for robust mobile notification support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('Service Worker registered successfully with scope:', reg.scope);
          // Silently synchronize subscription if permission was already granted
          syncPushSubscription();
        })
        .catch(err => {
          console.error('Service Worker registration failed:', err);
        });
    }
  }, []);

  // Study Reminder Notification background check
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    let lastNotifiedTime = '';

    const showLocalNotification = (title: string, body: string) => {
      // Try service worker notification first (for robust mobile support)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            body: body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            vibrate: [200, 100, 200]
          } as any);
        }).catch(() => {
          // Fallback to standard window Notification
          new Notification(title, { body });
        });
      } else {
        new Notification(title, { body });
      }
    };

    const checkReminder = () => {
      // If Web Push is active, or permission is granted (meaning we either have active push or are about to subscribe),
      // we let the server handle it to prevent duplicate notifications (especially across multiple open tabs).
      if (Notification.permission === 'granted' || localStorage.getItem('jadwalni_push_active') === 'true') {
        return;
      }

      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeString = `${currentHours}:${currentMinutes}`;

      if (currentTimeString === lastNotifiedTime) return;

      import('./utils/storage').then(({ getSchedules }) => {
        const schedules = getSchedules();
        const matchingSchedule = schedules.find(s => s.studyReminderTime === currentTimeString);

        if (matchingSchedule) {
          lastNotifiedTime = currentTimeString;

          if (Notification.permission === 'granted') {
            showLocalNotification(
              '📖 حان وقت المذاكرة والتميز! 🚀',
              `يا بطل، حان وقت مذاكرة جدولك "${matchingSchedule.name || 'القدرات'}". همتك عالية والـ 100% بانتظارك! 💪✨`
            );
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                showLocalNotification(
                  '📖 حان وقت المذاكرة والتميز! 🚀',
                  `يا بطل، حان وقت مذاكرة جدولك "${matchingSchedule.name || 'القدرات'}". همتك عالية والـ 100% بانتظارك! 💪✨`
                );
              }
            });
          }
        }
      });
    };

    // Check immediately and then every 30 seconds
    checkReminder();
    const intervalId = setInterval(checkReminder, 30000);

    return () => clearInterval(intervalId);
  }, []);

  // Sync hash with current page and activeScheduleId with strict auth check
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const activeSession = getSession();
      
      let targetPage: Page = 'landing';
      let id = '';
      
      if (!hash || hash === '#/' || hash === '') {
        targetPage = 'landing';
      } else if (hash.startsWith('#/schedule/')) {
        id = hash.replace('#/schedule/', '');
        targetPage = 'schedule-detail';
      } else if (hash === '#/create') {
        targetPage = 'create';
      } else if (hash === '#/schedules') {
        targetPage = 'schedules';
      } else if (hash === '#/auth') {
        targetPage = 'auth';
      } else if (hash === '#/profile') {
        targetPage = 'profile';
      } else if (hash === '#/contact') {
        targetPage = 'contact';
      } else {
        targetPage = 'landing';
      }

      // Check if target page is restricted and the user has no session
      const requiresAuth = ['create', 'schedules', 'schedule-detail', 'profile'].includes(targetPage);
      if (requiresAuth && !activeSession) {
        window.location.hash = '/auth';
        return;
      }

      if (targetPage === 'schedule-detail') {
        setActiveScheduleId(id);
      }
      setCurrentPage(targetPage);
    };

    // Trigger on initial load
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [session]);

  // Custom routing navigator
  const setPage = (page: Page) => {
    if (page === 'landing') {
      window.location.hash = '/';
    } else if (page === 'schedule-detail') {
      window.location.hash = `/schedule/${activeScheduleId}`;
    } else {
      window.location.hash = `/${page}`;
    }
  };

  const handleSetActiveScheduleId = (id: string) => {
    setActiveScheduleId(id);
    window.location.hash = `/schedule/${id}`;
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return <Landing setPage={setPage} session={session} />;
      case 'create':
        return <CreateSchedule setPage={setPage} setActiveScheduleId={handleSetActiveScheduleId} />;
      case 'schedules':
        return <SchedulesList setPage={setPage} setActiveScheduleId={handleSetActiveScheduleId} />;
      case 'schedule-detail':
        return (
          <ScheduleDetail
            scheduleId={activeScheduleId}
            setPage={setPage}
            session={session}
          />
        );
      case 'auth':
        return <Auth setPage={setPage} setSession={setSession} />;
      case 'profile':
        return (
          <ProfilePage
            session={session}
            setPage={setPage}
            setActiveScheduleId={handleSetActiveScheduleId}
          />
        );
      case 'contact':
        return <ContactPage setPage={setPage} session={session} />;
      default:
        return <Landing setPage={setPage} session={session} />;
    }
  };

  return (
    <div id="app-root-layout" className="min-h-screen bg-slate-50 flex flex-col justify-between">
      
      {/* Dynamic Navigation Header */}
      <Header
        currentPage={currentPage}
        setPage={setPage}
        session={session}
        setSession={setSession}
      />

      {/* Main page content with fade-in and slide-up entrance animations */}
      <div className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage + activeScheduleId}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Global Site Footer */}
      <footer id="main-global-footer" className="w-full bg-brand-blue py-6 border-t border-brand-gold/15 text-center shrink-0">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm sm:text-base font-black text-white/95 leading-relaxed select-none">
            مجهود حقيقي، بهدف واحد:يفيدك — ادعو لي ولأهلي🤍
          </p>
          <p className="text-[11px] text-brand-gold/70 font-semibold mt-1.5 select-none animate-pulse">
            منصة جدولني للقدرات © {new Date().getFullYear()} — بإشراف وتطوير آسر أسامة
          </p>

          {/* Social media connections for Aser Osama */}
          <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
            <a
              href="https://t.me/Asser70"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-sky-400 hover:text-sky-300 font-bold text-xs transition-all border border-white/5 shadow-sm"
              title="تيليجرام آسر أسامة"
            >
              <Send className="w-3 h-3 rotate-[315deg]" />
              <span>تيليجرام (@Asser70)</span>
            </a>
            <a
              href="https://www.instagram.com/_asser016?igsh=MTd6eGVpZnY0ZjE1bg%3D%3D&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-rose-400 hover:text-rose-300 font-bold text-xs transition-all border border-white/5 shadow-sm"
              title="انستقرام آسر أسامة"
            >
              <Instagram className="w-3 h-3" />
              <span>انستقرام (@_asser016)</span>
            </a>
            <a
              href="https://www.tiktok.com/@o1v__asser"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white font-bold text-xs transition-all border border-white/5 shadow-sm"
              title="تيك توك آسر أسامة"
            >
              <Video className="w-3 h-3" />
              <span>تيك توك (@o1v__asser)</span>
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
