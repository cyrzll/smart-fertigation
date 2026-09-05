import React from 'react';

// Exact SVG path from /public/icon/instagram.svg with fill="currentColor"
const InstagramSvgIcon = ({ className = 'w-3.5 h-3.5' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334"/>
  </svg>
);

export const FloatingCreatorBadge = () => {
  return (
    <aside
      aria-label="Informasi Pembuat Website"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 pointer-events-auto"
    >
      <a
        href="https://www.instagram.com/ahmdrizaalll"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5 rounded-full bg-[#FAF7EE]/95 backdrop-blur-md border border-[#D4DFC8] shadow-lg shadow-[#16381E]/8 hover:shadow-xl hover:border-[#4B7F38] hover:shadow-[#4B7F38]/15 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 cursor-pointer"
        title="Website ini dibuat oleh Ahmad Rizal (@ahmdrizaalll)"
        aria-label="Instagram Creator: @ahmdrizaalll"
      >
        {/* Instagram Icon (/public/icon/instagram.svg) in harmonized brand palette */}
        <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#E8F2DF] text-[#16381E] border border-[#C8D9B0] group-hover:bg-[#4B7F38] group-hover:text-[#FAF7EE] group-hover:border-[#4B7F38] shadow-xs group-hover:rotate-6 transition-all duration-300 shrink-0">
          <InstagramSvgIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:scale-110" />
        </span>

        {/* Text Content */}
        <div className="flex flex-col justify-center text-left leading-tight">
          <span className="text-[10px] font-semibold text-[#5A6B5A] tracking-tight">
            Dibuat oleh
          </span>
          <span className="text-xs font-black text-[#16381E] group-hover:text-[#4B7F38] transition-colors">
            Ahmad Rizal
          </span>
        </div>
      </a>
    </aside>
  );
};

export default FloatingCreatorBadge;
