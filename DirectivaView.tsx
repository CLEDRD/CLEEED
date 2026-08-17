import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Clock,
  Shield,
  Users,
  Award,
  Calendar,
  FileSpreadsheet,
  Download,
  PlusCircle,
  QrCode,
  Ticket,
  Mail,
  Database,
  Search,
  CheckCircle,
  Sparkles,
  ExternalLink,
  ChevronRight,
  UserPlus,
  Edit,
  Filter,
  Copy,
  Eye,
  X,
  FileCheck,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  CLUBS,
  GRADES,
  SECTIONS_3RO,
  SECTIONS_UPPER,
  TECHNICAL_AREAS,
  MONTHS_SPANISH,
  TRIMESTERS,
} from '../../utils/constants';
import {
  generateStudentListPDF,
  generateAttendanceReportPDF,
  generateGradesReportPDF,
  generateQRCardsPDF,
  generateEventPassesPDF,
  generateIndividualCertQRPDF,
} from '../../utils/pdfGenerator';
import {
  generateFacilitatorQRKey,
  generateStudentQRKey,
  generateQRCodeDataUrl,
} from '../../utils/qrUtils';
import { User, UserRole, EventPass, StudentCertificate, FacilitatorCertificate } from '../../types';
import { SqlViewerModal } from '../sql/SqlViewerModal';

