import React, { useState } from 'react';

export const CledLogo: React.FC<{
  className?: string;
  size?: number;
  showBadge?: boolean;
}> = ({ className = '', size = 44, showBadge = false }) => {
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${
        showBadge ? 'p-1 bg-white/10 backdrop-blur-xs rounded-full border border-amber-400/30 shadow-md' : ''
      } ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {!hasError ? (
        <img
          src="/LOGO_CLED_SF.png"
          alt="Logo Oficial CLED"
          width={size}
          height={size}
          onError={() => setHasError(true)}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain drop-shadow-sm filter"
          loading="eager"
        />
      ) : (
        <div className="w-full h-full rounded-full bg-[#0f2942] border-2 border-amber-400 flex items-center justify-center text-amber-400 font-black text-[10px] shadow-inner">
          CLED
        </div>
      )}
    </div>
  );
};

export const CledSeal: React.FC<{
  className?: string;
  size?: number;
  showBadge?: boolean;
}> = ({ className = '', size = 64, showBadge = false }) => {
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${
        showBadge ? 'p-1.5 bg-white rounded-full border-2 border-[#0f2942] shadow-lg' : ''
      } ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {!hasError ? (
        <img
          src="/SELLO_CLED_SF.png"
          alt="Sello Oficial CLED Directiva General"
          width={size}
          height={size}
          onError={() => setHasError(true)}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain drop-shadow-md filter"
          loading="eager"
        />
      ) : (
        <div className="w-full h-full rounded-full bg-[#0f2942] border-2 border-amber-400 flex flex-col items-center justify-center text-center p-1 shadow-inner">
          <span className="text-amber-400 font-bold text-[8px] leading-tight">SELLO</span>
          <span className="text-white font-extrabold text-[7px] leading-tight">DIRECTIVA</span>
        </div>
      )}
    </div>
  );
};



