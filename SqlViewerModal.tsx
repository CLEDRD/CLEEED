import React, { useState } from 'react';
import { Database, Copy, Check, X, Terminal, Code, Sparkles, RefreshCw } from 'lucide-react';
import { SUPABASE_SCHEMA_SQL, OFFICIAL_USER_UPDATE_SCRIPT, generateCustomUserSql } from '../../utils/sqlGenerator';
import { useApp } from '../../context/AppContext';

export const SqlViewerModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { users } = useApp();
  const [activeTab, setActiveTab] = useState<'schema' | 'update_official' | 'dynamic_export'>('schema');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getDynamicSql = () => {
    return `-- =========================================================================
-- SCRIPT DINÁMICO GENERADO CON TODOS LOS USUARIOS ACTUALES EN EL SISTEMA
-- Total registros: ${users.length}
-- =========================================================================

${users.map((u) => generateCustomUserSql(u)).join('\n\n')}
`;
  };

  const currentContent =
    activeTab === 'schema'
      ? SUPABASE_SCHEMA_SQL
      : activeTab === 'update_official'
      ? OFFICIAL_USER_UPDATE_SCRIPT
      : getDynamicSql();

  const handleCopy = () => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(currentContent).catch(() => {});
      }
    } catch (e) {
      console.warn('Clipboard write error:', e);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-slate-900 text-slate-100 rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-700 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Top Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Supabase / PostgreSQL SQL Scripts</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                  Ready for SQL Editor
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Esquemas de tablas, triggers automáticos para IT y scripts de migración de usuarios
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selector */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-0 bg-slate-950 border-b border-slate-800 text-xs sm:text-sm">
          <button
            onClick={() => setActiveTab('schema')}
            className={`pb-3 px-3 font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'schema'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            1. Schema Completo (14 Tablas)
          </button>
          <button
            onClick={() => setActiveTab('update_official')}
            className={`pb-3 px-3 font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'update_official'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-4 h-4" />
            2. Script de Actualización Oficial
          </button>
          <button
            onClick={() => setActiveTab('dynamic_export')}
            className={`pb-3 px-3 font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'dynamic_export'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            3. Exportar Usuarios Actuales ({users.length})
          </button>
        </div>

        {/* Code Content */}
        <div className="p-6 flex-1 overflow-y-auto bg-slate-900 font-mono text-xs text-slate-300">
          <pre className="whitespace-pre-wrap leading-relaxed select-all">
            {currentContent}
          </pre>
        </div>

        {/* Footer actions */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Compatible con Supabase Auth & Row Level Security</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition-colors text-xs sm:text-sm shadow-md"
            >
              {copied ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
              {copied ? '¡Copiado al portapapeles!' : 'Copiar Script SQL'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs sm:text-sm font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
