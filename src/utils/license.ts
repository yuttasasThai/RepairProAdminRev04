import { LicenseConfig, LicenseStatus, SubscriptionPlanType, BranchLinkItem, BranchRenewalEvent } from '../types/license';
export type { BranchLinkItem, BranchRenewalEvent };

export const DEFAULT_ADMIN_PIN = 'RepairPro0992256601';
export const DEFAULT_CONTACT_NAME = 'ช่างหน่อยชุมแพ';
export const DEFAULT_CONTACT_PHONE = '099-225-6601';
export const DEFAULT_CONTACT_PHONE_RAW = '0992256601';
export const DEFAULT_CONTACT_LINE = '@228snzee';

export function getActiveTenantId(): string {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tenantParam = params.get('tenant') || params.get('branch') || params.get('store');
      const isAdminExplicit = params.get('admin') === 'true' || tenantParam === 'default' || params.get('mode') === 'admin';

      if (isAdminExplicit) {
        localStorage.setItem('repair_pro_active_tenant', 'default');
        return 'default';
      }

      if (tenantParam && tenantParam.trim().length > 0) {
        const cleaned = tenantParam.trim().toLowerCase().replace(/[^a-z0-9_\u0E00-\u0E7F-]/g, '');
        const finalTenant = cleaned.length > 0 ? cleaned : 'branch';
        // จำรหัสสาขานี้ไว้ในเครื่อง เพื่อเวลาสร้างทางลัดบนหน้าจอโทรศัพท์ (PWA Shortcut) 
        // แล้วเปิดมาไม่มี query param จะยังคงเป็นลิงก์สาขาเดิม ไม่หลุดเป็นแอดมิน
        localStorage.setItem('repair_pro_active_tenant', finalTenant);
        return finalTenant;
      }

      // กรณีเปิดจากทางลัดหน้าจอมือถือ (Shortcut) ที่ URL อาจไม่มี query param
      // ให้ดึงค่าสาขาที่เคยเปิดใช้งานล่าสุดในเครื่องนี้มาใช้ต่อทันที
      const savedTenant = localStorage.getItem('repair_pro_active_tenant');
      if (savedTenant && savedTenant.trim().length > 0 && savedTenant !== 'default') {
        return savedTenant.trim();
      }
    }
  } catch (err) {
    console.error('Error getting tenant id:', err);
  }
  return 'default';
}

/**
 * สลับไปยังโหมดแอดมินหลัก (เครื่องเจ้าของร้าน)
 */
export function switchToAdminMode(): void {
  try {
    localStorage.setItem('repair_pro_active_tenant', 'default');
    const url = new URL(window.location.href);
    url.searchParams.set('tenant', 'default');
    url.searchParams.delete('branch');
    url.searchParams.delete('store');
    window.location.href = url.toString();
  } catch (err) {
    console.error('Error switching to admin:', err);
  }
}

/**
 * สลับไปยังสาขาอื่น
 */
export function switchToBranch(branchId: string): void {
  try {
    const clean = branchId.trim().toLowerCase().replace(/[^a-z0-9_\u0E00-\u0E7F-]/g, '') || 'branch';
    localStorage.setItem('repair_pro_active_tenant', clean);
    const url = new URL(window.location.href);
    url.searchParams.set('tenant', clean);
    window.location.href = url.toString();
  } catch (err) {
    console.error('Error switching branch:', err);
  }
}

/**
 * ตรวจสอบว่าเป็นผู้ใช้งานที่เปิดผ่าน "ลิงค์สาขา" หรือไม่
 * หากมี tenant ที่ไม่ใช่ 'default' จะคืนค่า true
 * หากเป็นเครื่องสาขาหลัก (แอดมิน) จะคืนค่า false
 */
export function isBranchUser(): boolean {
  return getActiveTenantId() !== 'default';
}

export function getTenantStoragePrefix(): string {
  const tenantId = getActiveTenantId();
  return tenantId === 'default' ? '' : `_${tenantId}`;
}

export function getLicenseStorageKey(): string {
  return `repair_pro_license_v1${getTenantStoragePrefix()}`;
}

