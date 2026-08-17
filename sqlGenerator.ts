import { User } from '../types';

export const SUPABASE_SCHEMA_SQL = `-- =========================================================================
-- SISTEMA DE GESTIÓN CLED (Club de Liderazgo Estudiantil y Desarrollo)
-- Instituto Politécnico Henríquez Ureña • Los Alcarrizos, Rep. Dominicana
-- Base de Datos PostgreSQL / Supabase Schema Oficial
-- =========================================================================

-- 1. EXTENSIÓN PARA GENERACIÓN DE UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA: USERS (Perfiles de Estudiantes, Facilitadores, Directiva, Eventos)
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR PRIMARY KEY, -- Auth UUID (auth.users.id) o ID único del sistema
    student_code VARCHAR UNIQUE, -- Código estudiantil generado aleatoriamente (ej: CLED-2673)
    name VARCHAR NOT NULL,
    email VARCHAR NOT NULL, -- Correo personal verificado del estudiante / usuario
    auth_email VARCHAR NOT NULL, -- Correo institucional de login en Authentication (ej: usuario@club.cled.do)
    role VARCHAR NOT NULL DEFAULT 'ESTUDIANTE' CHECK (role IN ('ESTUDIANTE', 'FACILITADOR', 'DIRECTIVA', 'PERSONAL_EVENTOS')),
    club VARCHAR DEFAULT 'Club de debate',
    grade VARCHAR, -- 3ro, 4to, 5to, 6to
    section VARCHAR, -- A, B, C, D, E, F
    technical_area VARCHAR DEFAULT 'N/A', -- Especialidad técnica o N/A para 3ro
    phone VARCHAR,
    birth_date DATE,
    matriculation_year INTEGER DEFAULT 2026,
    matriculation_trimester VARCHAR DEFAULT 'SEP – DIC 2026',
    facilitator_id VARCHAR REFERENCES public.users(id) ON DELETE SET NULL, -- ID del facilitador asignado
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. TRIGGER AUTOMÁTICO DE IT: Inserción desde auth.users a public.users
-- Cada vez que el equipo de IT crea un usuario en Supabase Authentication con correo nombredeusuario@nombredelclub.cled.do,
-- este trigger inserta de forma inmediata al usuario en public.users con 'ESTUDIANTE', 'Club de debate' y código CLED-XXXX aleatorio.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    random_code VARCHAR;
    default_name VARCHAR;
BEGIN
    -- Genera código estudiantil aleatorio único de 4 dígitos (formato CLED-XXXX)
    random_code := 'CLED-' || FLOOR(1000 + random() * 9000)::TEXT;
    default_name := COALESCE(NEW.raw_user_meta_data->>'full_name', UPPER(SPLIT_PART(NEW.email, '@', 1)));
    
    INSERT INTO public.users (
        id,
        student_code,
        name,
        email,
        auth_email,
        role,
        club,
        grade,
        section,
        technical_area,
        matriculation_year,
        matriculation_trimester,
        created_at
    ) VALUES (
        NEW.id::TEXT,
        random_code,
        default_name,
        NEW.email,
        NEW.email,
        'ESTUDIANTE',
        'Club de debate',
        '3ro',
        'A',
        'N/A',
        2026,
        'SEP – DIC 2026',
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger vinculado a auth.users (ejecutar en el SQL Editor de Supabase)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 4. TABLA: ATTENDANCE (Asistencia Estudiantil)
CREATE TABLE IF NOT EXISTS public.attendance (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    student_id VARCHAR REFERENCES public.users(id) ON DELETE CASCADE,
    student_name VARCHAR,
    date DATE NOT NULL,
    status VARCHAR NOT NULL CHECK (status IN ('Presente', 'Ausente', 'Justificado', 'Tardanza')),
    notes TEXT,
    club VARCHAR NOT NULL,
    month VARCHAR NOT NULL,
    trimester VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. TABLA: MODULES (Módulos Formativos del Club)
CREATE TABLE IF NOT EXISTS public.modules (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    module_number VARCHAR NOT NULL, -- Ej: 'Módulo I', 'Módulo II'
    title VARCHAR NOT NULL,
    max_value NUMERIC DEFAULT 100,
    club VARCHAR NOT NULL,
    trimester VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. TABLA: STUDENT_MODULE_GRADES (Calificaciones por Rúbrica Oficial de 8 Criterios)
CREATE TABLE IF NOT EXISTS public.student_module_grades (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    student_id VARCHAR REFERENCES public.users(id) ON DELETE CASCADE,
    module_id VARCHAR REFERENCES public.modules(id) ON DELETE CASCADE,
    club VARCHAR NOT NULL,
    trimester VARCHAR NOT NULL,
    dominio_conceptual NUMERIC CHECK (dominio_conceptual BETWEEN 0 AND 15),
    aplicacion_practica NUMERIC CHECK (aplicacion_practica BETWEEN 0 AND 20),
    participacion NUMERIC CHECK (participacion BETWEEN 0 AND 10),
    trabajo_colaborativo NUMERIC CHECK (trabajo_colaborativo BETWEEN 0 AND 10),
    comunicacion NUMERIC CHECK (comunicacion BETWEEN 0 AND 10),
    responsabilidad NUMERIC CHECK (responsabilidad BETWEEN 0 AND 15),
    iniciativa NUMERIC CHECK (iniciativa BETWEEN 0 AND 10),
    producto_proyecto_final NUMERIC CHECK (producto_proyecto_final BETWEEN 0 AND 10),
    total_score NUMERIC CHECK (total_score BETWEEN 0 AND 100),
    level VARCHAR CHECK (level IN ('Excelente', 'Satisfactorio', 'En proceso', 'No alcanzado')),
    badge_color VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_student_module UNIQUE (student_id, module_id)
);

-- 7. TABLA: TASKS (Tareas asignadas por facilitadores)
CREATE TABLE IF NOT EXISTS public.tasks (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    title VARCHAR NOT NULL,
    description TEXT,
    value NUMERIC DEFAULT 100,
    due_date VARCHAR,
    club VARCHAR NOT NULL,
    trimester VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. TABLA: TASK_SUBMISSIONS (Entregas de Tareas de Estudiantes)
CREATE TABLE IF NOT EXISTS public.task_submissions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    task_id VARCHAR REFERENCES public.tasks(id) ON DELETE CASCADE,
    student_id VARCHAR REFERENCES public.users(id) ON DELETE CASCADE,
    student_name VARCHAR,
    comment_or_link TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    score NUMERIC,
    feedback TEXT,
    status VARCHAR DEFAULT 'Entregado' CHECK (status IN ('Entregado', 'Calificado', 'Pendiente')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. TABLA: TEAMS (Equipos Dinámicos de Trabajo)
CREATE TABLE IF NOT EXISTS public.teams (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    team_name VARCHAR NOT NULL,
    student_ids TEXT[], -- Array de IDs de estudiantes
    club VARCHAR NOT NULL,
    trimester VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 10. TABLA: RESOURCES (Materiales y Recursos de Facilitadores)
CREATE TABLE IF NOT EXISTS public.resources (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    title VARCHAR NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    club VARCHAR NOT NULL,
    trimester VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 11. TABLA: STUDENT_CERTS (Certificados Estudiantiles)
CREATE TABLE IF NOT EXISTS public.student_certs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    student_id VARCHAR REFERENCES public.users(id) ON DELETE CASCADE,
    certificate_url TEXT NOT NULL,
    title VARCHAR DEFAULT 'Certificado de Módulos',
    qr_code_key VARCHAR,
    trimester VARCHAR NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 12. TABLA: FACILITATOR_CERTS (Certificaciones de Facilitadores Emitidas por Directiva)
CREATE TABLE IF NOT EXISTS public.facilitator_certs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    facilitator_id VARCHAR REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    certificate_url TEXT NOT NULL,
    qr_code_key VARCHAR NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    trimester VARCHAR NOT NULL
);

-- 13. TABLA: EVENTS (Eventos Institucionales CLED)
CREATE TABLE IF NOT EXISTS public.events (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    title VARCHAR NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time VARCHAR DEFAULT '09:00 AM',
    location VARCHAR NOT NULL,
    capacity INTEGER DEFAULT 200,
    status VARCHAR DEFAULT 'Activo' CHECK (status IN ('Activo', 'Finalizado', 'Cancelado')),
    trimester VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 14. TABLA: EVENT_PASSES (Control de Pases y Boletas con Códigos QR)
CREATE TABLE IF NOT EXISTS public.event_passes (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    pass_code VARCHAR UNIQUE NOT NULL,
    qr_code_key VARCHAR NOT NULL,
    user_id VARCHAR,
    user_name VARCHAR NOT NULL,
    person_name VARCHAR,
    user_email VARCHAR NOT NULL,
    user_phone VARCHAR,
    role VARCHAR,
    club VARCHAR,
    event_name VARCHAR NOT NULL,
    event_title VARCHAR,
    event_date VARCHAR NOT NULL,
    event_location VARCHAR NOT NULL,
    location VARCHAR,
    seat_or_table VARCHAR,
    status VARCHAR DEFAULT 'Activo' CHECK (status IN ('Activo', 'En Auditoría', 'Validado', 'Revocado')),
    validated BOOLEAN DEFAULT false,
    validated_at TIMESTAMP WITH TIME ZONE,
    audit_reason TEXT,
    trimester VARCHAR NOT NULL,
    generated_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 15. TABLA: AUDIT_LOGS (Registro de Auditorías de Seguridad y Accesos)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_name VARCHAR NOT NULL,
    action VARCHAR NOT NULL,
    details TEXT,
    trimester VARCHAR,
    pass_code VARCHAR,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ÍNDICES DE ALTO RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_users_auth_email ON public.users(auth_email);
CREATE INDEX IF NOT EXISTS idx_users_student_code ON public.users(student_code);
CREATE INDEX IF NOT EXISTS idx_users_facilitator_id ON public.users(facilitator_id);
CREATE INDEX IF NOT EXISTS idx_users_club ON public.users(club);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_attendance_club_trim ON public.attendance(club, trimester);
CREATE INDEX IF NOT EXISTS idx_grades_student ON public.student_module_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_passes_code ON public.event_passes(pass_code);

-- =========================================================================
-- POLÍTICAS RLS (Seguridad y Acceso para Web Client & Auth Users)
-- =========================================================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo a eventos para anon y authenticated" ON public.events;
DROP POLICY IF EXISTS "Permitir lectura publica de eventos" ON public.events;
DROP POLICY IF EXISTS "Permitir insercion y actualizacion a usuarios autenticados" ON public.events;
CREATE POLICY "Permitir todo a eventos para anon y authenticated"
ON public.events FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.event_passes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo a pases para anon y authenticated" ON public.event_passes;
DROP POLICY IF EXISTS "Permitir lectura publica de pases" ON public.event_passes;
DROP POLICY IF EXISTS "Permitir gestion de pases a autenticados" ON public.event_passes;
CREATE POLICY "Permitir todo a pases para anon y authenticated"
ON public.event_passes FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo a logs para anon y authenticated" ON public.audit_logs;
CREATE POLICY "Permitir todo a logs para anon y authenticated"
ON public.audit_logs FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);
`;

