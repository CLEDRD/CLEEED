import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Mail, Copy, Check, ExternalLink, X } from 'lucide-react';

export const EmailModal: React.FC = () => {
  const { emailModal, closeEmailModal } = useApp();
  const [copied, setCopied] = useState(false);

  if (!emailModal.isOpen) return null;

  const handleCopy = () => {
    const fullText = `Para: ${emailModal.to}\nAsunto: ${emailModal.subject}\n\n${emailModal.body}`;
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(fullText).catch(() => {});
      }
    } catch (e) {
      console.warn('Clipboard write error:', e);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const mailtoLink = `mailto:${encodeURIComponent(emailModal.to)}?subject=${encodeURIComponent(
    emailModal.subject
  )}&body=${encodeURIComponent(emailModal.body)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#0f2942] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">{emailModal.title || 'Enviar Notificación por Correo'}</h3>
              <p className="text-xs text-slate-300">Cliente de correo predeterminado CLED</p>
            </div>
          </div>
          <button
            onClick={closeEmailModal}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Destinatario (Para):
            </label>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 font-medium">
              {emailModal.to}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Asunto:
            </label>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800">
              {emailModal.subject}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Cuerpo del Mensaje:
            </label>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg font-sans text-slate-700 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">
              {emailModal.body}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-medium transition-colors text-xs sm:text-sm shadow-xs"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? '¡Copiado al portapapeles!' : 'Copiar Texto Completo'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={closeEmailModal}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium text-xs sm:text-sm"
            >
              Cerrar
            </button>
            <a
              href={mailtoLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-5 py-2 bg-[#0f2942] hover:bg-[#163a5d] text-white rounded-xl font-semibold transition-colors text-xs sm:text-sm shadow-md"
            >
              <ExternalLink className="w-4 h-4 text-amber-400" />
              Abrir en App de Correo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
