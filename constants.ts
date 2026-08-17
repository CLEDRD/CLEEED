import { RubricEvaluation, GradeScaleLevel } from '../types';

export const CLUBS = [
  'Club de debate',
  'Club de lectura',
  'Club de comunicación social y periodismo',
  'Club de baile',
  'Club de orientación y vocación universitaria',
  'Club de arte',
] as const;

export const GRADES = ['3ro', '4to', '5to', '6to'] as const;

export const SECTIONS_3RO = ['A', 'B', 'C', 'D', 'E'] as const;
export const SECTIONS_UPPER = ['A', 'B'] as const;

export const TECHNICAL_AREAS = [
  'Desarrollo Y administración de aplicaciones informáticas',
  'Logística y transporte',
  'Gestión administrativa y tributaria',
  'Refrigeración',
  'Electrónica',
  'Electricidad',
] as const;

// Generate trimesters sequence: SEP – DIC 2026, FEB – MAY 2027, SEP – DIC 2027, FEB – MAY 2028 ... up to 2040
export function generateTrimesters(): string[] {
  const list: string[] = [];
  for (let year = 2026; year <= 2040; year++) {
    if (year === 2026) {
      list.push(`SEP – DIC ${year}`);
    } else {
      list.push(`FEB – MAY ${year}`);
      list.push(`SEP – DIC ${year}`);
    }
  }
  return list;
}

export const TRIMESTERS = generateTrimesters();
export const CURRENT_TRIMESTER_DEFAULT = 'SEP – DIC 2026';

export function normalizeTrimester(raw?: string): string {
  if (!raw) return CURRENT_TRIMESTER_DEFAULT;
  const clean = raw
    .trim()
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .toUpperCase();
  const match = TRIMESTERS.find((t) => {
    const normT = t
      .replace(/[\u2013\u2014\u2212]/g, '-')
      .replace(/\s+/g, ' ')
      .toUpperCase();
    return normT === clean;
  });
  if (match) return match;
  return raw.replace(/-/g, '–').trim();
}

export function trimestersMatch(t1?: string, t2?: string): boolean {
  if (!t1 && !t2) return true;
  if (!t1 || !t2) return false;
  const norm1 = t1.trim().replace(/[\u2013\u2014\u2212-]/g, '-').replace(/\s+/g, ' ').toUpperCase();
  const norm2 = t2.trim().replace(/[\u2013\u2014\u2212-]/g, '-').replace(/\s+/g, ' ').toUpperCase();
  return norm1 === norm2;
}

