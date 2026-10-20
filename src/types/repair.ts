export type RepairStatus = 
  | 'pending'        // รอซ่อม
  | 'waiting_parts'  // รออะไหล่
  | 'completed'      // ซ่อมแล้ว
  | 'ready_to_ship'  // รอส่ง
  | 'delivered'      // ส่งแล้ว (พร้อมเลขพัสดุ)
  | 'picked_up'      // มารับเอง
  | 'in_progress'    // กำลังซ่อม
  | 'cancelled';     // ยกเลิก

export type CancellationReason = 
  | 'ลูกค้ายกเลิก'
  | 'ซ่อมไม่คุ้ม'
  | 'อาการหนัก'
  | 'อะไหล่ไม่มี'
  | 'อื่นๆ';

export type JobType = 'งานใหม่' | 'งานในประกัน';

// 1) ประเภทการรับงานตอนเปิดงาน: 1.ส่งมา 2.มาเอง 3.ซ่อมนอกสถานที่
export type ServiceChannel = 'ส่งมา' | 'มาเอง' | 'ซ่อมนอกสถานที่';

export type CustomerDecision = 'accepted' | 'cancelled' | 'pending';

export type DeviceCategory = string;

export interface CustomerInfo {
  name: string;
  phone: string;
  lineId?: string;
  email?: string;
  address?: string;
}

export interface DeviceInfo {
  category: DeviceCategory;
  categoryLabel: string;
  brand: string;
  model: string;
  serialNumber?: string; // S/N หรือ IMEI
  color?: string;
  accessories?: string; // อุปกรณ์ที่ติดมาด้วย เช่น อะแดปเตอร์ กล่อง สายชาร์จ
  passcode?: string; // รหัสปลดล็อคเครื่องสำหรับเทส
}

export interface FinancialInfo {
  price: number;        // ประเมินค่าซ่อม (รายได้) / ราคาประเมิน
  onsiteServiceFee?: number; // ค่าบริการนอกสถานที่
  partsCost: number;    // ค่าอะไหล่
  shippingCost: number; // ค่าจัดส่ง
  otherCost: number;    // ค่าใช้จ่ายอื่นๆ
  laborCost: number;    // ค่าแรง
  totalCost: number;    // ต้นทุนรวม (partsCost + shippingCost + otherCost + laborCost)
  profit: number;       // กำไร ((price + onsiteServiceFee) - totalCost)
  customerDecision?: CustomerDecision; // ตกลงซ่อม หรือ ยกเลิก
  deposit: number;      // เงินมัดจำ
  paidAmount: number;   // ยอดชำระแล้ว
  paymentStatus: 'unpaid' | 'deposit_paid' | 'paid';
  paymentMethod?: 'cash' | 'transfer' | 'credit_card' | 'qr';
  paymentSlipUrl?: string; // สลิปหลักฐานการโอนเงิน (Data URL หรือ image URL)
}

export interface WarrantyInfo {
  warrantyDays: number; // จำนวนวันรับประกัน เช่น 30, 60, 90 วัน (0 = ไม่มี)
  startDate?: string;   // วันที่เริ่มรับประกัน (ISO YYYY-MM-DD)
  endDate?: string;     // วันที่สิ้นสุดรับประกัน (ISO YYYY-MM-DD)
  terms?: string;       // เงื่อนไข เช่น ประกันเฉพาะอะไหล่ที่เปลี่ยน ไม่รวมตกน้ำ/ตกกระแทก
}

export interface StatusHistoryEntry {
  status: RepairStatus;
  timestamp: string;
  note?: string;
  updatedBy?: string;
  photos?: string[]; // รูปถ่ายที่แนบในแต่ละขั้นตอนสถานะ
  paymentStatus?: 'paid' | 'pending'; // สถานะชำระเงิน
  paymentMethod?: 'cash' | 'transfer'; // วิธีชำระ: เงินสด หรือ โอน
  paymentSlipUrl?: string; // รูปถ่ายสลิปหลักฐานการโอน
}

export interface WaitingPartItem {
  id?: string;
  name: string;   // รายละเอียดอะไหล่ที่รอ
  price: number;  // ราคาอะไหล่
}

export interface RepairJob {
  id: string; // เช่น REP-202610-001
  createdAt: string; // วดป วันที่รับงาน
  dueDate?: string;  // วันที่นัดรับเครื่อง
  completedAt?: string; // วันที่ซ่อมเสร็จ
  deliveredAt?: string; // วันที่ส่งมอบเครื่องให้ลูกค้า
  
  jobType?: JobType; // 'งานใหม่' | 'งานในประกัน'
  serviceChannel?: ServiceChannel; // 1.ส่งมา 2.มาเอง 3.ซ่อมนอกสถานที่
  customer: CustomerInfo;
  device: DeviceInfo;
  
  issueDescription: string; // อาการเสีย
  technician: string;       // ช่างผู้รับผิดชอบ
  technicianNotes?: string; // บันทึกการตรวจเช็ค / ผลการซ่อม
  
  status: RepairStatus;
  trackingNumber?: string;  // เลขพัสดุ (กรณีจัดส่งพัสดุ)
  waitingParts?: WaitingPartItem[]; // รายการอะไหล่ที่รอ (กรณีสถานะรออะไหล่)
  cancellationReason?: CancellationReason;
  cancellationNotes?: string; // รายละเอียดเหตุผลยกเลิกเพิ่มเติม
  deliveryAttachment?: string; // รูปถ่าย หรือ ไฟล์แนบหลักฐานการส่งมอบ (Data URL หรือ image URL)
  deliveryAttachmentName?: string; // ชื่อไฟล์แนบ
  
  financials: FinancialInfo;
  warranty: WarrantyInfo;
  
  history?: StatusHistoryEntry[];
  stepPhotos?: Record<number, string[]>; // รูปถ่ายแนบแยกตามขั้นตอน 1-5
  stepNotes?: Record<number, string>;    // บันทึกแยกตามขั้นตอน 1-5
}

export interface ShopSettings {
  shopName: string;         // ชื่อร้าน เช่น RepairProShop
  phone: string;            // เบอร์โทร
  lineId: string;           // LINE ID
  lineQrUrl?: string;       // QR Code image URL or link
  address: string;          // ที่อยู่ร้าน
  taxId?: string;
  bankInfo?: string;
  defaultWarrantyDays: number;
  defaultWarrantyTerms: string;
  technicians: string[];    // รายชื่อช่างที่รับผิดชอบ
  customCategories?: string[]; // หมวดหมู่อุปกรณ์ที่สร้างเองในหน้าตั้งค่า
}

export type TimeRangeFilter = 'today' | 'this_week' | 'this_month' | 'last_month' | 'all' | 'custom';