export function getDefaultLicenseConfig(): LicenseConfig {
  const tenantId = getActiveTenantId();
  const isBranch = tenantId !== 'default';
  
  const now = new Date();

  // ลิงก์แอดมินหลัก (default): สิทธิ์แอดมินใช้งานตลอดชีพ ไม่มีวันหมดอายุ!
  if (!isBranch) {
    return {
      tenantId: 'default',
      tenantName: 'สาขาหลัก (เครื่องแอดมิน)',
      planType: 'lifetime',
      planName: 'แพ็กเกจตลอดชีพ (สิทธิ์แอดมิน)',
      activatedAt: now.toISOString(),
      expiresAt: null,
      contactName: DEFAULT_CONTACT_NAME,
      contactPhone: DEFAULT_CONTACT_PHONE,
      contactLineId: DEFAULT_CONTACT_LINE,
      adminPin: DEFAULT_ADMIN_PIN,
    };
  }

  // ค้นหาว่ามีข้อมูลประวัติสาขานี้บันทึกไว้ในระบบหรือไม่
  const registeredBranches = getStoredBranches();
  const matchedBranch = registeredBranches.find(
    b => b.tenantCode === tenantId || b.username === tenantId
  );

  // อ่านพารามิเตอร์วันใช้งานจาก URL หากมีการส่งต่อ เช่น ?tenant=branch-01&days=30 หรือ ?days=90 หรือ &exp=...
  let grantedDays: number | 'lifetime' = 7;
  let exactExpiresAt: string | null = null;
  let customBranchName = matchedBranch ? matchedBranch.name : `สาขา: ${tenantId}`;
  let branchPin = matchedBranch ? matchedBranch.branchPin : DEFAULT_ADMIN_PIN;

  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const daysQuery = params.get('days');
      const planQuery = params.get('plan');
      const expQuery = params.get('exp');
      const nameQuery = params.get('name');
      const pinQuery = params.get('pin');

      if (pinQuery && pinQuery.trim().length > 0) {
        branchPin = pinQuery.trim();
      }
      if (nameQuery && nameQuery.trim().length > 0) {
        customBranchName = nameQuery.trim();
      }

      if (expQuery) {
        try {
          const parsedDate = new Date(decodeURIComponent(expQuery));
          if (!isNaN(parsedDate.getTime())) {
            exactExpiresAt = parsedDate.toISOString();
          }
        } catch {
          // ignore
        }
      }

      if (planQuery === 'lifetime' || daysQuery === 'lifetime') {
        grantedDays = 'lifetime';
      } else if (daysQuery) {
        const parsed = parseInt(daysQuery, 10);
        if (!isNaN(parsed) && parsed > 0) {
          grantedDays = parsed;
        }
      }
    }
  } catch {
    // fallback
  }

  // หากพบในทะเบียนประวัติสาขา ให้ใช้วันหมดอายุจากประวัติสาขา
  if (matchedBranch) {
    if (matchedBranch.expiresAt === null || matchedBranch.daysGranted === 'lifetime') {
      grantedDays = 'lifetime';
      exactExpiresAt = null;
    } else {
      exactExpiresAt = matchedBranch.expiresAt;
    }
    if (matchedBranch.name) {
      customBranchName = matchedBranch.name;
    }
    if (matchedBranch.branchPin) {
      branchPin = matchedBranch.branchPin;
    }
  }

  if (grantedDays === 'lifetime' || (matchedBranch && matchedBranch.expiresAt === null)) {
    return {
      tenantId,
      tenantName: customBranchName,
      planType: 'lifetime',
      planName: 'แพ็กเกจตลอดชีพ',
      activatedAt: now.toISOString(),
      expiresAt: null,
      contactName: DEFAULT_CONTACT_NAME,
      contactPhone: DEFAULT_CONTACT_PHONE,
      contactLineId: DEFAULT_CONTACT_LINE,
      adminPin: branchPin,
    };
  }

  // ลิงค์สาขาแยกอิสระ กำหนดวันหมดอายุตามที่สร้างไว้
  let finalExpiresIso = exactExpiresAt;
  if (!finalExpiresIso) {
    const numDays = typeof grantedDays === 'number' ? grantedDays : 7;
    const expires = new Date(now.getTime() + numDays * 24 * 60 * 60 * 1000);
    finalExpiresIso = expires.toISOString();
  }

  const numDays = typeof grantedDays === 'number' ? grantedDays : 7;
  return {
    tenantId,
    tenantName: customBranchName,
    planType: numDays <= 7 ? 'trial' : 'subscription',
    planName: numDays <= 7 ? `ทดลองใช้งาน (${numDays} วัน)` : `แพ็กเกจใช้งาน (${numDays} วัน)`,
    activatedAt: now.toISOString(),
    expiresAt: finalExpiresIso,
    contactName: DEFAULT_CONTACT_NAME,
    contactPhone: DEFAULT_CONTACT_PHONE,
    contactLineId: DEFAULT_CONTACT_LINE,
    adminPin: branchPin,
  };
}

