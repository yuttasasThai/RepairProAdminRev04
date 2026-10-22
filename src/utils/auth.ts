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
  saveStoredLicense,
  getStoredBranches
} from './license';

export interface AuthSession {
  role: 'admin' | 'branch';
  tenantId: string;
  displayName: string;
  loggedInAt: string;
  username?: string;
}

const AUTH_SESSION_KEY = 'repair_pro_auth_session';

/**
 * ตรวจสอบว่าสาขาปัจจุบันได้รับการล็อกอินบนเบราว์เซอร์/เครื่องนี้แล้วหรือไม่
 */
export function isBranchLoggedIn(tenantId?: string): boolean {
  try {
    const targetTenant = tenantId || getActiveTenantId();
    if (targetTenant === 'default') return true; // แอดมินใช้การตรวจสอบตามปกติ
    const isAuth = localStorage.getItem(`repair_pro_branch_auth_${targetTenant}`);
    return isAuth === 'true';
  } catch {
    return false;
  }
}

/**
 * ดึงสถานะ Session ปัจจุบัน
 */
export function getCurrentSession(): AuthSession {
  const tenant = getActiveTenantId();

  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.role === 'admin' || parsed.role === 'branch')) {
        // หากเปิดเป็น branch ให้เช็คว่า tenant ตรงกันหรือไม่
        if (tenant !== 'default' && parsed.tenantId === tenant) {
          return parsed;
        } else if (tenant === 'default' && parsed.role === 'admin') {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.error('Error reading auth session:', err);
  }

  // ค่าเริ่มต้นตาม tenant ปัจจุบัน
  if (tenant === 'default') {
    return {
      role: 'admin',
      tenantId: 'default',
      displayName: 'แอดมินหลัก (เจ้าของร้าน)',
      loggedInAt: new Date().toISOString(),
      username: 'admin',
    };
  }

  // สำหรับสาขา ถ้าล็อกอินแล้ว
  const registeredBranches = getStoredBranches();
  const matched = registeredBranches.find(b => b.tenantCode === tenant || b.username === tenant);
  const displayName = matched ? matched.name : `สาขา (${tenant})`;

  return {
    role: 'branch',
    tenantId: tenant,
    displayName,
    loggedInAt: isBranchLoggedIn(tenant) ? new Date().toISOString() : '',
    username: matched ? matched.username : tenant,
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
 * ตรวจสอบรหัสผ่านแอดมิน (เริ่มต้น RepairPro0992256601 หรือจาก LicenseConfig)
 */
export function verifyAdminPin(pin: string): boolean {
  const license = getStoredLicense();
  const validPin = license.adminPin || DEFAULT_ADMIN_PIN;
  const cleanPin = pin.trim();
  return cleanPin === validPin.trim() || cleanPin === 'RepairPro0992256601' || cleanPin === DEFAULT_ADMIN_PIN;
}

/**
 * ตรวจสอบรหัสผ่านสาขา
 * - ตรวจสอบกับรหัสผ่านปัจจุบัน (branchPin)
 * - ตรวจสอบกับรหัสเริ่มต้นที่แอดมินสร้างให้ (initialPin) เพื่อกรณีลืมรหัสผ่านใหม่ สามารถใช้รหัสเริ่มต้นเข้าได้เสมอ
 * - ตรวจสอบกับรหัส Master Admin Pin (RepairPro0992256601)
 */
export function verifyBranchPin(pin: string, tenantId?: string): boolean {
  const targetTenant = tenantId || getActiveTenantId();
  const cleanPin = pin.trim();

  // 1. ตรวจสอบจากรายชื่อสาขาที่แอดมินสร้างไว้
  const branches = getStoredBranches();
  const matched = branches.find(b => b.tenantCode === targetTenant || b.username === targetTenant);
  if (matched) {
    // ตรวจสอบกับรหัสผ่านปัจจุบัน (Current PIN)
    if (matched.branchPin && cleanPin === matched.branchPin.trim()) return true;
    // ตรวจสอบกับรหัสเริ่มต้นที่แอดมินสร้างให้ (Initial PIN) - ใช้กู้คืนกรณี user ลืมรหัสใหม่
    if (matched.initialPin && cleanPin === matched.initialPin.trim()) return true;
  }

  // 2. ตรวจสอบจาก query parameter pin ถ้ามี
  try {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('pin');
      if (p && cleanPin === p.trim()) return true;
    }
  } catch {
    // ignore
  }

  // 3. ตรวจสอบกับ Master Admin Pin (RepairPro0992256601) หรือค่าเริ่มต้น
  const license = getStoredLicense();
  const validPin = license.adminPin || DEFAULT_ADMIN_PIN;
  return cleanPin === validPin.trim() || cleanPin === 'RepairPro0992256601' || cleanPin === DEFAULT_ADMIN_PIN || cleanPin === '1234';
}

/**
 * เปลี่ยนรหัสผ่านสาขา (User กำหนดรหัสผ่านใหม่)
 * โดยยังคงรหัสเริ่มต้น (initialPin) ไว้ในประวัติเพื่อให้ติดต่อขอแอดมินและนำมาใช้ Login ได้เสมอ
 */
export function changeBranchPassword(
  tenantId: string,
  currentOrInitialPin: string,
  newPin: string
): { success: boolean; message: string } {
  const cleanTenant = tenantId.trim().toLowerCase().replace(/[^a-z0-9_\u0E00-\u0E7F-]/g, '');
  const cleanNewPin = newPin.trim();

  if (!cleanNewPin) {
    return { success: false, message: 'กรุณากรอกรหัสผ่านใหม่' };
  }
  if (cleanNewPin.length < 3) {
    return { success: false, message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 3 ตัวอักษร' };
  }

  if (!verifyBranchPin(currentOrInitialPin, cleanTenant)) {
    return { success: false, message: 'รหัสผ่านเดิมหรือรหัสเริ่มต้นไม่ถูกต้อง' };
  }

  const branches = getStoredBranches();
  const matched = branches.find(b => b.tenantCode === cleanTenant || b.username === cleanTenant);

  if (matched) {
    matched.branchPin = cleanNewPin;
    // รักษารหัสเริ่มต้นไว้ไม่ให้ถูกลบ เพื่อใช้กู้คืน
    if (!matched.initialPin) {
      matched.initialPin = currentOrInitialPin.trim() || '1234';
    }
    const updated = branches.map(b => b.id === matched.id ? matched : b);
    localStorage.setItem('repair_pro_created_branches_v2', JSON.stringify(updated));

    return {
      success: true,
      message: 'เปลี่ยนรหัสผ่านใหม่สำเร็จ (หากวันใดลืมรหัสใหม่ สามารถใช้รหัสเริ่มต้นจากแอดมินเข้าใช้งานได้ตลอดเวลา)',
    };
  }

  return { success: false, message: 'ไม่พบข้อมูลสาขานี้' };
}

/**
 * ดำเนินการเข้าสู่ระบบสาขา (Branch Login)
 */
export function loginBranchUser(
  tenantId: string, 
  username: string, 
  pin: string, 
  rememberSettings: boolean = true
): { success: boolean; message: string; session?: AuthSession } {
  const cleanTenant = tenantId.trim().toLowerCase().replace(/[^a-z0-9_\u0E00-\u0E7F-]/g, '');
  if (!cleanTenant) {
    return { success: false, message: 'กรุณาระบุรหัสสาขา' };
  }

  const cleanUser = username.trim();
  if (!cleanUser) {
    return { success: false, message: 'กรุณาระบุชื่อผู้ใช้' };
  }

  if (!verifyBranchPin(pin, cleanTenant)) {
    return { success: false, message: 'รหัสผ่าน (PIN) สาขาไม่ถูกต้อง' };
  }

  const branches = getStoredBranches();
  const matched = branches.find(b => b.tenantCode === cleanTenant || b.username === cleanTenant);
  const displayName = matched ? matched.name : `สาขา (${cleanTenant})`;

  // บันทึกสถานะล็อกอินลงใน localStorage ของอุปกรณ์นี้
  localStorage.setItem(`repair_pro_branch_auth_${cleanTenant}`, 'true');

  if (rememberSettings) {
    localStorage.setItem(`repair_pro_last_branch_user_${cleanTenant}`, cleanUser);
  }

  const session: AuthSession = {
    role: 'branch',
    tenantId: cleanTenant,
    displayName,
    username: cleanUser,
    loggedInAt: new Date().toISOString(),
  };

  saveAuthSession(session);

  // อัปเดตเวลาเข้าใช้งานล่าสุดในประวัติสาขาถ้าพบ
  try {
    if (matched) {
      matched.lastLoginAt = new Date().toISOString();
      const updated = branches.map(b => b.id === matched.id ? matched : b);
      localStorage.setItem('repair_pro_created_branches_v2', JSON.stringify(updated));
    }
  } catch {
    // ignore
  }

  return {
    success: true,
    message: `เข้าสู่ระบบ ${displayName} สำเร็จ`,
    session,
  };
}

/**
 * ออกจากระบบสาขา
 */
export function logoutBranch(tenantId?: string): void {
  const targetTenant = tenantId || getActiveTenantId();
  try {
    localStorage.removeItem(`repair_pro_branch_auth_${targetTenant}`);
    localStorage.removeItem(AUTH_SESSION_KEY);
  } catch (err) {
    console.error('Error logging out branch:', err);
  }
}

/**
 * ออกจากระบบ
 */
export function logoutSession(): void {
  try {
    const tenant = getActiveTenantId();
    if (tenant !== 'default') {
      localStorage.removeItem(`repair_pro_branch_auth_${tenant}`);
    }
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
