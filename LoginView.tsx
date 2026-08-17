import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CledLogo } from '../common/LogoBadge';
import {
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

export const LoginView: React.FC<{ onOpenSqlModal?: () => void }> = () => {
  const { login } = useApp();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage('Por favor ingresa tu correo institucional o código CLED.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Por favor ingresa tu contraseña para acceder.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const res = await login(identifier.trim(), password.trim());
      if (res.success) {
        setSuccessMessage('¡Acceso concedido! Cargando panel...');
      } else {
        setErrorMessage(res.message || 'Credenciales inválidas. Verifica tu correo y contraseña.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error de autenticación.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-400 selection:text-slate-950">
      {/* Top Bar */}
      <div className="bg-[#091b2c] border-b border-slate-800/80 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1 bg-white/5 rounded-lg border border-amber-500/20">
            <CledLogo size={36} />
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
              CLED
              <span className="text-amber-400 font-light text-xs">| Sistema Oficial</span>
            </h1>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Instituto Politécnico Henríquez Ureña • Los Alcarrizos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-amber-400/80 font-medium">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Portal Seguro</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-md w-full mx-auto px-4 py-8 sm:py-16 flex flex-col items-center justify-center">
        {/* Card: Login Form */}
        <div className="w-full bg-[#0f2942] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400 mb-1 shadow-inner">
              <KeyRound className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Iniciar Sesión</h2>
            <p className="text-xs text-slate-300">
              Ingresa con tu correo institucional (@club.cled.do) y contraseña
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-rose-500/15 border border-rose-500/40 rounded-xl flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Correo Electrónico o Código CLED
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="ej. usuario@club.cled.do o ID CLED"
                  className="w-full bg-[#091b2c] border border-slate-600 rounded-xl pl-10 pr-3 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#091b2c] border border-slate-600 rounded-xl pl-10 pr-3 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
                  required
                  minLength={4}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <span>{isLoading ? 'Verificando...' : 'Acceder al Sistema'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#091b2c] py-4 text-center text-xs text-slate-500">
        <p>Club de Liderazgo Estudiantil y Desarrollo (CLED) • Instituto Politécnico Henríquez Ureña • Los Alcarrizos</p>
      </footer>
    </div>
  );
};