export function getStoredLicense(): LicenseConfig {
  try {
    const key = getLicenseStorageKey();
    const raw = localStorage.getItem(key);
    const tenantId = getActiveTenantId();
    const isBranch = tenantId !== 'default';

    if (!raw) {
      const initial = getDefaultLicenseConfig();
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);

    // สำหรับเครื่องแอดมินหลัก (default): ต้องเป็นแพ็กเกจตลอดชีพ ไม่มีวันหมดอายุ เสมอ
    // หากเคยถูกบันทึกเป็น 30 วัน หรือมีวันหมดอายุ จะอัปเกรดเป็นตลอดชีพอัตโนมัติทันที
    if (!isBranch && (parsed.planType !== 'lifetime' || parsed.expiresAt)) {
      const updatedAdminLicense: LicenseConfig = {
        ...parsed,
        tenantId: 'default',
        tenantName: 'สาขาหลัก (เครื่องแอดมิน)',
        planType: 'lifetime',
        planName: 'แพ็กเกจตลอดชีพ (สิทธิ์แอดมิน)',
        expiresAt: null,
        contactName: parsed.contactName || DEFAULT_CONTACT_NAME,
        contactPhone: parsed.contactPhone || DEFAULT_CONTACT_PHONE,
        contactLineId: parsed.contactLineId || DEFAULT_CONTACT_LINE,
        adminPin: parsed.adminPin || DEFAULT_ADMIN_PIN,
      };
      localStorage.setItem(key, JSON.stringify(updatedAdminLicense));
      return updatedAdminLicense;
    }

    return {
      ...getDefaultLicenseConfig(),
      ...parsed,
      // บังคับอัปเดตข้อมูลติดต่อให้ตรงกับ admin ช่างหน่อยชุมแพ
      contactName: parsed.contactName || DEFAULT_CONTACT_NAME,
      contactPhone: parsed.contactPhone || DEFAULT_CONTACT_PHONE,
      contactLineId: parsed.contactLineId || DEFAULT_CONTACT_LINE,
    };
  } catch (err) {
    console.error('Error loading stored license:', err);
    return getDefaultLicenseConfig();
  }
}

export function saveStoredLicense(config: LicenseConfig): void {
  try {
    const key = getLicenseStorageKey();
    localStorage.setItem(key, JSON.stringify(config));
  } catch (err) {
    console.error('Error saving license config:', err);
  }
}

export function calculateLicenseStatus(config: LicenseConfig): LicenseStatus {
  if (config.planType === 'lifetime' || !config.expiresAt) {
    return {
      isExpired: false,
      isExpiringSoon: false,
      daysRemaining: 9999,
      hoursRemaining: 999999,
      countdownText: 'ตลอดชีพ (ไม่มีวันหมดอายุ)',
      expiresAtFormatted: 'ตลอดชีพ (ไม่มีวันหมดอายุ)',
      isLifetime: true,
      planName: config.planName || 'แพ็กเกจตลอดชีพ (สิทธิ์แอดมิน)',
    };
  }

  const now = new Date();
  const expireDate = new Date(config.expiresAt);
  const diffTime = expireDate.getTime() - now.getTime();
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const remainingHoursInDay = Math.max(0, diffHours % 24);
  const remainingMins = Math.max(0, Math.floor((diffTime / (1000 * 60)) % 60));

  const isExpired = diffTime <= 0;
  const isExpiringSoon = !isExpired && diffDays <= 7;

  let countdownText = '';
  if (isExpired) {
    countdownText = 'หมดอายุแล้ว';
  } else if (diffDays > 1) {
    countdownText = `นับถอยหลัง: เหลืออีก ${diffDays} วัน (${remainingHoursInDay} ชม.)`;
  } else if (diffHours > 0) {
    countdownText = `นับถอยหลัง: เหลืออีก ${diffHours} ชม. ${remainingMins} นาที`;
  } else {
    countdownText = `นับถอยหลัง: เหลืออีก ${remainingMins} นาที`;
  }

  // Format date in Thai format
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const day = expireDate.getDate();
  const month = thaiMonths[expireDate.getMonth()];
  const year = expireDate.getFullYear() + 543;
  const hours = String(expireDate.getHours()).padStart(2, '0');
  const minutes = String(expireDate.getMinutes()).padStart(2, '0');
  const formattedDate = `${day} ${month} ${year} ${hours}:${minutes} น.`;

  return {
    isExpired,
    isExpiringSoon,
    daysRemaining: Math.max(0, diffDays),
    hoursRemaining: Math.max(0, diffHours),
    countdownText,
    expiresAtFormatted: formattedDate,
    isLifetime: false,
    planName: config.planName || 'แพ็กเกจใช้งาน',
  };
}

// Generate code helper
function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).toUpperCase().padStart(4, '0').slice(0, 4);
}

export function generateActivationCode(days: number | 'lifetime'): string {
  const salt = Math.random().toString(36).substring(2, 6).toUpperCase();
  if (days === 'lifetime') {
    const check = hashCode(`LIFE-${salt}`);
    return `ACT-LIFE-${salt}${check}`;
  }
  const check = hashCode(`${days}D-${salt}`);
  return `ACT-${days}D-${salt}${check}`;
}

export interface ActivationCodeResult {
  valid: boolean;
  message: string;
  daysAdded: number | 'lifetime';
  planName: string;
}

