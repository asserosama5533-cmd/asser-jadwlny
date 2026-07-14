import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, MessageSquare, Send, CheckCircle, HelpCircle, ArrowRight, FileText, Instagram, Video } from 'lucide-react';
import { Page } from '../types';
import emailjs from '@emailjs/browser';

interface ContactPageProps {
  setPage: (page: Page) => void;
  session: any;
}

export default function ContactPage({ setPage, session }: ContactPageProps) {
  const [name, setName] = useState(session?.name || '');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;

    setLoading(true);
    setError('');

    // Explicitly initialize EmailJS to guarantee success
    try {
      emailjs.init('P_7NpnpiL7sCqZaZ3');
    } catch (initErr) {
      console.warn('EmailJS init warning:', initErr);
    }

    const templateParams = {
      name: name.trim(),
      message: message.trim(),
      email: session?.email || 'user@jadwalni.com'
    };

    emailjs.send(
      'service_zcspwn9',
      'template_pfogzdb',
      templateParams,
      'P_7NpnpiL7sCqZaZ3'
    )
    .then((response) => {
      console.log('EmailJS Success:', response.status, response.text);
      setLoading(false);
      setSubmitted(true);
      setMessage('');
    })
    .catch((err) => {
      console.error('EmailJS Error:', err);
      // Try with options object backup signature if string failed
      emailjs.send(
        'service_zcspwn9',
        'template_pfogzdb',
        templateParams,
        {
          publicKey: 'P_7NpnpiL7sCqZaZ3'
        }
      )
      .then((response) => {
        console.log('EmailJS Success (backup signature):', response.status, response.text);
        setLoading(false);
        setSubmitted(true);
        setMessage('');
      })
      .catch((backupErr) => {
        console.error('EmailJS Backup Error:', backupErr);
        setLoading(false);
        const errorDetail = backupErr && typeof backupErr === 'object' ? (backupErr.text || backupErr.message || JSON.stringify(backupErr)) : String(backupErr);
        setError(`فشل إرسال الرسالة: ${errorDetail || 'يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.'}`);
      });
    });
  };

  return (
    <div id="contact-page" className="max-w-3xl mx-auto px-4 py-12 text-right">
      
      {/* Back Button */}
      <button
        id="btn-contact-back"
        onClick={() => setPage('landing')}
        className="flex items-center gap-2 text-brand-blue/70 hover:text-brand-blue mb-8 text-sm font-bold transition-all cursor-pointer"
      >
        <ArrowRight className="w-4 h-4" />
        <span>العودة للرئيسية</span>
      </button>

      {/* Header */}
      <div className="text-center space-y-4 mb-10">
        <h1 className="text-3xl font-extrabold text-brand-blue">اتصل بنا والدعم الفني</h1>
        <p className="text-gray-600 max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
          هل واجهتك مشكلة في إنشاء الجدول أو لديك استفسار أو اقتراح؟ يسعدنا جداً تواصلك معنا وسنقوم بالرد عليك في أقرب وقت ممكن.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Support Card details */}
        <div className="md:col-span-1 space-y-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#162550] border border-brand-blue/5 dark:border-brand-blue/10 shadow-md space-y-4">
            <h3 className="text-base font-bold text-brand-blue dark:text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-brand-gold" />
              <span>معلومات الدعم الفني</span>
            </h3>
            <div className="space-y-3 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              <p>
                نحن هنا لمساعدتك في الحصول على أفضل تجربة مذاكرة للقدرات.
              </p>
              <div className="flex items-center gap-2 justify-end text-brand-blue dark:text-white font-bold">
                <span>تواصل معنا عبر النموذج المباشر</span>
                <Mail className="w-4 h-4 text-brand-gold" />
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                * يتم الرد على الاستفسارات والمشاكل الفنية خلال ٢٤ ساعة كحد أقصى.
              </p>
            </div>
          </div>

          {/* Social Accounts Card */}
          <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-[#FFFDF2] to-[#FFFBE6] dark:from-[#111e42] dark:to-[#0c1530] border-2 border-brand-gold/40 dark:border-brand-gold/30 shadow-xl space-y-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-48 h-48 bg-brand-gold/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-brand-gold/20 rounded-full blur-3xl pointer-events-none" />
            
            <div className="space-y-3 relative z-10">
              <h3 className="text-2xl sm:text-3xl font-black text-brand-blue dark:text-white flex items-center gap-3 justify-center tracking-tight">
                <span className="text-xl sm:text-2xl animate-pulse">🤍</span>
                <span>للتواصل والاستفسار تابعني</span>
                <span className="text-xl sm:text-2xl animate-pulse">🤍</span>
              </h3>
              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-200 font-bold max-w-xl mx-auto leading-relaxed">
                تابع حساباتي الرسمية للحصول على أهم النصائح والشروحات والملخصات الذهبية للوصول إلى 100٪ في اختبار القدرات!
              </p>
            </div>

            <div className="flex flex-col items-center gap-6 pt-4 relative z-10 max-w-2xl mx-auto">
              {/* Top of Triangle: TikTok */}
              <div className="w-full max-w-[280px]">
                <a
                  href="https://www.tiktok.com/@o1v__asser"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-between p-5 rounded-2xl bg-white dark:bg-[#162550] hover:bg-zinc-50 dark:hover:bg-[#1c2e63] text-zinc-900 dark:text-white transition-all border-2 border-brand-gold/15 dark:border-brand-gold/25 hover:border-zinc-500 dark:hover:border-brand-gold/50 hover:scale-[1.04] active:scale-[0.96] shadow-md hover:shadow-xl text-center group gap-4 h-full"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full bg-[#010101] text-white flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:rotate-12 mb-3 relative">
                      <svg className="w-6 h-6 fill-current text-white drop-shadow-[1.5px_1.5px_0px_#25F4EE] filter" viewBox="0 0 24 24">
                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.94-1.74-.22-.23-.45-.48-.64-.73v7.05c-.06 2.45-1.12 4.88-3 6.39-1.95 1.51-4.6 2.07-7 1.45-2.58-.68-4.75-2.77-5.51-5.32-.82-2.85-.06-6.13 1.95-8.22 1.9-1.96 4.74-2.73 7.37-2.01v4.21c-1.47-.46-3.15-.12-4.31.84-1.2 1-1.68 2.76-1.18 4.24.49 1.41 1.94 2.42 3.44 2.42 1.71-.05 3.12-1.49 3.11-3.2V0h-.6z" />
                      </svg>
                    </div>
                    <span className="block text-lg font-black text-zinc-900 dark:text-white">تيك توك</span>
                    <span className="text-xs text-gray-500 font-medium mt-1">مقاطع وشروحات سريعة</span>
                  </div>
                  <span className="text-xs bg-zinc-950 text-white px-4 py-1.5 rounded-xl font-mono tracking-wider shadow-sm font-extrabold w-full text-center">
                    @o1v__asser
                  </span>
                </a>
              </div>

              {/* Bottom of Triangle: Telegram & Instagram */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
                {/* Telegram */}
                <a
                  href="https://t.me/Asser70"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-between p-5 rounded-2xl bg-white dark:bg-[#162550] hover:bg-sky-50 dark:hover:bg-[#1c2e63] text-[#229ED9] dark:text-[#52bcf2] transition-all border-2 border-brand-gold/15 dark:border-brand-gold/25 hover:border-[#229ED9]/40 dark:hover:border-[#52bcf2]/60 hover:scale-[1.04] active:scale-[0.96] shadow-md hover:shadow-xl text-center group gap-4"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full bg-[#229ED9] text-white flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:rotate-12 mb-3">
                      <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.35-.49.97-.74 3.79-1.64 6.32-2.73 7.59-3.26 3.61-1.53 4.36-1.8 4.85-1.8.11 0 .35.03.51.16.13.1.17.24.19.34z" />
                      </svg>
                    </div>
                    <span className="block text-lg font-black text-[#1d7fae] dark:text-[#52bcf2]">تيليجرام</span>
                    <span className="text-xs text-gray-500 font-medium mt-1">مستجدات وملفات المذاكرة</span>
                  </div>
                  <span className="text-xs bg-[#229ED9] text-white px-4 py-1.5 rounded-xl font-mono tracking-wider shadow-sm font-extrabold w-full text-center">
                    @Asser70
                  </span>
                </a>

                {/* Instagram */}
                <a
                  href="https://www.instagram.com/_asser016?igsh=MTd6eGVpZnY0ZjE1bg%3D%3D&utm_source=qr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-between p-5 rounded-2xl bg-white dark:bg-[#162550] hover:bg-pink-50/50 dark:hover:bg-[#1c2e63] text-pink-600 dark:text-pink-400 transition-all border-2 border-brand-gold/15 dark:border-brand-gold/25 hover:border-pink-500/40 dark:hover:border-pink-400/60 hover:scale-[1.04] active:scale-[0.96] shadow-md hover:shadow-xl text-center group gap-4"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:rotate-12 mb-3">
                      <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                      </svg>
                    </div>
                    <span className="block text-lg font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">انستقرام</span>
                    <span className="text-xs text-gray-500 font-medium mt-1">النصائح واليوميات الذهبية</span>
                  </div>
                  <span className="text-xs bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 text-white px-4 py-1.5 rounded-xl font-mono tracking-wider shadow-sm font-extrabold w-full text-center">
                    @_asser016
                  </span>
                </a>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-brand-blue text-white space-y-2">
            <span className="text-brand-gold font-bold text-xs">نصيحة آسر 🤍</span>
            <p className="text-xs leading-relaxed text-justify">
              "إذا واجهتك صعوبة في فهم فكرة سؤال معين بالكمي أو اللفظي، لا تتردد في تدوينها فوراً في سجل أخطائك ومراجعتها بانتظام. فمراجعة الخطأ أفضل استثمار لوقتك."
            </p>
          </div>
        </div>

        {/* Contact Form card */}
        <div className="md:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#162550] border border-brand-blue/5 dark:border-brand-blue/10 p-6 sm:p-8 rounded-2xl shadow-xl shadow-brand-blue/5"
          >
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-4"
              >
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-500/20">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-brand-blue dark:text-white">تم إرسال رسالتك بنجاح!</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">شكراً لتواصلك معنا. سنقوم بالرد عليك عبر بريدك الإلكتروني قريباً جداً.</p>
                </div>
                <button
                  id="btn-contact-reset"
                  onClick={() => setSubmitted(false)}
                  className="px-6 py-2.5 bg-brand-blue text-white rounded-xl text-xs font-bold hover:bg-brand-blue-dark transition-all"
                >
                  إرسال رسالة أخرى
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Name */}
                <div className="space-y-1.5">
                  <label htmlFor="contact-name" className="block text-xs font-black text-brand-blue dark:text-white">اسم المستخدم</label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    placeholder="اكتب اسمك هنا..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-[#0b1120] border border-gray-200 dark:border-[#1e293b] text-sm text-brand-blue dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-gold transition-all"
                  />
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <label htmlFor="contact-message" className="block text-xs font-black text-brand-blue dark:text-white">الاستفسار، المشكلة، أو مقترح تطوير المنصة</label>
                  <textarea
                    id="contact-message"
                    required
                    placeholder="اكتب تفاصيل استفسارك أو المشكلة أو التطوير المقترح للمنصة هنا بالتفصيل..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#0b1120] border border-gray-200 dark:border-[#1e293b] text-sm text-brand-blue dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-gold transition-all leading-relaxed"
                  />
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold border border-red-100 dark:border-red-500/20 text-right">
                    {error}
                  </div>
                )}

                {/* Submit button */}
                <button
                  id="btn-contact-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-sm font-bold bg-brand-gold text-brand-blue hover:bg-brand-gold-light transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-4"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'جاري الإرسال...' : 'إرسال الرسالة'}</span>
                </button>

              </form>
            )}
          </motion.div>
        </div>

      </div>

    </div>
  );
}