export const DirectivaView: React.FC = () => {
  const {
    currentUser,
    users,
    attendance,
    modules,
    grades,
    tasks,
    teams,
    eventPasses,
    studentCerts,
    facilitatorCerts,
    currentTrimester,
    setCurrentTrimester,
    currentTime,
    addUser,
    addFacilitatorCert,
    deleteFacilitatorCert,
    regenerateFacilitatorCertQR,
    addStudentCert,
    updateStudentCert,
    deleteStudentCert,
    regenerateStudentCertQR,
    createEventPass,
    openEmailModal,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    | 'inicio'
    | 'facilitadores'
    | 'estudiantes'
    | 'asistencias'
    | 'calificaciones'
    | 'certificaciones'
  >('inicio');

  // Filters
  const [selectedClubFilter, setSelectedClubFilter] = useState<string>('Todos');
  const [selectedFacilitatorClubFilter, setSelectedFacilitatorClubFilter] = useState<string>('Todos');
  const [selectedAttendanceClubFilter, setSelectedAttendanceClubFilter] = useState<string>('Todos');
  const [selectedGradesClubFilter, setSelectedGradesClubFilter] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Clock
  const timeFormatted = currentTime.toLocaleTimeString('es-DO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const dateFormatted = currentTime.toLocaleDateString('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Aggregated data
  const facilitators = users.filter((u) => u.role === 'FACILITADOR');
  const allStudents = users.filter((u) => u.role === 'ESTUDIANTE');

  const filteredFacilitators = facilitators.filter((f) => {
    return selectedFacilitatorClubFilter === 'Todos' || f.club === selectedFacilitatorClubFilter;
  });

  const filteredStudents = allStudents.filter((st) => {
    const matchesClub = selectedClubFilter === 'Todos' || st.club === selectedClubFilter;
    const matchesSearch =
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (st.student_code && st.student_code.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesClub && matchesSearch;
  });

  // Filtered Attendance and Grades for Directiva
  const filteredAttendance = attendance.filter((a) => {
    const matchesClub =
      selectedAttendanceClubFilter === 'Todos' || a.club === selectedAttendanceClubFilter;
    const matchesTrimester = !a.trimester || a.trimester === currentTrimester;
    return matchesClub && matchesTrimester;
  });

  const trimesterModules = modules.filter((m) => m.trimester === currentTrimester);
  const trimesterGrades = grades.filter((g) => {
    const matchesTrimester = !g.trimester || g.trimester === currentTrimester;
    const matchesClub =
      selectedGradesClubFilter === 'Todos' || g.club === selectedGradesClubFilter;
    return matchesTrimester && matchesClub;
  });

  // --- CERTIFICATE SECTION STATE ---
  const [certTargetRole, setCertTargetRole] = useState<'FACILITADOR' | 'ESTUDIANTE'>('FACILITADOR');
  const [certFilterClub, setCertFilterClub] = useState<string>('Todos');

  // Issue Facilitator Cert Form
  const [certFacilitatorId, setCertFacilitatorId] = useState(facilitators[0]?.id || '');
  const [certFacTitle, setCertFacTitle] = useState('Acreditación Docente y Liderazgo Formativo');
  const [certFacUrl, setCertFacUrl] = useState('https://cled.do/certificados/diploma-docente.pdf');
  const [facCertSavedMsg, setFacCertSavedMsg] = useState('');

  // Issue Student Cert Form
  const [certStudentId, setCertStudentId] = useState(allStudents[0]?.id || '');
  const [certStudentTitle, setCertStudentTitle] = useState('Certificado de Módulo Formativo CLED');
  const [certStudentUrl, setCertStudentUrl] = useState('https://cled.do/certificados/diploma-estudiante.pdf');
  const [studentCertSavedMsg, setStudentCertSavedMsg] = useState('');

  // --- UNIVERSAL QR MODAL STATE ---
  const [qrModalData, setQrModalData] = useState<{
    user: User;
    certId?: string;
    certTitle: string;
    qrKey: string;
    role: 'FACILITADOR' | 'ESTUDIANTE';
  } | null>(null);

  const [modalQrDataUrl, setModalQrDataUrl] = useState<string>('');
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [copiedKeyMsg, setCopiedKeyMsg] = useState('');
  const [regenSuccessMsg, setRegenSuccessMsg] = useState('');

  const openQrModal = async (
    user: User,
    certTitle: string,
    qrKey: string,
    role: 'FACILITADOR' | 'ESTUDIANTE',
    certId?: string
  ) => {
    setQrModalData({ user, certId, certTitle, qrKey, role });
    setRegenSuccessMsg('');
    const dataUrl = await generateQRCodeDataUrl(qrKey);
    setModalQrDataUrl(dataUrl);
  };

  const handleRegenerateQR = async () => {
    if (!qrModalData) return;
    setIsRegenerating(true);

    try {
      let newKey = '';
      if (qrModalData.role === 'FACILITADOR') {
        newKey = await regenerateFacilitatorCertQR(
          qrModalData.user.id,
          qrModalData.certId,
          qrModalData.certTitle
        );
      } else {
        newKey = await regenerateStudentCertQR(
          qrModalData.user.id,
          qrModalData.certId,
          qrModalData.certTitle
        );
      }

      const newDataUrl = await generateQRCodeDataUrl(newKey);
      setQrModalData((prev) => (prev ? { ...prev, qrKey: newKey } : null));
      setModalQrDataUrl(newDataUrl);
      setRegenSuccessMsg('¡Clave y Código QR regenerados exitosamente!');
      setTimeout(() => setRegenSuccessMsg(''), 3500);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyKey = (key: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(key).catch(() => {});
      }
    } catch (e) {
      console.warn('Clipboard error:', e);
    }
    setCopiedKeyMsg('¡Clave copiada al portapapeles!');
    setTimeout(() => setCopiedKeyMsg(''), 2500);
  };

  const handleIssueFacCert = async (e: React.FormEvent) => {
    e.preventDefault();
    const fac = facilitators.find((f) => f.id === certFacilitatorId);
    if (!fac) return;

    const qrKey = generateFacilitatorQRKey(fac);
    await addFacilitatorCert(fac.id, certFacTitle, certFacUrl, qrKey);
    setFacCertSavedMsg(`¡Certificación emitida exitosamente para ${fac.name}!`);
    setTimeout(() => setFacCertSavedMsg(''), 3000);
  };

  const handleIssueStudentCert = async (e: React.FormEvent) => {
    e.preventDefault();
    const student = allStudents.find((s) => s.id === certStudentId);
    if (!student) return;

    await addStudentCert(student.id, certStudentTitle, certStudentUrl);
    setStudentCertSavedMsg(`¡Certificado emitido exitosamente para ${student.name}!`);
    setTimeout(() => setStudentCertSavedMsg(''), 3000);
  };

  // --- NEW EVENT PASS FORM STATE ---
  const [eventTitleInput, setEventTitleInput] = useState('Gala de Liderazgo y Premiación Anual CLED 2026');
  const [eventLocationInput, setEventLocationInput] = useState('Auditorio Principal Politécnico');
  const [eventDateInput, setEventDateInput] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [eventPersonType, setEventPersonType] = useState<'all_students' | 'all_facilitators' | 'single'>('all_students');
  const [eventSinglePersonId, setEventSinglePersonId] = useState(users[0]?.id || '');
  const [passCreatedMsg, setPassCreatedMsg] = useState('');

  const handleCreatePasses = (e: React.FormEvent) => {
    e.preventDefault();

    let targetUsers: User[] = [];
    if (eventPersonType === 'all_students') {
      targetUsers = allStudents;
    } else if (eventPersonType === 'all_facilitators') {
      targetUsers = facilitators;
    } else {
      const u = users.find((x) => x.id === eventSinglePersonId);
      if (u) targetUsers = [u];
    }

    targetUsers.forEach((usr, idx) => {
      createEventPass(
        usr.id,
        usr.name,
        usr.role,
        usr.club || 'CLED General',
        eventTitleInput,
        eventDateInput,
        eventLocationInput,
        `Mesa ${Math.floor(idx / 8) + 1} - Asiento ${(idx % 8) + 1}`
      );
    });

    setPassCreatedMsg(`¡Se generaron ${targetUsers.length} pases oficiales con QR para "${eventTitleInput}"!`);
    setTimeout(() => setPassCreatedMsg(''), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left Sidebar Navigation for Directiva */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-3 space-y-1 sticky top-24">
            <div className="px-3 py-2 border-b border-slate-100 mb-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Panel Directivo</div>
              <div className="text-xs font-bold text-[#0f2942] truncate">{currentUser.name}</div>
              <div className="text-[10px] text-amber-700 font-semibold truncate">Directiva General CLED</div>
            </div>
            {[
              { id: 'inicio', label: 'Inicio General', icon: <Sparkles className="w-4 h-4" /> },
              { id: 'facilitadores', label: 'Facilitadores (Docentes)', icon: <Shield className="w-4 h-4" /> },
              { id: 'estudiantes', label: 'Estudiantes Globales', icon: <Users className="w-4 h-4" /> },
              { id: 'asistencias', label: 'Auditoría Asistencias', icon: <Calendar className="w-4 h-4" /> },
              { id: 'calificaciones', label: 'Reportes Calificaciones', icon: <Award className="w-4 h-4" /> },
              { id: 'certificaciones', label: 'Emisión Certificados', icon: <Award className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all text-left ${
                  activeTab === tab.id
                    ? 'bg-[#0f2942] text-amber-400 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.icon}
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 w-full space-y-6">

          {/* Top Banner with Directiva Profile */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a1b2c] via-[#0f2942] to-[#1a3a5a] text-white p-6 sm:p-8 shadow-xl border border-amber-500/30">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/40 text-xs font-black uppercase tracking-wider">
                  <Shield className="w-4 h-4 text-amber-400" />
                  Directiva General • Control Institucional
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  ¡Bienvenid@, Directiva General!
                </h2>
                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs sm:text-sm text-slate-300">
                  <div className="flex items-center gap-1.5 font-mono bg-black/30 px-2.5 py-1 rounded-lg border border-white/10">
                    <span className="text-amber-400 font-bold">Usuario:</span>
                    <span>{currentUser.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono bg-black/30 px-2.5 py-1 rounded-lg border border-white/10">
                    <span className="text-amber-400 font-bold">Cargo:</span>
                    <span>DIRECTIVA GENERAL</span>
                  </div>
                </div>
              </div>

              {/* Clock */}
              <div className="bg-black/40 backdrop-blur-xs border border-white/10 rounded-2xl p-4 text-center shrink-0 min-w-[190px]">
                <div className="flex items-center justify-center gap-2 text-amber-400 text-xs font-semibold mb-1 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  <span>Hora en Vivo</span>
                </div>
                <div className="font-mono text-xl sm:text-2xl font-extrabold text-white tracking-widest">
                  {timeFormatted}
                </div>
                <div className="text-[10px] text-slate-300 capitalize mt-0.5">
                  {dateFormatted}
                </div>
              </div>
            </div>
          </div>

      {/* 1. SECCIÓN INICIO DIRECTIVA */}
      {activeTab === 'inicio' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Facilitadores Activos</span>
              <div className="text-3xl font-black text-slate-900 mt-2">{facilitators.length}</div>
              <p className="text-xs text-slate-500 mt-1">Liderando los {CLUBS.length} clubs</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estudiantes Globales</span>
              <div className="text-3xl font-black text-slate-900 mt-2">{allStudents.length}</div>
              <p className="text-xs text-slate-500 mt-1">En el trimestre {currentTrimester}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Módulos ({currentTrimester})</span>
              <div className="text-3xl font-black text-slate-900 mt-2">{trimesterModules.length}</div>
              <p className="text-xs text-slate-500 mt-1">Con rúbricas de evaluación</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Certificaciones</span>
              <div className="text-3xl font-black text-slate-900 mt-2">{facilitatorCerts.length + studentCerts.length}</div>
              <p className="text-xs text-slate-500 mt-1">Docentes y estudiantiles</p>
            </div>
          </div>

          {/* Quick Clubs Status Grid */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Resumen por Club Extracurricular CLED</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CLUBS.map((clubName) => {
                const fac = facilitators.find((f) => f.club === clubName);
                const studentsCount = allStudents.filter((s) => s.club === clubName).length;
                const modsCount = modules.filter((m) => m.club === clubName && m.trimester === currentTrimester).length;

                return (
                  <div key={clubName} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">{clubName}</p>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p>
                        <span className="font-semibold">Facilitador:</span>{' '}
                        {fac ? <span className="text-amber-800 font-bold">{fac.name}</span> : <span className="text-rose-500">Por asignar</span>}
                      </p>
                      <p>
                        <span className="font-semibold">Estudiantes:</span> {studentsCount}
                      </p>
                      <p>
                        <span className="font-semibold">Módulos:</span> {modsCount}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. SECCIÓN FACILITADORES */}
      {activeTab === 'facilitadores' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Directorio Oficial de Facilitadores (Docentes)</h2>
                <p className="text-xs text-slate-500">
                  Nómina institucional de docentes a cargo de los clubs.
                </p>
              </div>

              <button
                onClick={() =>
                  generateQRCardsPDF({
                    title: 'Ficha Institucional de Códigos QR de Facilitadores (Docentes)',
                    club: selectedFacilitatorClubFilter === 'Todos' ? 'Facilitadores Oficiales CLED' : selectedFacilitatorClubFilter,
                    trimestre: currentTrimester,
                    users: filteredFacilitators,
                    isFacilitator: true,
                  })
                }
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors"
              >
                <QrCode className="w-4 h-4" />
                <span>Descargar Fichas QR Facilitadores (PDF)</span>
              </button>
            </div>

            {/* Filter controls */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 max-w-sm">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Filtrar Facilitadores por Club:</label>
              <select
                value={selectedFacilitatorClubFilter}
                onChange={(e) => setSelectedFacilitatorClubFilter(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
              >
                <option value="Todos">Todos los Clubs</option>
                {CLUBS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Facilitators List */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Facilitador</th>
                    <th className="px-4 py-3">Club a Cargo</th>
                    <th className="px-4 py-3">Correo Institucional</th>
                    <th className="px-4 py-3">Contacto</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFacilitators.map((fac) => {
                    const qrKey = generateFacilitatorQRKey(fac);
                    return (
                      <tr key={fac.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{fac.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{fac.student_code || fac.id}</p>
                        </td>
                        <td className="px-4 py-3 font-semibold text-amber-900">{fac.club}</td>
                        <td className="px-4 py-3 font-mono text-xs text-blue-700 bg-blue-50/50 rounded-lg">
                          {fac.auth_email || fac.email}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">{fac.phone || '---'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() =>
                                openQrModal(
                                  fac,
                                  'Acreditación Docente y Liderazgo Formativo',
                                  generateFacilitatorQRKey(fac),
                                  'FACILITADOR'
                                )
                              }
                              className="px-3 py-1.5 bg-amber-500/10 text-amber-900 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-amber-500/20 transition-colors"
                              title="Ver y Validar Código QR"
                            >
                              <QrCode className="w-3.5 h-3.5 text-amber-700" />
                              <span>Ver QR</span>
                            </button>
                            <button
                              onClick={() =>
                                openEmailModal({
                                  to: fac.email,
                                  subject: `Notificación Oficial CLED - Docente ${fac.name}`,
                                  body: `Estimado/a ${fac.name},\n\nLe escribimos desde la Directiva General del Club de Liderazgo Estudiantil y Desarrollo (CLED) para coordinar las actividades del trimestre activo.\n\nAtentamente,\nDirectiva General CLED`,
                                  title: `Notificar al Facilitador ${fac.name}`,
                                })
                              }
                              className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-blue-100 transition-colors"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>Correo</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. SECCIÓN ESTUDIANTES GLOBALES */}
      {activeTab === 'estudiantes' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Nómina Global de Estudiantes</h2>
                <p className="text-xs text-slate-500">
                  Filtra por club, busca por nombre o matrícula y descarga los listados institucionales.
                </p>
              </div>

              <button
                onClick={() =>
                  generateStudentListPDF({
                    club: selectedClubFilter === 'Todos' ? 'Consolidado General de Clubs CLED' : selectedClubFilter,
                    facilitador: 'Directiva General',
                    trimestre: currentTrimester,
                    students: filteredStudents,
                  })
                }
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Nómina Filtrada (PDF)</span>
              </button>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Filtrar por Club:</label>
                <select
                  value={selectedClubFilter}
                  onChange={(e) => setSelectedClubFilter(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="Todos">Todos los Clubs</option>
                  {CLUBS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Buscar Estudiante:</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre, código o correo..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Estudiante</th>
                    <th className="px-4 py-3">Club</th>
                    <th className="px-4 py-3">Grado / Sec.</th>
                    <th className="px-4 py-3">Área Técnica</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((st, idx) => (
                    <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{st.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{st.student_code || st.id}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 font-medium">{st.club}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {st.grade || '3ro'} {st.section || 'A'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{st.technical_area || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            openEmailModal({
                              to: st.email,
                              subject: `Notificación Oficial CLED - ${st.name}`,
                              body: `Estimado/a ${st.name},\n\nLe escribimos desde la Directiva General del Club de Liderazgo Estudiantil y Desarrollo (CLED).\n\nAtentamente,\nDirectiva General CLED`,
                              title: `Notificar al Estudiante ${st.name}`,
                            })
                          }
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-blue-100 transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Notificar</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. SECCIÓN ASISTENCIAS */}
      {activeTab === 'asistencias' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Auditoría General de Asistencias</h2>
                <p className="text-xs text-slate-500">
                  Consolidado de registros de asistencia filtrables por club en el trimestre {currentTrimester}.
                </p>
              </div>

              <button
                onClick={() =>
                  generateAttendanceReportPDF({
                    club: selectedAttendanceClubFilter === 'Todos' ? 'Todos los Clubs CLED' : selectedAttendanceClubFilter,
                    facilitador: 'Directiva General',
                    trimestre: currentTrimester,
                    month: 'Todos',
                    students: filteredStudents,
                    attendanceRecords: filteredAttendance,
                  })
                }
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Generar Informe de Asistencia (PDF)</span>
              </button>
            </div>

            {/* Filter controls */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 max-w-sm">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Filtrar Asistencias por Club:</label>
              <select
                value={selectedAttendanceClubFilter}
                onChange={(e) => setSelectedAttendanceClubFilter(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
              >
                <option value="Todos">Todos los Clubs</option>
                {CLUBS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Estudiante</th>
                    <th className="px-4 py-3">Club</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Observación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">
                        No hay registros de asistencia para este club o trimestre.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.slice(0, 100).map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">{a.date}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{a.student_name}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{a.club}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              a.status === 'Presente'
                                ? 'bg-emerald-100 text-emerald-800'
                                : a.status === 'Ausente'
                                ? 'bg-rose-100 text-rose-800'
                                : a.status === 'Justificado'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{a.notes || '---'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. SECCIÓN CALIFICACIONES */}
      {activeTab === 'calificaciones' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Auditoría y Reporte Global de Calificaciones</h2>
                <p className="text-xs text-slate-500">
                  Supervisión de calificaciones modulares y rúbricas aplicadas en el trimestre {currentTrimester}.
                </p>
              </div>

              <button
                onClick={() =>
                  generateGradesReportPDF({
                    club: selectedGradesClubFilter === 'Todos' ? 'Consolidado General de Clubs' : selectedGradesClubFilter,
                    facilitador: 'Directiva General',
                    trimestre: currentTrimester,
                    modules: trimesterModules,
                    students: filteredStudents,
                    grades: trimesterGrades,
                  })
                }
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Calificaciones en PDF</span>
              </button>
            </div>

            {/* Filter controls */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 max-w-sm">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Filtrar Calificaciones por Club:</label>
              <select
                value={selectedGradesClubFilter}
                onChange={(e) => setSelectedGradesClubFilter(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
              >
                <option value="Todos">Todos los Clubs</option>
                {CLUBS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Estudiante</th>
                    <th className="px-4 py-3">Club</th>
                    <th className="px-4 py-3">Módulo</th>
                    <th className="px-4 py-3">Puntaje Rúbrica</th>
                    <th className="px-4 py-3">Nivel de Desempeño</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trimesterGrades.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">
                        No hay calificaciones registradas para este club o trimestre.
                      </td>
                    </tr>
                  ) : (
                    trimesterGrades.map((gr) => {
                      const student = users.find((u) => u.id === gr.student_id);
                      const mod = modules.find((m) => m.id === gr.module_id);

                      return (
                        <tr key={gr.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-900">{student?.name || 'Estudiante'}</td>
                          <td className="px-4 py-3 text-xs text-slate-600">{gr.club}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-slate-800">
                            {mod ? `${mod.module_number}: ${mod.title}` : 'Módulo'}
                          </td>
                          <td className="px-4 py-3 font-mono font-black text-slate-900 text-sm">
                            {gr.total_score} / 100
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                gr.total_score >= 90
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : gr.total_score >= 80
                                  ? 'bg-blue-100 text-blue-800'
                                  : gr.total_score >= 70
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {gr.level || 'No alcanzado'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. SECCIÓN CERTIFICACIONES */}
      {activeTab === 'certificaciones' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Emisión y Validación de Certificaciones CLED</h2>
                <p className="text-xs text-slate-500">
                  Gestión integral de certificaciones, diplomas y claves criptográficas QR regenerables para docentes y estudiantes.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() =>
                    generateQRCardsPDF({
                      title: 'Ficha Institucional de Códigos QR para Facilitadores (Docentes)',
                      club: 'Facilitadores Oficiales CLED',
                      trimestre: currentTrimester,
                      users: facilitators,
                      isFacilitator: true,
                    })
                  }
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl text-xs shadow-md transition-colors"
                >
                  <QrCode className="w-4 h-4" />
                  <span>PDF Fichas QR Facilitadores</span>
                </button>

                <button
                  onClick={() =>
                    generateQRCardsPDF({
                      title: `Ficha de Códigos QR para Certificados de Estudiantes (${currentTrimester})`,
                      club: selectedClubFilter === 'Todos' ? 'Todos los Clubs' : selectedClubFilter,
                      trimestre: currentTrimester,
                      users: filteredStudents,
                      isFacilitator: false,
                    })
                  }
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>PDF Fichas QR Estudiantes</span>
                </button>
              </div>
            </div>

            {/* Target Role Selector Tabs */}
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
              <button
                onClick={() => setCertTargetRole('FACILITADOR')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  certTargetRole === 'FACILITADOR'
                    ? 'bg-white text-[#0f2942] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="w-4 h-4 text-amber-600" />
                <span>Certificaciones Docentes ({facilitatorCerts.length})</span>
              </button>
              <button
                onClick={() => setCertTargetRole('ESTUDIANTE')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  certTargetRole === 'ESTUDIANTE'
                    ? 'bg-white text-[#0f2942] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Award className="w-4 h-4 text-blue-600" />
                <span>Certificaciones Estudiantiles ({studentCerts.length})</span>
              </button>
            </div>

            {/* --- DOCENTES SECTION --- */}
            {certTargetRole === 'FACILITADOR' && (
              <div className="space-y-6">
                {/* Facilitators Live QR Cards */}
                <div className="p-5 bg-gradient-to-br from-amber-500/5 via-slate-50 to-blue-500/5 rounded-2xl border border-amber-500/20 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-amber-700" />
                      <h3 className="font-bold text-slate-900 text-sm">
                        Facilitadores y Claves QR Activas ({facilitators.length} Docentes)
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Un facilitador puede poseer múltiples certificaciones y claves
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {facilitators.map((fac) => {
                      const userCerts = facilitatorCerts.filter((c) => c.facilitator_id === fac.id);
                      const primaryKey = userCerts[0]?.qr_code_key || generateFacilitatorQRKey(fac);
                      const primaryTitle = userCerts[0]?.title || 'Acreditación Docente y Liderazgo Formativo';

                      return (
                        <div
                          key={fac.id}
                          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 hover:border-amber-400/60 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-slate-900 text-xs">{fac.name}</p>
                              <p className="text-[11px] text-amber-800 font-semibold truncate">{fac.club}</p>
                            </div>
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 font-bold text-[9px] rounded-md shrink-0">
                              {userCerts.length} CERT.
                            </span>
                          </div>

                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between gap-1 text-[10px] font-mono">
                            <span className="truncate text-slate-600 font-semibold">{primaryKey}</span>
                            <button
                              onClick={() => handleCopyKey(primaryKey)}
                              className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors shrink-0"
                              title="Copiar Clave"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              onClick={() =>
                                openQrModal(fac, primaryTitle, primaryKey, 'FACILITADOR', userCerts[0]?.id)
                              }
                              className="flex-1 py-1.5 bg-[#0f2942] hover:bg-[#163a5d] text-amber-300 font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition-colors shadow-2xs"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>Ver QR</span>
                            </button>

                            <button
                              onClick={async () => {
                                const newK = await regenerateFacilitatorCertQR(
                                  fac.id,
                                  userCerts[0]?.id,
                                  primaryTitle
                                );
                                handleCopyKey(newK);
                              }}
                              className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                              title="Regenerar clave QR directamente"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                              <span className="hidden xl:inline text-[10px]">Regenerar</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {facCertSavedMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    {facCertSavedMsg}
                  </div>
                )}

                {/* Form for Facilitator Certification */}
                <form onSubmit={handleIssueFacCert} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 max-w-2xl">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#0f2942]" />
                    Emitir Nueva Certificación Docente (Permite Múltiples)
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Seleccionar Facilitador:</label>
                    <select
                      value={certFacilitatorId}
                      onChange={(e) => setCertFacilitatorId(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                    >
                      {facilitators.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} - {f.club}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Título de la Certificación / Acreditación:</label>
                    <input
                      type="text"
                      value={certFacTitle}
                      onChange={(e) => setCertFacTitle(e.target.value)}
                      placeholder="Ej: Acreditación Docente y Liderazgo Formativo..."
                      required
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">URL del Documento / Diploma:</label>
                    <input
                      type="url"
                      value={certFacUrl}
                      onChange={(e) => setCertFacUrl(e.target.value)}
                      placeholder="https://cled.do/certificados/diploma-docente.pdf"
                      required
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl text-xs shadow-md transition-colors flex items-center gap-2"
                  >
                    <Award className="w-4 h-4" />
                    <span>Emitir y Generar Clave QR Única</span>
                  </button>
                </form>

                {/* List of issued facilitator certs */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Historial de Certificaciones Docentes ({facilitatorCerts.length})
                  </h3>
                  <div className="space-y-3">
                    {facilitatorCerts.map((c) => {
                      const facUser = facilitators.find((f) => f.id === c.facilitator_id) || {
                        id: c.facilitator_id,
                        name: c.facilitator_name,
                        role: 'FACILITADOR' as any,
                        club: (c as any).club || 'CLED',
                      };
                      return (
                        <div
                          key={c.id}
                          className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-100/70 transition-colors"
                        >
                          <div className="space-y-1">
                            <p className="font-bold text-slate-900 text-sm">{c.facilitator_name}</p>
                            <p className="text-xs text-amber-900 font-semibold">{c.title}</p>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                Clave: {c.qr_code_key}
                              </span>
                              <button
                                onClick={() => handleCopyKey(c.qr_code_key)}
                                className="p-0.5 hover:bg-slate-200 rounded text-slate-500"
                                title="Copiar Clave"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                            <button
                              onClick={() => openQrModal(facUser as User, c.title, c.qr_code_key, 'FACILITADOR', c.id)}
                              className="px-3 py-1.5 bg-amber-500/10 text-amber-900 border border-amber-500/30 font-bold rounded-xl flex items-center gap-1.5 hover:bg-amber-500/20 transition-colors"
                            >
                              <QrCode className="w-3.5 h-3.5 text-amber-700" />
                              <span>Ver QR</span>
                            </button>

                            <button
                              onClick={async () => {
                                const newK = await regenerateFacilitatorCertQR(c.facilitator_id, c.id, c.title);
                                handleCopyKey(newK);
                              }}
                              className="px-3 py-1.5 bg-blue-50 text-blue-800 border border-blue-200 font-bold rounded-xl flex items-center gap-1.5 hover:bg-blue-100 transition-colors"
                              title="Regenerar clave para este certificado específico"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-blue-700" />
                              <span>Regenerar QR</span>
                            </button>

                            <button
                              onClick={() =>
                                generateIndividualCertQRPDF({
                                  user: facUser as User,
                                  certTitle: c.title,
                                  qrKey: c.qr_code_key,
                                  isFacilitator: true,
                                })
                              }
                              className="px-3 py-1.5 bg-[#0f2942] text-amber-400 font-bold rounded-xl flex items-center gap-1.5 hover:bg-[#163a5d] transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>PDF Ficha</span>
                            </button>

                            <button
                              onClick={() => deleteFacilitatorCert(c.id)}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                              title="Revocar Certificación"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* --- ESTUDIANTES SECTION --- */}
            {certTargetRole === 'ESTUDIANTE' && (
              <div className="space-y-6">
                {/* Form to issue student certificate */}
                <form onSubmit={handleIssueStudentCert} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 max-w-2xl">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#0f2942]" />
                    Emitir Nueva Certificación a Estudiante (Permite Múltiples)
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Seleccionar Estudiante:</label>
                    <select
                      value={certStudentId}
                      onChange={(e) => setCertStudentId(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                    >
                      {allStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} - {s.club} ({s.grade || '3ro'} {s.section || 'A'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Título de la Certificación / Diploma:</label>
                    <input
                      type="text"
                      value={certStudentTitle}
                      onChange={(e) => setCertStudentTitle(e.target.value)}
                      placeholder="Ej: Certificado de Módulo I: Oratoria y Periodismo Digital..."
                      required
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">URL del Documento / Diploma Digital:</label>
                    <input
                      type="url"
                      value={certStudentUrl}
                      onChange={(e) => setCertStudentUrl(e.target.value)}
                      placeholder="https://cled.do/certificados/diploma-estudiante.pdf"
                      required
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl text-xs shadow-md transition-colors flex items-center gap-2"
                  >
                    <Award className="w-4 h-4" />
                    <span>Emitir Certificación y Generar QR Único</span>
                  </button>
                </form>

                {studentCertSavedMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    {studentCertSavedMsg}
                  </div>
                )}

                {/* List of student certs */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Certificaciones Estudiantiles Registradas ({studentCerts.length})
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {studentCerts.map((c) => {
                      const studentUser = allStudents.find((s) => s.id === c.student_id) || {
                        id: c.student_id,
                        name: c.student_name || 'Estudiante',
                        role: 'ESTUDIANTE' as any,
                        club: 'CLED',
                      };
                      const qrKey = c.qr_code_key || generateStudentQRKey(studentUser as User, c.title);

                      return (
                        <div
                          key={c.id}
                          className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-100/70 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 text-sm">{c.student_name || studentUser.name}</p>
                              <span className="text-[10px] text-slate-500 font-medium">{studentUser.club}</span>
                            </div>
                            <p className="text-xs text-blue-900 font-semibold">{c.title || 'Certificado Oficial de Módulos'}</p>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                Clave: {qrKey}
                              </span>
                              <button
                                onClick={() => handleCopyKey(qrKey)}
                                className="p-0.5 hover:bg-slate-200 rounded text-slate-500"
                                title="Copiar Clave"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                            <button
                              onClick={() => openQrModal(studentUser as User, c.title || 'Certificado', qrKey, 'ESTUDIANTE', c.id)}
                              className="px-3 py-1.5 bg-amber-500/10 text-amber-900 border border-amber-500/30 font-bold rounded-xl flex items-center gap-1.5 hover:bg-amber-500/20 transition-colors"
                            >
                              <QrCode className="w-3.5 h-3.5 text-amber-700" />
                              <span>Ver QR</span>
                            </button>

                            <button
                              onClick={async () => {
                                const newK = await regenerateStudentCertQR(c.student_id, c.id, c.title);
                                handleCopyKey(newK);
                              }}
                              className="px-3 py-1.5 bg-blue-50 text-blue-800 border border-blue-200 font-bold rounded-xl flex items-center gap-1.5 hover:bg-blue-100 transition-colors"
                              title="Regenerar clave QR única para este certificado"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-blue-700" />
                              <span>Regenerar QR</span>
                            </button>

                            <button
                              onClick={() =>
                                generateIndividualCertQRPDF({
                                  user: studentUser as User,
                                  certTitle: c.title || 'Certificado de Módulos CLED',
                                  qrKey: qrKey,
                                  isFacilitator: false,
                                })
                              }
                              className="px-3 py-1.5 bg-[#0f2942] text-amber-400 font-bold rounded-xl flex items-center gap-1.5 hover:bg-[#163a5d] transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>PDF Ficha</span>
                            </button>

                            <button
                              onClick={() => deleteStudentCert(c.id)}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                              title="Eliminar Certificación"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Universal QR Inspection & Regeneration Modal */}
      {qrModalData && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-left">
                <QrCode className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Ficha QR de Validación CLED
                </h3>
              </div>
              <button
                onClick={() => setQrModalData(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="font-black text-slate-900 text-base sm:text-lg">{qrModalData.user.name}</p>
              <p className="text-xs font-semibold text-amber-800">{qrModalData.certTitle}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {qrModalData.user.club || 'CLED'} • {qrModalData.role}
              </p>
            </div>

            {regenSuccessMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{regenSuccessMsg}</span>
              </div>
            )}

            {modalQrDataUrl ? (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-inner">
                <img
                  src={modalQrDataUrl}
                  alt="QR Code"
                  className="w-48 h-48 mx-auto object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="w-48 h-48 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center text-xs text-slate-400">
                Generando código QR...
              </div>
            )}

            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase">
                <span>Clave Criptográfica Activa:</span>
                {copiedKeyMsg && <span className="text-emerald-600 lowercase font-semibold">{copiedKeyMsg}</span>}
              </div>
              <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-1 text-[11px] font-mono font-bold text-[#0f2942]">
                <span className="truncate">{qrModalData.qrKey}</span>
                <button
                  onClick={() => handleCopyKey(qrModalData.qrKey)}
                  className="p-1 hover:bg-slate-200 rounded text-slate-700 transition-colors"
                  title="Copiar Clave"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              {/* REGENERATE BUTTON */}
              <button
                onClick={handleRegenerateQR}
                disabled={isRegenerating}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-[#0f2942] font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
              >
                <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                <span>{isRegenerating ? 'Regenerando Clave...' : '🔄 Regenerar Clave y Código QR'}</span>
              </button>

              <button
                onClick={() =>
                  generateIndividualCertQRPDF({
                    user: qrModalData.user,
                    certTitle: qrModalData.certTitle,
                    qrKey: qrModalData.qrKey,
                    isFacilitator: qrModalData.role === 'FACILITADOR',
                  })
                }
                className="w-full py-2.5 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Ficha en PDF</span>
              </button>

              <button
                onClick={() => setQrModalData(null)}
                className="w-full py-2 text-slate-500 hover:text-slate-700 font-semibold text-xs transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};
