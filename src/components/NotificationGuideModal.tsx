import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Smartphone, Globe, BellRing, Share2, PlusSquare, ExternalLink, HelpCircle } from 'lucide-react';

interface NotificationGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationGuideModal({ isOpen, onClose }: NotificationGuideModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-brand-blue/5 dark:border-slate-800 overflow-hidden text-right z-10"
            dir="rtl"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 left-4 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Accent */}
            <div className="bg-gradient-to-r from-brand-gold/10 to-brand-blue/5 dark:from-brand-gold/20 dark:to-brand-blue/10 p-6 pt-8 flex flex-col items-center text-center">
              <div className="relative mb-3">
                <div className="absolute inset-0 bg-brand-gold/20 rounded-full blur-xl animate-pulse" />
                <div className="relative w-16 h-16 rounded-2xl bg-brand-gold/10 border-2 border-brand-gold/20 flex items-center justify-center text-brand-gold">
                  <BellRing className="w-8 h-8 animate-bounce" />
                </div>
              </div>
              <h2 className="text-xl font-black text-brand-blue dark:text-white" style={{ fontFamily: 'Tajawal, sans-serif' }}>
                دليل تفعيل الإشعارات والتنبيهات 🔔
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-xs leading-normal">
                كيف تضمن وصول تنبيهات بدء المذاكرة لجوالك بشكل حقيقي ومضمون 100%!
              </p>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              
              {/* Simple & Friendly Notification Explanation */}
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex gap-3 items-start">
                <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="block text-xs font-black text-amber-800 dark:text-amber-400">لماذا نحتاج لتثبيت الموقع كتطبيق؟ 📱</span>
                  <p className="text-[11px] text-amber-700/90 dark:text-amber-400/80 leading-relaxed">
                    كما تعلم، إشعارات الجوال ترتبط دائماً بالتطبيقات المثبتة على هاتفك. لكي يصلك تنبيه المذاكرة اليومي بدقة حتّى عند إغلاق الشاشة، كل ما عليك هو <b>إضافة الموقع لشاشتك الرئيسية كتطبيق</b> بخطوة واحدة بسيطة من الخيارات، وسيصلك التنبيه في موعده تماماً! 🚀
                  </p>
                </div>
              </div>

              {/* Steps for iOS (iPhone) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
                  <Smartphone className="w-5 h-5 text-brand-blue dark:text-brand-gold-light" />
                  <span className="text-sm font-black text-brand-blue dark:text-white">لأجهزة الآيفون والآيباد (iOS) 📱</span>
                </div>
                
                <div className="relative border-r-2 border-brand-gold/30 mr-3 pr-4 space-y-4">
                  <div className="relative">
                    <span className="absolute right-[-23px] top-0.5 w-4.5 h-4.5 rounded-full bg-brand-gold text-brand-blue font-mono text-[10px] font-black flex items-center justify-center">1</span>
                    <span className="block text-xs font-bold text-gray-800 dark:text-slate-200">افتح الموقع في متصفح Safari الأصلي</span>
                    <span className="block text-[11px] text-gray-500 dark:text-slate-400 leading-normal mt-0.5">
                      اضغط على زر <b>"فتح في نافذة جديدة" <ExternalLink className="inline w-3 h-3 mx-0.5" /></b> في أعلى يمين شاشة المعاينة الحالية لفتح الرابط في متصفح Safari بالكامل.
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute right-[-23px] top-0.5 w-4.5 h-4.5 rounded-full bg-brand-gold text-brand-blue font-mono text-[10px] font-black flex items-center justify-center">2</span>
                    <span className="block text-xs font-bold text-gray-800 dark:text-slate-200">اضغط على زر المشاركة (Share)</span>
                    <span className="block text-[11px] text-gray-500 dark:text-slate-400 leading-normal mt-0.5">
                      ستجده في شريط الأدوات السفلي لمتصفح سفاري <Share2 className="inline w-3 h-3 mx-0.5 text-brand-blue-light" />.
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute right-[-23px] top-0.5 w-4.5 h-4.5 rounded-full bg-brand-gold text-brand-blue font-mono text-[10px] font-black flex items-center justify-center">3</span>
                    <span className="block text-xs font-bold text-gray-800 dark:text-slate-200">اختر "إضافة إلى الشاشة الرئيسية"</span>
                    <span className="block text-[11px] text-gray-500 dark:text-slate-400 leading-normal mt-0.5">
                      مرر للأسفل واختر <b>"Add to Home Screen" <PlusSquare className="inline w-3.5 h-3.5 mx-0.5 text-brand-gold" /></b>. هذا يحوّل الموقع لتطبيق حقيقي على هاتفك ومثبت لديه صلاحية الإشعارات!
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute right-[-23px] top-0.5 w-4.5 h-4.5 rounded-full bg-brand-gold text-brand-blue font-mono text-[10px] font-black flex items-center justify-center">4</span>
                    <span className="block text-xs font-bold text-gray-800 dark:text-slate-200">افتح التطبيق وفعّل المنبه اليومي</span>
                    <span className="block text-[11px] text-gray-500 dark:text-slate-400 leading-normal mt-0.5">
                      افتح الأيقونة الجديدة على شاشتك الرئيسية، اضبط منبهك وسلّم الموافقة على الإشعارات. ستصلك الإشعارات حتى لو كان هاتفك مغلقاً! 🎉
                    </span>
                  </div>
                </div>
              </div>

              {/* Steps for Android & PC */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
                  <Globe className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-black text-brand-blue dark:text-white">لأجهزة الأندرويد والكمبيوتر (Android / Chrome) 🤖💻</span>
                </div>
                
                <div className="bg-emerald-50/80 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/40 p-3.5 rounded-2xl text-xs text-emerald-900 dark:text-emerald-300 font-bold leading-relaxed mb-3">
                  💡 <b>بشرى سارة:</b> لا تحتاج لتغيير أي إعدادات معقدة في جوالك! الإشعارات تعمل تلقائياً على الأندرويد في ثوانٍ بطريقتين سهلتين:
                </div>

                <div className="relative border-r-2 border-green-500/30 mr-3 pr-4 space-y-4">
                  
                  {/* Method 1 */}
                  <div className="relative">
                    <span className="absolute right-[-23px] top-0.5 w-4.5 h-4.5 rounded-full bg-green-500 text-white font-mono text-[10px] font-black flex items-center justify-center">1</span>
                    <span className="block text-xs font-bold text-gray-800 dark:text-slate-200">الطريقة الأولى (الأسهل والأسرع):</span>
                    <span className="block text-[11px] text-gray-600 dark:text-slate-400 leading-normal mt-1">
                      1. افتح الموقع في متصفح Chrome برابط كامل (خارج إطار المعاينة).<br />
                      2. اضغط على زر <b>"🔔 تجربة التنبيه"</b> داخل صفحة الجدول.<br />
                      3. اختر <b>"سماح" (Allow)</b> في الرسالة التي تظهر أعلى الشاشة.<br />
                      <b>وحالاً ستصلك التنبيهات في الموعد المذاكرة المحدد حتّى والموقع مغلق! ✅</b>
                    </span>
                  </div>

                  {/* Method 2 */}
                  <div className="relative border-t border-gray-100 dark:border-slate-800 pt-3">
                    <span className="absolute right-[-23px] top-3.5 w-4.5 h-4.5 rounded-full bg-brand-gold text-brand-blue font-mono text-[10px] font-black flex items-center justify-center">2</span>
                    <span className="block text-xs font-bold text-gray-800 dark:text-slate-200">الطريقة الثانية (تثبيت تطبيق جدولني على الشاشة):</span>
                    <span className="block text-[11px] text-gray-600 dark:text-slate-400 leading-normal mt-1">
                      1. اضغط على نقاط الخيارات الثلاثة <b>(⋮)</b> في أعلى متصفح Chrome.<br />
                      2. اختر <b>"تثبيت التطبيق" (Install app)</b> أو <b>"إضافة إلى الشاشة الرئيسية"</b>.<br />
                      3. سيظهر أيقونة "جدولني" كـ تطبيق حقيقي على شاشتك. عند فتحه واختيار وقت المذاكرة سينبهك تلقائياً دون أي خطوات إضافية! 🚀
                    </span>
                  </div>

                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 dark:bg-slate-800/50 p-4 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-brand-blue text-white text-xs font-black hover:bg-brand-blue-light transition-all shadow-md cursor-pointer"
              >
                فهمت، سأقوم بالتفعيل الآن! 👍
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