export function cleanClubName(club?: string): string {
  if (!club) return '';
  return club
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export const MONTHS_SPANISH = [
  'Todos',
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export interface RubricCriterionConfig {
  key: keyof RubricEvaluation;
  name: string;
  description: string;
  maxPoints: number;
}

export const RUBRIC_CRITERIA: RubricCriterionConfig[] = [
  {
    key: 'dominio_conceptual',
    name: 'Dominio conceptual',
    description: 'Comprende los contenidos del módulo',
    maxPoints: 15,
  },
  {
    key: 'aplicacion_practica',
    name: 'Aplicación práctica',
    description: 'Es capaz de llevar lo aprendido a situaciones reales',
    maxPoints: 20,
  },
  {
    key: 'participacion',
    name: 'Participación',
    description: 'Se involucra activamente en las actividades',
    maxPoints: 10,
  },
  {
    key: 'trabajo_colaborativo',
    name: 'Trabajo colaborativo',
    description: 'Coopera, respeta y aporta al equipo',
    maxPoints: 10,
  },
  {
    key: 'comunicacion',
    name: 'Comunicación',
    description: 'Expresa ideas de manera clara y adecuada',
    maxPoints: 10,
  },
  {
    key: 'responsabilidad',
    name: 'Responsabilidad',
    description: 'Cumple tareas, horarios y compromisos',
    maxPoints: 15,
  },
  {
    key: 'iniciativa',
    name: 'Iniciativa',
    description: 'Propone soluciones e ideas sin depender constantemente del instructor',
    maxPoints: 10,
  },
  {
    key: 'producto_proyecto_final',
    name: 'Producto/Proyecto final',
    description: 'Demuestra mediante una actividad final lo aprendido',
    maxPoints: 10,
  },
];

export function calculateGradeLevel(score: number): {
  level: GradeScaleLevel;
  badge_color: string;
  emoji: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  if (score >= 90) {
    return {
      level: 'Excelente',
      badge_color: 'emerald',
      emoji: '🟢',
      bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      textClass: 'text-emerald-700 dark:text-emerald-300',
      borderClass: 'border-emerald-500/30',
    };
  }
  if (score >= 80) {
    return {
      level: 'Satisfactorio',
      badge_color: 'blue',
      emoji: '🔵',
      bgClass: 'bg-blue-500/10 dark:bg-blue-500/20',
      textClass: 'text-blue-700 dark:text-blue-300',
      borderClass: 'border-blue-500/30',
    };
  }
  if (score >= 70) {
    return {
      level: 'En proceso',
      badge_color: 'amber',
      emoji: '🟡',
      bgClass: 'bg-amber-500/10 dark:bg-amber-500/20',
      textClass: 'text-amber-700 dark:text-amber-300',
      borderClass: 'border-amber-500/30',
    };
  }
  return {
    level: 'No alcanzado',
    badge_color: 'red',
    emoji: '🔴',
    bgClass: 'bg-rose-500/10 dark:bg-rose-500/20',
    textClass: 'text-rose-700 dark:text-rose-300',
    borderClass: 'border-rose-500/30',
  };
}

export const CLED_STATUTE_SUMMARY = `
ESTATUTO GENERAL DEL CLUB DE LIDERAZGO ESTUDIANTIL Y DESARROLLO (CLED)
Sede Principal: Los Alcarrizos, Santo Domingo, República Dominicana.

CAPÍTULO I: DE LA NATURALEZA Y FINES
Artículo 1. El Club de Liderazgo Estudiantil y Desarrollo (CLED) es una organización extracurricular formativa, orientada al empoderamiento ético, cívico, cultural y académico de jóvenes estudiantes de educación secundaria y técnica.
Artículo 2. Misión: Fomentar el pensamiento crítico, la oratoria, el trabajo en equipo, la innovación tecnológica y el compromiso social en cada uno de sus miembros.
Artículo 3. Visión: Ser el referente nacional de liderazgo juvenil y excelencia estudiantil en la República Dominicana.

CAPÍTULO II: DE LOS MIEMBROS Y DERECHOS
Artículo 4. Todo estudiante formalmente inscrito tiene derecho a:
  a) Participar libremente en los talleres, módulos formativos y actividades de su club.
  b) Ser evaluado con transparencia conforme a la rúbrica institucional de 8 criterios.
  c) Recibir su constancia de participación extracurricular y certificaciones avaladas.
  d) Solicitar aclaraciones y revisiones sobre asistencias o calificaciones de manera oportuna.

CAPÍTULO III: DE LOS DEBERES Y DISCIPLINA
Artículo 5. Son deberes fundamentales de los miembros:
  a) Mantener una asistencia mínima del 80% en las sesiones presenciales o virtuales.
  b) Cumplir puntualmente con las tareas y proyectos asignados en cada módulo.
  c) Tratar con absoluto respeto a facilitadores, compañeros y autoridades directivas.
  d) Portar dignamente el distintivo y representar con honor los valores del CLED.

CAPÍTULO IV: DE LA EVALUACIÓN MODULAR
Artículo 6. Cada módulo tendrá un valor de 100 puntos y será calificado según los 8 criterios oficiales:
  - Dominio conceptual (15 pts)
  - Aplicación práctica (20 pts)
  - Participación (10 pts)
  - Trabajo colaborativo (10 pts)
  - Comunicación (10 pts)
  - Responsabilidad (15 pts)
  - Iniciativa (10 pts)
  - Producto/Proyecto final (10 pts)
La calificación final de cada trimestre será el promedio simple de todos los módulos impartidos.

CAPÍTULO V: DE LAS CERTIFICACIONES Y EVENTOS
Artículo 7. Se emitirán constancias de participación oficial con sello institucional y código QR de validación criptográfica para cada estudiante y facilitador que cumpla con los requisitos establecidos por la Directiva General.
`;
