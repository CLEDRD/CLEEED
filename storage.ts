import {
  User,
  AttendanceRecord,
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
} from '../types';

const STORAGE_KEYS = {
  USERS: 'cled_users_v4',
  ATTENDANCE: 'cled_attendance_v4',
  MODULES: 'cled_modules_v4',
  GRADES: 'cled_grades_v4',
  TASKS: 'cled_tasks_v4',
  SUBMISSIONS: 'cled_submissions_v4',
  TEAMS: 'cled_teams_v4',
  RESOURCES: 'cled_resources_v4',
  STUDENT_CERTS: 'cled_student_certs_v4',
  FACILITATOR_CERTS: 'cled_fac_certs_v4',
  EVENTS: 'cled_events_v4',
  EVENT_PASSES: 'cled_passes_v4',
  AUDIT_LOGS: 'cled_audit_logs_v4',
  CURRENT_USER_ID: 'cled_current_user_id_v5',
  CURRENT_TRIMESTER: 'cled_current_trimester_v4',
  IS_AUTHENTICATED: 'cled_is_authenticated_v5',
};

// Seed dataset matching the institutional methodology and official update script
export const INITIAL_USERS: User[] = [
  {
    id: 'usr-st-01',
    student_code: 'CLED-2673',
    name: 'AURA MARTINEZ',
    email: 'shadai@gmail.com',
    auth_email: 'aura@lectura.cled.do',
    role: 'ESTUDIANTE',
    club: 'Club de comunicación social y periodismo',
    grade: '3ro',
    section: 'F',
    technical_area: 'N/A',
    phone: '809-200-3000',
    birth_date: '2009-08-19',
    facilitator_id: 'fac-ccsp-01',
    matriculation_year: 2026,
    matriculation_trimester: 'SEP – DIC 2026',
  },
  {
    id: 'usr-st-02',
    student_code: 'CLED-4821',
    name: 'SHADAI MARIA REYES ROSADO',
    email: 'ytodo@icloud.com',
    auth_email: 'shada@debate.cled.do',
    role: 'ESTUDIANTE',
    club: 'Club de comunicación social y periodismo',
    grade: '4to',
    section: 'B',
    technical_area: 'Desarrollo Y administración de aplicaciones informáticas',
    phone: '849-467-7830',
    birth_date: '2009-05-12',
    facilitator_id: 'fac-ccsp-01',
    matriculation_year: 2026,
    matriculation_trimester: 'SEP – DIC 2026',
  },
  {
    id: 'usr-st-03',
    student_code: 'CLED-5192',
    name: 'FERNANDO AGUSTIN',
    email: 'idk@outlook.com',
    auth_email: 'fernando@ccsp.cled.do',
    role: 'ESTUDIANTE',
    club: 'Club de comunicación social y periodismo',
    grade: '5to',
    section: 'A',
    technical_area: 'Gestión administrativa y tributaria',
    phone: '829-614-6298',
    birth_date: '2008-08-11',
    facilitator_id: 'fac-ccsp-01',
    matriculation_year: 2026,
    matriculation_trimester: 'SEP – DIC 2026',
  },
  {
    id: 'usr-st-04',
    student_code: 'CLED-6304',
    name: 'FAVIOLA PERALTA',
    email: 'favi298@hotmail.com',
    auth_email: 'faviola@cb.cled.do',
    role: 'ESTUDIANTE',
    club: 'Club de comunicación social y periodismo',
    grade: '6to',
    section: 'A',
    technical_area: 'Logística y transporte',
    phone: '809-372-3719',
    birth_date: '2009-10-02',
    facilitator_id: 'fac-ccsp-01',
    matriculation_year: 2026,
    matriculation_trimester: 'SEP – DIC 2026',
  },
  {
    id: 'fac-ccsp-01',
    student_code: 'FAC-101',
    name: 'PROF. CARLOS MANUEL MENDEZ',
    email: 'cmendez@politecnico.edu.do',
    auth_email: 'carlos.mendez@ccsp.cled.do',
    role: 'FACILITADOR',
    club: 'Club de comunicación social y periodismo',
    phone: '809-555-0144',
    matriculation_year: 2026,
    matriculation_trimester: 'SEP – DIC 2026',
  },
  {
    id: 'fac-debate-01',
    student_code: 'FAC-102',
    name: 'PROF. RAMON ALCANTARA',
    email: 'ralcantara@politecnico.edu.do',
    auth_email: 'ramon.alcantara@debate.cled.do',
    role: 'FACILITADOR',
    club: 'Club de debate',
    phone: '809-555-0188',
    matriculation_year: 2026,
    matriculation_trimester: 'SEP – DIC 2026',
  },
  {
    id: 'dir-general-01',
    student_code: 'DIR-001',
    name: 'LIC. ROBELIN MEJÍA / DIRECTIVA CLED',
    email: 'robelinmejia19@gmail.com',
    auth_email: 'directiva@general.cled.do',
    role: 'DIRECTIVA',
    club: 'Directiva General',
    phone: '829-450-0000',
    matriculation_year: 2026,
    matriculation_trimester: 'SEP – DIC 2026',
  },
  {
    id: 'evt-coord-01',
    student_code: 'EVT-001',
    name: 'COORD. MARIBEL SANTOS',
    email: 'eventos@cled.do',
    auth_email: 'eventos@logistica.cled.do',
    role: 'PERSONAL_EVENTOS',
    club: 'Comisión de Eventos',
    phone: '809-555-0199',
    matriculation_year: 2026,
    matriculation_trimester: 'SEP – DIC 2026',
  },
];

