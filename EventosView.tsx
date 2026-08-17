import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useApp } from '../../context/AppContext';
import {
  Clock,
  QrCode,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Download,
  Ticket,
  PlusCircle,
  History,
  ShieldCheck,
  Calendar,
  ShieldAlert,
  BarChart3,
  MapPin,
  Users,
  Mail,
  Filter,
  Trash2,
  Edit,
  Eye,
  FileText,
  Building2,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Camera,
  CameraOff,
  RefreshCw,
  UploadCloud,
  Volume2,
  VolumeX,
  ScanLine,
  Video,
  Check,
  RotateCcw,
  GraduationCap,
  ChevronDown,
} from 'lucide-react';
import {
  generateEventPassesPDF,
  generateEventDetailReportPDF,
  generateAllEventsConsolidatedReportPDF,
} from '../../utils/pdfGenerator';
import { TRIMESTERS } from '../../utils/constants';
import { CledEvent, EventPass } from '../../types';

export const EventosView: React.FC = () => {
  const {
    currentUser,
    users,
    events,
    eventPasses,
    studentCerts,
    facilitatorCerts,
    currentTime,
    currentTrimester,
    setCurrentTrimester,
    addEvent,
    updateEvent,
    deleteEvent,
    validatePassByCode,
    togglePassAudit,
    createEventPass,
    auditLogs,
  } = useApp();

  // Filtered strictly by active trimester
  const trimesterEvents = events.filter((e) => !e.trimester || e.trimester === currentTrimester);
  const trimesterEventPasses = eventPasses.filter((p) => !p.trimester || p.trimester === currentTrimester);
  const trimesterAuditLogs = auditLogs.filter((l) => !l.trimester || l.trimester === currentTrimester);

  // Active sidebar tab
  const [activeTab, setActiveTab] = useState<
    'control_eventos' | 'crear_evento' | 'auditoria_spam' | 'escaner'
  >('control_eventos');

  // Real-time Clock
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

  // ==========================================
  // 1. CREAR EVENTO FORM STATE
  // ==========================================
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventCapacity, setEventCapacity] = useState<number>(200);
  const [eventSuccessMsg, setEventSuccessMsg] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDate || !eventLocation.trim()) return;

    if (editingEventId) {
      updateEvent(editingEventId, {
        title: eventTitle.trim(),
        description: eventDescription.trim(),
        date: eventDate,
        time: eventTime || '09:00 AM',
        location: eventLocation.trim(),
        capacity: Number(eventCapacity) || 200,
      });
      setEventSuccessMsg(`¡Evento "${eventTitle}" actualizado satisfactoriamente!`);
      setEditingEventId(null);
    } else {
      addEvent(
        eventTitle.trim(),
        eventDescription.trim(),
        eventDate,
        eventTime || '09:00 AM',
        eventLocation.trim(),
        Number(eventCapacity) || 200
      );
      setEventSuccessMsg(`¡Evento "${eventTitle}" registrado exitosamente en el sistema CLED!`);
    }

    // Reset Form
    setEventTitle('');
    setEventDescription('');
    setEventDate('');
    setEventTime('');
    setEventLocation('');
    setEventCapacity(200);

    setTimeout(() => setEventSuccessMsg(''), 4000);
  };

  const handleEditEventClick = (evt: CledEvent) => {
    setEditingEventId(evt.id);
    setEventTitle(evt.title);
    setEventDescription(evt.description);
    setEventDate(evt.date);
    setEventTime(evt.time);
    setEventLocation(evt.location);
    setEventCapacity(evt.capacity || 200);
    setActiveTab('crear_evento');
  };

  // ==========================================
  // 2. AUDITORÍA (SPAM) STATE & ACTIONS
  // ==========================================
  const [auditSearch, setAuditSearch] = useState('');
  const [auditFilterEvent, setAuditFilterEvent] = useState('ALL');
  const [auditFilterStatus, setAuditFilterStatus] = useState<'ALL' | 'Activo' | 'En Auditoría' | 'Validado'>('ALL');
  const [auditReasonInput, setAuditReasonInput] = useState<{ [passId: string]: string }>({});

  const filteredAuditPasses = trimesterEventPasses.filter((pass) => {
    const matchSearch =
      pass.person_name.toLowerCase().includes(auditSearch.toLowerCase()) ||
      pass.pass_code.toLowerCase().includes(auditSearch.toLowerCase()) ||
      (pass.user_email && pass.user_email.toLowerCase().includes(auditSearch.toLowerCase())) ||
      (pass.club && pass.club.toLowerCase().includes(auditSearch.toLowerCase()));

    const matchEvent =
      auditFilterEvent === 'ALL' ||
      pass.event_name === auditFilterEvent ||
      pass.event_title === auditFilterEvent;

    const matchStatus =
      auditFilterStatus === 'ALL' ||
      (auditFilterStatus === 'En Auditoría' && (pass.status === 'En Auditoría' || pass.status === 'Revocado')) ||
      pass.status === auditFilterStatus;

    return matchSearch && matchEvent && matchStatus;
  });

  const handleToggleAudit = (pass: EventPass, sendToAudit: boolean) => {
    const customReason = auditReasonInput[pass.id] || (sendToAudit ? 'Inconsistencia detectada en verificación de boleta' : undefined);
    togglePassAudit(pass.id, sendToAudit, customReason);
  };

  // ==========================================
  // 3. CONTROL DE EVENTOS DASHBOARD STATE
  // ==========================================
  const [selectedControlEventId, setSelectedControlEventId] = useState<string>('ALL');
  const [controlSearch, setControlSearch] = useState('');
  const [controlStatusTab, setControlStatusTab] = useState<'ALL' | 'ASISTIERON' | 'AUSENTES' | 'AUDITORIA'>('ALL');

  const selectedEventObj = trimesterEvents.find((e) => e.id === selectedControlEventId);

  // Passes filtered by selected event
  const controlEventPasses = trimesterEventPasses.filter((pass) => {
    if (selectedControlEventId === 'ALL') return true;
    if (!selectedEventObj) return true;
    return (
      pass.event_name === selectedEventObj.title ||
      pass.event_title === selectedEventObj.title ||
      pass.event_name.toLowerCase().includes(selectedEventObj.title.toLowerCase())
    );
  });

  // Calculate statistics
  const statTotalGenerated = controlEventPasses.length;
  const statAttended = controlEventPasses.filter((p) => p.validated).length;
  const statAbsents = controlEventPasses.filter((p) => p.status === 'Activo' && !p.validated).length;
  const statInAudit = controlEventPasses.filter(
    (p) => p.status === 'En Auditoría' || p.status === 'Revocado'
  ).length;
  const statAttendancePercentage =
    statTotalGenerated > 0 ? Math.round((statAttended / statTotalGenerated) * 100) : 0;

  // Filtered passes for control table
  const filteredControlPasses = controlEventPasses.filter((p) => {
    const matchSearch =
      p.person_name.toLowerCase().includes(controlSearch.toLowerCase()) ||
      p.pass_code.toLowerCase().includes(controlSearch.toLowerCase()) ||
      (p.user_email && p.user_email.toLowerCase().includes(controlSearch.toLowerCase())) ||
      (p.club && p.club.toLowerCase().includes(controlSearch.toLowerCase()));

    if (!matchSearch) return false;

    if (controlStatusTab === 'ASISTIERON') return p.validated;
    if (controlStatusTab === 'AUSENTES') return p.status === 'Activo' && !p.validated;
    if (controlStatusTab === 'AUDITORIA') return p.status === 'En Auditoría' || p.status === 'Revocado';

    return true;
  });

  // PDF Download Handlers
  const handleDownloadSelectedEventReport = () => {
    if (selectedControlEventId === 'ALL' || !selectedEventObj) {
      generateAllEventsConsolidatedReportPDF({ events: trimesterEvents, passes: trimesterEventPasses });
    } else {
      generateEventDetailReportPDF({
        event: selectedEventObj,
        passes: trimesterEventPasses,
      });
    }
  };

  const handleDownloadAllConsolidatedReport = () => {
    generateAllEventsConsolidatedReportPDF({ events: trimesterEvents, passes: trimesterEventPasses });
  };

  // ==========================================
  // 4. SCANNER & QUICK PASS MODAL STATE
  // ==========================================
  const [manualCode, setManualCode] = useState('');
  const [scannerMode, setScannerMode] = useState<'camera' | 'manual' | 'upload'>('camera');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [camerasList, setCamerasList] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [soundFeedback, setSoundFeedback] = useState(true);
  const [scanFlash, setScanFlash] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedCodeRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [scanResult, setScanResult] = useState<{
    status: 'idle' | 'success' | 'already_used' | 'invalid';
    pass?: EventPass;
    message?: string;
  }>({ status: 'idle' });

  const [showQuickPassModal, setShowQuickPassModal] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickClub, setQuickClub] = useState('Invitado Especial');
  const [quickRole, setQuickRole] = useState<'ESTUDIANTE' | 'FACILITADOR' | 'DIRECTIVA'>('ESTUDIANTE');
  const [quickEvent, setQuickEvent] = useState(events[0]?.title || 'Gala Anual CLED 2026');

  // Audio feedback synthesis via Web Audio API
  const playBeepSound = (isSuccess = true) => {
    if (!soundFeedback) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = isSuccess ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(isSuccess ? 880 : 330, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Audio context might be restricted before user gesture
    }
  };

  const startCameraScanner = async (cameraId?: string) => {
    setIsCameraStarting(true);
    setCameraError(null);
    try {
      // Stop existing if scanning
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
        } catch (e) {
          console.warn('Stopping previous scanner instance:', e);
        }
      }

      // Check available cameras
      let devices: Array<{ id: string; label: string }> = [];
      try {
        devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCamerasList(devices);
        }
      } catch (e) {
        console.warn('Could not enumerate cameras:', e);
      }

      let targetCamId = cameraId || selectedCameraId;
      if (!targetCamId && devices.length > 0) {
        // Try to pick environment / back camera first
        const backCam = devices.find((d) =>
          /back|rear|environment|trasera|posterior/i.test(d.label)
        );
        targetCamId = backCam ? backCam.id : devices[0].id;
        setSelectedCameraId(targetCamId);
      }

      // Ensure camera DOM element is active & mounted
      setIsCameraActive(true);

      // Brief tick to allow DOM repaint of camera element container
      await new Promise((resolve) => setTimeout(resolve, 50));

      const scanner = new Html5Qrcode('cled-qr-camera-element');
      scannerRef.current = scanner;

      const cameraConfig = targetCamId
        ? { deviceId: { exact: targetCamId } }
        : { facingMode: 'environment' };

      await scanner.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrEdge = Math.floor(minEdge * 0.75);
            return { width: Math.max(qrEdge, 200), height: Math.max(qrEdge, 200) };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          const now = Date.now();
          // Debounce same code within 2.5 seconds
          if (
            lastScannedCodeRef.current.code === decodedText &&
            now - lastScannedCodeRef.current.time < 2500
          ) {
            return;
          }
          lastScannedCodeRef.current = { code: decodedText, time: now };

          setScanFlash(true);
          setTimeout(() => setScanFlash(false), 600);
          playBeepSound(true);

          setManualCode(decodedText);
          handleValidate(decodedText);
        },
        () => {
          // Scanning frames without QR - ignore
        }
      );
    } catch (err: any) {
      console.error('Error starting camera scanner:', err);
      setIsCameraActive(false);
      const msg = String(err?.message || err || '');
      if (msg.includes('NotAllowedError') || msg.includes('Permission denied')) {
        setCameraError(
          'Permiso de cámara denegado. Por favor, habilita el permiso de cámara en tu navegador para escanear pases QR.'
        );
      } else if (msg.includes('NotFoundError') || msg.includes('DevicesNotFoundError')) {
        setCameraError('No se encontró ninguna cámara conectada en tu dispositivo.');
      } else {
        setCameraError(
          'No se pudo inicializar la cámara con el modo solicitado. Intenta seleccionar otra cámara o ingresar el código manualmente.'
        );
      }
    } finally {
      setIsCameraStarting(false);
    }
  };

  const stopCameraScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error('Error stopping camera:', err);
      } finally {
        setIsCameraActive(false);
      }
    } else {
      setIsCameraActive(false);
    }
  };

  const handleSwitchCamera = async (newCamId: string) => {
    setSelectedCameraId(newCamId);
    if (isCameraActive) {
      await stopCameraScanner();
      await startCameraScanner(newCamId);
    }
  };

  const handleFileUploadQR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode('cled-qr-camera-element');
        scannerRef.current = scanner;
      }
      const decodedText = await scanner.scanFile(file, true);
      if (decodedText) {
        playBeepSound(true);
        setScanFlash(true);
        setTimeout(() => setScanFlash(false), 600);
        setManualCode(decodedText);
        handleValidate(decodedText);
      }
    } catch (err) {
      setCameraError('No se pudo detectar un código QR legible en la imagen seleccionada. Prueba con otra foto o introduce el código.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Stop camera when unmounting or switching tabs
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'escaner' && isCameraActive) {
      stopCameraScanner();
    }
  }, [activeTab]);

  const handleValidate = async (codeToTest: string) => {
    if (!codeToTest.trim()) return;
    const cleanCode = codeToTest.trim();
    const res = await validatePassByCode(cleanCode);

    if (res.valid && res.pass) {
      setScanResult({
        status: 'success',
        pass: res.pass,
        message: `¡ACCESO AUTORIZADO! Pase institucional verificado con éxito para ${res.pass.user_name} (${res.pass.event_name}).`,
      });
      return;
    } else if (res.pass && res.pass.status === 'Validado') {
      setScanResult({
        status: 'already_used',
        pass: res.pass,
        message: `¡ATENCIÓN! Este pase ya fue utilizado previamente el ${res.pass.validated_at || 'anteriormente'}.`,
      });
      return;
    } else if (res.pass && (res.pass.status === 'En Auditoría' || res.pass.status === 'Revocado')) {
      setScanResult({
        status: 'invalid',
        pass: res.pass,
        message: `⚠️ Pase REVOCADO o EN AUDITORÍA por seguridad. No se autoriza el acceso.`,
      });
      return;
    }

    // Check facilitator certs
    const facCertMatch = facilitatorCerts.find(
      (c) => c.qr_code_key.toUpperCase() === cleanCode.toUpperCase()
    );
    if (facCertMatch) {
      const facUser = users.find((u) => u.id === facCertMatch.facilitator_id);
      setScanResult({
        status: 'success',
        message: `✅ ¡ACREDITACIÓN DOCENTE VÁLIDA!\nDocente: ${facCertMatch.facilitator_name || facUser?.name}\nCertificación: ${facCertMatch.title}\nClub: ${facUser?.club || 'CLED'}\nClave: ${facCertMatch.qr_code_key}`,
      });
      return;
    }

    // Check student certs
    const stdCertMatch = studentCerts.find(
      (c) => c.qr_code_key && c.qr_code_key.toUpperCase() === cleanCode.toUpperCase()
    );
    if (stdCertMatch) {
      const stdUser = users.find((u) => u.id === stdCertMatch.student_id);
      setScanResult({
        status: 'success',
        message: `✅ ¡CERTIFICACIÓN ESTUDIANTIL VÁLIDA!\nEstudiante: ${stdCertMatch.student_name || stdUser?.name}\nCertificado: ${stdCertMatch.title || 'Módulos Académicos'}\nClub: ${stdUser?.club || 'CLED'}\nClave: ${stdCertMatch.qr_code_key}`,
      });
      return;
    }

    // Not found
    setScanResult({
      status: 'invalid',
      message: '❌ CÓDIGO NO VÁLIDO. No coincide con ningún pase, acreditación docente ni certificado activo.',
    });
  };

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;

    const targetEvt = events.find((ev) => ev.title === quickEvent) || events[0];

    const newPass = await createEventPass(
      `inv-${Date.now()}`,
      quickName.trim().toUpperCase(),
      quickRole,
      quickClub,
      quickEvent,
      targetEvt?.date || new Date().toISOString().split('T')[0],
      targetEvt?.location || 'Auditorio Principal',
      'Acceso Puerta / Recepción'
    );

    setShowQuickPassModal(false);
    setQuickName('');
    await handleValidate(newPass.qr_code_key);
  };

  const validatedPasses = eventPasses.filter((p) => p.validated);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#07131e] via-[#0f2942] to-[#153450] text-white p-6 sm:p-8 shadow-xl border border-amber-500/30">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/40 text-xs font-black uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Módulo Central de Eventos y Auditoría CLED
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Gestión Integral de Eventos, Boletas y Control de Asistencia
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Administra eventos institucionales, audita pases sospechosos con notificación por correo y genera reportes oficiales de asistencia en PDF por cada trimestre.
            </p>

            {/* Trimester Selector Bar in Hero */}
            <div className="pt-2 flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Trimestre Activo:</span>
              </span>
              <div className="relative">
                <select
                  value={currentTrimester}
                  onChange={(e) => setCurrentTrimester(e.target.value)}
                  className="bg-[#091b2c] text-white font-bold text-xs rounded-xl px-3.5 py-1.5 pr-8 border border-amber-400/40 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer appearance-none shadow-md"
                >
                  {TRIMESTERS.map((trim) => (
                    <option key={trim} value={trim} className="bg-[#0f2942] text-white">
                      {trim}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-amber-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <span className="text-[11px] text-slate-400 bg-black/30 px-2.5 py-1 rounded-lg border border-white/10">
                {trimesterEvents.length} {trimesterEvents.length === 1 ? 'evento registrado' : 'eventos registrados'} en este trimestre
              </span>
            </div>
          </div>

          {/* Live Clock */}
          <div className="bg-black/40 backdrop-blur-xs border border-white/10 rounded-2xl p-4 text-center shrink-0 min-w-[200px]">
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

      {/* Main Layout: Sidebar Navigation + Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar Menu */}
        <div className="lg:col-span-3 bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-2 sticky top-20">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-1">
            Menú de Eventos & Auditoría
          </p>

          {/* 1. Control de Eventos */}
          <button
            id="nav-control-eventos"
            onClick={() => setActiveTab('control_eventos')}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'control_eventos'
                ? 'bg-[#0f2942] text-amber-400 shadow-md translate-x-1'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <span>Control de eventos</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'control_eventos'
                  ? 'bg-amber-400/20 text-amber-300'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {trimesterEvents.length}
            </span>
          </button>

          {/* 2. Crear Evento */}
          <button
            id="nav-crear-evento"
            onClick={() => setActiveTab('crear_evento')}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'crear_evento'
                ? 'bg-[#0f2942] text-amber-400 shadow-md translate-x-1'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <PlusCircle className="w-4 h-4 text-amber-500" />
              <span>Crear evento</span>
            </div>
            {editingEventId && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                Editando
              </span>
            )}
          </button>

          {/* 3. Auditoría (Spam) */}
          <button
            id="nav-auditoria-spam"
            onClick={() => setActiveTab('auditoria_spam')}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'auditoria_spam'
                ? 'bg-[#0f2942] text-amber-400 shadow-md translate-x-1'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Auditoría (Spam)</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                trimesterEventPasses.filter((p) => p.status === 'En Auditoría' || p.status === 'Revocado').length > 0
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {trimesterEventPasses.filter((p) => p.status === 'En Auditoría' || p.status === 'Revocado').length}
            </span>
          </button>

          {/* 4. Escáner y Validación */}
          <button
            id="nav-escaner-puerta"
            onClick={() => setActiveTab('escaner')}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'escaner'
                ? 'bg-[#0f2942] text-amber-400 shadow-md translate-x-1'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <QrCode className="w-4 h-4 text-emerald-500" />
              <span>Validar en Puerta</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              En Vivo
            </span>
          </button>

          {/* Institutional Info Box in Sidebar */}
          <div className="pt-4 mt-4 border-t border-slate-100 px-3 space-y-2">
            <div className="flex items-center gap-2 text-slate-500 text-[11px]">
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-bold">Seguridad CLED v2.6</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Los eventos creados se sincronizan automáticamente con la plataforma de emisión de pases y boletos QR.
            </p>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-9 space-y-6">
          {/* ========================================================================= */}
          {/* TAB 1: CONTROL DE EVENTOS (Estadísticas, Asistentes, Ausentes, Reportes PDF) */}
          {/* ========================================================================= */}
          {activeTab === 'control_eventos' && (
            <div className="space-y-6">
              {/* Event Selector and PDF Export Bar */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-black text-slate-900 text-lg sm:text-xl flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-[#0f2942]" />
                      <span>Panel de Control y Asistencia de Eventos</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Métricas en tiempo real de boletas generadas, ingresos confirmados, ausentes y reportes oficiales en PDF.
                    </p>
                  </div>

                  {/* Actions for generating PDFs */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      id="btn-reporte-pdf-evento"
                      onClick={handleDownloadSelectedEventReport}
                      className="px-4 py-2.5 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md"
                    >
                      <Download className="w-4 h-4" />
                      <span>
                        {selectedControlEventId === 'ALL'
                          ? 'PDF Consolidado (Todos)'
                          : 'Reporte PDF de este Evento'}
                      </span>
                    </button>

                    {selectedControlEventId !== 'ALL' && (
                      <button
                        id="btn-reporte-pdf-todos"
                        onClick={handleDownloadAllConsolidatedReport}
                        className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors border border-slate-200"
                        title="Generar PDF Consolidado de todos los eventos"
                      >
                        <FileText className="w-4 h-4 text-slate-600" />
                        <span>PDF Todos los Eventos</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter by Event dropdown */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
                  <label className="text-xs font-bold text-slate-700 shrink-0 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <span>Seleccionar Evento:</span>
                  </label>
                  <select
                    id="select-control-evento"
                    value={selectedControlEventId}
                    onChange={(e) => setSelectedControlEventId(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="ALL">🌟 Todos los Eventos CLED (Vista General Consolidada)</option>
                    {trimesterEvents.map((evt) => (
                      <option key={evt.id} value={evt.id}>
                        {evt.title} ({evt.date} - {evt.location})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected Event Details (if specific event chosen) */}
              {selectedEventObj && (
                <div className="bg-gradient-to-r from-slate-900 to-[#0f2942] text-white p-5 rounded-3xl border border-slate-800 shadow-md space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded-md uppercase tracking-wider">
                      Evento Activo
                    </span>
                    <span className="text-xs text-slate-300 font-mono">
                      Capacidad del Auditorio: {selectedEventObj.capacity || 200} personas
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-amber-300">{selectedEventObj.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{selectedEventObj.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-2 border-t border-white/10 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      {selectedEventObj.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      {selectedEventObj.time}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      {selectedEventObj.location}
                    </span>
                  </div>
                </div>
              )}

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* 1. Boletas Generadas */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Boletas Emitidas</span>
                    <Ticket className="w-4 h-4 text-slate-700" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                    {statTotalGenerated}
                  </div>
                  <p className="text-[10px] text-slate-500">Pases con código QR generados</p>
                </div>

                {/* 2. Asistieron (Escaneados) */}
                <div className="bg-emerald-50/70 p-5 rounded-3xl border border-emerald-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-emerald-800">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Asistieron (Escaneados)</span>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
                    {statAttended}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                    <span>{statAttendancePercentage}% de asistencia</span>
                  </div>
                </div>

                {/* 3. Ausentes (No Escaneados) */}
                <div className="bg-amber-50/70 p-5 rounded-3xl border border-amber-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-amber-800">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Ausentes / No Escaneados</span>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-800 font-mono">
                    {statAbsents}
                  </div>
                  <p className="text-[10px] text-amber-700">Boletas activas sin ingreso registrado</p>
                </div>

                {/* 4. En Auditoría / Spam */}
                <div className="bg-rose-50/70 p-5 rounded-3xl border border-rose-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-rose-800">
                    <span className="text-[11px] font-bold uppercase tracking-wider">En Auditoría (Spam)</span>
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-rose-700 font-mono">
                    {statInAudit}
                  </div>
                  <p className="text-[10px] text-rose-700">Retenidos por inconsistencias</p>
                </div>
              </div>

              {/* Data Table: Attendees / Absentees / Audited Passes */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
                  {/* Status tabs */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => setControlStatusTab('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        controlStatusTab === 'ALL'
                          ? 'bg-[#0f2942] text-amber-400'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Todos ({controlEventPasses.length})
                    </button>
                    <button
                      onClick={() => setControlStatusTab('ASISTIERON')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        controlStatusTab === 'ASISTIERON'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Asistieron ({statAttended})
                    </button>
                    <button
                      onClick={() => setControlStatusTab('AUSENTES')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        controlStatusTab === 'AUSENTES'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Ausentes / No Escaneados ({statAbsents})
                    </button>
                    <button
                      onClick={() => setControlStatusTab('AUDITORIA')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        controlStatusTab === 'AUDITORIA'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      En Auditoría ({statInAudit})
                    </button>
                  </div>

                  {/* Search input */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={controlSearch}
                      onChange={(e) => setControlSearch(e.target.value)}
                      placeholder="Buscar asistente o código..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <th className="p-3">Código</th>
                        <th className="p-3">Asistente</th>
                        <th className="p-3">Rol</th>
                        <th className="p-3">Club / Institución</th>
                        <th className="p-3">Evento</th>
                        <th className="p-3 text-center">Estado de Asistencia</th>
                        <th className="p-3 text-center">Hora de Ingreso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredControlPasses.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            No se encontraron pases con los criterios seleccionados.
                          </td>
                        </tr>
                      ) : (
                        filteredControlPasses.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 font-mono font-bold text-slate-700">
                              {p.pass_code}
                            </td>
                            <td className="p-3">
                              <p className="font-bold text-slate-900">{p.person_name}</p>
                              <p className="text-[10px] text-slate-400">{p.user_email || 'Sin correo'}</p>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-md text-[10px]">
                                {p.role || 'Estudiante'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600">{p.club}</td>
                            <td className="p-3 text-slate-800 font-medium">
                              {p.event_name || p.event_title}
                            </td>
                            <td className="p-3 text-center">
                              {p.status === 'Validado' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                                  <CheckCircle className="w-3 h-3" />
                                  Asistió (Validado)
                                </span>
                              ) : p.status === 'En Auditoría' || p.status === 'Revocado' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full font-bold text-[10px]">
                                  <ShieldAlert className="w-3 h-3" />
                                  En Auditoría / Spam
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">
                                  <Clock className="w-3 h-3" />
                                  Ausente (No Escaneado)
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center font-mono text-[11px] text-slate-500">
                              {p.validated_at
                                ? new Date(p.validated_at).toLocaleTimeString('es-DO', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: CREAR EVENTO (Formulario + Lista de Eventos + Sincronización Web)  */}
          {/* ========================================================================= */}
          {activeTab === 'crear_evento' && (
            <div className="space-y-6">
              {/* Form Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <h3 className="font-black text-slate-900 text-lg sm:text-xl flex items-center gap-2">
                      <PlusCircle className="w-5 h-5 text-amber-600" />
                      <span>{editingEventId ? 'Modificar Evento CLED' : 'Registrar Nuevo Evento CLED'}</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Los eventos registrados aquí se reflejan automáticamente para la emisión de boletas y pases con código QR.
                    </p>
                  </div>

                  {editingEventId && (
                    <button
                      onClick={() => {
                        setEditingEventId(null);
                        setEventTitle('');
                        setEventDescription('');
                        setEventDate('');
                        setEventTime('');
                        setEventLocation('');
                        setEventCapacity(200);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                    >
                      Cancelar Edición
                    </button>
                  )}
                </div>

                {eventSuccessMsg && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{eventSuccessMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSaveEvent} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Título */}
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Título del Evento: <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="input-event-title"
                        type="text"
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        placeholder="Ej: Cumbre de Liderazgo Juvenil y Oratoria 2026"
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    {/* Descripción */}
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Descripción e Información del Evento:
                      </label>
                      <textarea
                        id="input-event-desc"
                        rows={3}
                        value={eventDescription}
                        onChange={(e) => setEventDescription(e.target.value)}
                        placeholder="Detalles sobre ponencias, invitados, dinámicas, código de vestimenta o propósito del evento..."
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    {/* Fecha */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Fecha del Evento: <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="input-event-date"
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    {/* Hora */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Hora de Inicio: <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="input-event-time"
                        type="text"
                        value={eventTime}
                        onChange={(e) => setEventTime(e.target.value)}
                        placeholder="Ej: 09:00 AM o 04:30 PM"
                        required
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    {/* Lugar */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Lugar / Recinto: <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="input-event-location"
                        type="text"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        placeholder="Ej: Auditorio Central Politécnico Henríquez Ureña"
                        required
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    {/* Capacidad Estimada */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Aforo / Capacidad Estimada:
                      </label>
                      <input
                        id="input-event-capacity"
                        type="number"
                        min={10}
                        max={2000}
                        value={eventCapacity}
                        onChange={(e) => setEventCapacity(Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      id="btn-submit-event"
                      type="submit"
                      className="px-6 py-3 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-md flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4 text-amber-400" />
                      <span>{editingEventId ? 'Guardar Cambios del Evento' : 'Publicar y Crear Evento'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* List of Registered Events */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#0f2942]" />
                    <span>Eventos Registrados en el Sistema ({trimesterEvents.length})</span>
                  </h3>
                  <span className="text-xs text-slate-400">Base de datos de pases</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {trimesterEvents.map((evt) => {
                    const linkedPasses = trimesterEventPasses.filter(
                      (p) =>
                        p.event_title === evt.title ||
                        p.event_name === evt.title ||
                        p.event_name.toLowerCase().includes(evt.title.toLowerCase())
                    );

                    return (
                      <div
                        key={evt.id}
                        className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-900 text-[10px] font-bold rounded-md">
                              {evt.status}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500">
                              {linkedPasses.length} boletas vinculadas
                            </span>
                          </div>

                          <h4 className="font-extrabold text-slate-900 text-sm">{evt.title}</h4>
                          <p className="text-xs text-slate-600 line-clamp-2">{evt.description}</p>

                          <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-200">
                            <p className="flex items-center gap-1.5 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-amber-600" />
                              <span>{evt.date} • {evt.time}</span>
                            </p>
                            <p className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate">{evt.location}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-xs">
                          <button
                            onClick={() => {
                              setSelectedControlEventId(evt.id);
                              setActiveTab('control_eventos');
                            }}
                            className="font-bold text-slate-800 hover:text-amber-600 flex items-center gap-1 transition-colors"
                          >
                            <span>Ver Asistencia</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditEventClick(evt)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
                              title="Editar evento"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                deleteEvent(evt.id);
                              }}
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-100 rounded-lg transition-colors"
                              title="Eliminar evento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: AUDITORÍA (SPAM) - Mandar a auditoría / Quitar con correo exacto    */}
          {/* ========================================================================= */}
          {activeTab === 'auditoria_spam' && (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
                  <div className="space-y-1">
                    <h3 className="font-black text-slate-900 text-lg sm:text-xl flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-600" />
                      <span>Auditoría de Pases y Control de Spam</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Envía pases sospechosos a auditoría o reactiva accesos verificados. El sistema abrirá automáticamente el correo predeterminado con la notificación correspondiente.
                    </p>
                  </div>

                  <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold shrink-0">
                    {trimesterEventPasses.filter((p) => p.status === 'En Auditoría' || p.status === 'Revocado').length} pases en auditoría
                  </span>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      placeholder="Buscar por nombre, pase o email..."
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Filter by Event */}
                  <div>
                    <select
                      value={auditFilterEvent}
                      onChange={(e) => setAuditFilterEvent(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="ALL">Todos los Eventos</option>
                      {trimesterEvents.map((e) => (
                        <option key={e.id} value={e.title}>
                          {e.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filter by Status */}
                  <div>
                    <select
                      value={auditFilterStatus}
                      onChange={(e) => setAuditFilterStatus(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="ALL">Todos los Estados</option>
                      <option value="Activo">Activos / Válidos</option>
                      <option value="En Auditoría">En Auditoría / Retenidos (Spam)</option>
                      <option value="Validado">Validados en Puerta</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Passes Cards List */}
              <div className="space-y-3">
                {filteredAuditPasses.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400 space-y-2">
                    <ShieldCheck className="w-12 h-12 mx-auto text-slate-300" />
                    <p className="text-sm font-bold">No se encontraron pases con estos filtros.</p>
                  </div>
                ) : (
                  filteredAuditPasses.map((pass) => {
                    const isAudited = pass.status === 'En Auditoría' || pass.status === 'Revocado';

                    return (
                      <div
                        key={pass.id}
                        className={`p-5 rounded-3xl border transition-all ${
                          isAudited
                            ? 'bg-rose-50/50 border-rose-300 shadow-sm'
                            : 'bg-white border-slate-200 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          {/* Left pass information */}
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-black text-xs px-2.5 py-0.5 bg-[#0f2942] text-amber-400 rounded-lg">
                                {pass.pass_code}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  isAudited
                                    ? 'bg-rose-200 text-rose-900 border border-rose-300'
                                    : pass.status === 'Validado'
                                    ? 'bg-emerald-100 text-emerald-900'
                                    : 'bg-slate-100 text-slate-800'
                                }`}
                              >
                                {isAudited ? '⚠️ EN AUDITORÍA / RETENIDO' : pass.status}
                              </span>
                              <span className="text-xs text-slate-500 font-semibold">
                                {pass.role || 'Estudiante'} • {pass.club}
                              </span>
                            </div>

                            <h4 className="text-base font-extrabold text-slate-900">
                              {pass.person_name}
                            </h4>

                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                              <span className="flex items-center gap-1 font-medium text-slate-700">
                                <Ticket className="w-3.5 h-3.5 text-amber-600" />
                                {pass.event_name || pass.event_title}
                              </span>
                              <span className="flex items-center gap-1 text-slate-600">
                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                {pass.user_email || 'correo@cled.do'}
                              </span>
                              <span className="text-[11px] font-mono text-slate-400">
                                Asiento: {pass.seat_or_table || 'Mesa General'}
                              </span>
                            </div>

                            {pass.audit_reason && (
                              <p className="text-xs text-rose-700 font-semibold bg-rose-100/60 px-3 py-1 rounded-xl inline-block mt-1">
                                Motivo: {pass.audit_reason}
                              </p>
                            )}
                          </div>

                          {/* Right Action Buttons */}
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                            {isAudited ? (
                              <button
                                id={`btn-quitar-auditoria-${pass.id}`}
                                onClick={() => handleToggleAudit(pass, false)}
                                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>Quitar de Auditoría (Reactivar)</span>
                              </button>
                            ) : (
                              <button
                                id={`btn-mandar-auditoria-${pass.id}`}
                                onClick={() => handleToggleAudit(pass, true)}
                                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                              >
                                <ShieldAlert className="w-4 h-4" />
                                <span>Mandar a Auditoría (Spam)</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: ESCÁNER Y VALIDACIÓN EN PUERTA (Tiempo Real con Cámara y Manual)   */}
          {/* ========================================================================= */}
          {activeTab === 'escaner' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
              {/* Left Column: Scanner Box */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-amber-600" />
                        <span>Validación y Escáner en Puerta</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Escanea el código QR de pases de evento, credenciales docentes o certificados de estudiantes.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowQuickPassModal(true)}
                      className="px-3 py-1.5 bg-amber-500/10 text-amber-800 border border-amber-500/30 rounded-xl text-xs font-bold hover:bg-amber-500/20 transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Pase Rápido</span>
                    </button>
                  </div>

                  {/* Mode Selector Tabs */}
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setScannerMode('camera')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        scannerMode === 'camera'
                          ? 'bg-white text-[#0f2942] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-600" />
                      <span className="hidden sm:inline">Cámara del Dispositivo</span>
                      <span className="sm:hidden">Cámara</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setScannerMode('manual');
                        if (isCameraActive) stopCameraScanner();
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        scannerMode === 'manual'
                          ? 'bg-white text-[#0f2942] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Search className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="hidden sm:inline">Ingreso Manual</span>
                      <span className="sm:hidden">Manual</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setScannerMode('upload');
                        if (isCameraActive) stopCameraScanner();
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        scannerMode === 'upload'
                          ? 'bg-white text-[#0f2942] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="hidden sm:inline">Subir Imagen QR</span>
                      <span className="sm:hidden">Subir Foto</span>
                    </button>
                  </div>

                  {/* 1. CAMERA MODE VIEWPORT */}
                  {scannerMode === 'camera' && (
                    <div className="space-y-4">
                      {/* Camera Viewport Box */}
                      <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner min-h-[320px] max-h-[440px] flex flex-col items-center justify-center">
                        {/* HTML5-QRCODE Video Target Container */}
                        <div
                          id="cled-qr-camera-element"
                          className="w-full h-full min-h-[320px] max-h-[420px] overflow-hidden"
                          style={{ display: isCameraActive ? 'block' : 'none' }}
                        />

                        {/* Scanner Live Target Overlay when active */}
                        {isCameraActive && (
                          <div
                            className={`absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-4 transition-all duration-300 ${
                              scanFlash ? 'ring-4 ring-emerald-400 bg-emerald-500/20' : ''
                            }`}
                          >
                            {/* Live Badge */}
                            <div className="flex items-center gap-2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[11px] font-bold text-white border border-white/20 shadow-md">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                              <span className="w-2 h-2 rounded-full bg-emerald-500 -ml-4" />
                              <span>Escaneando en tiempo real con cámara</span>
                            </div>

                            {/* Viewfinder Reticle Frame */}
                            <div className="relative w-56 h-56 border-2 border-amber-400/60 rounded-2xl shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center justify-center">
                              {/* Corner Brackets */}
                              <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                              <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                              <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                              <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />

                              {/* Scanning Laser Beam */}
                              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_#f59e0b] animate-pulse" />
                            </div>

                            {/* Bottom Helper */}
                            <p className="text-[11px] text-white/80 bg-black/50 px-3 py-1 rounded-full font-medium backdrop-blur-xs">
                              Centra el código QR del pase dentro del marco
                            </p>
                          </div>
                        )}

                        {/* Camera Inactive / Standby Placeholder */}
                        {!isCameraActive && (
                          <div className="p-8 text-center space-y-4 max-w-md z-10">
                            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 mx-auto flex items-center justify-center text-amber-400 shadow-lg">
                              <Camera className="w-8 h-8" />
                            </div>

                            <div>
                              <h4 className="font-bold text-white text-base">
                                Escáner Óptico con Cámara
                              </h4>
                              <p className="text-xs text-slate-400 mt-1">
                                Utiliza la cámara de tu teléfono móvil, tablet o laptop para validar los códigos QR de los pases al instante en la entrada.
                              </p>
                            </div>

                            {cameraError && (
                              <div className="p-3 bg-rose-950/80 border border-rose-600/50 rounded-xl text-rose-200 text-xs text-left flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-bold">Error de Cámara</p>
                                  <p className="text-[11px] opacity-90">{cameraError}</p>
                                </div>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => startCameraScanner()}
                              disabled={isCameraStarting}
                              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs sm:text-sm transition-all shadow-lg hover:shadow-amber-500/20 flex items-center justify-center gap-2 mx-auto disabled:opacity-50 cursor-pointer"
                            >
                              {isCameraStarting ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>Iniciando Cámara...</span>
                                </>
                              ) : (
                                <>
                                  <Camera className="w-4 h-4" />
                                  <span>Activar Cámara del Dispositivo</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Camera Controls Bar (When active) */}
                      {isCameraActive && (
                        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
                          {/* Camera Stop Button */}
                          <button
                            type="button"
                            onClick={stopCameraScanner}
                            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <CameraOff className="w-3.5 h-3.5" />
                            <span>Detener Cámara</span>
                          </button>

                          <div className="flex items-center gap-2">
                            {/* Camera Switcher Dropdown */}
                            {camerasList.length > 1 && (
                              <select
                                value={selectedCameraId}
                                onChange={(e) => handleSwitchCamera(e.target.value)}
                                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                              >
                                {camerasList.map((cam, idx) => (
                                  <option key={cam.id} value={cam.id}>
                                    {cam.label || `Cámara ${idx + 1}`}
                                  </option>
                                ))}
                              </select>
                            )}

                            {/* Sound Toggle */}
                            <button
                              type="button"
                              onClick={() => setSoundFeedback(!soundFeedback)}
                              className={`p-2 rounded-xl border transition-colors ${
                                soundFeedback
                                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                                  : 'bg-slate-100 border-slate-300 text-slate-500'
                              }`}
                              title={soundFeedback ? 'Sonido activado' : 'Sonido desactivado'}
                            >
                              {soundFeedback ? (
                                <Volume2 className="w-4 h-4" />
                              ) : (
                                <VolumeX className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. MANUAL CODE INPUT MODE */}
                  {scannerMode === 'manual' && (
                    <div className="space-y-4">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleValidate(manualCode);
                        }}
                        className="flex gap-2"
                      >
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            placeholder="Ej: PASS-CLED-90412 o Clave QR..."
                            className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <button
                          type="submit"
                          className="px-5 py-3 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl text-xs sm:text-sm transition-colors shadow-md shrink-0 cursor-pointer"
                        >
                          Verificar
                        </button>
                      </form>

                      {/* Quick Test Codes Buttons */}
                      {trimesterEventPasses.length > 0 && (
                        <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Pases Emitidos para Probar Rápido:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {trimesterEventPasses.slice(0, 6).map((p) => (
                              <button
                                key={p.id}
                                onClick={() => {
                                  setManualCode(p.qr_code_key);
                                  handleValidate(p.qr_code_key);
                                }}
                                className="px-2.5 py-1 bg-white hover:bg-amber-100 text-slate-700 hover:text-amber-900 rounded-lg text-xs font-mono font-semibold border border-slate-200 transition-colors shadow-2xs"
                              >
                                {p.person_name.split(' ')[0]} ({p.pass_code || p.qr_code_key})
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. UPLOAD QR IMAGE MODE */}
                  {scannerMode === 'upload' && (
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-8 text-center bg-slate-50 transition-colors cursor-pointer relative">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUploadQR}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <UploadCloud className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                        <h4 className="font-bold text-slate-800 text-sm">
                          Seleccionar o Arrastrar Foto con Código QR
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          PNG, JPG, JPEG o capturas de pantalla de la boleta
                        </p>
                        <span className="inline-block mt-3 px-4 py-1.5 bg-[#0f2942] text-amber-400 font-bold rounded-xl text-xs">
                          Examinar Archivos
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Visual Scan Result Box */}
                  {scanResult.status !== 'idle' && (
                    <div
                      className={`p-6 rounded-2xl border-2 transition-all space-y-4 animate-in fade-in zoom-in-95 duration-200 ${
                        scanResult.status === 'success'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                          : scanResult.status === 'already_used'
                          ? 'bg-amber-50 border-amber-500 text-amber-950'
                          : 'bg-rose-50 border-rose-500 text-rose-950'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {scanResult.status === 'success' && (
                          <CheckCircle className="w-9 h-9 text-emerald-600 shrink-0 mt-0.5" />
                        )}
                        {scanResult.status === 'already_used' && (
                          <AlertTriangle className="w-9 h-9 text-amber-600 shrink-0 mt-0.5" />
                        )}
                        {scanResult.status === 'invalid' && (
                          <XCircle className="w-9 h-9 text-rose-600 shrink-0 mt-0.5" />
                        )}

                        <div className="flex-1">
                          <h4 className="font-black text-lg sm:text-xl">
                            {scanResult.status === 'success' && 'ACCESO APROBADO'}
                            {scanResult.status === 'already_used' && 'PASE YA UTILIZADO'}
                            {scanResult.status === 'invalid' && 'PASE NO VÁLIDO O AUDITADO'}
                          </h4>
                          <p className="text-xs font-semibold opacity-90 whitespace-pre-line mt-1">
                            {scanResult.message}
                          </p>
                        </div>
                      </div>

                      {scanResult.pass && (
                        <div className="bg-white/90 backdrop-blur-xs p-4 rounded-xl border border-black/10 space-y-2.5 text-xs text-slate-800 shadow-2xs">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-500">Asistente:</span>
                              <p className="font-black text-slate-900 text-sm">{scanResult.pass.person_name}</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-500">Rol / Cargo:</span>
                              <p className="font-bold text-slate-800">{scanResult.pass.role}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-500">Club / Depto:</span>
                              <p className="text-slate-800 font-semibold">{scanResult.pass.club}</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-500">Ubicación / Asiento:</span>
                              <p className="font-extrabold text-amber-800">{scanResult.pass.seat_or_table || 'Acceso General'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Live Access History Log */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <History className="w-5 h-5 text-[#0f2942]" />
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                        Accesos Validados en Puerta ({validatedPasses.length})
                      </h3>
                    </div>

                    {validatedPasses.length > 0 && (
                      <button
                        onClick={() => generateEventPassesPDF(validatedPasses)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                        title="Descargar Registro en PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                    )}
                  </div>

                  {validatedPasses.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 space-y-2">
                      <ShieldCheck className="w-12 h-12 mx-auto text-slate-300" />
                      <p className="text-xs font-medium">No hay accesos registrados en esta sesión aún.</p>
                      <p className="text-[11px] text-slate-400">
                        Activa la cámara o escanea una boleta para registrar la entrada.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                      {validatedPasses.map((p) => (
                        <div
                          key={p.id}
                          className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between text-xs transition-colors"
                        >
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-900">{p.person_name}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{p.role} • {p.club}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10px] inline-flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Ingresó
                            </span>
                            <p className="font-mono text-[10px] text-slate-400 mt-0.5">{p.validated_at || 'Hoy'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Pass Creation Modal */}
      {showQuickPassModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-lg">Emitir Pase Rápido en Puerta</h3>

            <form onSubmit={handleQuickCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="Ej: LIC. RAFAEL PEÑA"
                  required
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Evento:</label>
                <select
                  value={quickEvent}
                  onChange={(e) => setQuickEvent(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold"
                >
                  {trimesterEvents.map((evt) => (
                    <option key={evt.id} value={evt.title}>
                      {evt.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Rol / Categoría:</label>
                <select
                  value={quickRole}
                  onChange={(e) => setQuickRole(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold"
                >
                  <option value="ESTUDIANTE">Estudiante</option>
                  <option value="FACILITADOR">Facilitador (Docente)</option>
                  <option value="DIRECTIVA">Directiva / Invitado Especial</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Club / Institución:</label>
                <input
                  type="text"
                  value={quickClub}
                  onChange={(e) => setQuickClub(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickPassModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl"
                >
                  Generar y Validar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