export const OFFICIAL_USER_UPDATE_SCRIPT = `-- =========================================================================
-- SCRIPT DE ACTUALIZACIÓN OFICIAL DE ESTUDIANTES Y FACILITADORES (CLED)
-- Ejecutar en el SQL Editor de Supabase después del aprovisionamiento de Auth
-- =========================================================================

-- 1. REGISTRO / ACTUALIZACIÓN DE FACILITADORES Y DIRECTIVA OFICIAL
INSERT INTO public.users (
    id,
    student_code,
    name,
    email,
    auth_email,
    role,
    club,
    phone,
    matriculation_year,
    matriculation_trimester
) VALUES 
(
    'fac-ccsp-01',
    'FAC-101',
    'PROF. CARLOS MANUEL MENDEZ',
    'cmendez@politecnico.edu.do',
    'carlos.mendez@ccsp.cled.do',
    'FACILITADOR',
    'Club de comunicación social y periodismo',
    '809-555-0144',
    2026,
    'SEP – DIC 2026'
),
(
    'fac-debate-01',
    'FAC-102',
    'PROF. RAMON ALCANTARA',
    'ralcantara@politecnico.edu.do',
    'ramon.alcantara@debate.cled.do',
    'FACILITADOR',
    'Club de debate',
    '809-555-0188',
    2026,
    'SEP – DIC 2026'
),
(
    'dir-general-01',
    'DIR-001',
    'LIC. ROBELIN MEJÍA / DIRECTIVA CLED',
    'robelinmejia19@gmail.com',
    'directiva@general.cled.do',
    'DIRECTIVA',
    'Directiva General',
    '829-450-0000',
    2026,
    'SEP – DIC 2026'
),
(
    'evt-coord-01',
    'EVT-001',
    'COORD. MARIBEL SANTOS',
    'eventos@cled.do',
    'eventos@logistica.cled.do',
    'PERSONAL_EVENTOS',
    'Comisión de Eventos',
    '809-555-0199',
    2026,
    'SEP – DIC 2026'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    auth_email = EXCLUDED.auth_email,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    club = EXCLUDED.club,
    phone = EXCLUDED.phone;

-- 2. ACTUALIZACIÓN DE ESTUDIANTES OFICIALES Y ASIGNACIÓN DE FACILITADOR
-- Estudiante 1: AURA MARTINEZ (3ro F, N/A)
UPDATE public.users
SET
    name = 'AURA MARTINEZ',
    role = 'ESTUDIANTE',
    email = 'shadai@gmail.com',
    club = 'Club de comunicación social y periodismo',
    grade = '3ro',
    section = 'F',
    technical_area = 'N/A',
    phone = '809-200-3000',
    birth_date = '2009-08-19',
    facilitator_id = 'fac-ccsp-01'
WHERE auth_email = 'aura@lectura.cled.do' OR email = 'aura@lectura.cled.do';

-- Estudiante 2: SHADAI MARIA REYES ROSADO (4to B, Informática)
UPDATE public.users
SET
    name = 'SHADAI MARIA REYES ROSADO',
    role = 'ESTUDIANTE',
    email = 'ytodo@icloud.com',
    club = 'Club de comunicación social y periodismo',
    grade = '4to',
    section = 'B',
    technical_area = 'Desarrollo Y administración de aplicaciones informáticas',
    phone = '849-467-7830',
    birth_date = '2009-05-12',
    facilitator_id = 'fac-ccsp-01'
WHERE auth_email = 'shada@debate.cled.do' OR email = 'shada@debate.cled.do';

-- Estudiante 3: FERNANDO AGUSTIN (5to A, Gestión)
UPDATE public.users
SET
    name = 'FERNANDO AGUSTIN',
    role = 'ESTUDIANTE',
    email = 'idk@outlook.com',
    club = 'Club de comunicación social y periodismo',
    grade = '5to',
    section = 'A',
    technical_area = 'Gestión administrativa y tributaria',
    phone = '829-614-6298',
    birth_date = '2008-08-11',
    facilitator_id = 'fac-ccsp-01'
WHERE auth_email = 'fernando@ccsp.cled.do' OR email = 'fernando@ccsp.cled.do';

-- Estudiante 4: FAVIOLA PERALTA (6to A, Logística)
UPDATE public.users
SET
    name = 'FAVIOLA PERALTA',
    role = 'ESTUDIANTE',
    email = 'favi298@hotmail.com',
    club = 'Club de comunicación social y periodismo',
    grade = '6to',
    section = 'A',
    technical_area = 'Logística y transporte',
    phone = '809-372-3719',
    birth_date = '2009-10-02',
    facilitator_id = 'fac-ccsp-01'
WHERE auth_email = 'faviola@cb.cled.do' OR email = 'faviola@cb.cled.do';
`;

export function generateCustomUserSql(user: User): string {
  return `UPDATE public.users
SET
    name = '${user.name.replace(/'/g, "''")}',
    role = '${user.role}',
    email = '${user.email}',
    club = '${(user.club || '').replace(/'/g, "''")}',
    grade = '${user.grade || '3ro'}',
    section = '${user.section || 'A'}',
    technical_area = '${(user.technical_area || 'N/A').replace(/'/g, "''")}',
    phone = '${user.phone || ''}',
    birth_date = '${user.birth_date || '2009-01-01'}'${user.facilitator_id ? `,\n    facilitator_id = '${user.facilitator_id}'` : ''}
WHERE auth_email = '${user.auth_email || user.email}' OR email = '${user.auth_email || user.email}';`;
}
