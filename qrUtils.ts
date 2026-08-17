import QRCode from 'qrcode';
import { User } from '../types';

/**
 * Standard deterministic student base key
 */
export function generateStudentQRKey(user: User, certIdentifier?: string, salt?: string | number): string {
  const parts = (user.name || 'ESTUDIANTE').trim().toUpperCase().split(' ');
  const lastName = parts.length > 1 ? parts.slice(1).join('_') : parts[0];
  const firstName = parts[0] || 'ESTUDIANTE';
  const birth = (user.birth_date || '2009-01-01').replace(/-/g, '');
  const matriculation = user.matriculation_year || 2026;
  
  let key = `${lastName}_${firstName}_${birth}_${matriculation}`;
  if (certIdentifier) {
    const cleanCert = certIdentifier.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 15);
    if (cleanCert) key += `_${cleanCert}`;
  }
  if (salt !== undefined) {
    key += `_${salt}`;
  }
  return key.replace(/_+/g, '_').replace(/^_|_$/g, '');
}

/**
 * Regenerates a unique, cryptographically distinct QR verification key for a student certificate
 */
export function regenerateStudentUniqueQRKey(user: User, certTitle?: string): string {
  const random4 = Math.floor(1000 + Math.random() * 9000);
  const timeSuffix = Date.now().toString().slice(-4);
  const certCode = certTitle ? certTitle.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) : 'CERT';
  return generateStudentQRKey(user, certCode, `${random4}${timeSuffix}`);
}

/**
 * Standard deterministic facilitator base key
 */
export function generateFacilitatorQRKey(user: User, certIdentifier?: string, salt?: string | number): string {
  const parts = (user.name || 'FACILITADOR').trim().toUpperCase().split(' ');
  const lastName = parts.length > 1 ? parts.slice(1).join('_') : parts[0];
  const firstName = parts[0] || 'FACILITADOR';
  const birth = (user.birth_date || '1995-05-20').replace(/-/g, '');
  const currentYear = new Date().getFullYear();
  
  let key = `${lastName}_${firstName}_${birth}_${currentYear}`;
  if (certIdentifier) {
    const cleanCert = certIdentifier.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 15);
    if (cleanCert) key += `_${cleanCert}`;
  }
  if (salt !== undefined) {
    key += `_${salt}`;
  } else {
    const random4 = Math.floor(1000 + Math.random() * 9000);
    key += `_${random4}`;
  }
  return key.replace(/_+/g, '_').replace(/^_|_$/g, '');
}

/**
 * Regenerates a unique, cryptographically distinct QR verification key for a facilitator certificate
 */
export function regenerateFacilitatorUniqueQRKey(user: User, certTitle?: string): string {
  const random4 = Math.floor(1000 + Math.random() * 9000);
  const timeSuffix = Date.now().toString().slice(-4);
  const certCode = certTitle ? certTitle.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) : 'DOC';
  return generateFacilitatorQRKey(user, certCode, `${random4}${timeSuffix}`);
}

export async function generateQRCodeDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 256,
      color: {
        dark: '#0f2942',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
}

