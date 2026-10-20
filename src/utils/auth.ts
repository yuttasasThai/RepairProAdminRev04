/**
 * Authentication & Cross-Device Sync Utility
 * รองรับการ Login ทั้งแอดมินและสาขา พร้อมระบบย้ายข้อมูลข้ามโทรศัพท์/เครื่องใหม่
 */

import { RepairJob, ShopSettings } from '../types/repair';
import { LicenseConfig } from '../types/license';
import { 
  getStoredJobs, 
  saveStoredJobs, 
  getStoredSettings, 
  saveStoredSettings
} from './storage';
import { 
  getActiveTenantId, 
  DEFAULT_ADMIN_PIN, 
  getStoredLicense, 
  saveStoredLicense
} from './license';

export interface AuthSession {
  role: 'admin' | 'branch';
  tenantId: string;
  displayName: string;
  loggedInAt: string;
}

const AUTH_SESSION_KEY = 'repair_pro_auth_session';

/**
 * ดึงสถานะ Session ปัจจุบัน
 */
export function getCurrentSession(): AuthSession {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.role === 'admin' || parsed.role === 'branch')) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading auth session:', err);
  }

  // ค่าเริ่มต้นตาม tenant ปัจจุบัน
  const tenant = getActiveTenantId();
  if (tenant === 'default') {
    return {
      role: 'admin',
      tenantId: 'default',
      displayName: 'แอดมินหลัก (เจ้าของร้าน)',
      loggedInAt: new Date().toISOString(),
    };
  }

  return {
    role: 'branch',
    tenantId: tenant,
    displayName: `สาขา (${tenant})`,
    loggedInAt: new Date().toISOString(),
  };
}

/**
 * บันทึก Session การเข้าสู่ระบบ
 */
export function saveAuthSession(session: AuthSession): void {
  try {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('Error saving auth session:', err);
  }
}

/**
 * ตรวจสอบรหัสผ่านแอดมิน (ค่าเริ่มต้น 1234 หรือจาก LicenseConfig)
 */
export function verifyAdminPin(pin: string): boolean {
  const license = getStoredLicense();
  const validPin = license.adminPin || DEFAULT_ADMIN_PIN;
  return pin.trim() === validPin.trim();
}

/**
 * ตรวจสอบรหัสผ่านสาขา
 */
export function verifyBranchPin(pin: string): boolean {
  const license = getStoredLicense();
  const validPin = license.adminPin || DEFAULT_ADMIN_PIN;
  return pin.trim() === validPin.trim() || pin.trim() === '1234';
}

/**
 * ออกจากระบบ
 */
export function logoutSession(): void {
  try {
    localStorage.removeItem(AUTH_SESSION_KEY);
  } catch (err) {
    console.error('Error logging out:', err);
  }
}

/**
 * สร้างข้อมูลชุดย้ายเครื่อง / ซิงค์ข้อมูลข้ามโทรศัพท์ (Cross-Device Sync Payload)
 */
export interface SyncPackage {
  version: string;
  exportedAt: string;
  tenantId: string;
  jobs: RepairJob[];
  settings: ShopSettings;
  license: LicenseConfig;
}

export function createSyncPackage(): SyncPackage {
  const tenantId = getActiveTenantId();
  const jobs = getStoredJobs();
  const settings = getStoredSettings();
  const license = getStoredLicense();

  return {
    version: 'rev.04',
    exportedAt: new Date().toISOString(),
    tenantId,
    jobs,
    settings,
    license,
  };
}

/**
 * แปลง SyncPackage เป็นรหัสย้ายเครื่อง (Encoded Sync Key)
 */
export function generateSyncCode(): string {
  try {
    const pkg = createSyncPackage();
    const jsonStr = JSON.stringify(pkg);
    // Base64 encode safe for UTF-8
    const encoded = btoa(encodeURIComponent(jsonStr));
    return encoded;
  } catch (err) {
    console.error('Error generating sync code:', err);
    return '';
  }
}

/**
 * ดึงข้อมูลเข้าเครื่องใหม่จากรหัสย้ายเครื่อง (Import Sync Code)
 */
export function importSyncCode(syncCode: string): { success: boolean; message: string; count?: number } {
  try {
    if (!syncCode || syncCode.trim().length === 0) {
      return { success: false, message: 'กรุณากรอกรหัสย้ายเครื่อง / Sync Code' };
    }

    const clean = syncCode.trim();
    let jsonStr = '';

    // รองรับทั้งแบบ raw JSON และ Base64 Encoded
    if (clean.startsWith('{')) {
      jsonStr = clean;
    } else {
      jsonStr = decodeURIComponent(atob(clean));
    }

    const parsed: SyncPackage = JSON.parse(jsonStr);

    if (!parsed || !Array.isArray(parsed.jobs)) {
      return { success: false, message: 'รูปแบบรหัสย้ายเครื่องไม่ถูกต้องหรือข้อมูลเสียหาย' };
    }

    // บันทึกข้อมูลเข้าเครื่องใหม่
    if (parsed.jobs) {
      saveStoredJobs(parsed.jobs);
    }

    if (parsed.settings) {
      saveStoredSettings(parsed.settings);
    }

    if (parsed.license) {
      saveStoredLicense(parsed.license);
    }

    return {
      success: true,
      message: `นำเข้าข้อมูลลงโทรศัพท์เครื่องใหม่สำเร็จเรียบร้อย (${parsed.jobs.length} งาน)`,
      count: parsed.jobs.length,
    };
  } catch (err) {
    console.error('Failed to import sync code:', err);
    return { success: false, message: 'รหัสย้ายเครื่องไม่ถูกต้อง หรือข้อมูลไม่สมบูรณ์' };
  }
}

/**
 * ดาวน์โหลดไฟล์สำรองข้อมูล JSON (Backup Data File)
 */
export function downloadBackupFile(): void {
  try {
    const pkg = createSyncPackage();
    const jsonStr = JSON.stringify(pkg, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `repair-pro-backup-${pkg.tenantId}-${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (err) {
    console.error('Error downloading backup:', err);
  }
}