export interface RegisteredRenewalCode {
  code: string;
  daysAdded: number | 'lifetime';
  planName: string;
  createdAt: string;
  targetBranch?: string;
  used?: boolean;
  usedAt?: string;
  usedByTenant?: string;
}

export function getRegisteredRenewalCodes(): RegisteredRenewalCode[] {
  try {
    const raw = localStorage.getItem('repair_pro_registered_renewal_codes');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function registerRenewalCode(
  codeOrConfig: string | { code: string; daysAdded: number | 'lifetime'; planName?: string; targetTenantId?: string; targetBranch?: string; note?: string },
  daysAdded?: number | 'lifetime',
  planName?: string,
  targetBranch?: string
): void {
  try {
    const list = getRegisteredRenewalCodes();
    let finalCode = '';
    let finalDays: number | 'lifetime' = 30;
    let finalPlanName = '';
    let finalTarget = '';

    if (typeof codeOrConfig === 'object') {
      finalCode = codeOrConfig.code.trim().toUpperCase();
      finalDays = codeOrConfig.daysAdded;
      finalPlanName = codeOrConfig.planName || (finalDays === 'lifetime' ? 'ตลอดชีพ (Lifetime)' : `ต่ออายุ ${finalDays} วัน`);
      finalTarget = codeOrConfig.targetTenantId || codeOrConfig.targetBranch || '';
    } else {
      finalCode = codeOrConfig.trim().toUpperCase();
      finalDays = daysAdded || 30;
      finalPlanName = planName || (finalDays === 'lifetime' ? 'ตลอดชีพ (Lifetime)' : `ต่ออายุ ${finalDays} วัน`);
      finalTarget = targetBranch || '';
    }

    const item: RegisteredRenewalCode = {
      code: finalCode,
      daysAdded: finalDays,
      planName: finalPlanName,
      createdAt: new Date().toISOString(),
      targetBranch: finalTarget,
      used: false,
    };
    const updated = [item, ...list.filter(x => x.code !== finalCode)];
    localStorage.setItem('repair_pro_registered_renewal_codes', JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving registered renewal code:', err);
  }
}

export function validateAndParseCode(inputCode: string, targetTenantId?: string): ActivationCodeResult {
  const code = inputCode.trim().toUpperCase();
  const currentTenant = targetTenantId || getActiveTenantId();
  const branchUser = isBranchUser() || (currentTenant && currentTenant !== 'default');

  // 1. Check admin-generated / registered renewal codes from Admin
  const registered = getRegisteredRenewalCodes();
  const matchedReg = registered.find(r => r.code === code);
  if (matchedReg) {
    if (matchedReg.used) {
      return {
        valid: false,
        message: 'รหัสต่ออายุนี้ถูกใช้งานไปแล้ว ไม่สามารถนำมาใช้ซ้ำได้ กรุณาติดต่อแอดมินเพื่อขอรหัสใหม่',
        daysAdded: 0,
        planName: '',
      };
    }

    if (matchedReg.targetBranch && currentTenant) {
      const cleanTarget = matchedReg.targetBranch.trim().toLowerCase();
      const cleanCurrent = currentTenant.trim().toLowerCase();
      if (cleanTarget !== cleanCurrent) {
        return {
          valid: false,
          message: `รหัสต่ออายุนี้ถูกกำหนดให้ใช้เฉพาะสาขา "${matchedReg.targetBranch}" เท่านั้น`,
          daysAdded: 0,
          planName: '',
        };
      }
    }

    return {
      valid: true,
      message: `ต่ออายุ ${matchedReg.planName} สำเร็จ`,
      daysAdded: matchedReg.daysAdded,
      planName: matchedReg.planName,
    };
  }

  // 2. SECURITY FIX: If caller is a branch link / branch tenant, STRICTLY FORBID hardcoded master bypass codes!
  // Only admin-issued registered codes or valid branch cryptographic tokens are accepted.
  if (branchUser) {
    // Branch tenants CANNOT self-renew with RENEW-30 or generic codes
    return {
      valid: false,
      message: 'รหัสต่ออายุไม่ถูกต้อง กรุณาติดต่อแอดมินผู้ดูแล (ช่างหน่อยชุมแพ โทร 0992256601 LINE: @228snzee) เพื่อขอรับรหัสต่ออายุของสาขาท่าน',
      daysAdded: 0,
      planName: '',
    };
  }

  // 3. For main admin domain only: Allow standard master renewal codes for testing / emergency admin maintenance
  if (code === 'RENEW-30' || code === 'RENEW30' || code === '30DAYS') {
    return { valid: true, message: 'ต่ออายุ 30 วัน สำเร็จ (รหัสแอดมิน)', daysAdded: 30, planName: 'ต่ออายุ 30 วัน' };
  }
  if (code === 'RENEW-90' || code === 'RENEW90' || code === '90DAYS') {
    return { valid: true, message: 'ต่ออายุ 90 วัน สำเร็จ (รหัสแอดมิน)', daysAdded: 90, planName: 'ต่ออายุ 90 วัน (3 เดือน)' };
  }
  if (code === 'RENEW-180' || code === 'RENEW180' || code === '180DAYS' || code === 'HALF-YEAR') {
    return { valid: true, message: 'ต่ออายุ 180 วัน (6 เดือน) สำเร็จ (รหัสแอดมิน)', daysAdded: 180, planName: 'ต่ออายุ 180 วัน (6 เดือน)' };
  }
  if (code === 'RENEW-360' || code === 'RENEW360' || code === '360DAYS' || code === 'RENEW-365' || code === 'RENEW365' || code === 'YEAR-2026') {
    return { valid: true, message: 'ต่ออายุ 360 วัน (1 ปี) สำเร็จ (รหัสแอดมิน)', daysAdded: 360, planName: 'ต่ออายุ 360 วัน (1 ปี)' };
  }
  if (code === 'LIFETIME' || code === 'LIFETIME-PRO' || code === 'VIP-LIFETIME' || code === 'PRO-LIFETIME') {
    return { valid: true, message: 'ปลดล็อคการใช้งานตลอดชีพสำเร็จ (ไม่มีวันหมดอายุ)', daysAdded: 'lifetime', planName: 'ตลอดชีพ (Lifetime)' };
  }
  if (code === 'TRIAL-7' || code === 'TRIAL7') {
    return { valid: true, message: 'ต่ออายุทดลองใช้งาน 7 วัน สำเร็จ', daysAdded: 7, planName: 'ทดลองใช้งานฟรี (7 วัน)' };
  }

  // 3. Algorithmic ACT- or RP- codes generated by Admin UI
  if (code.startsWith('ACT-LIFE-') || code.startsWith('RP-LIFE-')) {
    const body = code.replace(/^(ACT|RP)-LIFE-/, '');
    if (body.length >= 6) {
      const salt = body.slice(0, 4);
      const check = body.slice(4);
      if (check === hashCode(`LIFE-${salt}`)) {
        return { valid: true, message: 'ปลดล็อคการใช้งานตลอดชีพสำเร็จ', daysAdded: 'lifetime', planName: 'ตลอดชีพ (Lifetime)' };
      }
    }
  }

  const actMatch = code.match(/^(ACT|RP)-(\d+)D-(.+)$/);
  if (actMatch) {
    const days = parseInt(actMatch[2], 10);
    const body = actMatch[3];
    if (days > 0 && body.length >= 6) {
      const salt = body.slice(0, 4);
      const check = body.slice(4);
      if (check === hashCode(`${days}D-${salt}`)) {
        let planDesc = `แพ็กเกจ (+${days} วัน)`;
        if (days === 30) planDesc = 'ต่ออายุ 30 วัน';
        else if (days === 90) planDesc = 'ต่ออายุ 90 วัน (3 เดือน)';
        else if (days === 180) planDesc = 'ต่ออายุ 180 วัน (6 เดือน)';
        else if (days === 360 || days === 365) planDesc = 'ต่ออายุ 360 วัน (1 ปี)';
        return { 
          valid: true, 
          message: `ต่ออายุ ${days} วัน สำเร็จ`, 
          daysAdded: days, 
          planName: planDesc
        };
      }
    }
  }

  // 4. Branch specific dynamic renewal codes e.g. RP-BRANCH01-30D or RENEW-30-BRANCH
  const branchRenewMatch = code.match(/^(?:RP|RENEW)-([A-Z0-9_-]+)-(\d+)D/);
  if (branchRenewMatch) {
    const days = parseInt(branchRenewMatch[2], 10);
    if (days > 0) {
      return {
        valid: true,
        message: `ต่ออายุ ${days} วัน สำเร็จ`,
        daysAdded: days,
        planName: `ต่ออายุ ${days} วัน`,
      };
    }
  }

  return { valid: false, message: 'รหัสต่ออายุไม่ถูกต้องหรือหมดอายุแล้ว กรุณาติดต่อช่างหน่อยชุมแพ โทร 0992256601 ทางไลน์ @228snzee', daysAdded: 0, planName: '' };
}

export function applyRenewalCode(
  inputCode: string, 
  currentConfig: LicenseConfig
): { success: boolean; message: string; updatedConfig: LicenseConfig } {
  const result = validateAndParseCode(inputCode, currentConfig.tenantId);
  if (!result.valid) {
    return {
      success: false,
      message: result.message,
      updatedConfig: currentConfig,
    };
  }

  // Mark registered renewal code as used (single-use per code)
  try {
    const regList = getRegisteredRenewalCodes();
    const cleanCode = inputCode.trim().toUpperCase();
    const regIdx = regList.findIndex(r => r.code === cleanCode);
    if (regIdx !== -1) {
      regList[regIdx].used = true;
      regList[regIdx].usedAt = new Date().toISOString();
      regList[regIdx].usedByTenant = currentConfig.tenantId;
      localStorage.setItem('repair_pro_registered_renewal_codes', JSON.stringify(regList));
    }
  } catch (e) {
    console.error('Error updating registered renewal codes:', e);
  }

  const now = new Date();
  let newExpiresAt: string | null = null;
  let newPlanType: SubscriptionPlanType = 'monthly';

  if (result.daysAdded === 'lifetime') {
    newExpiresAt = null;
    newPlanType = 'lifetime';
  } else {
    // If current license is not expired, extend from current expiry date.
    // If already expired, extend from right now!
    let baseTime = now.getTime();
    if (currentConfig.expiresAt) {
      const currentExpiry = new Date(currentConfig.expiresAt).getTime();
      if (currentExpiry > baseTime) {
        baseTime = currentExpiry;
      }
    }
    const addedTime = result.daysAdded * 24 * 60 * 60 * 1000;
    newExpiresAt = new Date(baseTime + addedTime).toISOString();

    if (result.daysAdded >= 360) {
      newPlanType = 'annual';
    } else if (result.daysAdded >= 180) {
      newPlanType = 'half_year';
    } else if (result.daysAdded >= 90) {
      newPlanType = 'quarterly';
    } else if (result.daysAdded <= 7) {
      newPlanType = 'trial';
    } else {
      newPlanType = 'monthly';
    }
  }

  const updatedConfig: LicenseConfig = {
    ...currentConfig,
    planType: newPlanType,
    planName: result.planName,
    expiresAt: newExpiresAt,
  };

  saveStoredLicense(updatedConfig);

  // Sync to branch history in local storage if this tenant exists
  try {
    if (currentConfig.tenantId) {
      const branches = getStoredBranches();
      const bIdx = branches.findIndex(b => b.tenantCode === currentConfig.tenantId);
      if (bIdx !== -1) {
        const branch = { ...branches[bIdx] };
        branch.expiresAt = newExpiresAt;
        branch.daysGranted = result.daysAdded === 'lifetime' 
          ? 'lifetime' 
          : (typeof branch.daysGranted === 'number' ? branch.daysGranted + result.daysAdded : result.daysAdded);
        branch.renewals = [
          {
            renewedAt: new Date().toISOString(),
            daysAdded: result.daysAdded,
            previousExpiresAt: branches[bIdx].expiresAt,
            newExpiresAt,
            note: `เติมรหัสต่ออายุผ่านสาขา (${result.planName})`,
          },
          ...(branch.renewals || [])
        ];
        branch.url = buildBranchUrl(branch.tenantCode, branch.daysGranted, {
          username: branch.username,
          pin: branch.branchPin,
          expiresAt: newExpiresAt,
          shopName: branch.name,
        });
        branches[bIdx] = branch;
        localStorage.setItem('repair_pro_created_branches_v2', JSON.stringify(branches));
      }
    }
  } catch (err) {
    console.error('Error syncing branch record from renewal:', err);
  }

  return {
    success: true,
    message: result.message,
    updatedConfig,
  };
}

/**
 * แปลง ISO String เป็นวันที่และเวลาภาษาไทย (เช่น 28 ต.ค. 2569 16:30 น.)
 */
export function formatBranchDateThai(isoString?: string | null): string {
  if (!isoString) return 'ตลอดชีพ (ไม่มีวันหมดอายุ)';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const day = d.getDate();
    const month = thaiMonths[d.getMonth()];
    const year = d.getFullYear() + 543;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${minutes} น.`;
  } catch {
    return '-';
  }
}

/**
 * สร้าง URL ลิงก์สาขา พร้อมพารามิเตอร์ครบถ้วน
 */
export function buildBranchUrl(
  branchCode: string, 
  days?: number | 'lifetime',
  options?: {
    username?: string;
    pin?: string;
    expiresAt?: string | null;
    shopName?: string;
  }
): string {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const cleanCode = branchCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!cleanCode || cleanCode === 'default') {
      return `${origin}${pathname}`;
    }

    const params = new URLSearchParams();
    params.set('tenant', cleanCode);

    if (options?.username && options.username.trim() !== cleanCode) {
      params.set('user', options.username.trim());
    }
    if (options?.shopName && options.shopName.trim()) {
      params.set('name', options.shopName.trim());
    }
    if (options?.pin && options.pin.trim() && options.pin.trim() !== '1234') {
      params.set('pin', options.pin.trim());
    }

    if (days === 'lifetime') {
      params.set('plan', 'lifetime');
    } else if (typeof days === 'number' && days > 0) {
      params.set('days', String(days));
    }

    if (options?.expiresAt) {
      params.set('exp', options.expiresAt);
    }

    return `${origin}${pathname}?${params.toString()}`;
  } catch {
    const daysParam = days ? (days === 'lifetime' ? '&plan=lifetime' : `&days=${days}`) : '';
    return `?tenant=${branchCode}${daysParam}`;
  }
}

/**
 * ดึงรายการประวัติลิงก์สาขาทั้งหมดที่บันทึกไว้ในระบบ
 */
export function getStoredBranches(): BranchLinkItem[] {
  try {
    const raw = localStorage.getItem('repair_pro_created_branches_v2');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    // Normalize properties
    return parsed.map((item: any) => ({
      id: item.id || `br_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tenantCode: item.tenantCode || 'branch-01',
      username: item.username || item.tenantCode || 'branch-01',
      name: item.name || `สาขา ${item.tenantCode || 'branch-01'}`,
      initialPin: item.initialPin || item.branchPin || '1234',
      branchPin: item.branchPin || item.initialPin || '1234',
      phone: item.phone || '',
      notes: item.notes || '',
      daysGranted: item.daysGranted || 7,
      createdAt: item.createdAt || new Date().toISOString(),
      expiresAt: item.expiresAt !== undefined ? item.expiresAt : null,
      url: item.url || buildBranchUrl(item.tenantCode || 'branch-01', item.daysGranted),
      lastLoginAt: item.lastLoginAt,
      renewals: Array.isArray(item.renewals) ? item.renewals : [],
    }));
  } catch {
    return [];
  }
}

