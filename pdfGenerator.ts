import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AttendanceRecord, CledEvent, EventPass, Module, StudentModuleGrade, User } from '../types';
import { generateQRCodeDataUrl, generateStudentQRKey, generateFacilitatorQRKey } from './qrUtils';

let cachedLogoDataUrl: string | null = null;
let cachedSelloDataUrl: string | null = null;

export async function getLogoDataUrl(): Promise<string | null> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  try {
    const res = await fetch('/LOGO_CLED_SF.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogoDataUrl = reader.result as string;
        resolve(cachedLogoDataUrl);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}

export async function getSelloDataUrl(): Promise<string | null> {
  if (cachedSelloDataUrl) return cachedSelloDataUrl;
  try {
    const res = await fetch('/SELLO_CLED_SF.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedSelloDataUrl = reader.result as string;
        resolve(cachedSelloDataUrl);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}

export function generateTokenId(): string {
  const chars = '0123456789ABCDEF';
  let token = 'CLED-';
  for (let i = 0; i < 8; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  const timestamp = Date.now().toString().slice(-4);
  return `${token}-${timestamp}`;
}

export function formatEmissionDateTime(): string {
  const now = new Date();
  return now.toLocaleString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

// Draw Institutional Header in jsPDF with Logo
async function drawInstitutionalHeader(
  doc: jsPDF,
  opts: {
    asunto: string;
    club?: string;
    facilitador?: string;
    trimestre?: string;
    tokenId: string;
  }
) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top Navy banner band
  doc.setFillColor(15, 41, 66); // #0f2942
  doc.rect(0, 0, pageWidth, 7, 'F');

  // Gold accent line
  doc.setFillColor(217, 119, 6); // #d97706
  doc.rect(0, 7, pageWidth, 2, 'F');

  // Official Logo on top left
  const logoData = await getLogoDataUrl();
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', 14, 11, 16, 16);
    } catch (e) {
      console.warn('Could not add logo image to PDF:', e);
    }
  }

  const textStartX = logoData ? 33 : 14;

  // Institutional Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 41, 66);
  doc.text('INSTITUTO POLITÉCNICO HENRÍQUEZ UREÑA', textStartX, 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(217, 119, 6);
  doc.text('Club de Liderazgo Estudiantil y Desarrollo (CLED)', textStartX, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Los Alcarrizos, Santo Domingo, República Dominicana • Sistema Académico Oficial', textStartX, 26.5);

  // Metadata Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 30, pageWidth - 28, 24, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  // Column 1
  doc.setFont('helvetica', 'bold');
  doc.text('ASUNTO:', 18, 36);
  doc.setFont('helvetica', 'normal');
  doc.text(opts.asunto, 35, 36);

  if (opts.trimestre) {
    doc.setFont('helvetica', 'bold');
    doc.text('TRIMESTRE:', 18, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(opts.trimestre, 40, 42);
  }

  if (opts.club) {
    doc.setFont('helvetica', 'bold');
    doc.text('CLUB:', 18, 48);
    doc.setFont('helvetica', 'normal');
    doc.text(opts.club, 30, 48);
  }

  // Column 2
  const col2X = pageWidth / 2 + 10;
  if (opts.facilitador) {
    doc.setFont('helvetica', 'bold');
    doc.text('FACILITADOR:', col2X, 36);
    doc.setFont('helvetica', 'normal');
    doc.text(opts.facilitador, col2X + 26, 36);
  }

  doc.setFont('helvetica', 'bold');
  doc.text('EMISIÓN:', col2X, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(formatEmissionDateTime(), col2X + 18, 42);

  doc.setFont('helvetica', 'bold');
  doc.text('TOKEN ID:', col2X, 48);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(217, 119, 6);
  doc.text(opts.tokenId, col2X + 20, 48);
}

// Draw Institutional Footer with Sello and Page Number
async function drawInstitutionalFooter(doc: jsPDF, tokenId: string) {
  const pageCount = (doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : 1;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const selloData = await getSelloDataUrl();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Bottom divider
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Instituto Politécnico Henríquez Ureña • CLED | Token Oficial: ${tokenId}`, 14, pageHeight - 9);
    doc.text(`Pág. ${i}/${pageCount}`, pageWidth - 25, pageHeight - 9);

    // Directiva stamp signature
    if (selloData) {
      try {
        doc.addImage(selloData, 'PNG', pageWidth / 2 - 9, pageHeight - 24, 18, 18);
      } catch (e) {}
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 41, 66);
      doc.text('SELLO OFICIAL CLED - DIRECTIVA GENERAL', pageWidth / 2 - 35, pageHeight - 9);
    }
  }
}

// 1. REPORTE DE ASISTENCIA PDF
export async function generateAttendanceReportPDF(opts: {
  club: string;
  facilitador: string;
  trimestre: string;
  month: string;
  students: User[];
  attendanceRecords: AttendanceRecord[];
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const tokenId = generateTokenId();

  await drawInstitutionalHeader(doc, {
    asunto: `Reporte Oficial de Asistencias - Mes: ${opts.month}`,
    club: opts.club,
    facilitador: opts.facilitador,
    trimestre: opts.trimestre,
    tokenId,
  });

  let filteredRecords = opts.attendanceRecords.filter(
    (r) => r.club === opts.club && r.trimester === opts.trimestre
  );

  if (opts.month !== 'Todos') {
    filteredRecords = filteredRecords.filter((r) => r.month === opts.month);
  }

  const dates = Array.from(new Set(filteredRecords.map((r) => r.date))).sort();

  const headRow = ['ID', 'Estudiante', 'Grado / Sec', ...dates, 'Pres.', 'Aus.', '% Asist.'];
  
  const bodyRows = opts.students.map((student) => {
    const studentRecords = filteredRecords.filter((r) => r.student_id === student.id);
    let presentCount = 0;
    let absentCount = 0;
    let tardinessCount = 0;
    let justifiedCount = 0;

    const dateColumns = dates.map((date) => {
      const rec = studentRecords.find((r) => r.date === date);
      if (!rec) return '-';
      if (rec.status === 'Presente') {
        presentCount++;
        return 'P';
      }
      if (rec.status === 'Ausente') {
        absentCount++;
        return 'A';
      }
      if (rec.status === 'Tardanza') {
        tardinessCount++;
        return 'T';
      }
      if (rec.status === 'Justificado') {
        justifiedCount++;
        return 'J';
      }
      return '-';
    });

    const totalRecorded = presentCount + absentCount + tardinessCount + justifiedCount;
    const rate = totalRecorded > 0 ? Math.round(((presentCount + justifiedCount + tardinessCount * 0.5) / totalRecorded) * 100) : 100;

    return [
      student.student_code || student.id.slice(0, 8),
      student.name,
      `${student.grade || ''} ${student.section || ''}`,
      ...dateColumns,
      presentCount.toString(),
      absentCount.toString(),
      `${rate}%`,
    ];
  });

  autoTable(doc, {
    startY: 58,
    head: [headRow],
    body: bodyRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 41, 66], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14, bottom: 25 },
  });

  await drawInstitutionalFooter(doc, tokenId);
  doc.save(`Reporte_Asistencia_${opts.club.replace(/\s+/g, '_')}_${opts.trimestre.replace(/\s+/g, '_')}.pdf`);
}

// 2. LISTADO DE ESTUDIANTES PDF
export async function generateStudentListPDF(opts: {
  club: string;
  facilitador: string;
  trimestre: string;
  students: User[];
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const tokenId = generateTokenId();

  await drawInstitutionalHeader(doc, {
    asunto: 'Listado Oficial de Estudiantes Matriculados',
    club: opts.club,
    facilitador: opts.facilitador,
    trimestre: opts.trimestre,
    tokenId,
  });

  const bodyRows = opts.students.map((st, index) => [
    (index + 1).toString(),
    st.student_code || `CLED-${st.id.slice(0, 5)}`,
    st.name,
    st.grade || 'N/A',
    st.section || 'N/A',
    st.technical_area || 'N/A',
    st.email || 'N/A',
    st.phone || 'N/A',
  ]);

  autoTable(doc, {
    startY: 58,
    head: [['No.', 'ID Alumno', 'Nombre Completo', 'Grado', 'Sec.', 'Área Técnica', 'Correo Institucional', 'Teléfono']],
    body: bodyRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [15, 41, 66], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14, bottom: 25 },
  });

  await drawInstitutionalFooter(doc, tokenId);
  doc.save(`Listado_Estudiantes_${opts.club.replace(/\s+/g, '_')}_${opts.trimestre.replace(/\s+/g, '_')}.pdf`);
}

// 3. REPORTE DE CALIFICACIONES FINALES PDF
export async function generateGradesReportPDF(opts: {
  club: string;
  facilitador: string;
  trimestre: string;
  modules: Module[];
  grades: StudentModuleGrade[];
  students: User[];
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const tokenId = generateTokenId();

  await drawInstitutionalHeader(doc, {
    asunto: 'Acta Oficial Consolidada de Calificaciones y Rendimiento por Rúbrica',
    club: opts.club,
    facilitador: opts.facilitador,
    trimestre: opts.trimestre,
    tokenId,
  });

  const sortedModules = [...opts.modules];
  const moduleHeaders = sortedModules.map((m) => m.module_number || m.title);

  const headRow = ['ID', 'Estudiante', ...moduleHeaders, 'Promedio Final', 'Nivel de Logro'];

  const bodyRows = opts.students.map((student) => {
    let totalScoreSum = 0;
    let gradedCount = 0;

    const moduleCells = sortedModules.map((mod) => {
      const g = opts.grades.find((gr) => gr.student_id === student.id && gr.module_id === mod.id);
      if (g) {
        totalScoreSum += g.total_score;
        gradedCount++;
        return `${g.total_score}/100`;
      }
      return 'Sin calificar';
    });

    const finalAverage = gradedCount > 0 ? Math.round(totalScoreSum / gradedCount) : 0;
    let levelText = 'No alcanzado';
    if (finalAverage >= 90) levelText = 'Excelente (90-100)';
    else if (finalAverage >= 80) levelText = 'Satisfactorio (80-89)';
    else if (finalAverage >= 70) levelText = 'En proceso (70-79)';
    else if (gradedCount > 0) levelText = 'No alcanzado (0-69)';
    else levelText = 'Pendiente';

    return [
      student.student_code || student.id.slice(0, 6),
      student.name,
      ...moduleCells,
      gradedCount > 0 ? `${finalAverage} pts` : 'N/A',
      levelText,
    ];
  });

  autoTable(doc, {
    startY: 58,
    head: [headRow],
    body: bodyRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 41, 66], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14, bottom: 25 },
  });

  await drawInstitutionalFooter(doc, tokenId);
  doc.save(`Calificaciones_Finales_${opts.club.replace(/\s+/g, '_')}_${opts.trimestre.replace(/\s+/g, '_')}.pdf`);
}

// 4. CARTA DE CONSTANCIA DE PARTICIPACIÓN EXTRACURRICULAR PDF (Con Logo, Sello y QR Verificable)
export async function generateParticipationCertificatePDF(opts: {
  studentName: string;
  studentId: string;
  clubName: string;
  trimester: string;
  user: User;
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const tokenId = generateTokenId();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Double Border: Outer Navy, Inner Gold
  doc.setDrawColor(15, 41, 66);
  doc.setLineWidth(1.5);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.6);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // Top Navy banner band
  doc.setFillColor(15, 41, 66);
  doc.rect(13, 13, pageWidth - 26, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('INSTITUTO POLITÉCNICO HENRÍQUEZ UREÑA', pageWidth / 2, 21, { align: 'center' });

  // Top Logo
  const logoData = await getLogoDataUrl();
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', pageWidth / 2 - 13, 28, 26, 26);
    } catch (e) {}
  }

  const headerStartY = logoData ? 58 : 38;

  // Main Club name
  doc.setTextColor(15, 41, 66);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Club de Liderazgo Estudiantil y Desarrollo (CLED)', pageWidth / 2, headerStartY, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(217, 119, 6);
  doc.text('Asunto: Carta de Constancia de Participación Extracurricular.', pageWidth / 2, headerStartY + 8, { align: 'center' });

  // Salutation
  doc.setFontSize(11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 41, 66);
  doc.text('A QUIEN PUEDA INTERESAR:', 24, headerStartY + 24);

  // Body text formatted
  const now = new Date();
  const day = now.getDate();
  const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const monthName = monthNames[now.getMonth()];
  const year = now.getFullYear();

  const paragraph1 = `Sirva la presente para hacer constar que el/la estudiante ${opts.studentName}, matriculado/a bajo el ID institucional ${opts.studentId}, se encuentra participando activamente de manera extracurricular en el ${opts.clubName} perteneciente al Club de Liderazgo Estudiantil y Desarrollo (CLED) del Instituto Politécnico Henríquez Ureña, durante el período correspondiente al trimestre ${opts.trimester}.`;

  const paragraph2 = `Se expide la presente constancia para los fines que la parte interesada juzgue convenientes. Dado en Los Alcarrizos, Santo Domingo, República Dominicana, a los ${day} días del mes de ${monthName} del año ${year}.`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(51, 65, 85);

  const lines1 = doc.splitTextToSize(paragraph1, pageWidth - 48);
  doc.text(lines1, 24, headerStartY + 35, { lineHeightFactor: 1.5 });

  const lines2 = doc.splitTextToSize(paragraph2, pageWidth - 48);
  doc.text(lines2, 24, headerStartY + 72, { lineHeightFactor: 1.5 });

  // Signature Block & Sello
  const footerStartY = 195;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 41, 66);
  doc.text('Directiva General CLED', pageWidth / 2, footerStartY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Instituto Politécnico Henríquez Ureña', pageWidth / 2, footerStartY + 5, { align: 'center' });

  // Official Sello Stamp Image
  const selloData = await getSelloDataUrl();
  if (selloData) {
    try {
      doc.addImage(selloData, 'PNG', pageWidth / 2 - 15, footerStartY + 8, 30, 30);
    } catch (e) {}
  }

  // Embed Validation QR Code (Formatted for central scanner validation)
  const studentCode = opts.user.student_code || opts.user.id;
  const qrKey = `CLED-CONSTANCIA:${studentCode}:${opts.studentName}:${opts.clubName}:${opts.trimester}:${tokenId}`;
  const qrDataUrl = await generateQRCodeDataUrl(qrKey);
  
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', pageWidth / 2 - 16, footerStartY + 42, 32, 32);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(217, 119, 6);
  doc.text(`CLAVE DE VALIDACIÓN QR: ${studentCode}_CONSTANCIA_${opts.trimester}`, pageWidth / 2, footerStartY + 77, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Token de Seguridad: ${tokenId} | Emitido el ${formatEmissionDateTime()}`, pageWidth / 2, footerStartY + 81, { align: 'center' });
  doc.text('Verificable en la plataforma central CLED • Instituto Politécnico Henríquez Ureña', pageWidth / 2, footerStartY + 85, { align: 'center' });

  doc.save(`Constancia_Participacion_${opts.studentName.replace(/\s+/g, '_')}_${opts.trimester.replace(/\s+/g, '_')}.pdf`);
}

// 5. QR CARDS EXPORT PDF (For graphic designers / certificates of students or facilitators)
export async function generateQRCardsPDF(opts: {
  title: string;
  club: string;
  trimestre: string;
  users: User[];
  isFacilitator?: boolean;
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const tokenId = generateTokenId();
  const pageWidth = doc.internal.pageSize.getWidth();

  await drawInstitutionalHeader(doc, {
    asunto: opts.title,
    club: opts.club,
    trimestre: opts.trimestre,
    tokenId,
  });

  const cardWidth = 85;
  const cardHeight = 55;
  const startX = 16;
  let currentX = startX;
  let currentY = 60;
  const gapX = 8;
  const gapY = 8;

  for (let i = 0; i < opts.users.length; i++) {
    const user = opts.users[i];
    const qrKey =
      (user as any).qr_code_key ||
      (opts.isFacilitator ? generateFacilitatorQRKey(user) : generateStudentQRKey(user));
    const certTitle = (user as any).certificate_title || (opts.isFacilitator ? 'Certificación de Facilitador Líder' : 'Certificado Oficial de Módulos');
    const qrDataUrl = await generateQRCodeDataUrl(qrKey);

    // Card border
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(currentX, currentY, cardWidth, cardHeight, 3, 3, 'FD');

    // Navy header in card
    doc.setFillColor(15, 41, 66);
    doc.roundedRect(currentX, currentY, cardWidth, 8, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(
      opts.isFacilitator ? 'CLED • QR ACREDITACIÓN DOCENTE' : 'CLED • QR CERTIFICADO ESTUDIANTE',
      currentX + 4,
      currentY + 5.5
    );

    // User info on left
    doc.setTextColor(15, 41, 66);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const nameLines = doc.splitTextToSize(user.name, 44);
    doc.text(nameLines, currentX + 4, currentY + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`ID: ${user.student_code || user.id.slice(0, 10)}`, currentX + 4, currentY + 20);
    doc.text(`Cert: ${certTitle.slice(0, 24)}...`, currentX + 4, currentY + 24);
    doc.text(`Club: ${(user.club || opts.club).slice(0, 20)}...`, currentX + 4, currentY + 28);

    // QR Key text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.setTextColor(217, 119, 6);
    const keyLines = doc.splitTextToSize(`CLAVE VAL:\n${qrKey}`, 44);
    doc.text(keyLines, currentX + 4, currentY + 34);

    // Embed QR image on right
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', currentX + 49, currentY + 11, 33, 33);
    }

    // Advance position
    if (currentX + cardWidth + gapX < pageWidth - 16) {
      currentX += cardWidth + gapX;
    } else {
      currentX = startX;
      currentY += cardHeight + gapY;

      if (currentY + cardHeight > 265 && i < opts.users.length - 1) {
        doc.addPage();
        await drawInstitutionalHeader(doc, {
          asunto: opts.title,
          club: opts.club,
          trimestre: opts.trimestre,
          tokenId,
        });
        currentX = startX;
        currentY = 60;
      }
    }
  }

  await drawInstitutionalFooter(doc, tokenId);
  doc.save(`QR_Certificados_${opts.club.replace(/\s+/g, '_')}_${opts.trimestre.replace(/\s+/g, '_')}.pdf`);
}

// 5.1 INDIVIDUAL CERTIFICATE QR CARD PDF
export async function generateIndividualCertQRPDF(opts: {
  user: User;
  certTitle: string;
  qrKey: string;
  isFacilitator?: boolean;
  trimester?: string;
  issuedAt?: string;
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const tokenId = generateTokenId();
  const pageWidth = doc.internal.pageSize.getWidth();

  await drawInstitutionalHeader(doc, {
    asunto: `Ficha Oficial de Validación QR - ${opts.certTitle}`,
    club: opts.user.club || 'Club de Liderazgo Estudiantil y Desarrollo',
    trimestre: opts.trimester || 'Trimestre Actual',
    tokenId,
  });

  const qrDataUrl = await generateQRCodeDataUrl(opts.qrKey);

  // Large centered Certificate Pass Card
  const cardX = 25;
  const cardY = 65;
  const cardW = pageWidth - 50;
  const cardH = 140;

  // Outer card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'FD');

  // Top header bar inside card
  doc.setFillColor(15, 41, 66);
  doc.roundedRect(cardX, cardY, cardW, 14, 4, 4, 'F');
  doc.setTextColor(255, 215, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(
    opts.isFacilitator ? 'ACREDITACIÓN DOCENTE • CÓDIGO QR OFICIAL' : 'CERTIFICACIÓN ESTUDIANTIL • CÓDIGO QR OFICIAL',
    cardX + 8,
    cardY + 9
  );

  // Left Details
  doc.setTextColor(15, 41, 66);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(opts.user.name, cardX + 8, cardY + 26);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Identificador: ${opts.user.student_code || opts.user.id}`, cardX + 8, cardY + 33);
  doc.text(`Club / Área: ${opts.user.club || opts.user.technical_area || 'CLED'}`, cardX + 8, cardY + 39);
  doc.text(`Rol Institucional: ${opts.user.role}`, cardX + 8, cardY + 45);

  // Certificate Specific Box
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(cardX + 8, cardY + 52, cardW - 16, 20, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(146, 64, 14);
  doc.text('CERTIFICACIÓN / MÓDULO:', cardX + 12, cardY + 59);
  doc.setFontSize(9.5);
  doc.setTextColor(15, 41, 66);
  doc.text(opts.certTitle, cardX + 12, cardY + 67);

  // Center Big QR
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', cardX + (cardW - 48) / 2, cardY + 77, 48, 48);
  }

  // Bottom Key Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CLAVE ÚNICA DE VALIDACIÓN ENCRIPTADA:', cardX + 8, cardY + 130);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(217, 119, 6);
  doc.text(opts.qrKey, cardX + 8, cardY + 135);

  await drawInstitutionalFooter(doc, tokenId);
  doc.save(`Ficha_QR_${opts.user.name.replace(/\s+/g, '_')}_${tokenId}.pdf`);
}

// 6. EVENT PASSES / TICKETS PDF
export async function generateEventPassesPDF(passes: EventPass[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const tokenId = generateTokenId();
  const pageWidth = doc.internal.pageSize.getWidth();

  await drawInstitutionalHeader(doc, {
    asunto: 'Pases Oficiales de Acceso con Código QR para Eventos Institucionales',
    club: 'Eventos CLED General',
    tokenId,
  });

  const cardWidth = 85;
  const cardHeight = 58;
  const startX = 16;
  let currentX = startX;
  let currentY = 60;
  const gapX = 8;
  const gapY = 8;

  for (let i = 0; i < passes.length; i++) {
    const pass = passes[i];
    const qrDataUrl = await generateQRCodeDataUrl(pass.qr_code_key);

    // Card background & border
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(currentX, currentY, cardWidth, cardHeight, 3, 3, 'FD');

    // Navy header in card
    doc.setFillColor(15, 41, 66);
    doc.roundedRect(currentX, currentY, cardWidth, 9, 3, 3, 'F');
    doc.setTextColor(255, 215, 0);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('PASE OFICIAL CLED • ACCESO', currentX + 4, currentY + 6);

    // Pass details on left
    doc.setTextColor(15, 41, 66);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    const nameLines = doc.splitTextToSize(pass.person_name, 45);
    doc.text(nameLines, currentX + 4, currentY + 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Rol: ${pass.role} | Club: ${pass.club.slice(0, 18)}...`, currentX + 4, currentY + 23);
    doc.text(`Evento: ${pass.event_title.slice(0, 22)}...`, currentX + 4, currentY + 28);
    doc.text(`Fecha: ${pass.event_date} | ${pass.location || 'Auditorio'}`, currentX + 4, currentY + 33);
    doc.text(`Ubicación: ${pass.seat_or_table || 'General'}`, currentX + 4, currentY + 38);

    // QR Code Key
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(217, 119, 6);
    doc.text(`PASE: ${pass.qr_code_key}`, currentX + 4, currentY + 46);

    // Embed QR
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', currentX + 50, currentY + 14, 32, 32);
    }

    // Advance
    if (currentX + cardWidth + gapX < pageWidth - 16) {
      currentX += cardWidth + gapX;
    } else {
      currentX = startX;
      currentY += cardHeight + gapY;

      if (currentY + cardHeight > 265 && i < passes.length - 1) {
        doc.addPage();
        await drawInstitutionalHeader(doc, {
          asunto: 'Pases Oficiales de Acceso con Código QR para Eventos Institucionales',
          club: 'Eventos CLED General',
          tokenId,
        });
        currentX = startX;
        currentY = 60;
      }
    }
  }

  await drawInstitutionalFooter(doc, tokenId);
  doc.save(`Pases_Eventos_CLED_${tokenId}.pdf`);
}

// 8. REPORTE AUDITORÍA Y CONTROL DE EVENTO ESPECÍFICO
export async function generateEventDetailReportPDF(opts: {
  event: CledEvent;
  passes: EventPass[];
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const tokenId = generateTokenId();
  const pageWidth = doc.internal.pageSize.getWidth();

  await drawInstitutionalHeader(doc, {
    asunto: `Informe Oficial de Control y Asistencia: ${opts.event.title}`,
    club: 'Departamento de Auditoría y Control de Eventos',
    tokenId,
  });

  const eventPasses = opts.passes.filter(
    (p) =>
      p.event_title === opts.event.title ||
      p.event_name === opts.event.title ||
      p.event_name.toLowerCase().includes(opts.event.title.toLowerCase())
  );

  const totalGenerated = eventPasses.length;
  const attendedCount = eventPasses.filter((p) => p.validated).length;
  const notAttendedCount = eventPasses.filter((p) => p.status === 'Activo' && !p.validated).length;
  const auditQuarantinedCount = eventPasses.filter(
    (p) => p.status === 'En Auditoría' || p.status === 'Revocado'
  ).length;
  const attendanceRate = totalGenerated > 0 ? Math.round((attendedCount / totalGenerated) * 100) : 0;

  // Event info box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 52, pageWidth - 28, 22, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 41, 66);
  doc.text(`Evento: ${opts.event.title}`, 18, 58);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Fecha: ${opts.event.date}   |   Hora: ${opts.event.time}   |   Lugar: ${opts.event.location}`, 18, 64);
  doc.text(`Capacidad del Recinto: ${opts.event.capacity || 200} personas   |   Estado: ${opts.event.status}`, 18, 70);

  // Executive Metric Cards
  const cardWidth = (pageWidth - 28 - 9) / 4;
  const cardY = 78;
  const cardH = 18;

  const metrics = [
    { label: 'Boletas Generadas', val: `${totalGenerated}`, color: [15, 41, 66] },
    { label: 'Asistieron (Escaneados)', val: `${attendedCount}`, color: [5, 150, 105] },
    { label: 'No Asistieron (Ausentes)', val: `${notAttendedCount}`, color: [217, 119, 6] },
    { label: 'En Auditoría (Spam)', val: `${auditQuarantinedCount}`, color: [225, 29, 72] },
  ];

  metrics.forEach((m, idx) => {
    const cx = 14 + idx * (cardWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cx, cardY, cardWidth, cardH, 2, 2, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(m.label.toUpperCase(), cx + 3, cardY + 6);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.text(m.val, cx + 3, cardY + 14);
  });

  // Table of all passes for this event
  const tableData = eventPasses.map((p, idx) => [
    (idx + 1).toString(),
    p.person_name,
    p.role || 'Estudiante',
    p.club.slice(0, 25),
    p.seat_or_table || 'Mesa General',
    p.status === 'Validado' ? 'ASISTIÓ (INGRESADO)' : p.status === 'En Auditoría' ? 'EN AUDITORÍA / SPAM' : 'NO ASISTIÓ (PENDIENTE)',
    p.validated_at ? new Date(p.validated_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }) : '-',
    p.pass_code,
  ]);

  autoTable(doc, {
    startY: 102,
    head: [['#', 'Nombre de la Persona', 'Rol', 'Club / Institución', 'Asiento / Mesa', 'Estado de Asistencia', 'Hora Ingreso', 'Código Pase']],
    body: tableData.length > 0 ? tableData : [['-', 'No hay boletas generadas para este evento', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 2,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [15, 41, 66],
      textColor: [255, 215, 0],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { fontStyle: 'bold', cellWidth: 42 },
      2: { cellWidth: 20 },
      3: { cellWidth: 32 },
      4: { cellWidth: 22 },
      5: { halign: 'center', cellWidth: 30 },
      6: { halign: 'center', cellWidth: 16 },
      7: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        if (data.cell.raw === 'ASISTIÓ (INGRESADO)') {
          data.cell.styles.textColor = [5, 150, 105];
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.raw === 'EN AUDITORÍA / SPAM') {
          data.cell.styles.textColor = [225, 29, 72];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [217, 119, 6];
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 25 },
  });

  await drawInstitutionalFooter(doc, tokenId);
  doc.save(`Reporte_Evento_${opts.event.title.replace(/\s+/g, '_').slice(0, 20)}_${tokenId}.pdf`);
}

// 9. REPORTE CONSOLIDADO DE TODOS LOS EVENTOS
export async function generateAllEventsConsolidatedReportPDF(opts: {
  events: CledEvent[];
  passes: EventPass[];
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const tokenId = generateTokenId();
  const pageWidth = doc.internal.pageSize.getWidth();

  await drawInstitutionalHeader(doc, {
    asunto: 'Informe Ejecutivo Consolidado de Control y Asistencia de Eventos CLED',
    club: 'Dirección General y Departamento de Auditoría',
    tokenId,
  });

  const totalEvents = opts.events.length;
  const totalPasses = opts.passes.length;
  const totalAttended = opts.passes.filter((p) => p.validated).length;
  const totalAbsents = opts.passes.filter((p) => p.status === 'Activo' && !p.validated).length;
  const totalAudited = opts.passes.filter(
    (p) => p.status === 'En Auditoría' || p.status === 'Revocado'
  ).length;
  const globalAttendanceRate = totalPasses > 0 ? Math.round((totalAttended / totalPasses) * 100) : 0;

  // Executive Metric Cards
  const cardWidth = (pageWidth - 28 - 15) / 6;
  const cardY = 52;
  const cardH = 18;

  const metrics = [
    { label: 'Eventos Creados', val: `${totalEvents}`, color: [15, 41, 66] },
    { label: 'Boletas Totales', val: `${totalPasses}`, color: [15, 41, 66] },
    { label: 'Total Asistieron', val: `${totalAttended}`, color: [5, 150, 105] },
    { label: 'Total No Asistieron', val: `${totalAbsents}`, color: [217, 119, 6] },
    { label: 'Total en Auditoría', val: `${totalAudited}`, color: [225, 29, 72] },
    { label: '% Asistencia Global', val: `${globalAttendanceRate}%`, color: [14, 116, 144] },
  ];

  metrics.forEach((m, idx) => {
    const cx = 14 + idx * (cardWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cx, cardY, cardWidth, cardH, 2, 2, 'FD');

    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(m.label.toUpperCase(), cx + 3, cardY + 6);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.text(m.val, cx + 3, cardY + 14);
  });

  // Table summary per event
  const tableData = opts.events.map((evt, idx) => {
    const evtPasses = opts.passes.filter(
      (p) =>
        p.event_title === evt.title ||
        p.event_name === evt.title ||
        p.event_name.toLowerCase().includes(evt.title.toLowerCase())
    );
    const gen = evtPasses.length;
    const att = evtPasses.filter((p) => p.validated).length;
    const abs = evtPasses.filter((p) => p.status === 'Activo' && !p.validated).length;
    const aud = evtPasses.filter((p) => p.status === 'En Auditoría' || p.status === 'Revocado').length;
    const rate = gen > 0 ? `${Math.round((att / gen) * 100)}%` : '0%';

    return [
      (idx + 1).toString(),
      evt.title,
      evt.date,
      evt.time,
      evt.location.slice(0, 30),
      evt.status,
      gen.toString(),
      att.toString(),
      abs.toString(),
      aud.toString(),
      rate,
    ];
  });

  autoTable(doc, {
    startY: 76,
    head: [
      [
        '#',
        'Nombre del Evento',
        'Fecha',
        'Hora',
        'Lugar',
        'Estado',
        'Boletas Gen.',
        'Asistieron',
        'Ausentes',
        'Auditoría',
        '% Asist.',
      ],
    ],
    body: tableData.length > 0 ? tableData : [['-', 'No hay eventos registrados', '-', '-', '-', '-', '0', '0', '0', '0', '0%']],
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [15, 41, 66],
      textColor: [255, 215, 0],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { fontStyle: 'bold', cellWidth: 60 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 16 },
      4: { cellWidth: 45 },
      5: { halign: 'center', cellWidth: 18 },
      6: { halign: 'center', fontStyle: 'bold', cellWidth: 22 },
      7: { halign: 'center', fontStyle: 'bold', textColor: [5, 150, 105], cellWidth: 20 },
      8: { halign: 'center', fontStyle: 'bold', textColor: [217, 119, 6], cellWidth: 20 },
      9: { halign: 'center', fontStyle: 'bold', textColor: [225, 29, 72], cellWidth: 20 },
      10: { halign: 'center', fontStyle: 'bold', textColor: [15, 41, 66], cellWidth: 18 },
    },
    margin: { left: 14, right: 14, bottom: 25 },
  });

  await drawInstitutionalFooter(doc, tokenId);
  doc.save(`Reporte_Consolidado_Eventos_CLED_${tokenId}.pdf`);
}