export const INITIAL_ATTENDANCES: AttendanceRecord[] = [];
export const INITIAL_MODULES: Module[] = [
  // Club de comunicación social y periodismo (SEP - DIC 2026)
  {
    id: 'mod-ccsp-01',
    module_number: 'Módulo 1',
    title: 'Introducción al Periodismo Digital y Ética Informativa',
    max_value: 100,
    club: 'Club de comunicación social y periodismo',
    trimester: 'SEP – DIC 2026',
    created_at: new Date('2026-09-01T08:00:00Z').toISOString(),
  },
  {
    id: 'mod-ccsp-02',
    module_number: 'Módulo 2',
    title: 'Técnicas de Expresión Oral, Locución y Entrevista',
    max_value: 100,
    club: 'Club de comunicación social y periodismo',
    trimester: 'SEP – DIC 2026',
    created_at: new Date('2026-09-15T08:00:00Z').toISOString(),
  },
  {
    id: 'mod-ccsp-03',
    module_number: 'Módulo 3',
    title: 'Redacción de Crónicas, Reportajes y Notas de Prensa',
    max_value: 100,
    club: 'Club de comunicación social y periodismo',
    trimester: 'SEP – DIC 2026',
    created_at: new Date('2026-10-01T08:00:00Z').toISOString(),
  },
  {
    id: 'mod-ccsp-04',
    module_number: 'Módulo 4',
    title: 'Producción Audiovisual y Manejo de Redes CLED',
    max_value: 100,
    club: 'Club de comunicación social y periodismo',
    trimester: 'SEP – DIC 2026',
    created_at: new Date('2026-10-15T08:00:00Z').toISOString(),
  },
  {
    id: 'mod-ccsp-05',
    module_number: 'Módulo 5',
    title: 'Proyecto Periodístico Final e Investigación Institucional',
    max_value: 100,
    club: 'Club de comunicación social y periodismo',
    trimester: 'SEP – DIC 2026',
    created_at: new Date('2026-11-01T08:00:00Z').toISOString(),
  },
  // Club de debate (SEP - DIC 2026)
  {
    id: 'mod-deb-01',
    module_number: 'Módulo 1',
    title: 'Fundamentos de la Lógica, Retórica y Oratoria',
    max_value: 100,
    club: 'Club de debate',
    trimester: 'SEP – DIC 2026',
    created_at: new Date('2026-09-01T08:00:00Z').toISOString(),
  },
  {
    id: 'mod-deb-02',
    module_number: 'Módulo 2',
    title: 'Construcción y Refutación de Argumentos (Modelo Karl Popper)',
    max_value: 100,
    club: 'Club de debate',
    trimester: 'SEP – DIC 2026',
    created_at: new Date('2026-09-15T08:00:00Z').toISOString(),
  },
  {
    id: 'mod-deb-03',
    module_number: 'Módulo 3',
    title: 'Técnicas de Debate Parlamentario y Análisis de Moción',
    max_value: 100,
    club: 'Club de debate',
    trimester: 'SEP – DIC 2026',
    created_at: new Date('2026-10-01T08:00:00Z').toISOString(),
  },
  {
    id: 'mod-deb-04',
    module_number: 'Módulo 4',
    title: 'Estrategias de Persuasión y Lenguaje Corporal',
    max_value: 100,
    club: 'Club de debate',
    trimester: 'SEP – DIC 2026',
    created_at: new Date('2026-10-15T08:00:00Z').toISOString(),
  },
  {
    id: 'mod-deb-05',
    module_number: 'Módulo 5',
    title: 'Torneo Final de Debate y Defensa de Proyectos',
    max_value: 100,
    club: 'Club de debate',
    trimester: 'SEP – DIC 2026',
    created_at: new Date('2026-11-01T08:00:00Z').toISOString(),
  },
];
export const INITIAL_GRADES: StudentModuleGrade[] = [];
export const INITIAL_TASKS: Task[] = [];
export const INITIAL_SUBMISSIONS: TaskSubmission[] = [];
export const INITIAL_TEAMS: Team[] = [];
export const INITIAL_RESOURCES: ResourceItem[] = [];
export const INITIAL_STUDENT_CERTS: StudentCertificate[] = [];
export const INITIAL_FACILITATOR_CERTS: FacilitatorCertificate[] = [];
export const INITIAL_EVENTS: CledEvent[] = [];
export const INITIAL_EVENT_PASSES: EventPass[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

// Memory fallback store for sandboxed iframes
const memoryStore = new Map<string, string>();

// Storage Helper
export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const item = window.localStorage.getItem(key);
      if (item) return JSON.parse(item);
    }
  } catch {
    // Fallback to memory
  }
  const memItem = memoryStore.get(key);
  if (memItem) {
    try {
      return JSON.parse(memItem);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function saveToStorage<T>(key: string, value: T): void {
  const jsonStr = JSON.stringify(value);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, jsonStr);
      return;
    }
  } catch {
    // Fallback to memory
  }
  memoryStore.set(key, jsonStr);
}

export { STORAGE_KEYS };
