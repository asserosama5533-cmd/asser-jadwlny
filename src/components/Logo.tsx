import React from 'react';
import { motion } from 'motion/react';

interface LogoProps {
  variant?: 'compact' | 'standard' | 'hero' | 'splash';
  className?: string;
  color?: 'gold' | 'blue' | 'white' | 'dynamic';
}

export default function Logo({ 
  variant = 'standard', 
  className = '', 
  color = 'dynamic' 
}: LogoProps) {
  
  // Color configuration mapping
  const getColorClasses = () => {
    switch (color) {
      case 'gold':
        return {
          text: 'text-brand-gold dark:text-brand-gold-light',
          subtext: 'text-brand-gold/90 dark:text-brand-gold-light/90',
          linesBg: 'bg-brand-gold/50',
          glow: 'shadow-brand-gold/20'
        };
      case 'blue':
        return {
          text: 'text-brand-blue dark:text-brand-blue-light',
          subtext: 'text-brand-blue/90 dark:text-brand-blue-light/90',
          linesBg: 'bg-brand-blue/40',
          glow: 'shadow-brand-blue/10'
        };
      case 'white':
        return {
          text: 'text-white',
          subtext: 'text-gray-200',
          linesBg: 'bg-white/60',
          glow: 'shadow-white/10'
        };
      case 'dynamic':
      default:
        return {
          text: 'text-brand-blue dark:text-white transition-colors duration-300',
          subtext: 'text-brand-blue-light dark:text-brand-gold-light transition-colors duration-300',
          linesBg: 'bg-brand-blue/30 dark:bg-brand-gold/50 transition-colors duration-300',
          glow: 'shadow-brand-blue/5 dark:shadow-brand-gold/10'
        };
    }
  };

  const colors = getColorClasses();

  // Handle compact variant (used in navbar)
  if (variant === 'compact') {
    return (
      <div id="logo-compact" className={`inline-flex flex-col items-center select-none group ${className}`}>
        {/* We use standard HTML span to avoid any browser or device SVG rendering issues */}
        <span className={`text-xl sm:text-2xl font-black tracking-tight leading-none ${colors.text}`} style={{ fontFamily: 'Tajawal, sans-serif' }}>
          جدولني
        </span>
        <div className="flex items-center gap-1 w-full mt-1">
          <div className={`h-[1px] flex-grow rounded-full ${colors.linesBg}`} />
          <span className={`text-[8px] sm:text-[9px] font-black tracking-wider leading-none shrink-0 ${colors.subtext}`} style={{ fontFamily: 'Tajawal, sans-serif' }}>
            للقدرات
          </span>
          <div className={`h-[1px] flex-grow rounded-full ${colors.linesBg}`} />
        </div>
      </div>
    );
  }

  const sizing = (() => {
    switch (variant) {
      case 'splash':
        return {
          container: 'space-y-3 px-4 py-2 sm:space-y-4 sm:px-6 sm:py-4',
          mainText: 'text-5xl sm:text-7xl md:text-8xl',
          subText: 'text-base sm:text-xl md:text-2xl',
          lineHeight: 'h-[2px]',
          lineWidth: 'w-12 sm:w-24 md:w-32',
          gap: 'gap-2.5 sm:gap-4'
        };
      case 'hero':
        return {
          container: 'space-y-2.5 px-3 py-1 sm:space-y-3 sm:px-4 sm:py-2',
          mainText: 'text-4xl sm:text-6xl md:text-7xl',
          subText: 'text-xs sm:text-lg md:text-xl',
          lineHeight: 'h-[1.5px] sm:h-[2px]',
          lineWidth: 'w-8 sm:w-16 md:w-24',
          gap: 'gap-2 sm:gap-3.5'
        };
      case 'standard':
      default:
        return {
          container: 'space-y-2 px-3 py-1',
          mainText: 'text-3xl sm:text-5xl',
          subText: 'text-[10px] sm:text-sm',
          lineHeight: 'h-[1px] sm:h-[1.5px]',
          lineWidth: 'w-6 sm:w-12',
          gap: 'gap-1.5 sm:gap-2.5'
        };
    }
  })();

  // Motion animation parameters
  const wordVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 15 },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: { 
        duration: 0.7, 
        ease: [0.16, 1, 0.3, 1] 
      }
    }
  };

  const lineVariants = {
    hidden: { scaleX: 0 },
    visible: { 
      scaleX: 1,
      transition: { 
        delay: 0.35,
        duration: 0.7, 
        ease: 'easeOut' 
      }
    }
  };

  const subtextVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        delay: 0.5,
        duration: 0.45, 
        ease: 'easeOut' 
      }
    }
  };

  return (
    <div 
      id={`logo-wrapper-${variant}`} 
      className={`relative flex flex-col items-center justify-center select-none text-center ${sizing.container} ${className}`}
    >
      {/* Main typography */}
      <motion.span
        variants={wordVariants}
        initial="hidden"
        animate="visible"
        className={`block font-black tracking-tight select-none leading-none ${sizing.mainText} ${colors.text}`}
        style={{ fontFamily: 'Tajawal, sans-serif' }}
      >
        جدولني
      </motion.span>

      {/* Flanking lines and subtext */}
      <div className={`flex items-center justify-center ${sizing.gap} w-full`}>
        {/* Right Line */}
        <motion.div 
          variants={lineVariants}
          initial="hidden"
          animate="visible"
          className={`rounded-full ${sizing.lineHeight} ${sizing.lineWidth} ${colors.linesBg}`}
          style={{ originX: 1 }}
        />

        {/* Center text */}
        <motion.span
          variants={subtextVariants}
          initial="hidden"
          animate="visible"
          className={`font-black tracking-widest uppercase shrink-0 leading-none ${sizing.subText} ${colors.subtext}`}
          style={{ fontFamily: 'Tajawal, sans-serif' }}
        >
          للقدرات
        </motion.span>

        {/* Left Line */}
        <motion.div 
          variants={lineVariants}
          initial="hidden"
          animate="visible"
          className={`rounded-full ${sizing.lineHeight} ${sizing.lineWidth} ${colors.linesBg}`}
          style={{ originX: 0 }}
        />
      </div>
    </div>
  );
}
