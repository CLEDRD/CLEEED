import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Clock,
  Calendar,
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  Users,
  FileText,
  ExternalLink,
  ChevronRight,
  Send,
  Sparkles,
  Download,
  Phone,
  Mail,
  ShieldCheck,
  Info,
  Clock3,
} from 'lucide-react';
import { RUBRIC_CRITERIA, calculateGradeLevel, CLED_STATUTE_SUMMARY } from '../../utils/constants';
import { generateParticipationCertificatePDF } from '../../utils/pdfGenerator';
import { AttendanceRecord, Task } from '../../types';

export const StudentView: React.FC = () => {
  const {
    currentUser,
    users,
    attendance,
    modules,
    grades,
    tasks,
    submissions,
    resources,
    studentCerts,
    currentTrimester,
    currentTime,
    openEmailModal,
    submitTask,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'inicio' | 'asistencia' | 'calificaciones' | 'calificacion_final' | 'certificados' | 'recursos' | 'tareas'
  >('inicio');

  // Attendance report modal state
  const [selectedAttendanceForReport, setSelectedAttendanceForReport] = useState<AttendanceRecord | null>(null);
  const [studentExplanation, setStudentExplanation] = useState('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Task submission modal
  const [selectedTaskToSubmit, setSelectedTaskToSubmit] = useState<Task | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Statute Viewer modal
  const [isStatuteModalOpen, setIsStatuteModalOpen] = useState(false);

  // Linked Facilitator
  const facilitator =
    users.find((u) => u.id === currentUser.facilitator_id) ||
    users.find((u) => u.role === 'FACILITADOR' && u.club === currentUser.club) || {
      name: 'Facilitador Asignado CLED',
    };

  // Filter student data for current trimester
  const studentAttendances = attendance.filter(
    (a) => a.student_id === currentUser.id && a.trimester === currentTrimester
  );

  const clubModules = modules.filter(
    (m) => m.club === currentUser.club && m.trimester === currentTrimester
  );

  const studentGrades = grades.filter(
    (g) => g.student_id === currentUser.id && g.trimester === currentTrimester
  );

  const clubTasks = tasks.filter(
    (t) => t.club === currentUser.club && t.trimester === currentTrimester
  );

  const clubResources = resources.filter(
    (r) => (r.club === currentUser.club || !r.club) && r.trimester === currentTrimester
  );

  const studentCertificates = studentCerts.filter(
    (c) => c.student_id === currentUser.id
  );

  // Final Grade Calculation (Sum of module scores / number of modules graded)
  const totalModuleScoresSum = studentGrades.reduce((sum, g) => sum + g.total_score, 0);
  const gradedModulesCount = studentGrades.length;
  const finalAverageGrade =
    gradedModulesCount > 0 ? Math.round(totalModuleScoresSum / gradedModulesCount) : 0;
  const finalGradeLevel = calculateGradeLevel(finalAverageGrade);

  // Format real-time Clock: HH:MM:SS
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

  // Handle Attendance Report Email Generation
  const handleOpenAttendanceReport = (record: AttendanceRecord) => {
    setSelectedAttendanceForReport(record);
    setStudentExplanation('');
    setIsReportModalOpen(true);
  };

  const handleSendAttendanceEmail = () => {
    if (!selectedAttendanceForReport) return;

    const studentName = currentUser.name;
    const studentId = currentUser.student_code || currentUser.id;
    const facilitatorName = facilitator.name;
    const attendanceDate = selectedAttendanceForReport.date;
    const attendanceStatus = selectedAttendanceForReport.status;
    const explanation = studentExplanation.trim() || '[No se especificó explicación adicional]';

    const subject = `Solicitud de revisión de asistencia - ${studentName} - ID: ${studentId}`;
    const body = `Estimado Equipo de Soporte de CLED,

Mi nombre es ${studentName}, matriculado/a bajo el ID ${studentId}, en el grupo a cargo del facilitador ${facilitatorName}.

Me dirijo a ustedes para reportar un inconveniente con mi registro de asistencia correspondiente al día ${attendanceDate}. En el sistema he sido marcado/a con el estado de ${attendanceStatus}, lo cual considero que es un error.

A continuación, explico el motivo de esta aclaración:

${explanation}

Quedo a su disposición en caso de que requieran alguna captura de pantalla o evidencia adicional para procesar esta corrección. Agradezco de antemano su asistencia con este caso.

Atentamente,
${studentName}`;

    openEmailModal({
      to: 'soporte.cled@outlook.com',
      subject,
      body,
      title: 'Reporte de Asistencia a Soporte CLED',
    });

    setIsReportModalOpen(false);
  };

  const handleDownloadParticipationCertificate = () => {
    generateParticipationCertificatePDF({
      studentName: currentUser.name,
      studentId: currentUser.student_code || currentUser.id,
      clubName: currentUser.club || 'Club de Liderazgo Estudiantil y Desarrollo',
      trimester: currentTrimester,
      user: currentUser,
    });
  };

  const handleOpenTaskSubmit = (task: Task) => {
    const existing = submissions.find((s) => s.task_id === task.id && s.student_id === currentUser.id);
    setSelectedTaskToSubmit(task);
    setSubmissionContent(existing ? existing.comment_or_link : '');
    setIsSubmitModalOpen(true);
  };

  const handleConfirmTaskSubmit = () => {
    if (!selectedTaskToSubmit || !submissionContent.trim()) return;
    submitTask(selectedTaskToSubmit.id, submissionContent.trim());
    setIsSubmitModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-3 space-y-1.5 sticky top-24">
            <div className="px-3 py-2 border-b border-slate-100 mb-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Portal Estudiante</div>
              <div className="text-xs font-bold text-[#0f2942] truncate">{currentUser.name}</div>
              <div className="text-[10px] text-amber-600 font-mono font-medium truncate">{currentUser.student_code || currentUser.id}</div>
            </div>
            {[
              { id: 'inicio', label: 'Inicio', icon: <Sparkles className="w-4 h-4" /> },
              { id: 'asistencia', label: 'Mi Asistencia', icon: <Clock3 className="w-4 h-4" /> },
              { id: 'calificaciones', label: 'Mis Calificaciones', icon: <BookOpen className="w-4 h-4" /> },
              { id: 'calificacion_final', label: 'Calificación Final', icon: <Award className="w-4 h-4" /> },
              { id: 'certificados', label: 'Certificados & QR', icon: <FileText className="w-4 h-4" /> },
              { id: 'recursos', label: 'Recursos de Estudio', icon: <ExternalLink className="w-4 h-4" /> },
              { id: 'tareas', label: 'Mis Tareas', icon: <CheckCircle2 className="w-4 h-4" /> },
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
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 w-full space-y-6">

      {/* 1. SECCIÓN INICIO */}
      {activeTab === 'inicio' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f2942] via-[#163a5d] to-[#0a1e30] text-white p-6 sm:p-8 shadow-xl border border-amber-500/20">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  Portal del Estudiante • {currentTrimester}
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  ¡Bienvenid@, {currentUser.name}!
                </h2>
                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs sm:text-sm text-slate-300">
                  <div className="flex items-center gap-1.5 font-mono bg-black/20 px-2.5 py-1 rounded-lg">
                    <span className="text-amber-400 font-bold">ID:</span>
                    <span>{currentUser.student_code || currentUser.id}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-medium">Club:</span>
                    <span className="font-semibold text-white">{currentUser.club || 'Sin asignar'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-medium">Facilitador:</span>
                    <span className="font-semibold text-amber-300">{facilitator.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-medium">Grado:</span>
                    <span className="text-white font-semibold">
                      {currentUser.grade || '3ro'} {currentUser.section || 'A'} • {currentUser.technical_area || 'General'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Digital Clock Card on Welcome Screen */}
              <div className="bg-black/30 backdrop-blur-xs border border-white/10 rounded-2xl p-4 text-center shrink-0 min-w-[200px] shadow-inner">
                <div className="flex items-center justify-center gap-2 text-amber-400 text-xs font-semibold mb-1 uppercase tracking-wider">
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span>Hora Actual</span>
                </div>
                <div className="font-mono text-2xl sm:text-3xl font-extrabold text-white tracking-widest">
                  {timeFormatted}
                </div>
                <div className="text-[11px] text-slate-300 mt-1 capitalize font-medium">
                  {dateFormatted}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Final Average */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider">Calificación Final</span>
                <Award className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">
                  {gradedModulesCount > 0 ? `${finalAverageGrade}` : '---'}
                </span>
                <span className="text-xs text-slate-500 font-medium">/ 100 pts</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${finalGradeLevel.bgClass} ${finalGradeLevel.textClass}`}>
                  {finalGradeLevel.emoji} {finalGradeLevel.level}
                </span>
              </div>
            </div>

            {/* Attendance Rate */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider">Asistencia Registrada</span>
                <Clock3 className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">
                  {studentAttendances.length}
                </span>
                <span className="text-xs text-slate-500 font-medium">sesiones</span>
              </div>
              <div className="mt-2 text-xs text-slate-500 font-medium">
                {studentAttendances.filter((a) => a.status === 'Presente').length} presentes • {studentAttendances.filter((a) => a.status === 'Ausente').length} ausentes
              </div>
            </div>

            {/* Tasks Count */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider">Tareas del Club</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">
                  {clubTasks.length}
                </span>
                <span className="text-xs text-slate-500 font-medium">asignadas</span>
              </div>
              <div className="mt-2 text-xs text-slate-500 font-medium">
                {submissions.filter((s) => s.student_id === currentUser.id).length} entregadas
              </div>
            </div>

            {/* Club & Sección */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider">Club & Área</span>
                <Award className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="text-base font-bold text-slate-900 truncate">
                {currentUser.club || 'Liderazgo CLED'}
              </div>
              <div className="mt-2 text-xs text-slate-500 font-medium truncate">
                {currentUser.grade || '3ro'} {currentUser.section || 'A'} • {currentUser.technical_area || 'Politécnico'}
              </div>
            </div>
          </div>

          {/* Quick Actions & Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base">Estatuto y Reglamento CLED</h3>
                <ShieldCheck className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Accede a las normas oficiales, derechos de los miembros, deberes éticos y la estructura de la rúbrica de 8 criterios de evaluación.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsStatuteModalOpen(true)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Leer Estatuto Oficial
                </button>
                <button
                  onClick={handleDownloadParticipationCertificate}
                  className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-500/30 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-amber-600" />
                  Constancia Extracurricular (PDF)
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base">Módulos en Curso</h3>
                <span className="text-xs font-bold text-slate-400">{clubModules.length} módulos</span>
              </div>
              {clubModules.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">No hay módulos registrados aún para este trimestre.</p>
              ) : (
                <div className="space-y-2.5">
                  {clubModules.slice(0, 3).map((mod) => {
                    const grade = studentGrades.find((g) => g.module_id === mod.id);
                    return (
                      <div
                        key={mod.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs"
                      >
                        <div className="truncate mr-2">
                          <span className="font-bold text-slate-900">{mod.module_number}: </span>
                          <span className="text-slate-600">{mod.title}</span>
                        </div>
                        {grade ? (
                          <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] shrink-0 ${calculateGradeLevel(grade.total_score).bgClass} ${calculateGradeLevel(grade.total_score).textClass}`}>
                            {grade.total_score} / 100
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full bg-slate-200 text-slate-600 text-[10px] font-semibold shrink-0">
                            En progreso
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. SECCIÓN ASISTENCIA */}
      {activeTab === 'asistencia' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Registro de Asistencias</h2>
                <p className="text-xs text-slate-500">
                  Historial de asistencias marcadas por tu facilitador: <span className="font-semibold text-slate-700">{facilitator.name}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Total registradas:</span>
                <span className="px-3 py-1 bg-slate-100 text-slate-800 font-bold rounded-lg text-xs font-mono">
                  {studentAttendances.length} sesiones
                </span>
              </div>
            </div>

            {studentAttendances.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Clock3 className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-sm font-medium">Aún no hay asistencias registradas para este trimestre.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Mes</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Observaciones</th>
                      <th className="px-4 py-3 text-right">Reportar Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentAttendances.map((rec) => {
                      const statusColor =
                        rec.status === 'Presente'
                          ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                          : rec.status === 'Ausente'
                          ? 'bg-rose-500/10 text-rose-700 border-rose-500/30'
                          : rec.status === 'Tardanza'
                          ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                          : 'bg-blue-500/10 text-blue-700 border-blue-500/30';

                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5 font-mono font-medium text-slate-900 whitespace-nowrap">
                            {rec.date}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                            {rec.month}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${statusColor}`}>
                              {rec.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate">
                            {rec.notes || '---'}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleOpenAttendanceReport(rec)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-all shadow-2xs hover:scale-105"
                              title="Solicitar revisión de asistencia a soporte.cled@outlook.com"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              <span>Reportar</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. SECCIÓN CALIFICACIONES (RÚBRICA DE 8 CRITERIOS) */}
      {activeTab === 'calificaciones' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Rúbrica y Calificaciones de Módulos</h2>
              <p className="text-xs text-slate-500">
                Evaluación continua según la rúbrica oficial de 8 criterios (100 puntos por módulo)
              </p>
            </div>

            {clubModules.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-sm font-medium">Aún no hay módulos registrados en tu club.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {clubModules.map((mod) => {
                  const grade = studentGrades.find((g) => g.module_id === mod.id);
                  const level = grade ? calculateGradeLevel(grade.total_score) : null;

                  return (
                    <div
                      key={mod.id}
                      className="bg-slate-50 rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4"
                    >
                      {/* Module Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 bg-[#0f2942] text-amber-400 text-xs font-bold rounded-lg">
                              {mod.module_number}
                            </span>
                            <h3 className="font-bold text-slate-900 text-base">{mod.title}</h3>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Valor oficial: 100 Puntos</p>
                        </div>

                        <div>
                          {grade && level ? (
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="text-2xl font-black text-slate-900">
                                  {grade.total_score}
                                </span>
                                <span className="text-xs text-slate-500 font-bold"> / 100</span>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${level.bgClass} ${level.textClass} border ${level.borderClass}`}>
                                {level.emoji} {level.level}
                              </span>
                            </div>
                          ) : (
                            <span className="px-3 py-1 bg-slate-200 text-slate-600 rounded-full text-xs font-semibold">
                              Módulo sin calificar
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Criteria Breakdown Grid */}
                      {grade ? (
                        <div>
                          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                            Desglose por Criterios de la Rúbrica Oficial:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {RUBRIC_CRITERIA.map((crit) => {
                              const scoreObtained = (grade as any)[crit.key] ?? 0;
                              const pct = Math.round((scoreObtained / crit.maxPoints) * 100);

                              return (
                                <div
                                  key={crit.key}
                                  className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5"
                                >
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-800 truncate" title={crit.name}>
                                      {crit.name}
                                    </span>
                                    <span className="font-mono font-bold text-slate-900">
                                      {scoreObtained}/{crit.maxPoints}
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        pct >= 85
                                          ? 'bg-emerald-500'
                                          : pct >= 70
                                          ? 'bg-blue-500'
                                          : pct >= 50
                                          ? 'bg-amber-500'
                                          : 'bg-rose-500'
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <p className="text-[10px] text-slate-500 truncate" title={crit.description}>
                                    {crit.description}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">
                          El facilitador aún no ha registrado la evaluación de este módulo.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. SECCIÓN CALIFICACIÓN FINAL */}
      {activeTab === 'calificacion_final' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Calificación Final del Trimestre</h2>
              <p className="text-xs text-slate-500">
                La calificación final es el resultado de la suma de todas las notas de todos los módulos dividida entre la cantidad de módulos calificados.
              </p>
            </div>

            {/* Score Showcase Hero */}
            <div className="bg-gradient-to-br from-slate-900 to-[#0f2942] text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg border border-amber-500/20">
              <div className="space-y-3 text-center md:text-left">
                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-bold uppercase tracking-wider border border-amber-500/30">
                  Trimestre: {currentTrimester}
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold">
                  {currentUser.name}
                </h3>
                <p className="text-xs text-slate-300 max-w-md">
                  Módulos evaluados: <span className="font-bold text-white">{gradedModulesCount}</span> de{' '}
                  <span className="font-bold text-white">{clubModules.length}</span> módulos totales.
                </p>
              </div>

              {/* Big Circular/Metric Badge */}
              <div className="flex flex-col items-center justify-center p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 min-w-[220px]">
                <span className="text-xs text-slate-300 font-semibold uppercase tracking-wider">
                  Promedio Acumulado
                </span>
                <div className="font-black text-5xl sm:text-6xl text-amber-400 font-mono tracking-tight my-1">
                  {gradedModulesCount > 0 ? finalAverageGrade : '---'}
                </div>
                <div className="text-xs text-slate-300 font-medium">sobre 100 puntos</div>
                <div className="mt-3">
                  <span className={`px-4 py-1 rounded-full text-xs font-bold ${finalGradeLevel.bgClass} ${finalGradeLevel.textClass} border ${finalGradeLevel.borderClass}`}>
                    {finalGradeLevel.emoji} {finalGradeLevel.level}
                  </span>
                </div>
              </div>
            </div>

            {/* Official Scale Reference Table */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Escala de Rendimiento Oficial CLED:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-emerald-200/80 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                    <span>🟢 90 – 100</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 mt-1">Excelente</p>
                  <p className="text-[11px] text-slate-500">Dominio sobresaliente de los objetivos.</p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-blue-200/80 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-blue-800 text-sm">
                    <span>🔵 80 – 89</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 mt-1">Satisfactorio</p>
                  <p className="text-[11px] text-slate-500">Cumple de forma sólida con los estándares.</p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
                    <span>🟡 70 – 79</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 mt-1">En proceso</p>
                  <p className="text-[11px] text-slate-500">Requiere afianzar competencias clave.</p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-rose-200/80 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-rose-800 text-sm">
                    <span>🔴 0 – 69</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 mt-1">No alcanzado</p>
                  <p className="text-[11px] text-slate-500">No cumple con los mínimos requeridos.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SECCIÓN CERTIFICADOS */}
      {activeTab === 'certificados' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Certificados y Constancias Oficiales</h2>
                <p className="text-xs text-slate-500">
                  Descarga tus constancias extracurriculares emitidas por la Directiva General y enlaces de diplomas.
                </p>
              </div>

              <button
                onClick={handleDownloadParticipationCertificate}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Generar Carta de Constancia (PDF)</span>
              </button>
            </div>

            {/* Participation Certificate Preview Card */}
            <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-6 relative overflow-hidden space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 rounded-xl text-amber-700">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Carta de Constancia de Participación Extracurricular
                  </h3>
                  <p className="text-xs text-slate-600">
                    Documento formal emitido en Los Alcarrizos, República Dominicana con Sello y Token Criptográfico.
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-amber-200 text-xs text-slate-700 leading-relaxed font-serif italic shadow-inner">
                &ldquo;Sirva la presente para hacer constar que el/la estudiante <strong>{currentUser.name}</strong>, matriculado/a bajo el ID <strong>{currentUser.student_code || currentUser.id}</strong>, se encuentra participando activamente de manera extracurricular en el <strong>{currentUser.club}</strong> perteneciente al Club de Liderazgo Estudiantil y Desarrollo (CLED), durante el período correspondiente al trimestre <strong>{currentTrimester}</strong>...&rdquo;
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] font-mono text-slate-500">
                  Validez: Directiva General CLED • Sello Institucional
                </span>
                <button
                  onClick={handleDownloadParticipationCertificate}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-xs"
                >
                  Descargar Constancia en PDF
                </button>
              </div>
            </div>

            {/* Facilitator Published Certificates */}
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-3">Certificados de Módulos Publicados</h3>
              {studentCertificates.length === 0 ? (
                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  Aún no se han publicado enlaces de certificados externos para este trimestre.
                </div>
              ) : (
                <div className="space-y-3">
                  {studentCertificates.map((cert) => {
                    const cleanUrl =
                      cert.certificate_url?.startsWith('http://') || cert.certificate_url?.startsWith('https://')
                        ? cert.certificate_url
                        : `https://${cert.certificate_url}`;

                    return (
                      <div
                        key={cert.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900">{cert.title || 'Certificado Oficial CLED'}</p>
                          <p className="text-[11px] text-slate-500 font-mono truncate max-w-md">
                            {cert.certificate_url}
                          </p>
                        </div>
                        <a
                          href={cleanUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f2942] text-amber-400 font-bold rounded-lg hover:bg-[#163a5d] transition-colors shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Abrir Certificado</span>
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. SECCIÓN RECURSOS */}
      {activeTab === 'recursos' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Recursos y Documentos de Apoyo</h2>
                <p className="text-xs text-slate-500">
                  Enlaces educativos, bibliografía y acceso prioritario al Estatuto Orgánico del CLED.
                </p>
              </div>

              <button
                onClick={() => setIsStatuteModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-500/30 rounded-xl text-xs font-bold transition-all"
              >
                <BookOpen className="w-4 h-4 text-amber-600" />
                <span>Ver Estatuto de CLED</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Statute Card */}
              <div className="p-5 bg-gradient-to-br from-slate-900 to-[#0f2942] text-white rounded-2xl space-y-3 shadow-md border border-amber-500/20">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider rounded-md border border-amber-500/30">
                    Documento Fundacional
                  </span>
                  <BookOpen className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="font-bold text-base text-white">Estatuto General del CLED</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Marco regulatorio institucional, derechos y deberes del estudiante, y ponderación de rúbricas formativas.
                </p>
                <button
                  onClick={() => setIsStatuteModalOpen(true)}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition-colors text-center"
                >
                  Abrir Visor de Estatuto
                </button>
              </div>

              {/* Facilitator links */}
              {clubResources.map((res) => (
                <div
                  key={res.id}
                  className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md">
                        Enlace del Facilitador
                      </span>
                      <ExternalLink className="w-4 h-4 text-slate-400" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{res.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {res.description || 'Recurso didáctico para el desarrollo modular.'}
                    </p>
                  </div>

                  <a
                    href={res.url.startsWith('#') ? '#' : res.url}
                    onClick={(e) => {
                      if (res.url === '#estatuto') {
                        e.preventDefault();
                        setIsStatuteModalOpen(true);
                      }
                    }}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold text-xs rounded-xl transition-colors text-center block"
                  >
                    Acceder al Recurso
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. SECCIÓN TAREAS */}
      {activeTab === 'tareas' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Tareas y Asignaciones</h2>
                <p className="text-xs text-slate-500">
                  Entrega tus compromisos y proyectos adjuntando enlaces o comentarios para revisión.
                </p>
              </div>
            </div>

            {clubTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <CheckCircle2 className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-sm font-medium">No hay tareas pendientes en este momento.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {clubTasks.map((task) => {
                  const submission = submissions.find(
                    (s) => s.task_id === task.id && s.student_id === currentUser.id
                  );

                  return (
                    <div
                      key={task.id}
                      className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 shadow-2xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">{task.title}</h3>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                            <span>Fecha límite: <strong className="text-slate-700">{task.due_date}</strong></span>
                            <span>•</span>
                            <span>Valor: <strong className="text-amber-600">{task.value} pts</strong></span>
                          </div>
                        </div>

                        <div>
                          {submission ? (
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                submission.status === 'Calificado'
                                  ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/30'
                                  : 'bg-blue-500/10 text-blue-700 border border-blue-500/30'
                              }`}
                            >
                              {submission.status === 'Calificado' ? `Calificado: ${submission.score}/${task.value} pts` : 'Entregado'}
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 border border-amber-500/30">
                              Pendiente de entrega
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                        {task.description}
                      </p>

                      {/* Submission status box */}
                      {submission && (
                        <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800">Tu Entrega:</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(submission.submitted_at).toLocaleString('es-DO')}
                            </span>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-lg text-slate-700 font-mono text-xs break-all">
                            {submission.comment_or_link}
                          </div>
                          {submission.feedback && (
                            <div className="pt-2 border-t border-slate-100 text-xs">
                              <span className="font-bold text-amber-700">Retroalimentación del Facilitador: </span>
                              <span className="text-slate-700">{submission.feedback}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => handleOpenTaskSubmit(task)}
                          className="px-4 py-2 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl text-xs transition-colors shadow-xs"
                        >
                          {submission ? 'Actualizar Entrega / Comentarios' : 'Entregar Tarea'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      </div>
    </div>

      {/* MODAL: Reporte de Asistencia (Apertura de Email a soporte.cled@outlook.com) */}
      {isReportModalOpen && selectedAttendanceForReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#0f2942] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm sm:text-base">Reportar Error en Asistencia</h3>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-slate-300 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                <p className="font-bold">Asistencia Seleccionada:</p>
                <p>Fecha: <strong>{selectedAttendanceForReport.date}</strong></p>
                <p>Estado actual marcado: <strong>{selectedAttendanceForReport.status}</strong></p>
                <p>Facilitador a cargo: <strong>{facilitator.name}</strong></p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Explicación del Motivo / Aclaración:
                </label>
                <textarea
                  rows={4}
                  value={studentExplanation}
                  onChange={(e) => setStudentExplanation(e.target.value)}
                  placeholder="Explica brevemente por qué consideras que el registro debe ser corregido (ej: estuve presente en la sala virtual / entregué justificante al docente)..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                />
              </div>

              <div className="text-[11px] text-slate-500">
                Se redactará un correo formal a <strong>soporte.cled@outlook.com</strong> con todos tus datos y la explicación ingresada.
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium text-xs sm:text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendAttendanceEmail}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-colors flex items-center gap-2 shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>Generar y Enviar Reporte</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Entrega de Tarea */}
      {isSubmitModalOpen && selectedTaskToSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#0f2942] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base">Entrega de Tarea</h3>
              <button onClick={() => setIsSubmitModalOpen(false)} className="text-slate-300 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="font-bold text-slate-900">{selectedTaskToSubmit.title}</p>
                <p className="text-slate-600 text-xs">{selectedTaskToSubmit.description}</p>
                <p className="text-amber-700 font-semibold text-[11px]">Valor: {selectedTaskToSubmit.value} pts</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Enlace de entrega (Drive, Docs, YouTube, etc.) o Comentario:
                </label>
                <textarea
                  rows={4}
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                  placeholder="Pega aquí tu enlace de Google Drive / Docs / Video o redacta tu respuesta..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-slate-800"
                />
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs sm:text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmTaskSubmit}
                disabled={!submissionContent.trim()}
                className="px-5 py-2 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl text-xs sm:text-sm transition-colors disabled:opacity-50"
              >
                Confirmar Entrega
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Estatuto General del CLED */}
      {isStatuteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95">
            <div className="bg-[#0f2942] text-white px-6 py-4 flex items-center justify-between border-b border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Estatuto General Oficial del CLED</h3>
                  <p className="text-[11px] text-slate-300">Sede Central: Los Alcarrizos, República Dominicana</p>
                </div>
              </div>
              <button
                onClick={() => setIsStatuteModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto font-sans text-xs sm:text-sm text-slate-700 leading-relaxed space-y-4 whitespace-pre-line bg-slate-50">
              {CLED_STATUTE_SUMMARY}
            </div>

            <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">Documento Certificado por la Directiva General CLED</span>
              <button
                onClick={() => setIsStatuteModalOpen(false)}
                className="px-4 py-1.5 bg-[#0f2942] hover:bg-[#163a5d] text-white font-semibold text-xs rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
