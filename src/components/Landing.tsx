import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, CheckCircle2, Award, Zap, BookOpen, AlertCircle, Sparkles, ArrowLeft } from 'lucide-react';
import { Page } from '../types';
import Logo from './Logo';

interface LandingProps {
  setPage: (page: Page) => void;
  session: any;
}

export default function Landing({ setPage, session }: LandingProps) {
  // Brand Splash Intro Screen state
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('brand_splash_shown');
    }
    return true;
  });

  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('brand_splash_shown', 'true');
        }
      }, 1800); // 1.8 seconds premium splash reveal
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
  };

  const features = [
    {
      title: 'توزيع كمي دقيق',
      desc: 'جدولة ١٢٤ بنكًا كميًا كاملاً بالتساوي على أيام دراستك، بمعدل نصف ساعة إلى ساعة للبنك الواحد.',
      icon: Award,
    },
    {
      title: 'تقسيم لفظي شامل',
      desc: 'توزيع ٢٥٧ قسمًا لفظيًا متكاملاً لتبسيط استيعاب مهارات التناظر، إكمال الجمل، والوعي القرائي.',
      icon: BookOpen,
    },
    {
      title: 'خيار مرن لراحة الجمعة',
      desc: 'يمكنك اختيار استبعاد يوم الجمعة كراحة أسبوعية، وسيتكفل النظام بإعادة توزيع المهام تلقائيًا.',
      icon: Calendar,
    },
    {
      title: 'مفكرة الأخطاء اليومية',
      desc: 'سجل الأسئلة الصعبة التي واجهتك أثناء المذاكرة بالتفصيل لمراجعتها بشكل مستمر وسهل.',
      icon: AlertCircle,
    },
  ];

  if (showSplash) {
    return (
      <div id="brand-splash-screen" className="fixed inset-0 z-50 bg-brand-blue-dark flex flex-col items-center justify-center overflow-hidden">
        {/* Animated background lights */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-brand-gold/15 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-blue/30 rounded-full blur-[140px]" />
        
        <div className="flex flex-col items-center space-y-6 px-4">
          <Logo variant="splash" color="gold" />
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="flex flex-col items-center text-center space-y-2.5"
          >
            <span className="text-xs sm:text-sm font-black text-white/90 tracking-widest">مرحباً بك في المنصة الرسمية لجدولة مذاكرتك</span>
            <div className="h-[2px] w-16 bg-brand-gold/40 rounded-full" />
            <span className="text-[10px] font-bold text-brand-gold/80 tracking-widest font-sans">SUPERVISED BY ASSER OSAMA</span>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div id="landing-page" className="relative min-h-[calc(100vh-5rem)] flex flex-col justify-between overflow-hidden bg-brand-blue/5">
      
      {/* Decorative ambient background blur lights */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-gold/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-10 w-80 h-80 bg-brand-blue/10 rounded-full blur-[120px] pointer-events-none" />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center space-y-16"
        >
          {/* Welcome Badge & Hero Text */}
          <div className="space-y-6 max-w-4xl mx-auto flex flex-col items-center">
            
            {/* Custom Brand Logo Presentation */}
            <motion.div 
              variants={itemVariants} 
              className="flex justify-center mb-4 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300 }}
              onClick={() => setShowSplash(true)}
              title="إعادة عرض الواجهة الترحيبية"
            >
              <div className="px-8 py-6 rounded-3xl bg-white/75 dark:bg-brand-blue-light/75 border border-brand-blue/5 dark:border-brand-gold/15 shadow-xl shadow-brand-blue/5 backdrop-blur-md relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-gold/5 via-transparent to-brand-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Logo variant="hero" color="dynamic" />
              </div>
            </motion.div>

            <motion.div 
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-sm font-semibold mb-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>طريقك نحو الـ ١٠٠٪ يبدأ من هنا</span>
            </motion.div>

            <motion.h1 
              variants={itemVariants}
              className="text-4xl sm:text-5xl md:text-6xl font-black text-brand-blue leading-[1.2] tracking-tight"
            >
              مرحباً بك، أنا <span className="text-brand-gold font-black underline decoration-brand-gold/30 decoration-wavy decoration-2">آسر</span> وجبت <span className="text-brand-gold relative inline-block"><bdi dir="ltr" className="font-mono text-5xl sm:text-6xl md:text-7xl">100</bdi></span> في القدرات وحبيت أشارككم وأفيدكم.
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="text-lg sm:text-xl text-gray-600 font-medium max-w-2xl mx-auto leading-relaxed"
            >
              السر في التميز بالقدرات ليس كثرة المذاكرة العشوائية، بل الالتزام بجدول منظم ودقيق يوزع جهدك بذكاء. قمت بتصميم "جدولني" ليقوم بذلك بالنيابة عنك وبأعلى كفاءة.
            </motion.p>
          </div>


          {/* Action CTA */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              id="cta-create-schedule"
              onClick={() => setPage('create')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-lg font-bold bg-brand-gold text-brand-blue hover:bg-brand-gold-light hover:scale-[1.03] active:scale-[0.97] shadow-xl shadow-brand-gold/20 transition-all duration-300 flex items-center justify-center gap-3"
            >
              <span>ابدأ تخطيط جدولك الآن</span>
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <button
              id="cta-how-it-works"
              onClick={() => {
                const el = document.getElementById('features-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-lg font-semibold bg-white text-brand-blue border border-brand-blue/10 hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>تعرف على الميزات</span>
            </button>
          </motion.div>

          {/* Feature Grid */}
          <div id="features-section" className="pt-16 border-t border-brand-blue/5">
            <motion.h2 
              variants={itemVariants}
              className="text-2xl sm:text-3xl font-extrabold text-brand-blue mb-12"
            >
              لماذا تختار منصة جدولني؟
            </motion.h2>

            <motion.div 
              variants={containerVariants}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-right"
            >
              {features.map((feat, index) => {
                const Icon = feat.icon;
                return (
                  <motion.div
                    id={`feature-card-${index}`}
                    key={index}
                    variants={itemVariants}
                    className="p-8 rounded-2xl bg-white border border-brand-blue/5 shadow-md shadow-brand-blue/2 hover:shadow-xl hover:shadow-brand-gold/5 hover:border-brand-gold/20 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-xl bg-brand-blue/5 text-brand-gold flex items-center justify-center border border-brand-gold/10">
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold text-brand-blue">{feat.title}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{feat.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>

          {/* Inspirational Quote Section */}
          <motion.div 
            variants={itemVariants}
            className="max-w-3xl mx-auto p-8 rounded-2xl bg-brand-blue text-white border border-brand-gold/20 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-24 h-24 bg-brand-gold/10 rounded-full blur-2xl" />
            <div className="relative z-10 space-y-4">
              <p className="text-xl italic font-medium leading-relaxed">
                "الـ ١٠٠٪ ليست مستحيلة، كل ما تحتاجه هو توجيه مستمر، خطة منظمة، والالتزام بحل الأسئلة بنقاط قوتك وتغطية ثغراتك بأخطائك."
              </p>
              <div className="text-brand-gold font-bold text-sm">
                — آسر (معد المنصة، حاصل على ١٠٠٪ في اختبار القدرات)
              </div>
            </div>
          </motion.div>

        </motion.div>
      </main>

      {/* Footer Section */}
      <footer className="bg-brand-blue text-gray-400 py-8 border-t border-brand-gold/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
          <div>
            &copy; {new Date().getFullYear()} جدولني للقدرات. جميع الحقوق محفوظة لآسر.
          </div>
          <div className="flex gap-6">
            <button onClick={() => setPage('contact')} className="hover:text-brand-gold transition-colors">اتصل بنا الدعم الفني</button>
            <span className="text-brand-gold/30">|</span>
            <span className="text-brand-gold font-medium">إعداد: Asser Osama</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
