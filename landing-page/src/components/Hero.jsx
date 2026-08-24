import React, { useState, useRef, useEffect } from 'react';
import { gsap, stopScroll, startScroll } from '../hooks/useGsap';
import { Cpu, ArrowRight } from 'lucide-react';

const fullText = "Mewujudkan Ekosistem Agribisnis Melon Presisi Berbasis AIoT & Smart Protection";
const greenStart = 21; // index where "Agribisnis Melon Presisi" begins
const greenEnd = 45;   // index where "Agribisnis Melon Presisi" ends

export const Hero = () => {
  const [displayedLength, setDisplayedLength] = useState(0);
  const sectionRef = useRef(null);
  const subtitleRef = useRef(null);
  const buttonsRef = useRef(null);
  const statsRef = useRef(null);
  const rightRef = useRef(null);

  useEffect(() => {
    // 1. Lock scrolling on initial load
    stopScroll();

    // 2. Hide subsequent elements initially (including stats container border-t)
    gsap.set([subtitleRef.current, buttonsRef.current, statsRef.current, rightRef.current], {
      opacity: 0,
      y: 30,
    });
    if (statsRef.current) {
      gsap.set(statsRef.current.children, { opacity: 0, y: 20 });
    }
    gsap.set('header', { y: -80, opacity: 0 });

    let current = 0;
    const interval = setInterval(() => {
      current++;
      setDisplayedLength(current);
      if (current >= fullText.length) {
        clearInterval(interval);

        // Typing finished -> sequentially reveal the remaining hero elements and navbar
        const tl = gsap.timeline({
          onComplete: () => {
            // Unlock scrolling after all elements and navbar appear
            startScroll();
          },
        });

        tl.to(subtitleRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: 'power2.out',
        })
          .to(
            buttonsRef.current,
            {
              opacity: 1,
              y: 0,
              duration: 0.5,
              ease: 'power2.out',
            },
            '-=0.2'
          )
          .to(
            statsRef.current,
            {
              opacity: 1,
              y: 0,
              duration: 0.4,
              ease: 'power2.out',
            },
            '-=0.2'
          )
          .to(
            statsRef.current.children,
            {
              opacity: 1,
              y: 0,
              duration: 0.4,
              stagger: 0.15,
              ease: 'power2.out',
            },
            '-=0.3'
          )
          .to(
            rightRef.current,
            {
              opacity: 1,
              y: 0,
              duration: 0.6,
              ease: 'power2.out',
            },
            '-=0.2'
          )
          .to(
            'header',
            {
              y: 0,
              opacity: 1,
              duration: 0.6,
              ease: 'power2.out',
            },
            '-=0.3'
          );
      }
    }, 24); // ~24ms per character for smooth typing

    return () => {
      clearInterval(interval);
      startScroll();
    };
  }, []);

  const part1 = fullText.slice(0, Math.min(displayedLength, greenStart));
  const part2 = displayedLength > greenStart ? fullText.slice(greenStart, Math.min(displayedLength, greenEnd)) : '';
  const part3 = displayedLength > greenEnd ? fullText.slice(greenEnd, displayedLength) : '';
  const isTyping = displayedLength < fullText.length;

  return (
    <section ref={sectionRef} id="hero" className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 lg:pt-40 lg:pb-28 overflow-hidden bg-[#FAF7EE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Headline & Info */}
          <div className="lg:col-span-7 space-y-5 sm:space-y-6 text-left">
            {/* Main Headline (Types directly at its natural position) */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#16381E] tracking-tight leading-[1.18] min-h-[4.4em] sm:min-h-[3.2em] md:min-h-[2.8em] lg:min-h-[2.4em] text-left">
              <span>{part1}</span>
              {part2 && <span className="text-[#4B7F38]">{part2}</span>}
              <span>{part3}</span>
              {isTyping && (
                <span className="inline-block w-0.5 sm:w-1 h-6 sm:h-8 lg:h-11 bg-[#4B7F38] ml-1 align-middle animate-pulse" />
              )}
            </h1>

            {/* Subtitle */}
            <p ref={subtitleRef} className="text-xs sm:text-sm md:text-base text-[#2E4F34] leading-relaxed max-w-2xl font-medium text-left">
              Transformasi 116 Hektar Lahan Pertanian Desa Ngablak Bersama Kelompok Tani Sido Maju Tanjung Melalui AIoT Smart Crop Protection, Fertigasi Otomatis &amp; Strategi Zero Waste.
            </p>

            {/* CTA Buttons */}
            <div ref={buttonsRef} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-3 sm:gap-4 pt-2 sm:pt-4">
              <a
                href="#visi-misi"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 border border-[#16381E]/30 text-[#16381E] hover:text-[#4B7F38] hover:border-[#4B7F38] font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm transition-colors group"
              >
                <span>Jelajahi 4 Pilar Misi</span>
                <ArrowRight className="w-4 h-4 text-[#4B7F38] group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="#teknologi"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 border border-[#16381E]/20 text-[#16381E] hover:border-[#4B7F38] hover:text-[#4B7F38] font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm transition-colors"
              >
                <Cpu className="w-4 h-4 text-[#4B7F38]" />
                <span>Sistem Fertigasi AIoT</span>
              </a>
            </div>

            {/* Live Stats Bar */}
            <div ref={statsRef} className="grid grid-cols-3 gap-2 sm:gap-3 pt-6 sm:pt-8 border-t border-[#16381E]/10 text-left">
              <div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-black text-[#16381E]">116 Ha</div>
                <div className="text-[10px] sm:text-xs font-bold text-[#4B7F38] mt-0.5">Lahan Hortikultura</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-black text-[#16381E]">4 Pilar</div>
                <div className="text-[10px] sm:text-xs font-bold text-[#4B7F38] mt-0.5">Misi Operasional</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-black text-[#16381E]">Zero Waste</div>
                <div className="text-[10px] sm:text-xs font-bold text-[#4B7F38] mt-0.5">Integrasi SDGs #12</div>
              </div>
            </div>
          </div>

          {/* Right Column: MELO Mascot Showcase (Substantially enlarged) */}
          <div ref={rightRef} className="lg:col-span-5 relative flex justify-center mt-6 lg:mt-0">
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 lg:w-full max-w-md lg:max-w-lg aspect-square flex items-center justify-center">
              <img
                src="/icon/melo_main.png"
                alt="MELO Mascot"
                className="w-full h-full object-contain drop-shadow-xl hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
