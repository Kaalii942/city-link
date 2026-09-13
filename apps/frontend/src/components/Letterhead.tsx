import React from 'react';

export function LesLogo({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer Navy Blue Crescent / C Shape */}
      <path
        d="M 58 10 C 25 10 5 32 5 60 C 5 88 28 98 58 98 C 76 98 90 90 96 82 C 90 86 78 90 62 90 C 38 90 20 76 20 54 C 20 32 38 18 62 18 C 76 18 88 22 95 26 C 88 16 74 10 58 10 Z"
        fill="#0F294A"
      />
      {/* Inside Orange LES Text */}
      <text
        x="36"
        y="62"
        fill="#F97316"
        fontSize="25"
        fontWeight="900"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.5"
      >
        LES
      </text>
    </svg>
  );
}

export function CityLinkLogo() {
  return (
    <div className="text-right inline-block">
      <div className="text-3xl font-black tracking-tight leading-none font-sans">
        <span className="text-[#0F294A]">CITY</span>
        <span className="text-[#F97316]">LINK</span>
      </div>
      <div className="h-[2px] bg-[#0F294A] my-1 w-full"></div>
      <div className="text-[9.5px] font-bold text-[#0F294A] tracking-[0.16em] uppercase font-sans">
        ENGINEERING & SERVICES
      </div>
    </div>
  );
}

export function MasterLetterheadHeader() {
  return (
    <div className="flex justify-between items-start w-full pb-3 border-b border-gray-200">
      <div className="flex items-center gap-3">
        <LesLogo className="w-16 h-16" />
      </div>
      <CityLinkLogo />
    </div>
  );
}

export function MasterLetterheadFooter() {
  return (
    <div className="w-full pt-3 font-sans text-center text-[10px] text-gray-800 border-t-2 border-[#0F294A]">
      <p className="font-semibold text-gray-900 leading-tight">
        Office # 35, Ground Floor, Aries Tower, Shamsabad, Murree Road, Rawalpindi, Pakistan
      </p>
      <p className="text-[9.5px] text-gray-700 mt-0.5 leading-tight">
        Tel: +9251-4575595 / Fax:+9251-4575550 / URL: www.citylink.com.pk / Email: citylink.engg@gmail.com
      </p>
    </div>
  );
}

interface LetterheadWrapperProps {
  children: React.ReactNode;
  title?: string;
  documentNumber?: string;
  date?: string;
}

export default function LetterheadWrapper({ children }: LetterheadWrapperProps) {
  return (
    <div className="w-full bg-white text-gray-900 flex flex-col justify-between min-h-[1050px] p-8 printable-document font-sans text-xs">
      <MasterLetterheadHeader />
      <div className="flex-1 py-4 space-y-4">
        {children}
      </div>
      <MasterLetterheadFooter />
    </div>
  );
}
