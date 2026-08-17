import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Clock,
  UserCheck,
  ClipboardList,
  FileSpreadsheet,
  PlusCircle,
  Award,
  QrCode,
  CheckCircle,
  Users,
  UserPlus,
  Download,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Edit,
  Save,
  Trash2,
  Shuffle,
  Shield,
  FileText,
  Loader2,
  AlertCircle,
  Check,
} from 'lucide-react';
import {
  CLUBS,
  GRADES,
  SECTIONS_3RO,
  SECTIONS_UPPER,
  TECHNICAL_AREAS,
  MONTHS_SPANISH,
  TRIMESTERS,
  RUBRIC_CRITERIA,
  calculateGradeLevel,
  normalizeTrimester,
  trimestersMatch,
  cleanClubName,
} from '../../utils/constants';
import {
  generateAttendanceReportPDF,
  generateStudentListPDF,
  generateGradesReportPDF,
  generateParticipationCertificatePDF,
  generateQRCardsPDF,
} from '../../utils/pdfGenerator';
import { generateStudentQRKey } from '../../utils/qrUtils';
import { AttendanceStatus, Module, RubricEvaluation, User } from '../../types';

export const FacilitatorView: React.FC = () => {
  const {
    currentUser,
    users,
    attendance,
    modules,
    grades,
    tasks,
    submissions,
    teams,
    resources,
    studentCerts,
    facilitatorCerts,
    currentTrimester,
    setCurrentTrimester,
    currentTime,
    recordAttendance,
    batchRecordAttendance,
    addModule,
    gradeStudentModule,
    addTask,
    gradeSubmission,
    createTeamManual,
    createTeamsAutomatic,
    addResource,
    updateStudentCert,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    | 'inicio'
    | 'asistencia'
    | 'reporte_asistencia'
    | 'listado'
    | 'ingresar_modulo'
    | 'calificar_modulo'
    | 'calificaciones_finales'
    | 'certificados'
    | 'qr_certificados'
    | 'tareas'
    | 'correccion_tareas'
    | 'mis_certificaciones'
  >('inicio');

  const myClub = currentUser.club || 'Club de comunicación social y periodismo';

  // Filter students for this facilitator's club or assigned facilitator_id matching the active trimester
  const clubStudents = users.filter((u) => {
    if (u.role !== 'ESTUDIANTE') return false;
    const isClubMatch = cleanClubName(u.club) === cleanClubName(myClub);
    const isFacMatch = u.facilitator_id === currentUser.id;
    if (!isClubMatch && !isFacMatch) return false;

    const studentTrim = u.trimester || u.matriculation_trimester;
    if (!studentTrim) return true;
    return trimestersMatch(studentTrim, currentTrimester);
  });

  // Filter modules for this club & trimester
  const clubModules = modules.filter(
    (m) =>
      cleanClubName(m.club) === cleanClubName(myClub) &&
      trimestersMatch(m.trimester, currentTrimester)
  );

  // Filter tasks for this club & trimester
  const clubTasks = tasks.filter(
    (t) =>
      cleanClubName(t.club) === cleanClubName(myClub) &&
      trimestersMatch(t.trimester, currentTrimester)
  );

  // Filter teams for this club & trimester
  const clubTeams = teams.filter(
    (t) =>
      cleanClubName(t.club) === cleanClubName(myClub) &&
      trimestersMatch(t.trimester, currentTrimester)
  );

  // Filter attendances for this club & trimester
  const clubAttendances = attendance.filter(
    (a) =>
      cleanClubName(a.club) === cleanClubName(myClub) &&
      trimestersMatch(a.trimester, currentTrimester)
  );

  // My Facilitator Certs from Directiva
  const myCertifications = facilitatorCerts.filter(
    (c) => c.facilitator_id === currentUser.id || !c.facilitator_id
  );

  // Clock Formatting
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

  // --- ATTENDANCE FORM STATE ---
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [attendanceStatuses, setAttendanceStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [attendanceNotes, setAttendanceNotes] = useState<Record<string, string>>({});
  const [attendanceSavedMessage, setAttendanceSavedMessage] = useState('');

  // Auto-fill existing attendances for selected date
  const loadAttendanceForDate = (dateStr: string) => {
    const existing = clubAttendances.filter((a) => a.date === dateStr);
    const statusesMap: Record<string, AttendanceStatus> = {};
    const notesMap: Record<string, string> = {};

    clubStudents.forEach((st) => {
      const rec = existing.find((a) => a.student_id === st.id);
      statusesMap[st.id] = rec ? rec.status : 'Presente';
      notesMap[st.id] = rec ? rec.notes || '' : '';
    });

    setAttendanceStatuses(statusesMap);
    setAttendanceNotes(notesMap);
  };

  React.useEffect(() => {
    loadAttendanceForDate(attendanceDate);
  }, [attendanceDate, clubStudents.length, currentTrimester]);

  const handleSaveAttendance = () => {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const month = monthNames[new Date(attendanceDate).getMonth()] || 'Septiembre';

    const records = clubStudents.map((st) => ({
      studentId: st.id,
      studentName: st.name,
      date: attendanceDate,
      status: attendanceStatuses[st.id] || 'Presente',
      notes: attendanceNotes[st.id] || '',
      club: myClub,
      month,
    }));

    batchRecordAttendance(records);
    setAttendanceSavedMessage('¡Asistencias guardadas exitosamente!');
    setTimeout(() => setAttendanceSavedMessage(''), 3000);
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const nextStatuses: Record<string, AttendanceStatus> = {};
    clubStudents.forEach((st) => {
      nextStatuses[st.id] = status;
    });
    setAttendanceStatuses(nextStatuses);
  };

  // --- REPORT ATTENDANCE STATE ---
  const [reportMonth, setReportMonth] = useState<string>('Todos');
  const [reportTrimester, setReportTrimester] = useState<string>(currentTrimester);

  const handleGenerateAttendancePDF = () => {
    generateAttendanceReportPDF({
      club: myClub,
      facilitador: currentUser.name,
      trimestre: reportTrimester,
      month: reportMonth,
      students: clubStudents,
      attendanceRecords: attendance,
    });
  };

  const handleGenerateStudentListPDF = () => {
    generateStudentListPDF({
      club: myClub,
      facilitador: currentUser.name,
      trimestre: currentTrimester,
      students: clubStudents,
    });
  };

  const handleGenerateGradesPDF = () => {
    generateGradesReportPDF({
      club: myClub,
      facilitador: currentUser.name,
      trimestre: currentTrimester,
      modules: clubModules,
      students: clubStudents,
      grades,
    });
  };

  // --- CREATE MODULE STATE ---
  const [moduleNumberInput, setModuleNumberInput] = useState('Módulo I');
  const [moduleTitleInput, setModuleTitleInput] = useState('');
  const [moduleCreatedSuccess, setModuleCreatedSuccess] = useState('');

  const handleCreateModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleTitleInput.trim()) return;
    addModule(moduleNumberInput, moduleTitleInput.trim(), myClub);
    setModuleCreatedSuccess(`¡${moduleNumberInput} creado con éxito!`);
    setModuleTitleInput('');
    setTimeout(() => setModuleCreatedSuccess(''), 3000);
  };

  // --- GRADING MODULE STATE ---
  const [selectedModuleIdForGrading, setSelectedModuleIdForGrading] = useState<string>('');
  const [selectedStudentForGrading, setSelectedStudentForGrading] = useState<string>('');
  const [rubricScores, setRubricScores] = useState<RubricEvaluation>({
    dominio_conceptual: 13,
    aplicacion_practica: 18,
    participacion: 9,
    trabajo_colaborativo: 8,
    comunicacion: 9,
    responsabilidad: 14,
    iniciativa: 8,
    producto_proyecto_final: 9,
  });
  const [isSavingGrade, setIsSavingGrade] = useState(false);
  const [gradeSavedSuccess, setGradeSavedSuccess] = useState('');
  const [gradeErrorMessage, setGradeErrorMessage] = useState('');

  // Resolved active module and student guaranteed to be non-empty if items exist in the club
  const activeModuleId =
    selectedModuleIdForGrading && clubModules.some((m) => m.id === selectedModuleIdForGrading)
      ? selectedModuleIdForGrading
      : clubModules[0]?.id || '';

  const activeStudentId =
    selectedStudentForGrading && clubStudents.some((s) => s.id === selectedStudentForGrading)
      ? selectedStudentForGrading
      : clubStudents[0]?.id || '';

  // When student or module changes, load existing grade
  React.useEffect(() => {
    if (activeStudentId && activeModuleId) {
      const existing = grades.find(
        (g) =>
          g.student_id === activeStudentId &&
          g.module_id === activeModuleId &&
          g.trimester === currentTrimester
      );
      if (existing) {
        setRubricScores({
          dominio_conceptual: existing.dominio_conceptual,
          aplicacion_practica: existing.aplicacion_practica,
          participacion: existing.participacion,
          trabajo_colaborativo: existing.trabajo_colaborativo,
          comunicacion: existing.comunicacion,
          responsabilidad: existing.responsabilidad,
          iniciativa: existing.iniciativa,
          producto_proyecto_final: existing.producto_proyecto_final,
        });
      }
    }
  }, [activeModuleId, activeStudentId, currentTrimester, grades]);

  const currentEvaluationTotal = (Object.values(rubricScores) as number[]).reduce((a, b) => a + Number(b), 0);
  const currentEvaluationLevel = calculateGradeLevel(currentEvaluationTotal);

  const handleSaveGrade = async () => {
    const targetStudentId = activeStudentId;
    const targetModuleId = activeModuleId;

    if (!targetStudentId || !targetModuleId) {
      if (clubModules.length === 0) {
        setGradeErrorMessage(
          'No hay módulos registrados en este club para este trimestre. Por favor crea uno en la pestaña "Ingresar Módulo".'
        );
      } else if (clubStudents.length === 0) {
        setGradeErrorMessage('No hay estudiantes registrados en este club.');
      } else {
        setGradeErrorMessage('Por favor selecciona un módulo y un estudiante para evaluar.');
      }
      setTimeout(() => setGradeErrorMessage(''), 5000);
      return;
    }

    const studentObj =
      users.find((s) => s.id === targetStudentId) ||
      clubStudents.find((s) => s.id === targetStudentId);
    const moduleObj =
      modules.find((m) => m.id === targetModuleId) ||
      clubModules.find((m) => m.id === targetModuleId);

    setIsSavingGrade(true);
    setGradeSavedSuccess('');
    setGradeErrorMessage('');

    try {
      const result = await gradeStudentModule(
        targetStudentId,
        targetModuleId,
        myClub,
        rubricScores
      );

      const stName = studentObj ? studentObj.name : 'el estudiante';
      const modName = moduleObj ? `${moduleObj.module_number} (${moduleObj.title})` : 'el módulo';

      setGradeSavedSuccess(
        `¡Calificación guardada exitosamente en la tabla student_module_grades! Estudiante: ${stName} • ${modName} • Nota: ${currentEvaluationTotal}/100 pts (${currentEvaluationLevel.level})`
      );
      setTimeout(() => setGradeSavedSuccess(''), 7000);
    } catch (err: any) {
      setGradeErrorMessage(`Error al guardar la calificación: ${err?.message || 'Error desconocido'}`);
      setTimeout(() => setGradeErrorMessage(''), 6000);
    } finally {
      setIsSavingGrade(false);
    }
  };

  // --- CERTIFICATES STATE ---
  const [studentCertUrlInput, setStudentCertUrlInput] = useState<Record<string, string>>({});
  const [certSavedMsg, setCertSavedMsg] = useState('');

  const handleSaveStudentCert = (studentId: string) => {
    const url = studentCertUrlInput[studentId] || '';
    if (!url.trim()) return;
    updateStudentCert(studentId, url.trim(), 'Certificado Oficial de Módulos');
    setCertSavedMsg('¡Enlace de certificado actualizado!');
    setTimeout(() => setCertSavedMsg(''), 3000);
  };

  // --- TASKS CREATION STATE ---
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskValue, setNewTaskValue] = useState(20);
  const [newTaskDueDate, setNewTaskDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [taskCreatedMsg, setTaskCreatedMsg] = useState('');

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    addTask(newTaskTitle, newTaskDescription, newTaskValue, newTaskDueDate, myClub);
    setTaskCreatedMsg('¡Tarea publicada exitosamente!');
    setNewTaskTitle('');
    setNewTaskDescription('');
    setTimeout(() => setTaskCreatedMsg(''), 3000);
  };

  // --- TASK CORRECTION STATE ---
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('');
  const [correctionScore, setCorrectionScore] = useState<number>(20);
  const [correctionFeedback, setCorrectionFeedback] = useState<string>('');
  const [correctionSuccessMsg, setCorrectionSuccessMsg] = useState('');

  const clubSubmissions = submissions.filter((sub) => {
    const task = tasks.find((t) => t.id === sub.task_id);
    return task && task.club === myClub && task.trimester === currentTrimester;
  });

  const handleSaveCorrection = (submissionId: string) => {
    gradeSubmission(submissionId, correctionScore, correctionFeedback);
    setCorrectionSuccessMsg('¡Calificación y retroalimentación guardadas!');
    setTimeout(() => setCorrectionSuccessMsg(''), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left Sidebar Navigation for Facilitator */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-3 space-y-1 sticky top-24">
            <div className="px-3 py-2 border-b border-slate-100 mb-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Portal Facilitador</div>
              <div className="text-xs font-bold text-[#0f2942] truncate">{currentUser.name}</div>
              <div className="text-[10px] text-amber-700 font-medium truncate">{myClub}</div>
            </div>
            {[
              { id: 'inicio', label: 'Inicio', icon: <Sparkles className="w-4 h-4" /> },
              { id: 'asistencia', label: 'Tomar Asistencia', icon: <ClipboardList className="w-4 h-4" /> },
              { id: 'reporte_asistencia', label: 'Reporte Asistencia (PDF)', icon: <Download className="w-4 h-4" /> },
              { id: 'listado', label: 'Listado Estudiantes (PDF)', icon: <FileSpreadsheet className="w-4 h-4" /> },
              { id: 'ingresar_modulo', label: 'Ingresar Módulo', icon: <PlusCircle className="w-4 h-4" /> },
              { id: 'calificar_modulo', label: 'Calificar Módulo', icon: <Award className="w-4 h-4" /> },
              { id: 'calificaciones_finales', label: 'Calificaciones Finales (PDF)', icon: <FileText className="w-4 h-4" /> },
              { id: 'certificados', label: 'Certificados & Enlaces', icon: <Award className="w-4 h-4" /> },
              { id: 'qr_certificados', label: 'QR Certificados (PDF)', icon: <QrCode className="w-4 h-4" /> },
              { id: 'tareas', label: 'Publicar Tareas', icon: <CheckCircle className="w-4 h-4" /> },
              { id: 'correccion_tareas', label: 'Corrección Tareas', icon: <Edit className="w-4 h-4" /> },
              { id: 'mis_certificaciones', label: 'Mis Certificaciones CLED', icon: <Shield className="w-4 h-4" /> },
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

      {/* 1. SECCIÓN INICIO FACILITADOR */}
      {activeTab === 'inicio' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f2942] via-[#163a5d] to-[#0a1e30] text-white p-6 sm:p-8 shadow-xl border border-amber-500/20">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
                  <UserCheck className="w-3.5 h-3.5" />
                  Panel Docente • {currentTrimester}
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  ¡Bienvenid@, Fac. {currentUser.name}!
                </h2>
                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs sm:text-sm text-slate-300">
                  <div className="flex items-center gap-1.5 font-mono bg-black/20 px-2.5 py-1 rounded-lg">
                    <span className="text-amber-400 font-bold">ID:</span>
                    <span>{currentUser.student_code || currentUser.id}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-medium">Club a cargo:</span>
                    <span className="font-bold text-amber-300 text-sm">{myClub}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Selector de Trimestre Activo para Facilitador */}
                <div className="bg-black/40 backdrop-blur-xs border border-white/10 rounded-2xl p-3 flex flex-col justify-center min-w-[210px] shadow-inner">
                  <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Trimestre Activo</span>
                  </div>
                  <div className="relative">
                    <select
                      value={currentTrimester}
                      onChange={(e) => setCurrentTrimester(e.target.value)}
                      className="w-full bg-[#153a5b] text-amber-300 font-bold text-xs rounded-xl px-3 py-1.5 pr-7 border border-amber-500/30 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer appearance-none shadow-xs"
                    >
                      {TRIMESTERS.map((trim) => (
                        <option key={trim} value={trim} className="bg-[#0f2942] text-white">
                          {trim}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-amber-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Live Digital Clock */}
                <div className="bg-black/30 backdrop-blur-xs border border-white/10 rounded-2xl p-4 text-center shrink-0 min-w-[170px] shadow-inner">
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
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Matrícula del Club</span>
              <div className="text-3xl font-black text-slate-900 mt-2">{clubStudents.length}</div>
              <p className="text-xs text-slate-500 mt-1">Estudiantes inscritos</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Módulos Planificados</span>
              <div className="text-3xl font-black text-slate-900 mt-2">{clubModules.length}</div>
              <p className="text-xs text-slate-500 mt-1">Valorados en 100 pts c/u</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tareas Publicadas</span>
              <div className="text-3xl font-black text-slate-900 mt-2">{clubTasks.length}</div>
              <p className="text-xs text-slate-500 mt-1">{clubSubmissions.length} entregas recibidas</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Asistencias Registradas</span>
              <div className="text-3xl font-black text-slate-900 mt-2">{clubAttendances.length}</div>
              <p className="text-xs text-slate-500 mt-1">Registros en el trimestre</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. SECCIÓN ASISTENCIA */}
      {activeTab === 'asistencia' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Control de Asistencia Diaria</h2>
                <p className="text-xs text-slate-500">
                  Establece la fecha y marca la asistencia de tus {clubStudents.length} estudiantes en {myClub}.
                </p>
              </div>

              {/* Date picker & batch actions */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => handleMarkAll('Presente')}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
                >
                  ✓ Todos Presentes
                </button>
              </div>
            </div>

            {attendanceSavedMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                {attendanceSavedMessage}
              </div>
            )}

            {clubStudents.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                No hay estudiantes registrados en este club aún. Puedes ingresarlos en la pestaña &quot;Ingresar Estudiantes&quot;.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Estudiante</th>
                      <th className="px-4 py-3">Grado / Sec.</th>
                      <th className="px-4 py-3">Estado de Asistencia</th>
                      <th className="px-4 py-3">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clubStudents.map((student) => {
                      const currentStatus = attendanceStatuses[student.id] || 'Presente';
                      const currentNote = attendanceNotes[student.id] || '';

                      return (
                        <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900">{student.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {student.student_code || student.id}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {student.grade || '3ro'} {student.section || 'A'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {(['Presente', 'Ausente', 'Justificado', 'Tardanza'] as AttendanceStatus[]).map((status) => {
                                const isSelected = currentStatus === status;
                                return (
                                  <button
                                    key={status}
                                    onClick={() =>
                                      setAttendanceStatuses((prev) => ({
                                        ...prev,
                                        [student.id]: status,
                                      }))
                                    }
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                      isSelected
                                        ? status === 'Presente'
                                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                          : status === 'Ausente'
                                          ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                                          : status === 'Justificado'
                                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                          : 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {status}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={currentNote}
                              onChange={(e) =>
                                setAttendanceNotes((prev) => ({
                                  ...prev,
                                  [student.id]: e.target.value,
                                }))
                              }
                              placeholder="Nota u observación..."
                              className="w-full px-2.5 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={handleSaveAttendance}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Asistencias ({attendanceDate})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SECCIÓN REPORTE ASISTENCIA (PDF) */}
      {activeTab === 'reporte_asistencia' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Generación de Reporte Oficial de Asistencia en PDF</h2>
              <p className="text-xs text-slate-500">
                Exporta el registro consolidado de asistencias con logo institucional, sello, trimestre, facilitador, club, fecha/hora y token de seguridad.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Seleccionar Mes:
                </label>
                <select
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {MONTHS_SPANISH.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Seleccionar Trimestre (hasta 2040):
                </label>
                <select
                  value={reportTrimester}
                  onChange={(e) => setReportTrimester(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {TRIMESTERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <p className="font-bold">Parámetros del Documento Oficial:</p>
              <p>• Club: <strong>{myClub}</strong></p>
              <p>• Facilitador: <strong>{currentUser.name}</strong></p>
              <p>• Total Estudiantes en nómina: <strong>{clubStudents.length}</strong></p>
              <p>• Validador: Sello Oficial Directiva General • Token Criptográfico Autogenerado</p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleGenerateAttendancePDF}
                className="flex items-center gap-2 px-6 py-3 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Generar y Descargar Reporte de Asistencia (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. SECCIÓN LISTADO (PDF) */}
      {activeTab === 'listado' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Listado de Estudiantes del Club</h2>
                <p className="text-xs text-slate-500">
                  Nómina oficial de estudiantes inscritos en {myClub} para el trimestre {currentTrimester}.
                </p>
              </div>

              <button
                onClick={handleGenerateStudentListPDF}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Listado Oficial en PDF</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">ID Matrícula</th>
                    <th className="px-4 py-3">Nombre Completo</th>
                    <th className="px-4 py-3">Grado</th>
                    <th className="px-4 py-3">Sec.</th>
                    <th className="px-4 py-3">Área Técnica</th>
                    <th className="px-4 py-3">Teléfono</th>
                    <th className="px-4 py-3">Correo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clubStudents.map((st, idx) => (
                    <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {st.student_code || st.id}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{st.name}</td>
                      <td className="px-4 py-3 text-slate-600">{st.grade || '3ro'}</td>
                      <td className="px-4 py-3 text-slate-600">{st.section || 'A'}</td>
                      <td className="px-4 py-3 text-slate-600">{st.technical_area || 'N/A'}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono">{st.phone || '---'}</td>
                      <td className="px-4 py-3 text-blue-600 font-mono text-xs">{st.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. SECCIÓN INGRESAR MÓDULO */}
      {activeTab === 'ingresar_modulo' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ingresar Nuevo Módulo de Planificación</h2>
              <p className="text-xs text-slate-500">
                Registra los módulos de trabajo formativo (Módulo I, II, III, IV, V, VI...). El valor predeterminado es de 100 puntos fijos.
              </p>
            </div>

            {moduleCreatedSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                {moduleCreatedSuccess}
              </div>
            )}

            <form onSubmit={handleCreateModule} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Número de Módulo (por escrito / romano):
                </label>
                <input
                  type="text"
                  value={moduleNumberInput}
                  onChange={(e) => setModuleNumberInput(e.target.value)}
                  placeholder="Ej: Módulo I, Módulo II, Módulo III..."
                  required
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Título del Módulo:
                </label>
                <input
                  type="text"
                  value={moduleTitleInput}
                  onChange={(e) => setModuleTitleInput(e.target.value)}
                  placeholder="Ej: Fundamentos de la Argumentación y Técnicas de Refutación..."
                  required
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Valor Oficial (Predeterminado y No Ajustable):
                </label>
                <input
                  type="text"
                  value="100 Puntos (Fijo según Rúbrica Oficial CLED)"
                  disabled
                  className="w-full p-3 bg-slate-100 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-600 cursor-not-allowed"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-3 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl text-xs sm:text-sm transition-colors flex items-center gap-2 shadow-md"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Guardar Módulo en Base de Datos</span>
              </button>
            </form>

            {/* List of existing modules */}
            <div className="pt-6 border-t border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Módulos Registrados ({clubModules.length})</h3>
              <div className="space-y-2.5">
                {clubModules.map((mod) => (
                  <div
                    key={mod.id}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#0f2942]">{mod.module_number}: </span>
                      <span className="text-slate-800 font-medium">{mod.title}</span>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-500/20 text-amber-800 font-bold rounded-lg text-[11px]">
                      100 pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. SECCIÓN CALIFICAR MÓDULO (RÚBRICA DE 8 CRITERIOS) */}
      {activeTab === 'calificar_modulo' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Calificar Estudiante con Rúbrica Oficial de 8 Criterios</h2>
              <p className="text-xs text-slate-500">
                Selecciona el módulo y el estudiante para evaluar cada criterio pedagógico. El total y nivel se calculan automáticamente.
              </p>
            </div>

            {gradeSavedSuccess && (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-300 text-emerald-900 rounded-2xl text-xs sm:text-sm font-semibold flex items-start gap-3 shadow-xs animate-in fade-in">
                <div className="p-1 bg-emerald-500 text-white rounded-lg mt-0.5 shrink-0">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-emerald-950 flex items-center gap-2">
                    <span>¡Calificación Guardada y Sincronizada!</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full">
                      Tabla: student_module_grades
                    </span>
                  </p>
                  <p className="text-emerald-800 leading-relaxed">{gradeSavedSuccess}</p>
                </div>
              </div>
            )}

            {gradeErrorMessage && (
              <div className="p-4 bg-rose-50 border-2 border-rose-300 text-rose-900 rounded-2xl text-xs sm:text-sm font-semibold flex items-start gap-3 shadow-xs animate-in fade-in">
                <div className="p-1 bg-rose-500 text-white rounded-lg mt-0.5 shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-rose-950">Aviso del Sistema</p>
                  <p className="text-rose-800">{gradeErrorMessage}</p>
                </div>
              </div>
            )}

            {/* Selectors for Module & Student */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Seleccionar Módulo:
                </label>
                {clubModules.length > 0 ? (
                  <select
                    value={activeModuleId}
                    onChange={(e) => setSelectedModuleIdForGrading(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {clubModules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.module_number}: {m.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2">
                    <span>No hay módulos en este trimestre</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('ingresar_modulo')}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[11px]"
                    >
                      + Crear Módulo
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Seleccionar Estudiante:
                </label>
                {clubStudents.length > 0 ? (
                  <select
                    value={activeStudentId}
                    onChange={(e) => setSelectedStudentForGrading(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {clubStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.student_code || st.id}) - {st.grade || '3ro'} {st.section || 'A'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600">
                    No hay estudiantes registrados en este club
                  </div>
                )}
              </div>
            </div>

            {/* 8-Criteria Rubric Sliders & Inputs */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Criterios de Evaluación</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {RUBRIC_CRITERIA.map((crit) => {
                  const val = Number((rubricScores as any)[crit.key] ?? 0);

                  return (
                    <div
                      key={crit.key}
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900 text-xs sm:text-sm">{crit.name}</p>
                          <p className="text-[11px] text-slate-500">{crit.description}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={crit.maxPoints}
                            value={val}
                            onChange={(e) => {
                              const num = Math.max(0, Math.min(crit.maxPoints, Number(e.target.value)));
                              setRubricScores((prev) => ({ ...prev, [crit.key]: num }));
                            }}
                            className="w-14 p-1.5 text-center font-bold text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                          />
                          <span className="text-xs font-bold text-slate-500">/{crit.maxPoints}</span>
                        </div>
                      </div>

                      <input
                        type="range"
                        min={0}
                        max={crit.maxPoints}
                        value={val}
                        onChange={(e) => {
                          const num = Number(e.target.value);
                          setRubricScores((prev) => ({ ...prev, [crit.key]: num }));
                        }}
                        className="w-full accent-amber-600 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total and Performance Scale Calculation Banner */}
            <div className="p-6 bg-[#0f2942] text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md border border-amber-500/20">
              <div>
                <p className="text-xs text-slate-300 uppercase tracking-wider font-semibold">
                  Puntaje Total Calculado del Módulo:
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-black text-4xl text-amber-400 font-mono">
                    {currentEvaluationTotal}
                  </span>
                  <span className="text-sm text-slate-300 font-bold">/ 100 Puntos</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className={`px-4 py-2 rounded-xl text-sm font-black border ${currentEvaluationLevel.bgClass} ${currentEvaluationLevel.textClass} ${currentEvaluationLevel.borderClass}`}>
                  {currentEvaluationLevel.emoji} {currentEvaluationLevel.level}
                </span>

                <button
                  onClick={handleSaveGrade}
                  disabled={isSavingGrade}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-slate-950 font-extrabold rounded-xl text-xs sm:text-sm shadow-md transition-colors flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSavingGrade ? (
                    <>
                      <Loader2 className="w-4 h-4 text-slate-950 animate-spin" />
                      <span>Guardando en BD...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-slate-950" />
                      <span>Guardar Nota en Sistema</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. SECCIÓN CALIFICACIONES FINALES (PDF) */}
      {activeTab === 'calificaciones_finales' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Calificaciones Finales del Semestre / Trimestre</h2>
                <p className="text-xs text-slate-500">
                  Consolidado de calificaciones modulares y promedio general final por estudiante.
                </p>
              </div>

              <button
                onClick={handleGenerateGradesPDF}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Calificaciones Finales (PDF)</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Estudiante</th>
                    {clubModules.map((m) => (
                      <th key={m.id} className="px-4 py-3 whitespace-nowrap">
                        {m.module_number}
                      </th>
                    ))}
                    <th className="px-4 py-3">Promedio Final</th>
                    <th className="px-4 py-3">Nivel Obtenido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clubStudents.map((student) => {
                    let totalScoreSum = 0;
                    let gradedCount = 0;

                    const moduleGrades = clubModules.map((mod) => {
                      const g = grades.find(
                        (gr) => gr.student_id === student.id && gr.module_id === mod.id && gr.trimester === currentTrimester
                      );
                      if (g) {
                        totalScoreSum += g.total_score;
                        gradedCount++;
                        return g.total_score;
                      }
                      return null;
                    });

                    const finalAvg = gradedCount > 0 ? Math.round(totalScoreSum / gradedCount) : 0;
                    const finalLvl = calculateGradeLevel(finalAvg);

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{student.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{student.student_code || student.id}</p>
                        </td>
                        {moduleGrades.map((sc, i) => (
                          <td key={i} className="px-4 py-3 font-mono font-semibold text-slate-800">
                            {sc !== null ? `${sc} pts` : <span className="text-slate-400">---</span>}
                          </td>
                        ))}
                        <td className="px-4 py-3 font-mono font-black text-slate-900 text-sm">
                          {gradedCount > 0 ? `${finalAvg} / 100` : '---'}
                        </td>
                        <td className="px-4 py-3">
                          {gradedCount > 0 ? (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${finalLvl.bgClass} ${finalLvl.textClass}`}>
                              {finalLvl.emoji} {finalLvl.level}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">Sin evaluar</span>
                          )}
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

      {/* 8. SECCIÓN CERTIFICADOS */}
      {activeTab === 'certificados' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Gestión de Certificados de Estudiantes</h2>
              <p className="text-xs text-slate-500">
                Asigna el enlace del certificado final a cada estudiante y genera constancias oficiales de participación extracurricular.
              </p>
            </div>

            {certSavedMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                {certSavedMsg}
              </div>
            )}

            <div className="space-y-3">
              {clubStudents.map((st) => {
                const cert = studentCerts.find(
                  (c) => c.student_id === st.id && c.trimester === currentTrimester
                );
                const currentUrl = studentCertUrlInput[st.id] ?? (cert ? cert.certificate_url : '');

                return (
                  <div
                    key={st.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1 min-w-[200px]">
                      <p className="font-bold text-slate-900 text-sm">{st.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{st.student_code || st.id}</p>
                    </div>

                    <div className="flex-1 max-w-md">
                      <input
                        type="url"
                        value={currentUrl}
                        onChange={(e) =>
                          setStudentCertUrlInput((prev) => ({
                            ...prev,
                            [st.id]: e.target.value,
                          }))
                        }
                        placeholder="https://cled.do/certificados/diploma-estudiante.pdf"
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveStudentCert(st.id)}
                        className="px-3 py-1.5 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl transition-colors shadow-xs"
                      >
                        Guardar Enlace
                      </button>

                      <button
                        onClick={() =>
                          generateParticipationCertificatePDF({
                            studentName: st.name,
                            studentId: st.student_code || st.id,
                            clubName: myClub,
                            trimester: currentTrimester,
                            user: st,
                          })
                        }
                        className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-500/30 font-bold rounded-xl transition-colors flex items-center gap-1"
                        title="Generar Constancia en PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-600" />
                        <span>Constancia PDF</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 9. SECCIÓN QR CERTIFICADOS (PDF) */}
      {activeTab === 'qr_certificados' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">QR de Certificados para Extracción y Diseño Gráfico</h2>
                <p className="text-xs text-slate-500">
                  Códigos QR autogenerados con la clave criptográfica: <span className="font-mono font-bold text-slate-700">[APELLIDO]_[NOMBRE]_[FECHA_NACIMIENTO]_[AÑO_MATRICULACION]</span>
                </p>
              </div>

              <button
                onClick={() =>
                  generateQRCardsPDF({
                    title: 'Fichas de QR de Validación para Certificados de Estudiantes',
                    club: myClub,
                    trimestre: currentTrimester,
                    users: clubStudents,
                  })
                }
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Descargar PDF con Fichas QR</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clubStudents.map((st) => {
                const qrKey = generateStudentQRKey(st);

                return (
                  <div
                    key={st.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div>
                        <p className="font-bold text-slate-900 text-xs sm:text-sm">{st.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{st.student_code || st.id}</p>
                      </div>
                      <QrCode className="w-5 h-5 text-amber-600" />
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Clave de Autenticación CLED:
                      </p>
                      <p className="font-mono text-xs font-bold text-amber-700 break-all select-all">
                        {qrKey}
                      </p>
                    </div>

                    <p className="text-[10px] text-slate-500">
                      Nacimiento: {st.birth_date || '2009-01-01'} • Matrícula: {st.matriculation_year || 2026}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 10. SECCIÓN TAREAS */}
      {activeTab === 'tareas' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Publicar Nueva Tarea o Asignación</h2>
              <p className="text-xs text-slate-500">
                Los estudiantes verán esta tarea en su portal para enviar sus enlaces y comentarios de entrega.
              </p>
            </div>

            {taskCreatedMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                {taskCreatedMsg}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Título de la Tarea:
                </label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Ej: Análisis de Discurso Político y Elaboración de Crónica..."
                  required
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Descripción / Instrucciones:
                </label>
                <textarea
                  rows={3}
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Detalla los pasos, formato requerido y enlaces necesarios..."
                  required
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Valor en Puntos:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={newTaskValue}
                    onChange={(e) => setNewTaskValue(Number(e.target.value))}
                    className="w-full p-3 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Fecha de Entrega:
                  </label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-3 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl text-xs sm:text-sm transition-colors flex items-center gap-2 shadow-md"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Publicar Tarea en el Portal</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 11. SECCIÓN CORRECCIÓN DE TAREAS */}
      {activeTab === 'correccion_tareas' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Corrección y Retroalimentación de Tareas</h2>
              <p className="text-xs text-slate-500">
                Puntúa los trabajos entregados por tus estudiantes, lee sus comentarios y revisa sus enlaces adjuntos.
              </p>
            </div>

            {correctionSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                {correctionSuccessMsg}
              </div>
            )}

            {clubSubmissions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <CheckCircle className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-sm font-medium">Aún no hay entregas de tareas recibidas en este club.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {clubSubmissions.map((sub) => {
                  const task = tasks.find((t) => t.id === sub.task_id);
                  const isCurrent = selectedSubmissionId === sub.id;

                  return (
                    <div
                      key={sub.id}
                      className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 shadow-2xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">
                            Estudiante: <span className="text-[#0f2942] font-black">{sub.student_name}</span>
                          </p>
                          <p className="text-xs text-slate-500">
                            Tarea: <strong className="text-slate-700">{task?.title || 'Tarea'}</strong> • Valor: {task?.value || 100} pts
                          </p>
                        </div>

                        <div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              sub.status === 'Calificado'
                                ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-700 border border-amber-500/30'
                            }`}
                          >
                            {sub.status === 'Calificado' ? `Calificado: ${sub.score} pts` : 'Pendiente de Calificar'}
                          </span>
                        </div>
                      </div>

                      {/* Content submitted */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 text-xs">
                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                          Entrega del Estudiante:
                        </span>
                        <p className="font-mono text-slate-800 break-all leading-relaxed">
                          {sub.comment_or_link}
                        </p>
                      </div>

                      {/* Grading form */}
                      <div className="pt-2 flex flex-col sm:flex-row items-end sm:items-center gap-3">
                        <div className="w-full sm:w-32">
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                            Puntaje (máx {task?.value || 100}):
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={task?.value || 100}
                            defaultValue={sub.score ?? (task?.value || 20)}
                            onChange={(e) => setCorrectionScore(Number(e.target.value))}
                            className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono"
                          />
                        </div>

                        <div className="w-full flex-1">
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                            Retroalimentación al Estudiante:
                          </label>
                          <input
                            type="text"
                            defaultValue={sub.feedback || ''}
                            onChange={(e) => setCorrectionFeedback(e.target.value)}
                            placeholder="Excelente dominio del tema y claridad expositiva..."
                            className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>

                        <button
                          onClick={() => handleSaveCorrection(sub.id)}
                          className="px-4 py-2 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl text-xs shrink-0 transition-colors shadow-xs"
                        >
                          Guardar Nota
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

      {/* 12. SECCIÓN MIS CERTIFICACIONES */}
      {activeTab === 'mis_certificaciones' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Mis Certificaciones Oficiales CLED</h2>
              <p className="text-xs text-slate-500">
                Diplomas y avales docentes otorgados por la Directiva General.
              </p>
            </div>

            {myCertifications.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Shield className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-sm font-medium">Aún no se han emitido certificaciones para tu perfil en este trimestre.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myCertifications.map((cert) => (
                  <div
                    key={cert.id}
                    className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-800 rounded-md font-bold text-[10px] uppercase">
                        Acreditación Docente CLED
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">{cert.title}</h3>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Clave QR Oficial: {cert.qr_code_key}
                      </p>
                    </div>

                    <a
                      href={cert.certificate_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl transition-colors shadow-xs shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Ver Certificación</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};
