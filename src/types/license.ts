export type SubscriptionPlanType = 'trial' | 'subscription' | 'monthly' | 'quarterly' | 'half_year' | 'annual' | 'lifetime';

export interface LicenseConfig {
  tenantId: string;           // รหัสสาขา/รหัสแยก เช่น 'default', 'branch-1'
  tenantName: string;         // ชื่อสาขา/ชื่อผู้ใช้งาน
  planType: SubscriptionPlanType;
  planName: string;           // ชื่อแพ็กเกจ เช่น 'ทดลองใช้งานฟรี 7 วัน', 'ต่ออายุ 30 วัน'
  activatedAt: string;        // วันที่เริ่มใช้งาน (ISO string)
  expiresAt?: string | null;  // วันที่หมดอายุ (ISO string, null/undefined สำหรับตลอดชีพ)
  contactName?: string;       // ชื่อผู้ดูแลระบบ เช่น 'ช่างหน่อยชุมแพ'
  contactPhone: string;       // เบอร์ติดต่อแจ้งต่ออายุ เช่น '099-225-6601'
  contactLineId: string;      // Line ID แจ้งต่ออายุ เช่น '@228snzee'
  adminPin: string;           // รหัสผ่านผู้ดูแลเพื่อแก้ไข/ออกรหัสต่ออายุ (เริ่มต้น: '1234')
}

export interface LicenseStatus {
  isExpired: boolean;
  isExpiringSoon: boolean;    // เหลือน้อยกว่าหรือเท่ากับ 7 วัน
  daysRemaining: number;
  hoursRemaining?: number;
  countdownText?: string;     // ข้อความนับถอยหลัง เช่น "เหลืออีก 6 วัน 14 ชม."
  expiresAtFormatted: string;
  isLifetime: boolean;
  planName: string;
}

export interface BranchRenewalEvent {
  renewedAt: string;
  daysAdded: number | 'lifetime';
  previousExpiresAt: string | null;
  newExpiresAt: string | null;
  note?: string;
}

export interface BranchLinkItem {
  id: string;
  tenantCode: string;          // รหัส tenant เช่น 'branch-01'
  username: string;            // ชื่อผู้ใช้สำหรับล็อกอิน เช่น 'branch-01'
  name: string;                // ชื่อร้าน / สาขา เช่น 'สาขาขอนแก่น'
  branchPin: string;           // รหัสผ่าน PIN สาขา เช่น '1234'
  phone?: string;              // เบอร์โทรสาขา
  notes?: string;              // บันทึกเพิ่มเติม
  daysGranted: number | 'lifetime';
  createdAt: string;
  expiresAt: string | null;    // วันที่หมดอายุ (ISO string, null สำหรับตลอดชีพ)
  url: string;                 // URL ลิงก์สาขา
  lastLoginAt?: string;        // เวลาเข้าสู่ระบบล่าสุด
  renewals?: BranchRenewalEvent[]; // ประวัติการต่ออายุ
}

