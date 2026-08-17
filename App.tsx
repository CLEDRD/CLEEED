import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { StudentView } from './components/student/StudentView';
import { FacilitatorView } from './components/facilitator/FacilitatorView';
import { DirectivaView } from './components/directiva/DirectivaView';
import { EventosView } from './components/eventos/EventosView';
import { LoginView } from './components/auth/LoginView';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { EmailModal } from './components/common/EmailModal';

const AppContent: React.FC = () => {
  const { currentRole, isAuthenticated } = useApp();

  if (!isAuthenticated) {
    return (
      <ErrorBoundary fallbackTitle="Error en la pantalla de autenticación CLED">
        <LoginView />
      </ErrorBoundary>
    );
  }

  const isEventosRole =
    currentRole === 'PERSONAL_EVENTOS' ||
    (currentRole as string) === 'event_protocol' ||
    (currentRole as string) === 'EVENT_PROTOCOL' ||
    (currentRole as string) === 'EVENTOS' ||
    (currentRole as string) === 'EVENTO_PROTOCOLO';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-amber-400 selection:text-slate-950 font-sans text-slate-800 antialiased">
      <Header />

      <main className="flex-1 pb-16">
        <ErrorBoundary fallbackTitle="Error al cargar el módulo del sistema">
          {currentRole === 'ESTUDIANTE' && <StudentView />}
          {currentRole === 'FACILITADOR' && <FacilitatorView />}
          {currentRole === 'DIRECTIVA' && <DirectivaView />}
          {isEventosRole && <EventosView />}
        </ErrorBoundary>
      </main>

      <footer className="border-t border-slate-200 bg-white py-5 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-bold text-slate-700">Sistema CLED</span>
            <span>•</span>
            <span>Instituto Politécnico Henríquez Ureña</span>
          </div>

          <div className="text-[11px] text-slate-400 text-center sm:text-right">
            <span>Club de Liderazgo Estudiantil y Desarrollo • Los Alcarrizos, Santo Domingo</span>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <EmailModal />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="Error en la inicialización del sistema CLED">
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

