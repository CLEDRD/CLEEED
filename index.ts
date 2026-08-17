export type UserRole = 'ESTUDIANTE' | 'FACILITADOR' | 'DIRECTIVA' | 'PERSONAL_EVENTOS';

export type AttendanceStatus = 'Presente' | 'Ausente' | 'Justificado' | 'Tardanza';

export type GradeScaleLevel = 'Excelente' | 'Satisfactorio' | 'En proceso' | 'No alcanzado';

export interface User {
  id: string;
  student_code?: string; // e.g., CLED-2673
  name: string;
  email: string;
  auth_email?: string; // e.g., nombredeusuario@nombredelclub.cled.do
  role: UserRole;
  club?: string;
  grade?: string; // 3ro, 4to, 5to, 6to
  section?: string; // A-E for 3ro, A-B for 4to-6to
  technical_area?: string; // N/A for 3ro, or specialized technical track
  phone?: string;
  birth_date?: string; // YYYY-MM-DD
  facilitator_id?: string; // Linked facilitator id
  facilitator_name?: string; // Facilitator display name
  matriculation_year?: number; // e.g., 2026
  matriculation_trimester?: string; // e.g., 'SEP – DIC 2026'
  trimester?: string; // e.g., 'SEP – DIC 2026'
  avatar_url?: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  student_name?: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  notes?: string;
  club: string;
  month: string; // Enero, Febrero, etc.
  trimester: string; // e.g. "SEP – DIC 2026"
  created_at: string;
}

export interface RubricEvaluation {
  dominio_conceptual: number; // Max 15
  aplicacion_practica: number; // Max 20
  participacion: number; // Max 10
  trabajo_colaborativo: number; // Max 10
  comunicacion: number; // Max 10
  responsabilidad: number; // Max 15
  iniciativa: number; // Max 10
  producto_proyecto_final: number; // Max 10
}

export interface Module {
  id: string;
  module_number: string; // e.g. "Módulo I", "Módulo II"
  title: string;
  max_value: number; // Always 100
  club: string;
  trimester: string;
  created_at: string;
}

export interface StudentModuleGrade {
  id: string;
  student_id: string;
  module_id: string;
  club: string;
  trimester: string;
  dominio_conceptual: number;
  aplicacion_practica: number;
  participacion: number;
  trabajo_colaborativo: number;
  comunicacion: number;
  responsabilidad: number;
  iniciativa: number;
  producto_proyecto_final: number;
  total_score: number; // 0-100
  level: GradeScaleLevel;
  badge_color: string; // green, blue, yellow, red
  created_at: string;
  updated_at?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  value: number; // Points value
  due_date: string; // YYYY-MM-DD
  club: string;
  trimester: string;
  created_at: string;
}

export interface TaskSubmission {
  id: string;
  task_id: string;
  student_id: string;
  student_name: string;
  comment_or_link: string;
  submitted_at: string;
  score?: number;
  feedback?: string;
  status: 'Entregado' | 'Calificado' | 'Pendiente';
  created_at: string;
}

export interface Team {
  id: string;
  team_name: string;
  student_ids: string[];
  club: string;
  trimester: string;
  created_at: string;
  is_random?: boolean;
}

export interface ResourceItem {
  id: string;
  title: string;
  url: string;
  description?: string;
  club: string;
  trimester: string;
  created_at: string;
}

export interface StudentCertificate {
  id: string;
  student_id: string;
  student_name?: string;
  certificate_url: string;
  title?: string;
  qr_code_key?: string;
  updated_at: string;
  issued_at?: string;
  trimester: string;
}

export interface FacilitatorCertificate {
  id: string;
  facilitator_id: string;
  facilitator_name?: string;
  title: string;
  certificate_url: string;
  qr_code_key: string;
  issued_at: string;
  trimester: string;
}

export interface CledEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "09:00 AM" or "14:30"
  location: string;
  capacity?: number;
  status: 'Activo' | 'Finalizado' | 'Cancelado';
  trimester?: string;
  created_at: string;
}

export type PassStatus = 'Activo' | 'En Auditoría' | 'Validado' | 'Revocado';

export interface EventPass {
  id: string;
  pass_code: string; // e.g., EVT-84920
  qr_code_key: string; // PASS-CLED-...
  user_id?: string;
  user_name: string;
  person_name: string;
  role?: string;
  club: string;
  user_email: string;
  user_phone?: string;
  event_name: string;
  event_title: string;
  event_date: string;
  event_location: string;
  location?: string;
  seat_or_table?: string;
  status: PassStatus;
  validated: boolean;
  trimester?: string;
  generated_date: string;
  created_at: string;
  validated_at?: string;
  audit_reason?: string;
}

export interface AuditLog {
  id: string;
  user_name: string;
  action: string;
  details: string;
  timestamp: string;
  trimester?: string;
  pass_code?: string;
}