/**
 * บันทึกหรือสร้างลิงก์สาขาใหม่ลงในประวัติ
 */
export function saveBranchLinkItem(item: BranchLinkItem): BranchLinkItem[] {
  try {
    const current = getStoredBranches();
    const filtered = current.filter(b => b.tenantCode !== item.tenantCode && b.id !== item.id);
    const updated = [item, ...filtered];
    localStorage.setItem('repair_pro_created_branches_v2', JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/**
 * อัปเดตข้อมูลของลิงก์สาขาเดิม
 */
export function updateStoredBranch(updatedItem: BranchLinkItem): BranchLinkItem[] {
  try {
    const current = getStoredBranches();
    const updated = current.map(b => b.id === updatedItem.id || b.tenantCode === updatedItem.tenantCode ? updatedItem : b);
    localStorage.setItem('repair_pro_created_branches_v2', JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/**
 * ลบรายการประวัติลิงก์สาขา
 */
export function deleteStoredBranch(tenantCodeOrId: string): BranchLinkItem[] {
  try {
    const current = getStoredBranches();
    const updated = current.filter(b => b.tenantCode !== tenantCodeOrId && b.id !== tenantCodeOrId);
    localStorage.setItem('repair_pro_created_branches_v2', JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/**
 * ต่ออายุ หรือ ปรับลดอายุให้ลิงก์สาขาในระบบทันที (รองรับทั้ง + เพิ่มวัน และ - ลดวัน)
 */
export function renewStoredBranch(
  tenantCodeOrId: string,
  daysToAdd: number | 'lifetime',
  note?: string
): { success: boolean; message: string; updatedBranch?: BranchLinkItem; updatedBranches: BranchLinkItem[] } {
  try {
    const list = getStoredBranches();
    const index = list.findIndex(b => b.tenantCode === tenantCodeOrId || b.id === tenantCodeOrId);
    if (index === -1) {
      return { success: false, message: 'ไม่พบข้อมูลสาขานี้ในระบบ', updatedBranches: list };
    }

    const branch = { ...list[index] };
    const prevExpires = branch.expiresAt;
    let newExpiresAt: string | null = null;
    let newDaysGranted: number | 'lifetime' = daysToAdd;
    const isReduction = typeof daysToAdd === 'number' && daysToAdd < 0;

    if (daysToAdd === 'lifetime') {
      newExpiresAt = null;
      newDaysGranted = 'lifetime';
    } else if (isReduction) {
      // ลดอายุการใช้งาน
      const now = Date.now();
      let baseTime = now;
      if (branch.expiresAt) {
        baseTime = new Date(branch.expiresAt).getTime();
      } else {
        // จากตลอดชีพ เปลี่ยนเป็นกำหนดวันหมดอายุ โดยหักลบจาก 1 ปีนับจากนี้
        baseTime = now + 365 * 24 * 60 * 60 * 1000;
      }
      const newTime = baseTime + daysToAdd * 24 * 60 * 60 * 1000;
      newExpiresAt = new Date(newTime).toISOString();
      const currentGranted = typeof branch.daysGranted === 'number' ? branch.daysGranted : 365;
      newDaysGranted = Math.max(0, currentGranted + daysToAdd);
    } else {
      // เพิ่มอายุการใช้งาน (+)
      const now = Date.now();
      let baseTime = now;
      if (branch.expiresAt) {
        const curExp = new Date(branch.expiresAt).getTime();
        if (curExp > now) {
          baseTime = curExp; // ขยายต่อจากวันหมดอายุเดิม
        }
      }
      newExpiresAt = new Date(baseTime + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
      newDaysGranted = typeof branch.daysGranted === 'number' ? branch.daysGranted + daysToAdd : daysToAdd;
    }

    const defaultNote = daysToAdd === 'lifetime'
      ? 'ต่ออายุตลอดชีพ'
      : (isReduction ? `ลดอายุการใช้งาน ${Math.abs(daysToAdd)} วัน` : `ต่ออายุเพิ่ม +${daysToAdd} วัน`);

    const renewalEvent: BranchRenewalEvent = {
      renewedAt: new Date().toISOString(),
      daysAdded: daysToAdd,
      previousExpiresAt: prevExpires,
      newExpiresAt,
      note: note || defaultNote,
    };

    branch.expiresAt = newExpiresAt;
    branch.daysGranted = newDaysGranted;
    branch.renewals = [renewalEvent, ...(branch.renewals || [])];
    branch.url = buildBranchUrl(branch.tenantCode, branch.daysGranted, {
      username: branch.username,
      pin: branch.branchPin,
      expiresAt: newExpiresAt,
      shopName: branch.name,
    });

    list[index] = branch;
    localStorage.setItem('repair_pro_created_branches_v2', JSON.stringify(list));

    // หากเบราว์เซอร์นี้เปิด tenant นี้อยู่ ให้อัปเดต license storage ด้วย
    try {
      const activeTenant = getActiveTenantId();
      if (activeTenant === branch.tenantCode) {
        const currentLic = getStoredLicense();
        const updatedLic: LicenseConfig = {
          ...currentLic,
          expiresAt: newExpiresAt,
          planType: daysToAdd === 'lifetime' ? 'lifetime' : (daysToAdd >= 360 ? 'annual' : 'monthly'),
          planName: daysToAdd === 'lifetime' ? 'ตลอดชีพ' : (isReduction ? `ปรับลดเวลา (${daysToAdd} วัน)` : `ต่ออายุ (+${daysToAdd} วัน)`),
        };
        saveStoredLicense(updatedLic);
      }
    } catch {
      // ignore
    }

    const resultMessage = daysToAdd === 'lifetime'
      ? `เปลี่ยนสถานะสาขา "${branch.name}" เป็นตลอดชีพเรียบร้อยแล้ว`
      : (isReduction 
          ? `ลดอายุการใช้งานสาขา "${branch.name}" ลง ${Math.abs(daysToAdd)} วัน เรียบร้อยแล้ว`
          : `ต่ออายุสาขา "${branch.name}" เพิ่ม +${daysToAdd} วัน เรียบร้อยแล้ว`);

    return {
      success: true,
      message: resultMessage,
      updatedBranch: branch,
      updatedBranches: list,
    };
  } catch (err) {
    console.error('Error renewing branch:', err);
    return { success: false, message: 'เกิดข้อผิดพลาดในการต่ออายุ', updatedBranches: getStoredBranches() };
  }
}

/**
 * ปรับเพิ่มหรือลดอายุให้สาขา (Helper สำหรับเรียกใช้ทั้งบวกและลบ)
 */
export function adjustBranchExpiry(
  tenantCodeOrId: string, 
  daysDelta: number, 
  note?: string
) {
  return renewStoredBranch(tenantCodeOrId, daysDelta, note);
}

/**
 * สร้างข้อความสรุปสำหรับส่งให้สาขาทาง LINE หรือ SMS
 */
export function getBranchShareMessage(branch: BranchLinkItem): string {
  const expiryStr = branch.expiresAt ? formatBranchDateThai(branch.expiresAt) : 'ตลอดชีพ (ไม่มีวันหมดอายุ)';
  return `📢 ข้อมูลเข้าใช้งานระบบงานซ่อม RepairProShop
━━━━━━━━━━━━━━━━━━━━
🏪 สาขา: ${branch.name}
👤 ชื่อผู้ใช้ (Username): ${branch.username || branch.tenantCode}
🔑 รหัสผ่าน (PIN): ${branch.branchPin || '1234'}
⏳ วันหมดอายุ: ${expiryStr}
🔗 ลิงก์เข้าใช้งาน: ${branch.url}
━━━━━━━━━━━━━━━━━━━━
📌 คำแนะนำ:
1. เปิดลิงก์ด้านบนในมือถือ แล้วใส่ชื่อผู้ใช้และรหัสผ่านเพื่อเข้าใช้งาน
2. หากเปลี่ยนโทรศัพท์ สามารถใช้รหัสเดิมเข้าสู่ระบบได้ทันที
3. ติดต่อแอดมิน: ช่างหน่อยชุมแพ โทร 099-225-6601 LINE: @228snzee`;
}


