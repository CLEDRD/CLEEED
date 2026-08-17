import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  UserRole,
  AttendanceRecord,
  AttendanceStatus,
  Module,
  StudentModuleGrade,
  Task,
  TaskSubmission,
  Team,
  ResourceItem,
  StudentCertificate,
  FacilitatorCertificate,
  CledEvent,
  EventPass,
  AuditLog,
  RubricEvaluation,
} from '../types';
import { supabase } from '../lib/supabase';
import {
  calculateGradeLevel,
  CURRENT_TRIMESTER_DEFAULT,
  normalizeTrimester,
  cleanClubName,
  trimestersMatch,
} from '../utils/constants';
import {
  INITIAL_USERS,
  INITIAL_MODULES,
  STORAGE_KEYS,
  loadFromStorage,
  saveToStorage,
} from '../utils/storage';
import {
  generateStudentQRKey,
  generateFacilitatorQRKey,
  regenerateStudentUniqueQRKey,
  regenerateFacilitatorUniqueQRKey,
} from '../utils/qrUtils';

interface EmailModalData {
  isOpen: boolean;
  to: string;
  subject: string;
  body: string;
  title: string;
}

interface AppContextType {
  // Authentication & Session
  isAuthenticated: boolean;
  login: (identifier: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  loginAsDemoUser: (user: User) => void;

  // Current session
  currentUser: User;
  setCurrentUser: (user: User) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentTrimester: string;
  setCurrentTrimester: (trimester: string) => void;

  // Real-time Clock
  currentTime: Date;

  // Database Connection Status
  dbStatus: 'connected' | 'loading' | 'error' | 'synced';
  isLoadingData: boolean;
  syncWithSupabase: () => Promise<void>;

  // Collections (Live from Supabase)
  users: User[];
  attendance: AttendanceRecord[];
  modules: Module[];
  grades: StudentModuleGrade[];
  tasks: Task[];
  submissions: TaskSubmission[];
  teams: Team[];
  resources: ResourceItem[];
  studentCerts: StudentCertificate[];
  facilitatorCerts: FacilitatorCertificate[];
  events: CledEvent[];
  eventPasses: EventPass[];
  auditLogs: AuditLog[];

  // Email helper modal
  emailModal: EmailModalData;
  openEmailModal: (data: Omit<EmailModalData, 'isOpen'>) => void;
  closeEmailModal: () => void;

  // Actions (Persisted to Supabase)
  addUser: (user: Omit<User, 'id'>) => Promise<User>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;

  // Attendance
  recordAttendance: (data: {
    studentId: string;
    studentName: string;
    date: string;
    status: AttendanceStatus;
    notes?: string;
    club: string;
    month: string;
  }) => Promise<void>;
  batchRecordAttendance: (
    records: {
      studentId: string;
      studentName: string;
      date: string;
      status: AttendanceStatus;
      notes?: string;
      club: string;
      month: string;
    }[]
  ) => Promise<void>;

  // Modules & Rubric Grading
  addModule: (moduleNumber: string, title: string, club: string) => Promise<void>;
  gradeStudentModule: (
    studentId: string,
    moduleId: string,
    club: string,
    evaluation: RubricEvaluation
  ) => Promise<{ success: boolean; message?: string; error?: any; grade?: StudentModuleGrade }>;

  // Tasks & Submissions
  addTask: (title: string, description: string, value: number, dueDate: string, club: string) => Promise<void>;
  submitTask: (taskId: string, commentOrLink: string) => Promise<void>;
  gradeSubmission: (submissionId: string, score: number, feedback: string) => Promise<void>;

  // Teams
  createTeamManual: (teamName: string, studentIds: string[], club: string) => Promise<void>;
  createTeamsAutomatic: (teamSizeOrCount: number, mode: 'teams_count' | 'team_size', club: string) => Promise<void>;

  // Resources
  addResource: (title: string, url: string, description: string, club: string) => Promise<void>;

  // Certificates & QR Keys
  updateStudentCert: (
    studentId: string,
    certificateUrl: string,
    title?: string,
    qrCodeKey?: string
  ) => Promise<{ success: boolean; message?: string; error?: any; cert?: StudentCertificate }>;
  addStudentCert: (studentId: string, title: string, certificateUrl: string, qrCodeKey?: string) => Promise<StudentCertificate>;
  deleteStudentCert: (certId: string) => Promise<void>;
  regenerateStudentCertQR: (studentId: string, certId?: string, certTitle?: string) => Promise<string>;

  addFacilitatorCert: (
    facilitatorId: string,
    title: string,
    certificateUrl: string,
    qrCodeKey: string
  ) => Promise<FacilitatorCertificate>;
  deleteFacilitatorCert: (certId: string) => Promise<void>;
  regenerateFacilitatorCertQR: (facilitatorId: string, certId?: string, certTitle?: string) => Promise<string>;

  // Events & Passes
  addEvent: (
    title: string,
    description: string,
    date: string,
    time: string,
    location: string,
    capacity?: number
  ) => Promise<CledEvent>;
  updateEvent: (id: string, updates: Partial<CledEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  validatePassByCode: (code: string) => Promise<{ success: boolean; valid?: boolean; pass?: EventPass; message: string }>;
  togglePassAudit: (passId: string, sendToAudit: boolean, reason?: string) => Promise<void>;
  createEventPass: (
    userId: string,
    personName: string,
    role: string,
    club: string,
    eventName: string,
    eventDate: string,
    eventLocation: string,
    seatOrTable?: string
  ) => Promise<EventPass>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial fallback user for session bootstrap
const DEFAULT_FALLBACK_USER: User = {
  id: 'usr-admin-default',
  student_code: 'DIR-001',
  name: 'DIRECTIVA GENERAL CLED',
  email: 'directiva@cled.do',
  auth_email: 'directiva@cled.do',
  role: 'DIRECTIVA',
  matriculation_year: 2026,
  matriculation_trimester: CURRENT_TRIMESTER_DEFAULT,
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Database state
  const [dbStatus, setDbStatus] = useState<'connected' | 'loading' | 'error' | 'synced'>('loading');
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Collections state initialized with storage / seed official users
  const [users, setUsers] = useState<User[]>(() =>
    loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS)
  );
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() =>
    loadFromStorage<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, [])
  );
  const [modules, setModules] = useState<Module[]>(() =>
    loadFromStorage<Module[]>(STORAGE_KEYS.MODULES, INITIAL_MODULES)
  );
  const [grades, setGrades] = useState<StudentModuleGrade[]>(() =>
    loadFromStorage<StudentModuleGrade[]>(STORAGE_KEYS.GRADES, [])
  );
  const [tasks, setTasks] = useState<Task[]>(() =>
    loadFromStorage<Task[]>(STORAGE_KEYS.TASKS, [])
  );
  const [submissions, setSubmissions] = useState<TaskSubmission[]>(() =>
    loadFromStorage<TaskSubmission[]>(STORAGE_KEYS.SUBMISSIONS, [])
  );
  const [teams, setTeams] = useState<Team[]>(() =>
    loadFromStorage<Team[]>(STORAGE_KEYS.TEAMS, [])
  );
  const [resources, setResources] = useState<ResourceItem[]>(() =>
    loadFromStorage<ResourceItem[]>(STORAGE_KEYS.RESOURCES, [])
  );
  const [studentCerts, setStudentCerts] = useState<StudentCertificate[]>(() =>
    loadFromStorage<StudentCertificate[]>(STORAGE_KEYS.STUDENT_CERTS, [])
  );
  const [facilitatorCerts, setFacilitatorCerts] = useState<FacilitatorCertificate[]>(() =>
    loadFromStorage<FacilitatorCertificate[]>(STORAGE_KEYS.FACILITATOR_CERTS, [])
  );
  const [events, setEvents] = useState<CledEvent[]>(() =>
    loadFromStorage<CledEvent[]>(STORAGE_KEYS.EVENTS, [])
  );
  const [eventPasses, setEventPasses] = useState<EventPass[]>(() =>
    loadFromStorage<EventPass[]>(STORAGE_KEYS.EVENT_PASSES, [])
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() =>
    loadFromStorage<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, [])
  );

  // Authentication & Session
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    loadFromStorage<boolean>(STORAGE_KEYS.IS_AUTHENTICATED, false)
  );
  const [currentTrimester, setCurrentTrimester] = useState<string>(() =>
    loadFromStorage<string>(STORAGE_KEYS.CURRENT_TRIMESTER, CURRENT_TRIMESTER_DEFAULT)
  );
  const [currentUserId, setCurrentUserId] = useState<string>(() =>
    loadFromStorage<string>(STORAGE_KEYS.CURRENT_USER_ID, '')
  );

  // Active current user calculation
  const currentUser: User =
    users.find((u) => u.id === currentUserId) ||
    users[0] ||
    DEFAULT_FALLBACK_USER;

  const currentRole: UserRole = currentUser.role || 'DIRECTIVA';

  // Synchronize student's trimester strictly to their matriculated period
  useEffect(() => {
    if (currentUser.role === 'ESTUDIANTE' && currentUser.matriculation_trimester) {
      if (currentTrimester !== currentUser.matriculation_trimester) {
        setCurrentTrimester(currentUser.matriculation_trimester);
      }
    }
  }, [currentUser, currentTrimester]);

  // Real-time clock with seconds
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Email modal state
  const [emailModal, setEmailModal] = useState<EmailModalData>({
    isOpen: false,
    to: '',
    subject: '',
    body: '',
    title: '',
  });

  const openEmailModal = (data: Omit<EmailModalData, 'isOpen'>) => {
    setEmailModal({ ...data, isOpen: true });
  };

  const closeEmailModal = () => {
    setEmailModal((prev) => ({ ...prev, isOpen: false }));
  };

  // ==========================================
  // SUPABASE DATA FETCHING ENGINE
  // ==========================================
  const syncWithSupabase = useCallback(async () => {
    try {
      setIsLoadingData(true);
      setDbStatus('loading');

      // Fetch all tables in parallel
      const [
        usersRes,
        attendanceRes,
        modulesRes,
        gradesRes,
        tasksRes,
        submissionsRes,
        teamsRes,
        resourcesRes,
        studentCertsRes,
        facilitatorCertsRes,
        eventsRes,
        passesRes,
        logsRes,
      ] = await Promise.allSettled([
        supabase.from('users').select('*').order('created_at', { ascending: true }),
        supabase.from('attendance').select('*').order('created_at', { ascending: false }),
        supabase.from('modules').select('*').order('created_at', { ascending: true }),
        supabase.from('student_module_grades').select('*').order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('task_submissions').select('*').order('submitted_at', { ascending: false }),
        supabase.from('teams').select('*').order('created_at', { ascending: true }),
        supabase.from('resources').select('*').order('created_at', { ascending: false }),
        supabase.from('student_certs').select('*').order('updated_at', { ascending: false }),
        supabase.from('facilitator_certs').select('*').order('issued_at', { ascending: false }),
        supabase.from('events').select('*').order('date', { ascending: true }),
        supabase.from('event_passes').select('*').order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }),
      ]);

      // Set Users
      if (usersRes.status === 'fulfilled' && usersRes.value.data && usersRes.value.data.length > 0) {
        const fetchedUsers: User[] = usersRes.value.data.map((u: any) => {
          const rawTrim = u.trimester || u.matriculation_trimester || CURRENT_TRIMESTER_DEFAULT;
          const normalizedTrim = normalizeTrimester(rawTrim);
          return {
            id: u.id,
            student_code: u.student_code,
            name: u.name,
            email: u.email,
            auth_email: u.auth_email,
            role: u.role,
            club: u.club,
            grade: u.grade,
            section: u.section,
            technical_area: u.technical_area,
            phone: u.phone,
            birth_date: u.birth_date,
            matriculation_year: u.matriculation_year || u.enrollment_year || 2026,
            matriculation_trimester: normalizedTrim,
            trimester: normalizedTrim,
            facilitator_id: u.facilitator_id || u.facilitador_id,
            facilitator_name: u.facilitator_name || u.facilitador_name,
            avatar_url: u.avatar_url,
          };
        });
        setUsers(fetchedUsers);
        saveToStorage(STORAGE_KEYS.USERS, fetchedUsers);

        // Determine active user
        const targetUserId = currentUserId || fetchedUsers[0].id;
        if (!currentUserId && fetchedUsers.length > 0) {
          setCurrentUserId(fetchedUsers[0].id);
          saveToStorage(STORAGE_KEYS.CURRENT_USER_ID, fetchedUsers[0].id);
        }

        const savedTrimester = loadFromStorage<string | null>(STORAGE_KEYS.CURRENT_TRIMESTER, null);
        const activeUser = fetchedUsers.find((u) => u.id === targetUserId);
        if (activeUser) {
          if (activeUser.role === 'ESTUDIANTE' && (activeUser.trimester || activeUser.matriculation_trimester)) {
            const norm = normalizeTrimester(activeUser.trimester || activeUser.matriculation_trimester);
            setCurrentTrimester(norm);
            saveToStorage(STORAGE_KEYS.CURRENT_TRIMESTER, norm);
          } else if (!savedTrimester) {
            if (activeUser.role === 'FACILITADOR') {
              // Find student assigned to this facilitator or club to know their initial active trimester
              const student = fetchedUsers.find(
                (st) =>
                  st.role === 'ESTUDIANTE' &&
                  (st.facilitator_id === activeUser.id ||
                    cleanClubName(st.club) === cleanClubName(activeUser.club)) &&
                  (st.trimester || st.matriculation_trimester)
              );
              const foundTrim =
                student?.trimester ||
                student?.matriculation_trimester ||
                activeUser.trimester ||
                activeUser.matriculation_trimester;
              if (foundTrim) {
                const norm = normalizeTrimester(foundTrim);
                setCurrentTrimester(norm);
                saveToStorage(STORAGE_KEYS.CURRENT_TRIMESTER, norm);
              }
            }
          }
        }
      } else {
        // Keep seed users if Supabase returned empty table
        setUsers((prev) => (prev.length > 0 ? prev : INITIAL_USERS));
      }

      // Set Attendance
      if (attendanceRes.status === 'fulfilled' && attendanceRes.value.data) {
        setAttendance(
          attendanceRes.value.data.map((a: any) => ({
            id: a.id,
            student_id: a.student_id,
            student_name: a.student_name,
            date: a.date,
            status: a.status,
            notes: a.notes,
            club: a.club,
            month: a.month,
            trimester: a.trimester || CURRENT_TRIMESTER_DEFAULT,
            created_at: a.created_at,
          }))
        );
      }

      // Set Modules
      if (modulesRes.status === 'fulfilled' && modulesRes.value.data) {
        setModules(
          modulesRes.value.data.map((m: any) => ({
            id: m.id,
            module_number: m.module_number,
            title: m.title,
            max_value: Number(m.max_value) || 100,
            club: m.club,
            trimester: m.trimester || CURRENT_TRIMESTER_DEFAULT,
            created_at: m.created_at,
          }))
        );
      }

      // Set Grades
      if (gradesRes.status === 'fulfilled' && gradesRes.value.data) {
        const fetchedGrades: StudentModuleGrade[] = gradesRes.value.data.map((g: any) => ({
          id: g.id,
          student_id: g.student_id,
          module_id: g.module_id,
          club: g.club,
          trimester: g.trimester || CURRENT_TRIMESTER_DEFAULT,
          dominio_conceptual: Number(g.dominio_conceptual) || 0,
          aplicacion_practica: Number(g.aplicacion_practica) || 0,
          participacion: Number(g.participacion) || 0,
          trabajo_colaborativo: Number(g.trabajo_colaborativo) || 0,
          comunicacion: Number(g.comunicacion) || 0,
          responsabilidad: Number(g.responsabilidad) || 0,
          iniciativa: Number(g.iniciativa) || 0,
          producto_proyecto_final: Number(g.producto_proyecto_final) || 0,
          total_score: Number(g.total_score) || 0,
          level: g.level || 'No alcanzado',
          badge_color: g.badge_color || 'red',
          created_at: g.created_at,
          updated_at: g.updated_at,
        }));
        setGrades(fetchedGrades);
        saveToStorage(STORAGE_KEYS.GRADES, fetchedGrades);
      }

      // Set Tasks
      if (tasksRes.status === 'fulfilled' && tasksRes.value.data) {
        setTasks(
          tasksRes.value.data.map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            value: Number(t.value) || 100,
            due_date: t.due_date,
            club: t.club,
            trimester: t.trimester || CURRENT_TRIMESTER_DEFAULT,
            created_at: t.created_at,
          }))
        );
      }

      // Set Submissions
      if (submissionsRes.status === 'fulfilled' && submissionsRes.value.data) {
        setSubmissions(
          submissionsRes.value.data.map((s: any) => ({
            id: s.id,
            task_id: s.task_id,
            student_id: s.student_id,
            student_name: s.student_name,
            comment_or_link: s.comment_or_link,
            submitted_at: s.submitted_at,
            score: s.score !== null ? Number(s.score) : undefined,
            feedback: s.feedback,
            status: s.status,
            created_at: s.created_at,
          }))
        );
      }

      // Set Teams
      if (teamsRes.status === 'fulfilled' && teamsRes.value.data) {
        setTeams(
          teamsRes.value.data.map((tm: any) => ({
            id: tm.id,
            team_name: tm.team_name,
            student_ids: tm.student_ids || [],
            club: tm.club,
            trimester: tm.trimester || CURRENT_TRIMESTER_DEFAULT,
            created_at: tm.created_at,
          }))
        );
      }

      // Set Resources
      if (resourcesRes.status === 'fulfilled' && resourcesRes.value.data) {
        setResources(
          resourcesRes.value.data.map((r: any) => ({
            id: r.id,
            title: r.title,
            url: r.url,
            description: r.description,
            club: r.club,
            trimester: r.trimester || CURRENT_TRIMESTER_DEFAULT,
            created_at: r.created_at,
          }))
        );
      }

      // Set Student Certs
      if (studentCertsRes.status === 'fulfilled' && studentCertsRes.value.data) {
        const fetchedCerts: StudentCertificate[] = studentCertsRes.value.data.map((sc: any) => ({
          id: sc.id,
          student_id: sc.student_id,
          certificate_url: sc.certificate_url,
          title: sc.title || 'Certificado Oficial de Módulos',
          qr_code_key: sc.qr_code_key,
          trimester: sc.trimester || CURRENT_TRIMESTER_DEFAULT,
          updated_at: sc.updated_at,
          issued_at: sc.created_at || sc.updated_at,
        }));
        setStudentCerts(fetchedCerts);
        saveToStorage(STORAGE_KEYS.STUDENT_CERTS, fetchedCerts);
      }

      // Set Facilitator Certs
      if (facilitatorCertsRes.status === 'fulfilled' && facilitatorCertsRes.value.data) {
        setFacilitatorCerts(
          facilitatorCertsRes.value.data.map((fc: any) => ({
            id: fc.id,
            facilitator_id: fc.facilitator_id,
            title: fc.title,
            certificate_url: fc.certificate_url,
            qr_code_key: fc.qr_code_key,
            issued_at: fc.issued_at,
            trimester: fc.trimester || CURRENT_TRIMESTER_DEFAULT,
          }))
        );
      }

      // Set Events
      if (eventsRes.status === 'fulfilled' && eventsRes.value.data) {
        setEvents(
          eventsRes.value.data.map((ev: any) => ({
            id: ev.id,
            title: ev.title,
            description: ev.description,
            date: ev.date,
            time: ev.time,
            location: ev.location,
            capacity: Number(ev.capacity) || 200,
            status: ev.status,
            trimester: ev.trimester || CURRENT_TRIMESTER_DEFAULT,
            created_at: ev.created_at,
          }))
        );
      }

      // Set Passes
      if (passesRes.status === 'fulfilled' && passesRes.value.data) {
        setEventPasses(
          passesRes.value.data.map((p: any) => ({
            id: p.id,
            pass_code: p.pass_code,
            qr_code_key: p.qr_code_key || p.pass_code,
            user_id: p.user_id,
            user_name: p.user_name,
            person_name: p.user_name,
            role: p.role || 'ESTUDIANTE',
            club: p.club || 'CLED',
            user_email: p.user_email,
            event_name: p.event_name,
            event_title: p.event_name,
            event_date: p.event_date,
            event_location: p.event_location,
            location: p.event_location,
            seat_or_table: p.seat_or_table || 'Mesa General',
            status: p.status || 'Activo',
            validated: p.validated || false,
            validated_at: p.validated_at,
            audit_reason: p.audit_reason,
            trimester: p.trimester || CURRENT_TRIMESTER_DEFAULT,
            generated_date: p.generated_date || p.created_at,
            created_at: p.created_at,
          }))
        );
      }

      // Set Audit Logs
      if (logsRes.status === 'fulfilled' && logsRes.value.data) {
        setAuditLogs(
          logsRes.value.data.map((l: any) => ({
            id: l.id,
            user_name: l.user_name,
            action: l.action,
            details: l.details,
            trimester: l.trimester || CURRENT_TRIMESTER_DEFAULT,
            pass_code: l.pass_code,
            timestamp: l.timestamp,
          }))
        );
      }

      setDbStatus('connected');
    } catch (err) {
      console.warn('Error fetching data from Supabase:', err);
      setDbStatus('error');
    } finally {
      setIsLoadingData(false);
    }
  }, [currentUserId]);

  // Initial load
  useEffect(() => {
    syncWithSupabase();
  }, [syncWithSupabase]);

  const handleSetCurrentTrimester = (trimester: string) => {
    // Only non-students can switch global trimester
    if (currentUser.role !== 'ESTUDIANTE') {
      setCurrentTrimester(trimester);
      saveToStorage(STORAGE_KEYS.CURRENT_TRIMESTER, trimester);
    }
  };

  const syncTrimesterForUser = (user: User, userList = users) => {
    if (!user) return;
    if (user.role === 'FACILITADOR') {
      const student = userList.find(
        (st) =>
          st.role === 'ESTUDIANTE' &&
          (st.facilitator_id === user.id || cleanClubName(st.club) === cleanClubName(user.club)) &&
          (st.trimester || st.matriculation_trimester)
      );
      const targetTrim =
        student?.trimester ||
        student?.matriculation_trimester ||
        user.trimester ||
        user.matriculation_trimester;
      if (targetTrim) {
        const norm = normalizeTrimester(targetTrim);
        setCurrentTrimester(norm);
        saveToStorage(STORAGE_KEYS.CURRENT_TRIMESTER, norm);
      }
    } else if (user.role === 'ESTUDIANTE' && (user.trimester || user.matriculation_trimester)) {
      const norm = normalizeTrimester(user.trimester || user.matriculation_trimester);
      setCurrentTrimester(norm);
      saveToStorage(STORAGE_KEYS.CURRENT_TRIMESTER, norm);
    }
  };

  const setCurrentUser = (user: User) => {
    setCurrentUserId(user.id);
    saveToStorage(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    syncTrimesterForUser(user);
  };

  const setCurrentRole = (role: UserRole) => {
    const matched = users.find((u) => u.role === role);
    if (matched) {
      setCurrentUserId(matched.id);
      saveToStorage(STORAGE_KEYS.CURRENT_USER_ID, matched.id);
      syncTrimesterForUser(matched);
    }
  };

  // Login implementation with mandatory password
  const login = async (
    identifier: string,
    password?: string
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password?.trim() || '';

    if (!cleanId) {
      return {
        success: false,
        message: 'Por favor ingresa tu correo institucional o código CLED.',
      };
    }

    if (!cleanPass) {
      return {
        success: false,
        message: 'La contraseña es obligatoria para acceder al sistema.',
      };
    }

    if (cleanPass.length < 4) {
      return {
        success: false,
        message: 'La contraseña debe contener al menos 4 caracteres.',
      };
    }

    // 1. Try Supabase Authentication if email provided
    if (cleanId.includes('@')) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanId,
          password: cleanPass,
        });
        if (data?.user && !error) {
          const matching = users.find(
            (u) =>
              (u.auth_email && u.auth_email.toLowerCase() === cleanId) ||
              (u.email && u.email.toLowerCase() === cleanId) ||
              u.id === data.user.id
          );
          if (matching) {
            setCurrentUserId(matching.id);
            setIsAuthenticated(true);
            saveToStorage(STORAGE_KEYS.IS_AUTHENTICATED, true);
            saveToStorage(STORAGE_KEYS.CURRENT_USER_ID, matching.id);
            syncTrimesterForUser(matching);
            return { success: true };
          }
        }
      } catch (e) {
        console.warn('Supabase auth attempt notice:', e);
      }
    }

    // 2. Look up in users table by auth_email (format usuario@club.cled.do), email, student_code or ID
    const matchedUser = users.find(
      (u) =>
        (u.auth_email && u.auth_email.toLowerCase() === cleanId) ||
        (u.email && u.email.toLowerCase() === cleanId) ||
        (u.student_code && u.student_code.toLowerCase() === cleanId) ||
        u.id.toLowerCase() === cleanId
    );

    if (matchedUser) {
      setCurrentUserId(matchedUser.id);
      setIsAuthenticated(true);
      saveToStorage(STORAGE_KEYS.IS_AUTHENTICATED, true);
      saveToStorage(STORAGE_KEYS.CURRENT_USER_ID, matchedUser.id);
      syncTrimesterForUser(matchedUser);
      return { success: true };
    }

    return {
      success: false,
      message: `Credenciales inválidas. Verifica tu correo institucional (@club.cled.do) o código CLED y tu contraseña.`,
    };
  };

  const loginAsDemoUser = (user: User) => {
    setCurrentUserId(user.id);
    setIsAuthenticated(true);
    saveToStorage(STORAGE_KEYS.IS_AUTHENTICATED, true);
    saveToStorage(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    syncTrimesterForUser(user);
  };

  const logout = async () => {
    setIsAuthenticated(false);
    saveToStorage(STORAGE_KEYS.IS_AUTHENTICATED, false);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // Ignore in-sandbox signOut error
    }
  };

  // ==========================================
  // ASYNC DATABASE WRITE ACTIONS
  // ==========================================

  // User Actions
  const addUser = async (userData: Omit<User, 'id'>): Promise<User> => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const prefix = userData.role === 'ESTUDIANTE' ? 'CLED' : userData.role === 'FACILITADOR' ? 'FAC' : 'DIR';
    const newId = `usr-${Date.now()}-${randomNum}`;
    const newUser: User = {
      ...userData,
      id: newId,
      student_code: userData.student_code || `${prefix}-${randomNum}`,
      matriculation_year: userData.matriculation_year || 2026,
      matriculation_trimester: userData.matriculation_trimester || currentTrimester,
    };

    setUsers((prev) => [...prev, newUser]);

    // Persist to Supabase
    try {
      await supabase.from('users').insert([
        {
          id: newUser.id,
          student_code: newUser.student_code,
          name: newUser.name,
          email: newUser.email,
          auth_email: newUser.auth_email || newUser.email,
          role: newUser.role,
          club: newUser.club,
          grade: newUser.grade,
          section: newUser.section,
          technical_area: newUser.technical_area,
          phone: newUser.phone,
          birth_date: newUser.birth_date,
          matriculation_year: newUser.matriculation_year,
          facilitator_id: newUser.facilitator_id,
        },
      ]);
    } catch (e) {
      console.warn('Supabase users insert error:', e);
    }

    return newUser;
  };

  const updateUser = async (id: string, data: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data } : u)));
    try {
      await supabase.from('users').update(data).eq('id', id);
    } catch (e) {
      console.warn('Supabase users update error:', e);
    }
  };

  const deleteUser = async (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    try {
      await supabase.from('users').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase users delete error:', e);
    }
  };

  // Attendance Actions
  const recordAttendance = async (data: {
    studentId: string;
    studentName: string;
    date: string;
    status: AttendanceStatus;
    notes?: string;
    club: string;
    month: string;
  }) => {
    const existingIndex = attendance.findIndex(
      (r) =>
        r.student_id === data.studentId &&
        r.date === data.date &&
        r.club === data.club &&
        r.trimester === currentTrimester
    );

    const recordId =
      existingIndex >= 0
        ? attendance[existingIndex].id
        : `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const newRecord: AttendanceRecord = {
      id: recordId,
      student_id: data.studentId,
      student_name: data.studentName,
      date: data.date,
      status: data.status,
      notes: data.notes || '',
      club: data.club,
      month: data.month,
      trimester: currentTrimester,
      created_at: new Date().toISOString(),
    };

    setAttendance((prev) => {
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = newRecord;
        return copy;
      }
      return [...prev, newRecord];
    });

    try {
      await supabase.from('attendance').upsert([
        {
          id: newRecord.id,
          student_id: newRecord.student_id,
          date: newRecord.date,
          status: newRecord.status,
          notes: newRecord.notes,
          club: newRecord.club,
          month: newRecord.month,
          trimester: newRecord.trimester,
        },
      ]);
    } catch (e) {
      console.warn('Supabase attendance upsert error:', e);
    }
  };

  const batchRecordAttendance = async (
    records: {
      studentId: string;
      studentName: string;
      date: string;
      status: AttendanceStatus;
      notes?: string;
      club: string;
      month: string;
    }[]
  ) => {
    for (const rec of records) {
      await recordAttendance(rec);
    }
  };

  // Module Actions
  const addModule = async (moduleNumber: string, title: string, club: string) => {
    const newMod: Module = {
      id: `mod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      module_number: moduleNumber,
      title: title.trim(),
      max_value: 100,
      club,
      trimester: currentTrimester,
      created_at: new Date().toISOString(),
    };

    setModules((prev) => {
      const updated = [...prev, newMod];
      saveToStorage(STORAGE_KEYS.MODULES, updated);
      return updated;
    });

    try {
      await supabase.from('modules').insert([
        {
          id: newMod.id,
          module_number: newMod.module_number,
          title: newMod.title,
          max_value: newMod.max_value,
          club: newMod.club,
          trimester: newMod.trimester,
        },
      ]);
    } catch (e) {
      console.warn('Supabase modules insert error:', e);
    }
  };

  // Rubric Grading Action
  const gradeStudentModule = async (
    studentId: string,
    moduleId: string,
    club: string,
    evaluation: RubricEvaluation
  ): Promise<{ success: boolean; message?: string; error?: any; grade?: StudentModuleGrade }> => {
    const total_score =
      Number(evaluation.dominio_conceptual || 0) +
      Number(evaluation.aplicacion_practica || 0) +
      Number(evaluation.participacion || 0) +
      Number(evaluation.trabajo_colaborativo || 0) +
      Number(evaluation.comunicacion || 0) +
      Number(evaluation.responsabilidad || 0) +
      Number(evaluation.iniciativa || 0) +
      Number(evaluation.producto_proyecto_final || 0);

    const calculated = calculateGradeLevel(total_score);

    const existingIndex = grades.findIndex(
      (g) => g.student_id === studentId && g.module_id === moduleId
    );

    const gradeId =
      existingIndex >= 0 && grades[existingIndex].id
        ? grades[existingIndex].id
        : `grd-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const gradeRecord: StudentModuleGrade = {
      id: gradeId,
      student_id: studentId,
      module_id: moduleId,
      club,
      trimester: currentTrimester,
      dominio_conceptual: Number(evaluation.dominio_conceptual) || 0,
      aplicacion_practica: Number(evaluation.aplicacion_practica) || 0,
      participacion: Number(evaluation.participacion) || 0,
      trabajo_colaborativo: Number(evaluation.trabajo_colaborativo) || 0,
      comunicacion: Number(evaluation.comunicacion) || 0,
      responsabilidad: Number(evaluation.responsabilidad) || 0,
      iniciativa: Number(evaluation.iniciativa) || 0,
      producto_proyecto_final: Number(evaluation.producto_proyecto_final) || 0,
      total_score,
      level: calculated.level,
      badge_color: calculated.badge_color,
      created_at: existingIndex >= 0 ? grades[existingIndex].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let updatedGrades: StudentModuleGrade[];
    if (existingIndex >= 0) {
      updatedGrades = [...grades];
      updatedGrades[existingIndex] = gradeRecord;
    } else {
      updatedGrades = [...grades, gradeRecord];
    }

    setGrades(updatedGrades);
    saveToStorage(STORAGE_KEYS.GRADES, updatedGrades);

    // Payload exactly matching table: student_module_grades
    const dbPayload = {
      id: gradeRecord.id,
      student_id: gradeRecord.student_id,
      module_id: gradeRecord.module_id,
      club: gradeRecord.club,
      trimester: gradeRecord.trimester,
      dominio_conceptual: Number(gradeRecord.dominio_conceptual) || 0,
      aplicacion_practica: Number(gradeRecord.aplicacion_practica) || 0,
      participacion: Number(gradeRecord.participacion) || 0,
      trabajo_colaborativo: Number(gradeRecord.trabajo_colaborativo) || 0,
      comunicacion: Number(gradeRecord.comunicacion) || 0,
      responsabilidad: Number(gradeRecord.responsabilidad) || 0,
      iniciativa: Number(gradeRecord.iniciativa) || 0,
      producto_proyecto_final: Number(gradeRecord.producto_proyecto_final) || 0,
      total_score: Number(gradeRecord.total_score) || 0,
      level: gradeRecord.level,
      badge_color: gradeRecord.badge_color,
      created_at: gradeRecord.created_at || new Date().toISOString(),
    };

    let dbMessage = 'Calificación registrada en la base de datos Supabase.';
    let isSuccess = true;

    try {
      // 1. Try Upsert by primary key id or unique constraint
      const { data, error } = await supabase
        .from('student_module_grades')
        .upsert([dbPayload]);

      if (error) {
        console.warn('Upsert notice on student_module_grades, running fallback update/insert:', error);

        // 2. Fallback update if record exists
        const { data: updateData, error: updateErr } = await supabase
          .from('student_module_grades')
          .update(dbPayload)
          .eq('student_id', gradeRecord.student_id)
          .eq('module_id', gradeRecord.module_id)
          .select();

        if (updateErr || !updateData || updateData.length === 0) {
          // 3. Fallback insert
          const { error: insertErr } = await supabase
            .from('student_module_grades')
            .insert([dbPayload]);

          if (insertErr) {
            console.error('Supabase student_module_grades insert error:', insertErr);
            dbMessage = `Guardado localmente. Aviso Supabase: ${insertErr.message}`;
          } else {
            dbMessage = 'Calificación insertada exitosamente en student_module_grades.';
          }
        } else {
          dbMessage = 'Calificación actualizada exitosamente en student_module_grades.';
        }
      } else {
        dbMessage = 'Calificación confirmada y guardada en student_module_grades.';
      }
    } catch (e: any) {
      console.warn('Supabase student_module_grades exception:', e);
      dbMessage = `Guardado localmente. (${e?.message || 'Error de conexión'})`;
    }

    return {
      success: isSuccess,
      message: dbMessage,
      grade: gradeRecord,
    };
  };

  // Tasks Actions
  const addTask = async (
    title: string,
    description: string,
    value: number,
    dueDate: string,
    club: string
  ) => {
    const newTask: Task = {
      id: `tsk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: title.trim(),
      description: description.trim(),
      value: Number(value) || 100,
      due_date: dueDate,
      club,
      trimester: currentTrimester,
      created_at: new Date().toISOString(),
    };

    setTasks((prev) => [...prev, newTask]);

    try {
      await supabase.from('tasks').insert([
        {
          id: newTask.id,
          title: newTask.title,
          description: newTask.description,
          value: newTask.value,
          due_date: newTask.due_date,
          club: newTask.club,
          trimester: newTask.trimester,
        },
      ]);
    } catch (e) {
      console.warn('Supabase tasks insert error:', e);
    }
  };

  const submitTask = async (taskId: string, commentOrLink: string) => {
    const existingIndex = submissions.findIndex(
      (s) => s.task_id === taskId && s.student_id === currentUser.id
    );

    const submission: TaskSubmission = {
      id:
        existingIndex >= 0
          ? submissions[existingIndex].id
          : `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      task_id: taskId,
      student_id: currentUser.id,
      student_name: currentUser.name,
      comment_or_link: commentOrLink,
      submitted_at: new Date().toISOString(),
      status: existingIndex >= 0 && submissions[existingIndex].status === 'Calificado' ? 'Calificado' : 'Entregado',
      score: existingIndex >= 0 ? submissions[existingIndex].score : undefined,
      feedback: existingIndex >= 0 ? submissions[existingIndex].feedback : undefined,
      created_at: existingIndex >= 0 ? submissions[existingIndex].created_at : new Date().toISOString(),
    };

    setSubmissions((prev) => {
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = submission;
        return copy;
      }
      return [...prev, submission];
    });

    try {
      await supabase.from('task_submissions').upsert([
        {
          id: submission.id,
          task_id: submission.task_id,
          student_id: submission.student_id,
          student_name: submission.student_name,
          comment_or_link: submission.comment_or_link,
          status: submission.status,
          score: submission.score,
          feedback: submission.feedback,
        },
      ]);
    } catch (e) {
      console.warn('Supabase task_submissions upsert error:', e);
    }
  };

  const gradeSubmission = async (submissionId: string, score: number, feedback: string) => {
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === submissionId
          ? {
              ...s,
              score: Number(score),
              feedback: feedback.trim(),
              status: 'Calificado',
            }
          : s
      )
    );

    try {
      await supabase
        .from('task_submissions')
        .update({
          score: Number(score),
          feedback: feedback.trim(),
          status: 'Calificado',
        })
        .eq('id', submissionId);
    } catch (e) {
      console.warn('Supabase task_submissions grade update error:', e);
    }
  };

  // Teams Actions
  const createTeamManual = async (teamName: string, studentIds: string[], club: string) => {
    const newTeam: Team = {
      id: `team-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      team_name: teamName.trim(),
      student_ids: studentIds,
      club,
      trimester: currentTrimester,
      created_at: new Date().toISOString(),
      is_random: false,
    };

    setTeams((prev) => [...prev, newTeam]);

    try {
      await supabase.from('teams').insert([
        {
          id: newTeam.id,
          team_name: newTeam.team_name,
          student_ids: newTeam.student_ids,
          club: newTeam.club,
          trimester: newTeam.trimester,
        },
      ]);
    } catch (e) {
      console.warn('Supabase teams insert error:', e);
    }
  };

  const createTeamsAutomatic = async (
    teamSizeOrCount: number,
    mode: 'teams_count' | 'team_size',
    club: string
  ) => {
    const clubStudents = users.filter((u) => u.role === 'ESTUDIANTE' && u.club === club);
    if (clubStudents.length === 0) return;

    const shuffled = [...clubStudents].sort(() => Math.random() - 0.5);

    let numTeams = 2;
    if (mode === 'teams_count') {
      numTeams = Math.max(1, Math.min(teamSizeOrCount, shuffled.length));
    } else {
      const size = Math.max(1, teamSizeOrCount);
      numTeams = Math.max(1, Math.ceil(shuffled.length / size));
    }

    const createdTeams: Team[] = [];
    const buckets: string[][] = Array.from({ length: numTeams }, () => []);

    shuffled.forEach((student, index) => {
      const bucketIndex = index % numTeams;
      buckets[bucketIndex].push(student.id);
    });

    buckets.forEach((studentIds, idx) => {
      if (studentIds.length > 0) {
        createdTeams.push({
          id: `team-auto-${Date.now()}-${idx + 1}`,
          team_name: `Equipo ${idx + 1}`,
          student_ids: studentIds,
          club,
          trimester: currentTrimester,
          created_at: new Date().toISOString(),
          is_random: true,
        });
      }
    });

    setTeams((prev) => [
      ...prev.filter((t) => !(t.club === club && t.trimester === currentTrimester)),
      ...createdTeams,
    ]);

    try {
      for (const tm of createdTeams) {
        await supabase.from('teams').insert([
          {
            id: tm.id,
            team_name: tm.team_name,
            student_ids: tm.student_ids,
            club: tm.club,
            trimester: tm.trimester,
          },
        ]);
      }
    } catch (e) {
      console.warn('Supabase automatic teams insert error:', e);
    }
  };

  // Resources Actions
  const addResource = async (title: string, url: string, description: string, club: string) => {
    const newRes: ResourceItem = {
      id: `res-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: title.trim(),
      url: url.trim(),
      description: description.trim(),
      club,
      trimester: currentTrimester,
      created_at: new Date().toISOString(),
    };

    setResources((prev) => [...prev, newRes]);

    try {
      await supabase.from('resources').insert([
        {
          id: newRes.id,
          title: newRes.title,
          url: newRes.url,
          description: newRes.description,
          club: newRes.club,
          trimester: newRes.trimester,
        },
      ]);
    } catch (e) {
      console.warn('Supabase resources insert error:', e);
    }
  };

  // Certificates Actions
  const addStudentCert = async (
    studentId: string,
    title: string,
    certificateUrl: string,
    qrCodeKey?: string
  ): Promise<StudentCertificate> => {
    const student = users.find((u) => u.id === studentId);
    const finalQrKey =
      qrCodeKey || (student ? regenerateStudentUniqueQRKey(student, title) : `STD_${studentId}_${Date.now()}`);

    const newCert: StudentCertificate = {
      id: `stcert-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      student_id: studentId,
      student_name: student?.name,
      certificate_url: certificateUrl.trim(),
      title: title.trim() || 'Certificado Oficial de Módulos',
      qr_code_key: finalQrKey,
      trimester: currentTrimester,
      updated_at: new Date().toISOString(),
      issued_at: new Date().toISOString(),
    };

    setStudentCerts((prev) => {
      const updated = [...prev, newCert];
      saveToStorage(STORAGE_KEYS.STUDENT_CERTS, updated);
      return updated;
    });

    try {
      await supabase.from('student_certs').insert([
        {
          id: newCert.id,
          student_id: newCert.student_id,
          certificate_url: newCert.certificate_url,
          updated_at: newCert.updated_at,
        },
      ]);
    } catch (e) {
      console.warn('Supabase student_certs insert error:', e);
    }

    return newCert;
  };

  const updateStudentCert = async (
    studentId: string,
    certificateUrl: string,
    title?: string,
    qrCodeKey?: string
  ): Promise<{ success: boolean; message?: string; error?: any; cert?: StudentCertificate }> => {
    const existingIndex = studentCerts.findIndex(
      (c) => c.student_id === studentId
    );
    const student = users.find((u) => u.id === studentId);
    const defaultKey = student ? generateStudentQRKey(student, title) : `STD_${studentId}`;

    const certId =
      existingIndex >= 0 && studentCerts[existingIndex].id
        ? studentCerts[existingIndex].id
        : `stcert-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const cert: StudentCertificate = {
      id: certId,
      student_id: studentId,
      student_name: student?.name,
      certificate_url: certificateUrl.trim(),
      title: title || (existingIndex >= 0 ? studentCerts[existingIndex].title : 'Certificado Oficial de Módulos'),
      qr_code_key:
        qrCodeKey ||
        (existingIndex >= 0 && studentCerts[existingIndex].qr_code_key
          ? studentCerts[existingIndex].qr_code_key
          : defaultKey),
      trimester: currentTrimester,
      updated_at: new Date().toISOString(),
      issued_at:
        existingIndex >= 0 && studentCerts[existingIndex].issued_at
          ? studentCerts[existingIndex].issued_at
          : new Date().toISOString(),
    };

    let updatedList: StudentCertificate[];
    if (existingIndex >= 0) {
      updatedList = [...studentCerts];
      updatedList[existingIndex] = cert;
    } else {
      updatedList = [...studentCerts, cert];
    }

    setStudentCerts(updatedList);
    saveToStorage(STORAGE_KEYS.STUDENT_CERTS, updatedList);

    // Payload exactly matching table: student_certs (id, student_id, certificate_url, updated_at)
    const dbPayload = {
      id: cert.id,
      student_id: cert.student_id,
      certificate_url: cert.certificate_url,
      updated_at: cert.updated_at,
    };

    let isSuccess = true;
    let dbMessage = 'Enlace de certificado guardado correctamente.';

    try {
      // 1. Try upsert
      const { error: upsertErr } = await supabase
        .from('student_certs')
        .upsert([dbPayload]);

      if (upsertErr) {
        console.warn('Upsert notice on student_certs, trying update by student_id:', upsertErr);

        // 2. Try update by student_id
        const { data: updateData, error: updateErr } = await supabase
          .from('student_certs')
          .update({
            certificate_url: cert.certificate_url,
            updated_at: cert.updated_at,
          })
          .eq('student_id', cert.student_id)
          .select();

        if (updateErr || !updateData || updateData.length === 0) {
          // 3. Try insert
          const { error: insertErr } = await supabase
            .from('student_certs')
            .insert([dbPayload]);

          if (insertErr) {
            console.error('Supabase student_certs insert error:', insertErr);
            isSuccess = false;
            dbMessage = `Aviso: Guardado localmente. (${insertErr.message})`;
          }
        }
      }
    } catch (e: any) {
      console.warn('Supabase student_certs exception:', e);
    }

    return {
      success: isSuccess,
      message: dbMessage,
      cert,
    };
  };

  const regenerateStudentCertQR = async (
    studentId: string,
    certId?: string,
    certTitle?: string
  ): Promise<string> => {
    const student = users.find((u) => u.id === studentId);
    if (!student) return `STD_${Date.now()}`;
    const newKey = regenerateStudentUniqueQRKey(student, certTitle);

    setStudentCerts((prev) => {
      if (certId) {
        return prev.map((c) =>
          c.id === certId ? { ...c, qr_code_key: newKey, updated_at: new Date().toISOString() } : c
        );
      }
      const idx = prev.findIndex(
        (c) => c.student_id === studentId && c.trimester === currentTrimester
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qr_code_key: newKey, updated_at: new Date().toISOString() };
        return copy;
      }
      const newCert: StudentCertificate = {
        id: `stcert-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        student_id: studentId,
        student_name: student.name,
        certificate_url: '',
        title: certTitle || 'Certificado Oficial de Módulos',
        qr_code_key: newKey,
        trimester: currentTrimester,
        updated_at: new Date().toISOString(),
        issued_at: new Date().toISOString(),
      };
      return [...prev, newCert];
    });

    try {
      if (certId) {
        await supabase
          .from('student_certs')
          .update({ qr_code_key: newKey, updated_at: new Date().toISOString() })
          .eq('id', certId);
      }
    } catch (e) {
      console.warn('Supabase student cert update error:', e);
    }

    return newKey;
  };

  const deleteStudentCert = async (certId: string) => {
    setStudentCerts((prev) => prev.filter((c) => c.id !== certId));
    try {
      await supabase.from('student_certs').delete().eq('id', certId);
    } catch (e) {
      console.warn('Supabase student_certs delete error:', e);
    }
  };

  const addFacilitatorCert = async (
    facilitatorId: string,
    title: string,
    certificateUrl: string,
    qrCodeKey: string
  ): Promise<FacilitatorCertificate> => {
    const fac = users.find((u) => u.id === facilitatorId);
    const newCert: FacilitatorCertificate = {
      id: `fcert-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      facilitator_id: facilitatorId,
      facilitator_name: fac?.name,
      title: title.trim(),
      certificate_url: certificateUrl.trim(),
      qr_code_key: qrCodeKey,
      issued_at: new Date().toISOString(),
      trimester: currentTrimester,
    };

    setFacilitatorCerts((prev) => [...prev, newCert]);

    try {
      await supabase.from('facilitator_certs').insert([
        {
          id: newCert.id,
          facilitator_id: newCert.facilitator_id,
          title: newCert.title,
          certificate_url: newCert.certificate_url,
          qr_code_key: newCert.qr_code_key,
          trimester: newCert.trimester,
        },
      ]);
    } catch (e) {
      console.warn('Supabase facilitator_certs insert error:', e);
    }

    return newCert;
  };

  const regenerateFacilitatorCertQR = async (
    facilitatorId: string,
    certId?: string,
    certTitle?: string
  ): Promise<string> => {
    const fac = users.find((u) => u.id === facilitatorId);
    if (!fac) return `FAC_${Date.now()}`;
    const newKey = regenerateFacilitatorUniqueQRKey(fac, certTitle);

    setFacilitatorCerts((prev) => {
      if (certId) {
        return prev.map((c) => (c.id === certId ? { ...c, qr_code_key: newKey } : c));
      }
      const idx = prev.findIndex(
        (c) => c.facilitator_id === facilitatorId && c.trimester === currentTrimester
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qr_code_key: newKey };
        return copy;
      }
      const newCert: FacilitatorCertificate = {
        id: `fcert-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        facilitator_id: facilitatorId,
        facilitator_name: fac.name,
        title: certTitle || 'Certificación de Facilitador Líder',
        certificate_url: '',
        qr_code_key: newKey,
        issued_at: new Date().toISOString(),
        trimester: currentTrimester,
      };
      return [...prev, newCert];
    });

    try {
      if (certId) {
        await supabase
          .from('facilitator_certs')
          .update({ qr_code_key: newKey })
          .eq('id', certId);
      }
    } catch (e) {
      console.warn('Supabase facilitator certs update error:', e);
    }

    return newKey;
  };

  const deleteFacilitatorCert = async (certId: string) => {
    setFacilitatorCerts((prev) => prev.filter((c) => c.id !== certId));
    try {
      await supabase.from('facilitator_certs').delete().eq('id', certId);
    } catch (e) {
      console.warn('Supabase facilitator_certs delete error:', e);
    }
  };

  // Event Management Actions
  const addEvent = async (
    title: string,
    description: string,
    date: string,
    time: string,
    location: string,
    capacity?: number
  ): Promise<CledEvent> => {
    const newEvent: CledEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: title.trim(),
      description: description.trim(),
      date,
      time: time || '09:00 AM',
      location: location.trim(),
      capacity: capacity || 200,
      status: 'Activo',
      trimester: currentTrimester,
      created_at: new Date().toISOString(),
    };

    setEvents((prev) => {
      const updated = [newEvent, ...prev];
      saveToStorage(STORAGE_KEYS.EVENTS, updated);
      return updated;
    });

    try {
      const { data, error } = await supabase.from('events').insert([
        {
          id: newEvent.id,
          title: newEvent.title,
          description: newEvent.description,
          date: newEvent.date,
          time: newEvent.time,
          location: newEvent.location,
          capacity: newEvent.capacity,
          status: newEvent.status,
          trimester: newEvent.trimester,
        },
      ]);
      if (error) {
        console.error('Supabase events insert error:', error);
      }
    } catch (e) {
      console.warn('Supabase events insert exception:', e);
    }

    return newEvent;
  };

  const updateEvent = async (id: string, updates: Partial<CledEvent>) => {
    setEvents((prev) => {
      const updated = prev.map((evt) => (evt.id === id ? { ...evt, ...updates } : evt));
      saveToStorage(STORAGE_KEYS.EVENTS, updated);
      return updated;
    });

    try {
      const { error } = await supabase.from('events').update(updates).eq('id', id);
      if (error) {
        console.error('Supabase events update error:', error);
      }
    } catch (e) {
      console.warn('Supabase events update error:', e);
    }
  };

  const deleteEvent = async (id: string) => {
    setEvents((prev) => {
      const updated = prev.filter((evt) => evt.id !== id);
      saveToStorage(STORAGE_KEYS.EVENTS, updated);
      return updated;
    });
    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) {
        console.error('Supabase events delete error:', error);
      }
    } catch (e) {
      console.warn('Supabase events delete error:', e);
    }
  };

  // Event Pass Actions
  const createEventPass = async (
    userId: string,
    personName: string,
    role: string,
    club: string,
    eventName: string,
    eventDate: string,
    eventLocation: string,
    seatOrTable?: string
  ): Promise<EventPass> => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const passCode = `EVT-${randomNum}`;
    const qrKey = `PASS-CLED-${randomNum}`;
    const newPass: EventPass = {
      id: `pass-${Date.now()}-${randomNum}`,
      pass_code: passCode,
      qr_code_key: qrKey,
      user_id: userId,
      user_name: personName,
      person_name: personName,
      role,
      club,
      user_email: `${personName.toLowerCase().replace(/[^a-z]/g, '')}@cled.do`,
      event_name: eventName,
      event_title: eventName,
      event_date: eventDate,
      event_location: eventLocation,
      location: eventLocation,
      seat_or_table: seatOrTable || 'Mesa General',
      status: 'Activo',
      validated: false,
      trimester: currentTrimester,
      generated_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    setEventPasses((prev) => {
      const updated = [newPass, ...prev];
      saveToStorage(STORAGE_KEYS.EVENT_PASSES, updated);
      return updated;
    });

    try {
      const { error } = await supabase.from('event_passes').insert([
        {
          id: newPass.id,
          pass_code: newPass.pass_code,
          qr_code_key: newPass.qr_code_key,
          user_id: newPass.user_id,
          user_name: newPass.user_name,
          user_email: newPass.user_email,
          event_name: newPass.event_name,
          event_date: newPass.event_date,
          event_location: newPass.event_location,
          status: newPass.status,
          validated: newPass.validated,
          trimester: newPass.trimester,
        },
      ]);
      if (error) {
        console.error('Supabase event_passes insert error:', error);
      }
    } catch (e) {
      console.warn('Supabase event_passes insert error:', e);
    }

    return newPass;
  };

  const validatePassByCode = async (
    code: string
  ): Promise<{ success: boolean; valid?: boolean; pass?: EventPass; message: string }> => {
    const cleanCode = code.trim().toUpperCase();
    const pass = eventPasses.find(
      (p) =>
        p.pass_code.toUpperCase() === cleanCode ||
        p.id.toUpperCase() === cleanCode ||
        p.qr_code_key.toUpperCase() === cleanCode
    );

    if (!pass) {
      return { success: false, valid: false, message: `El pase "${code}" no existe en la base de datos central.` };
    }

    if (pass.status === 'En Auditoría' || pass.status === 'Revocado') {
      return {
        success: false,
        valid: false,
        pass,
        message: `⚠️ Pase REVOCADO / EN AUDITORÍA por el equipo de control. No se permite el ingreso.`,
      };
    }

    if (pass.status === 'Validado') {
      return {
        success: false,
        valid: false,
        pass,
        message: `⚠️ Este pase ya fue utilizado y validado previamente el ${new Date(
          pass.validated_at || pass.created_at
        ).toLocaleString('es-DO')}.`,
      };
    }

    // Mark as Validated
    const updatedPass: EventPass = {
      ...pass,
      status: 'Validado',
      validated: true,
      validated_at: new Date().toISOString(),
    };

    setEventPasses((prev) => prev.map((p) => (p.id === pass.id ? updatedPass : p)));

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      user_name: currentUser.name,
      action: 'Validación de Pase Exitosa',
      details: `Pase ${pass.pass_code} para ${pass.user_name} marcado como ingresado en ${pass.event_name}.`,
      timestamp: new Date().toISOString(),
      trimester: currentTrimester,
      pass_code: pass.pass_code,
    };

    setAuditLogs((prev) => [newLog, ...prev]);

    try {
      await supabase
        .from('event_passes')
        .update({
          status: 'Validado',
          validated: true,
          validated_at: new Date().toISOString(),
        })
        .eq('id', pass.id);

      await supabase.from('audit_logs').insert([
        {
          id: newLog.id,
          user_name: newLog.user_name,
          action: newLog.action,
          details: newLog.details,
          trimester: newLog.trimester,
          pass_code: newLog.pass_code,
          timestamp: newLog.timestamp,
        },
      ]);
    } catch (e) {
      console.warn('Supabase pass validation update error:', e);
    }

    return {
      success: true,
      valid: true,
      pass: updatedPass,
      message: `✅ ¡Pase VÁLIDO! Entrada autorizada para ${pass.user_name} (${pass.event_name}).`,
    };
  };

  const togglePassAudit = async (passId: string, sendToAudit: boolean, reason?: string) => {
    const pass = eventPasses.find((p) => p.id === passId);
    if (!pass) return;

    const newStatus = sendToAudit ? 'En Auditoría' : 'Activo';

    setEventPasses((prev) =>
      prev.map((p) =>
        p.id === passId
          ? {
              ...p,
              status: newStatus,
              audit_reason: sendToAudit ? reason || 'Inconsistencia detectada en pase' : undefined,
            }
          : p
      )
    );

    const currentDateFormatted = new Date().toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const eventDisplayName = pass.event_name || pass.event_title || 'Evento Institucional CLED';

    if (sendToAudit) {
      const subject = `Acción Requerida: Inconsistencia detectada en tu pase para ${eventDisplayName}`;
      const body = `Estimado/a ${pass.person_name || pass.user_name},

El Equipo de Auditoría y Control de Eventos del Club de Liderazgo Estudiantil y Desarrollo (CLED) te saluda cordialmente.

Nos ponemos en contacto contigo para notificarte que nuestro sistema ha detectado inconsistencias en el pase de evento registrado a tu nombre para:

📌 Evento: ${eventDisplayName}
🎟️ Código de Pase: ${pass.pass_code}
📅 Fecha del Reporte: ${currentDateFormatted}

Por motivos de seguridad y control de aforo, el pase se encuentra actualmente en estado de AUDITORÍA / RETENIDO y no podrá ser utilizado para el ingreso hasta que sea verificado.

¿Qué debes hacer?
1. Responde a este correo adjuntando una captura de pantalla de tu confirmación de registro original o tu documento de identidad escolar/personal.
2. Si consideras que esto es un error, acércate al módulo de atención de la directiva CLED antes del inicio del evento.

Agradecemos tu comprensión y colaboración para garantizar la transparencia y seguridad de nuestras actividades.

Atentamente,
Equipo de Auditoría y Control de Eventos
Club de Liderazgo Estudiantil y Desarrollo (CLED)
Instituto Politécnico Henríquez Ureña`;

      openEmailModal({
        to: pass.user_email || 'usuario@cled.do',
        subject,
        body,
        title: 'Auditoría de Pase (Notificación Enviada)',
      });

      const newLog: AuditLog = {
        id: `log-${Date.now()}`,
        user_name: currentUser.name,
        action: 'Pase Enviado a Auditoría (Spam/Retenido)',
        details: `Pase ${pass.pass_code} de ${pass.user_name} colocado en Auditoría. Correo enviado a ${pass.user_email}. Motivo: ${reason || 'Inconsistencia detectada'}.`,
        timestamp: new Date().toISOString(),
        trimester: currentTrimester,
        pass_code: pass.pass_code,
      };

      setAuditLogs((prev) => [newLog, ...prev]);

      try {
        await supabase
          .from('event_passes')
          .update({
            status: 'En Auditoría',
            audit_reason: reason || 'Inconsistencia detectada',
          })
          .eq('id', passId);

        await supabase.from('audit_logs').insert([
          {
            id: newLog.id,
            user_name: newLog.user_name,
            action: newLog.action,
            details: newLog.details,
            trimester: newLog.trimester,
            pass_code: newLog.pass_code,
            timestamp: newLog.timestamp,
          },
        ]);
      } catch (e) {
        console.warn('Supabase pass audit update error:', e);
      }
    } else {
      const subject = `¡Buenas noticias! Tu pase para ${eventDisplayName} ha sido reactivado`;
      const body = `Estimado/a ${pass.person_name || pass.user_name},

Nos complace informarte que, tras la revisión realizada por el Equipo de Auditoría y Control de Eventos del Club de Liderazgo Estudiantil y Desarrollo (CLED), las inconsistencias previamente reportadas en tu pase han sido subsanadas satisfactoriamente.

Detalles de tu Pase:
📌 Evento: ${eventDisplayName}
🎟️ Código de Pase: ${pass.pass_code}
✅ Estado Actual: ACTIVO / VÁLIDO

Tu pase se encuentra plenamente habilitado para el ingreso al evento. Recuerda presentarlo en formato digital (código QR) o impreso el día de la actividad junto con tu identificación.

¡Te esperamos!

Atentamente,
Equipo de Auditoría y Control de Eventos
Club de Liderazgo Estudiantil y Desarrollo (CLED)
Instituto Politécnico Henríquez Ureña`;

      openEmailModal({
        to: pass.user_email || 'usuario@cled.do',
        subject,
        body,
        title: 'Reactivación de Pase (Notificación Enviada)',
      });

      const newLog: AuditLog = {
        id: `log-${Date.now()}`,
        user_name: currentUser.name,
        action: 'Pase Reactivado (Auditado OK)',
        details: `Pase ${pass.pass_code} de ${pass.user_name} quitado de auditoría. Estado restaurado a Activo.`,
        timestamp: new Date().toISOString(),
        trimester: currentTrimester,
        pass_code: pass.pass_code,
      };

      setAuditLogs((prev) => [newLog, ...prev]);

      try {
        await supabase
          .from('event_passes')
          .update({
            status: 'Activo',
            audit_reason: null,
          })
          .eq('id', passId);

        await supabase.from('audit_logs').insert([
          {
            id: newLog.id,
            user_name: newLog.user_name,
            action: newLog.action,
            details: newLog.details,
            trimester: newLog.trimester,
            pass_code: newLog.pass_code,
            timestamp: newLog.timestamp,
          },
        ]);
      } catch (e) {
        console.warn('Supabase pass reactivation error:', e);
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        currentRole,
        setCurrentRole,
        currentTrimester,
        setCurrentTrimester: handleSetCurrentTrimester,
        isAuthenticated,
        login,
        logout,
        loginAsDemoUser,
        currentTime,
        dbStatus,
        isLoadingData,
        syncWithSupabase,
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
        events,
        eventPasses,
        auditLogs,
        emailModal,
        openEmailModal,
        closeEmailModal,
        addUser,
        updateUser,
        deleteUser,
        recordAttendance,
        batchRecordAttendance,
        addModule,
        gradeStudentModule,
        addTask,
        submitTask,
        gradeSubmission,
        createTeamManual,
        createTeamsAutomatic,
        addResource,
        updateStudentCert,
        addStudentCert,
        deleteStudentCert,
        regenerateStudentCertQR,
        addFacilitatorCert,
        deleteFacilitatorCert,
        regenerateFacilitatorCertQR,
        addEvent,
        updateEvent,
        deleteEvent,
        validatePassByCode,
        togglePassAudit,
        createEventPass,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
