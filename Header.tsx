import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TRIMESTERS } from '../../utils/constants';
import { CledLogo } from './LogoBadge';
import {
  Clock,
  Calendar,
  GraduationCap,
  ChevronDown,
  LogOut,
} from 'lucide-react';

export const Header: React.FC<{ onOpenSqlModal?: () => void }> = () => {
  const {
    currentUser,
    currentRole,
    currentTrimester,
    setCurrentTrimester,
    currentTime,
    logout,
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Format real-time clock: HH:MM:SS
  const timeFormatted = currentTime.toLocaleTimeString('es-DO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  // Format Date in Spanish: e.g. Sábado, 15 de Agosto de 2026
  const dateFormatted = currentTime.toLocaleDateString('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const capitalizedDate = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);

  return (
    <header className="sticky top-0 z-40 bg-[#0f2942] text-white border-b border-slate-700/80 shadow-md">
      {/* Top Strip: Real-time Clock and Trimester */}
      <div className="bg-[#091b2c] border-b border-slate-800/80 px-4 sm:px-8 py-1.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Digital Clock with seconds & Date */}
        <div className="flex items-center gap-3 text-slate-300 font-mono">
          <div className="flex items-center gap-1.5 bg-[#0f2942] px-2.5 py-1 rounded-md border border-slate-700/60 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-bold text-amber-300 text-xs sm:text-sm tracking-wider">
              {timeFormatted}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-slate-300 font-sans text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{capitalizedDate}</span>
          </div>
        </div>

        {/* Global Trimester Selector */}
        <div className="flex items-center gap-2">
          {currentRole === 'ESTUDIANTE' ? (
            <div
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs font-semibold shadow-xs"
              title="El trimestre del estudiante corresponde a su período de matriculación"
            >
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Trimestre: <strong>{currentUser.matriculation_trimester || currentTrimester}</strong></span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider hidden md:inline">
                Trimestre Activo:
              </span>
              <div className="relative">
                <select
                  value={currentTrimester}
                  onChange={(e) => setCurrentTrimester(e.target.value)}
                  className="bg-[#153a5b] text-amber-300 font-semibold text-xs rounded-lg px-3 py-1 pr-7 border border-amber-500/30 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer appearance-none shadow-xs"
                >
                  {TRIMESTERS.map((trim) => (
                    <option key={trim} value={trim} className="bg-[#0f2942] text-white font-sans">
                      {trim}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-amber-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Bar: Logo, Branding, User Profile */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="relative p-1 bg-white/5 rounded-xl border border-amber-500/20">
            <CledLogo size={42} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-white flex items-center gap-1.5">
                CLED
                <span className="text-amber-400 font-light text-xs sm:text-sm">| Sistema Oficial</span>
              </h1>
              <span className="hidden md:inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                Rep. Dominicana
              </span>
            </div>
            <p className="text-[11px] text-slate-300 hidden sm:block truncate max-w-md">
              Instituto Politécnico Henríquez Ureña • Los Alcarrizos
            </p>
          </div>
        </div>

        {/* Right Section: User Profile Dropdown */}
        <div className="flex items-center gap-3">
          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 bg-[#153a5b] hover:bg-[#1b4870] border border-slate-600/80 rounded-xl transition-all shadow-xs text-left cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center font-bold text-amber-300 text-xs">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden lg:block">
                <p className="text-xs font-bold text-white truncate max-w-[150px]">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-amber-300 font-mono">
                  {currentUser.student_code || currentUser.id}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 py-2 border-b border-slate-800">
                  <p className="text-xs font-bold text-white">{currentUser.name}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{currentUser.email}</p>
                  <p className="text-[10px] text-amber-400 mt-0.5 truncate">
                    {currentUser.club || 'CLED Institucional'}
                  </p>
                </div>

                <div className="mt-2 px-3 space-y-1">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors font-semibold cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

