import React, { useState, useRef } from 'react';
import { 
  X, 
  Check, 
  AlertTriangle, 
  ArrowRight, 
  Truck, 
  Lock, 
  ShieldCheck, 
  Package, 
  Plus, 
  Trash2, 
  DollarSign, 
  PackageCheck,
  Calculator,
  Wrench,
  Clock,
  Upload,
  Image as ImageIcon,
  FileText,
  Eye,
  CheckCircle2,
  Camera,
  CreditCard,
  Banknote,
  Receipt,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { RepairJob, RepairStatus, CancellationReason, WaitingPartItem } from '../types/repair';
import { STATUS_MAP, CANCELLATION_REASONS, formatCurrency, formatDateThai } from '../utils/formatters';

interface StatusUpdateModalProps {
  job: RepairJob | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (
    jobId: string, 
    newStatus: RepairStatus, 
    options: {
      price?: number;
      cancellationReason?: CancellationReason;
      cancellationNotes?: string;
      technicianNotes?: string;
      statusNote?: string;
      trackingNumber?: string;
      actualWarrantyDays?: number;
      waitingParts?: WaitingPartItem[];
      partsCost?: number;
      otherCost?: number;
      onsiteServiceFee?: number;
      shippingCost?: number;
      deliveryAttachment?: string;
      deliveryAttachmentName?: string;
      photos?: string[];
      stepNumber?: number;
      paymentStatus?: 'paid' | 'pending';
      paymentMethod?: 'cash' | 'transfer';
      paymentSlipUrl?: string;
    }
  ) => void;
}

// ลำดับขั้นตอนสถานะงานซ่อม 1-5
const STATUS_TO_STEP: Record<RepairStatus, number> = {
  pending: 1,
  in_progress: 2,
  waiting_parts: 2,
  completed: 3,
  ready_to_ship: 4,
  delivered: 5,
  picked_up: 5,
  cancelled: -1,
};

const STEP_LABELS = [
  { step: 1, label: '1. รับงานซ่อม', desc: 'ตรวจสภาพแรกรับ' },
  { step: 2, label: '2. ตรวจซ่อม/อะไหล่', desc: 'รออะไหล่/เปลี่ยนอะไหล่' },
  { step: 3, label: '3. ซ่อมเสร็จแล้ว', desc: 'สรุปราคา/ประกัน/ชำระเงิน' },
  { step: 4, label: '4. รอส่งมอบ', desc: 'พัสดุ/รับที่ร้าน' },
  { step: 5, label: '5. ส่งมอบสำเร็จ', desc: 'ส่งแล้ว/รับเครื่องแล้ว' },
];

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  job,
  isOpen,
  onClose,
  onUpdateStatus,
}) => {
  if (!isOpen || !job) return null;

  const jobCurrentStep = STATUS_TO_STEP[job.status] ?? 1;
  const isDelivered = job.status === 'delivered';
  const isPickedUp = job.status === 'picked_up';
  const isCancelled = job.status === 'cancelled';
  const isTerminal = isDelivered || isPickedUp || isCancelled;

  // 3) หน้าแท็บสถานะงานซ่อมทั้ง 5 สถานะ เพื่อย้อนดูประวัติงานซ่อม
  const [activeStepTab, setActiveStepTab] = useState<number>(() => {
    if (job.status === 'cancelled') return 1;
    return Math.max(1, jobCurrentStep);
  });

  // Track the minimum progression step
  const [currentProgressStep, setCurrentProgressStep] = useState<number>(() => {
    if (job.status === 'cancelled') return 1;
    return Math.max(1, jobCurrentStep);
  });

  // Step 2 sub-choice: 2.1 รออะไหล่ vs 2.2 เปลี่ยนอะไหล่
  const [step2Sub, setStep2Sub] = useState<'2.1_waiting' | '2.2_replace'>(() => {
    return job.status === 'waiting_parts' ? '2.1_waiting' : '2.2_replace';
  });

  // Step 4 sub-choice: 4.1 จัดส่งทางพัสดุ vs 4.2 มารับเอง
  const [step4Sub, setStep4Sub] = useState<'4.1_shipping' | '4.2_pickup'>(() => {
    return job.status === 'picked_up' ? '4.2_pickup' : '4.1_shipping';
  });

  // Step 2 parts items (+ เพิ่ม/ลบได้หลายรายการ)
  const [partsList, setPartsList] = useState<WaitingPartItem[]>(() => {
    if (job.waitingParts && job.waitingParts.length > 0) {
      return job.waitingParts;
    }
    return [{ name: '', price: 0 }];
  });

  // Step 3 fields: แก้ไขราคาประเมินได้, ต้นทุนอะไหล่, ค่าใช้จ่ายอื่น, บริการนอกสถานที่, ประกัน
  const [estimatedPrice, setEstimatedPrice] = useState<number>(job.financials?.price || 0);

  const initialPartsCost = job.financials?.partsCost && job.financials.partsCost > 0
    ? job.financials.partsCost
    : (job.waitingParts && job.waitingParts.length > 0
      ? job.waitingParts.reduce((sum, p) => sum + (p.price || 0), 0)
      : 0);

  const [partsCost, setPartsCost] = useState<number>(initialPartsCost);
  const [otherCost, setOtherCost] = useState<number>(job.financials?.otherCost || 0);
  const [onsiteServiceFee, setOnsiteServiceFee] = useState<number>(job.financials?.onsiteServiceFee || 0);
  const [actualWarrantyDays, setActualWarrantyDays] = useState<number>(
    job.warranty?.warrantyDays && job.warranty.warrantyDays > 0 ? job.warranty.warrantyDays : 90
  );

  // 4) สถานะชำระแล้ว ในหน้าสถานะซ่อมเสร็จแล้ว (ระบุวิธีชำระ เงินสด, โอน + แนบรูปสลิป, รอชำระ)
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>(
    job.financials?.paymentStatus === 'paid' ? 'paid' : 'pending'
  );
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>(
    job.financials?.paymentMethod === 'cash' ? 'cash' : 'transfer'
  );
  const [paymentSlipUrl, setPaymentSlipUrl] = useState<string>(job.financials?.paymentSlipUrl || '');
  const slipInputRef = useRef<HTMLInputElement>(null);

  // Step 4 fields: จัดส่งพัสดุ (เลขพัสดุ, ค่าส่ง) vs มารับเอง
  const [trackingNumber, setTrackingNumber] = useState<string>(job.trackingNumber || '');
  const [shippingCost, setShippingCost] = useState<number>(job.financials?.shippingCost || 0);

  // 2) รูปถ่ายในแต่ละขั้นตอนของงานซ่อม ทั้ง 5 สถานะ
  const [stepPhotos, setStepPhotos] = useState<Record<number, string[]>>(() => {
    const initial: Record<number, string[]> = {
      1: job.stepPhotos?.[1] || [],
      2: job.stepPhotos?.[2] || [],
      3: job.stepPhotos?.[3] || [],
      4: job.stepPhotos?.[4] || [],
      5: job.stepPhotos?.[5] || (job.deliveryAttachment ? [job.deliveryAttachment] : []),
    };
    return initial;
  });

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 4) State สำหรับการกดย้อนไปแก้ไขขั้นตอนที่ผ่านมาแล้ว (Edit mode per step)
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);

  // Notes & cancellation
  const [technicianNotes, setTechnicianNotes] = useState<string>(job.technicianNotes || '');
  const [stepNotes, setStepNotes] = useState<Record<number, string>>(() => {
    return job.stepNotes || {};
  });

  const [cancellationReason, setCancellationReason] = useState<CancellationReason>(
    job.cancellationReason || 'ลูกค้ายกเลิก'
  );
  const [cancellationNotes, setCancellationNotes] = useState<string>(job.cancellationNotes || '');
  const [showCancelMode, setShowCancelMode] = useState<boolean>(false);

  // Total parts price calculation
  const totalPartsPrice = partsList.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  const handleAddPartItem = () => {
    setPartsList(prev => [...prev, { name: '', price: 0 }]);
  };

  const handleRemovePartItem = (index: number) => {
    setPartsList(prev => {
      const updated = prev.filter((_, i) => i !== index);
      const nextList = updated.length > 0 ? updated : [{ name: '', price: 0 }];
      const newTotal = nextList.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
      setPartsCost(newTotal);
      return nextList;
    });
  };

  const handleUpdatePartItem = (index: number, field: 'name' | 'price', value: any) => {
    setPartsList(prev => {
      const nextList = prev.map((item, i) => {
        if (i === index) {
          return {
            ...item,
            [field]: field === 'price' ? Math.max(0, Number(value) || 0) : value,
          };
        }
        return item;
      });
      // 1) ปรับเพิ่มลดค่าอะไหล่ในช่องต้นทุนอะไหล่ในสถานะที่ 3 (ซ่อมเสร็จ) และหน้ารายได้ทันที
      const newTotal = nextList.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
      setPartsCost(newTotal);
      return nextList;
    });
  };

  // Sync parts price to partsCost
  const handleSyncPartsCost = () => {
    setPartsCost(totalPartsPrice);
  };

  // 2) Handle Photo Attachment for any step (1 to 5)
  const handlePhotoUploadForStep = (stepNumber: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (file.size > 8 * 1024 * 1024) {
        alert('ขนาดไฟล์ภาพต้องไม่เกิน 8MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setStepPhotos(prev => {
          const currentList = prev[stepNumber] || [];
          return {
            ...prev,
            [stepNumber]: [...currentList, result],
          };
        });
      };
      reader.readAsDataURL(file);
    });
    // Reset input
    e.target.value = '';
  };

  const handleRemovePhotoFromStep = (stepNumber: number, photoIndex: number) => {
    setStepPhotos(prev => {
      const currentList = prev[stepNumber] || [];
      return {
        ...prev,
        [stepNumber]: currentList.filter((_, i) => i !== photoIndex),
      };
    });
  };

  // Handle Payment Slip Upload (สำหรับขั้นตอนที่ 3 และ 5)
  const handleSlipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('ขนาดไฟล์สลิปต้องไม่เกิน 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPaymentSlipUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveSlip = () => {
    setPaymentSlipUrl('');
    if (slipInputRef.current) {
      slipInputRef.current.value = '';
    }
  };

  // Financial preview calculation
  const effectiveShipping = step4Sub === '4.1_shipping' ? (shippingCost || 0) : 0;
  const currentTotalCost = (partsCost || 0) + (otherCost || 0) + effectiveShipping;
  const estimatedProfit = (estimatedPrice + (onsiteServiceFee || 0)) - currentTotalCost;

  // ==========================================
  // ACTION HANDLERS PER STEP
  // ==========================================

  // Step 1: บันทึกรับงานซ่อม -> ไปขั้นตอนที่ 2
  const handleSaveStep1 = () => {
    const photos = stepPhotos[1] || [];
    onUpdateStatus(job.id, 'in_progress', {
      stepNumber: 1,
      photos,
      technicianNotes: technicianNotes.trim() || undefined,
      statusNote: 'รับงานซ่อมเข้าสู่ระบบเรียบร้อย ตรวจเช็คสภาพแรกรับและเริ่มตรวจซ่อม',
    });
    setCurrentProgressStep(2);
    setActiveStepTab(2);
  };

  // Step 2: บันทึกข้อมูลกำลังตรวจซ่อม (รออะไหล่ / เปลี่ยนอะไหล่) -> ไปขั้นตอนที่ 3
  const handleSaveStep2 = () => {
    const filteredParts = partsList.filter(p => p.name.trim() !== '' || p.price > 0);
    const resolvedParts = totalPartsPrice > 0 ? totalPartsPrice : partsCost;
    setPartsCost(resolvedParts);

    const targetStatus = step2Sub === '2.1_waiting' ? 'waiting_parts' : 'in_progress';
    const note = step2Sub === '2.1_waiting'
      ? `รออะไหล่: ${filteredParts.map(p => `${p.name} (${formatCurrency(p.price)})`).join(', ') || 'ระบุอะไหล่'} รวม ${formatCurrency(resolvedParts)}`
      : `เปลี่ยนอะไหล่: ${filteredParts.map(p => `${p.name} (${formatCurrency(p.price)})`).join(', ') || 'ระบุอะไหล่'} รวม ${formatCurrency(resolvedParts)}`;

    const photos = stepPhotos[2] || [];

    onUpdateStatus(job.id, targetStatus, {
      stepNumber: 2,
      photos,
      waitingParts: filteredParts,
      partsCost: resolvedParts,
      technicianNotes: technicianNotes.trim() || undefined,
      statusNote: note,
    });

    setPartsCost(resolvedParts);
    setCurrentProgressStep(3);
    setActiveStepTab(3);
  };

  // Step 3: บันทึกซ่อมเสร็จแล้ว + สถานะชำระเงิน -> ไปขั้นตอนที่ 4
  const handleSaveStep3 = () => {
    // 2) กรณีซ่อมเสร็จแล้ว หากติดรอชำระ ยังไม่สามารถกดบันทึกได้
    if (paymentStatus === 'pending') {
      alert('กรณีซ่อมเสร็จแล้ว หากติดสถานะ "รอชำระ" จะยังไม่สามารถกดบันทึกได้ กรุณาระบุการชำระเงิน (เงินสด หรือ โอนเงิน) ให้เรียบร้อยก่อน');
      return;
    }

    if (!actualWarrantyDays || actualWarrantyDays <= 0) {
      alert('กรุณาระบุระยะเวลารับประกัน (วัน)');
      return;
    }

    const filteredParts = partsList.filter(p => p.name.trim() !== '' || p.price > 0);
    const resolvedParts = partsCost > 0 ? partsCost : totalPartsPrice;
    const photos = stepPhotos[3] || [];

    const paymentNote = paymentStatus === 'paid' 
      ? `ชำระแล้ว (${paymentMethod === 'cash' ? 'เงินสด' : 'โอนเงิน'})`
      : 'รอชำระเงิน';

    onUpdateStatus(job.id, 'completed', {
      stepNumber: 3,
      price: Math.max(0, estimatedPrice || 0),
      partsCost: resolvedParts,
      otherCost: otherCost || 0,
      onsiteServiceFee: onsiteServiceFee || 0,
      actualWarrantyDays: actualWarrantyDays,
      waitingParts: filteredParts,
      photos,
      paymentStatus,
      paymentMethod: paymentStatus === 'paid' ? paymentMethod : undefined,
      paymentSlipUrl: paymentStatus === 'paid' && paymentMethod === 'transfer' ? paymentSlipUrl : undefined,
      technicianNotes: technicianNotes.trim() || undefined,
      statusNote: `ซ่อมแล้ว (ราคา: ${formatCurrency(estimatedPrice)}, อะไหล่: ${formatCurrency(resolvedParts)}, สถานะเงิน: ${paymentNote})`,
    });

    setCurrentProgressStep(4);
    setActiveStepTab(4);
  };

  // Step 4: บันทึกรอส่ง (จัดส่งพัสดุ vs มารับเอง) -> ไปขั้นตอนที่ 5
  const handleSaveStep4 = () => {
    const resolvedParts = partsCost > 0 ? partsCost : totalPartsPrice;
    const resolvedShipping = step4Sub === '4.1_shipping' ? (shippingCost || 0) : 0;
    const resolvedTracking = step4Sub === '4.1_shipping' ? trackingNumber.trim() : '';
    const photos = stepPhotos[4] || [];

    onUpdateStatus(job.id, 'ready_to_ship', {
      stepNumber: 4,
      price: Math.max(0, estimatedPrice || 0),
      partsCost: resolvedParts,
      otherCost: otherCost || 0,
      onsiteServiceFee: onsiteServiceFee || 0,
      shippingCost: resolvedShipping,
      trackingNumber: resolvedTracking || undefined,
      actualWarrantyDays: actualWarrantyDays,
      photos,
      technicianNotes: technicianNotes.trim() || undefined,
      statusNote: step4Sub === '4.1_shipping'
        ? `รอส่งพัสดุ (เลขพัสดุ: ${resolvedTracking || 'รอระบุ'}, ค่าส่ง: ${formatCurrency(resolvedShipping)})`
        : 'รอส่ง: ลูกค้าจะมารับเครื่องเองที่ร้าน',
    });

    setCurrentProgressStep(5);
    setActiveStepTab(5);
  };

  // Step 5: บันทึกส่งมอบเรียบร้อย -> บันทึกหน้ารายได้ & ประกัน
  const handleSaveStep5 = () => {
    const targetStatus = step4Sub === '4.2_pickup' ? 'picked_up' : 'delivered';
    const resolvedParts = partsCost > 0 ? partsCost : totalPartsPrice;
    const resolvedShipping = step4Sub === '4.1_shipping' ? (shippingCost || 0) : 0;
    const resolvedTracking = step4Sub === '4.1_shipping' ? trackingNumber.trim() : '';
    const photos = stepPhotos[5] || [];
    const mainDeliveryPhoto = photos.length > 0 ? photos[0] : undefined;

    const paymentNote = paymentStatus === 'paid' 
      ? `ชำระแล้ว (${paymentMethod === 'cash' ? 'เงินสด' : 'โอนเงิน'})`
      : 'รอชำระเงิน';

    onUpdateStatus(job.id, targetStatus, {
      stepNumber: 5,
      price: Math.max(0, estimatedPrice || 0),
      partsCost: resolvedParts,
      otherCost: otherCost || 0,
      onsiteServiceFee: onsiteServiceFee || 0,
      shippingCost: resolvedShipping,
      trackingNumber: resolvedTracking || undefined,
      actualWarrantyDays: actualWarrantyDays,
      deliveryAttachment: mainDeliveryPhoto,
      deliveryAttachmentName: mainDeliveryPhoto ? 'รูปถ่ายส่งมอบ.jpg' : undefined,
      photos,
      paymentStatus,
      paymentMethod: paymentStatus === 'paid' ? paymentMethod : undefined,
      paymentSlipUrl: paymentStatus === 'paid' && paymentMethod === 'transfer' ? paymentSlipUrl : undefined,
      technicianNotes: technicianNotes.trim() || undefined,
      statusNote: targetStatus === 'delivered'
        ? `ส่งมอบเรียบร้อย (จัดส่งพัสดุ ${resolvedTracking || 'ไม่มีเลข'}, ค่าส่ง: ${formatCurrency(resolvedShipping)}, เงิน: ${paymentNote})`
        : `ส่งมอบเรียบร้อย (ลูกค้ารับเองที่ร้าน, เงิน: ${paymentNote})`,
    });

    onClose();
  };

  // 4) Handlers สำหรับการย้อนไปแก้ไขข้อมูลและกดบันทึกใหม่ในแต่ละขั้นตอน (Step 1 - 5)
  const handleSaveEditedStep = (stepNum: number) => {
    const currentPhotos = stepPhotos[stepNum] || [];
    const filteredParts = partsList.filter(p => p.name.trim() !== '' || p.price > 0);

    // 1) ถ้ามีการย้อนกลับไปแก้ไขเพิ่มลดอะไหล่ราคาอะไหล่ในสถานะขั้นตอนที่2 ตรวจซ่อม ให้ปรับเพิ่มค่าอะไหล่ในช่อง ต้นทุนอะไหลในสถานะที่3 ซ่อมเสร็จ และ ปรับเพิ่มในบันทึกหน้ารายได้ ในสถานะที่ 5 ด้วย
    const calculatedParts = totalPartsPrice > 0 ? totalPartsPrice : partsList.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    const resolvedParts = stepNum === 2 ? calculatedParts : (partsCost > 0 ? partsCost : totalPartsPrice);
    if (stepNum === 2) {
      setPartsCost(resolvedParts);
    }

    const resolvedShipping = step4Sub === '4.1_shipping' ? (shippingCost || 0) : 0;
    const resolvedTracking = step4Sub === '4.1_shipping' ? trackingNumber.trim() : '';

    if (stepNum === 3 && paymentStatus === 'pending') {
      alert('กรณีซ่อมเสร็จแล้ว หากติดสถานะ "รอชำระ" จะยังไม่สามารถกดบันทึกได้ กรุณาระบุการชำระเงิน (เงินสด หรือ โอนเงิน) ให้เรียบร้อยก่อน');
      return;
    }

    const paymentNote = paymentStatus === 'paid' 
      ? `ชำระแล้ว (${paymentMethod === 'cash' ? 'เงินสด' : 'โอนเงิน'})`
      : 'รอชำระเงิน';

    onUpdateStatus(job.id, job.status, {
      stepNumber: stepNum,
      price: Math.max(0, estimatedPrice || 0),
      partsCost: resolvedParts,
      otherCost: otherCost || 0,
      onsiteServiceFee: onsiteServiceFee || 0,
      shippingCost: resolvedShipping,
      trackingNumber: resolvedTracking || undefined,
      actualWarrantyDays: actualWarrantyDays,
      waitingParts: filteredParts,
      photos: currentPhotos,
      paymentStatus,
      paymentMethod: paymentStatus === 'paid' ? paymentMethod : undefined,
      paymentSlipUrl: paymentStatus === 'paid' && paymentMethod === 'transfer' ? paymentSlipUrl : undefined,
      technicianNotes: technicianNotes.trim() || undefined,
      statusNote: `แก้ไขข้อมูลขั้นตอนที่ ${stepNum} (${stepNum === 1 ? 'รับงาน' : stepNum === 2 ? `ตรวจซ่อม/อะไหล่ (ปรับต้นทุนอะไหล่เป็น: ${formatCurrency(resolvedParts)})` : stepNum === 3 ? `ซ่อมเสร็จ/การเงิน: ${paymentNote}` : stepNum === 4 ? 'รอส่งมอบ' : 'ส่งมอบ'})`,
    });

    setEditingStep(null);
    setEditSuccessMsg(`บันทึกการแก้ไขขั้นตอนที่ ${stepNum} เรียบร้อยแล้ว (อัปเดตต้นทุนอะไหล่ในขั้นตอนที่ 3 และหน้ารายได้แล้ว)`);
    setTimeout(() => setEditSuccessMsg(null), 3000);
  };

  // Confirm cancel job
  const handleConfirmCancel = () => {
    onUpdateStatus(job.id, 'cancelled', {
      cancellationReason,
      cancellationNotes: cancellationNotes.trim() || undefined,
      statusNote: `ยกเลิกงานซ่อม: ${cancellationReason} ${cancellationNotes ? `- ${cancellationNotes}` : ''}`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base">อัพเดตสถานะและประวัติงานซ่อม</span>
              <span className="text-xs bg-slate-800 px-2.5 py-0.5 rounded font-mono text-blue-300 font-bold border border-slate-700">
                {job.id}
              </span>
              {job.serviceChannel && (
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  job.serviceChannel === 'ส่งมา' 
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' 
                    : job.serviceChannel === 'มาเอง' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {job.serviceChannel === 'ส่งมา' ? '📦 1. ส่งมา' : job.serviceChannel === 'มาเอง' ? '🚶‍♂️ 2. มาเอง' : '🚗 3. นอกสถานที่'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              ลูกค้า: <strong className="text-white">{job.customer.name}</strong> ({job.customer.phone}) • {job.device.brand} {job.device.model}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3) Navigation Tabs: 5 ขั้นตอนสถานะเพื่อย้อนดูประวัติงานซ่อม */}
        <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 shrink-0">
          <div className="text-[11px] font-bold text-slate-600 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>แท็บ 5 สถานะงานซ่อม (คลิกแท็บเพื่อย้อนดูประวัติและรูปถ่ายแต่ละขั้นตอน):</span>
            </span>
            <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-0.2 rounded border border-blue-200">
              สถานะปัจจุบัน: {STATUS_MAP[job.status]?.label}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1">
            {STEP_LABELS.map(st => {
              const isPassed = currentProgressStep > st.step || isTerminal;
              const isCurrent = currentProgressStep === st.step && !isTerminal;
              const isSelected = activeStepTab === st.step;
              const hasPhotos = (stepPhotos[st.step] && stepPhotos[st.step].length > 0);

              return (
                <button
                  key={st.step}
                  type="button"
                  onClick={() => setActiveStepTab(st.step)}
                  className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-300'
                      : isPassed
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                      : isCurrent
                      ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 animate-pulse'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {isPassed ? (
                      <CheckCircle2 className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                    ) : isCurrent ? (
                      <Clock className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-amber-600'}`} />
                    ) : (
                      <span className="w-3 h-3 rounded-full bg-slate-200 text-slate-700 text-[9px] font-bold flex items-center justify-center">
                        {st.step}
                      </span>
                    )}
                    <span className="text-[11px] font-bold truncate">ขั้นที่ {st.step}</span>
                  </div>
                  <div className={`text-[9px] truncate mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                    {st.step === 1 ? 'รับงาน' : st.step === 2 ? 'ตรวจซ่อม' : st.step === 3 ? 'ซ่อมเสร็จ' : st.step === 4 ? 'รอส่ง' : 'ส่งมอบ'}
                  </div>
                  {hasPhotos && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white" title="มีรูปแนบ" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm overflow-y-auto flex-1">
          {editSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{editSuccessMsg}</span>
            </div>
          )}
          
          {/* ============================================================== */}
          {/* TAB 1: 1. รับงานซ่อม */}
          {/* ============================================================== */}
          {activeStepTab === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">1</span>
                    <span>ขั้นตอนที่ 1: รับงานซ่อมเข้าระบบ</span>
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    บันทึกข้อมูลเครื่องแรกรับ อาการเสีย และรูปถ่ายสภาพเครื่องก่อนเริ่มซ่อม
                  </p>
                </div>
                {currentProgressStep > 1 && (
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>ผ่านขั้นตอนนี้แล้ว</span>
                  </span>
                )}
              </div>

              {/* Information Cards */}
              <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">วันที่เปิดงาน:</span>
                  <strong className="text-slate-800">{formatDateThai(job.createdAt, true)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">ช่างผู้รับผิดชอบ:</span>
                  <strong className="text-slate-800">{job.technician}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[11px]">อาการเสียที่แจ้ง:</span>
                  <p className="font-semibold text-slate-900 mt-0.5 bg-white p-2 rounded border border-slate-200">
                    {job.issueDescription}
                  </p>
                </div>
              </div>

              {/* 2) Photo attachment button for Step 1 */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span>รูปถ่ายขั้นตอนที่ 1 (สภาพเครื่องแรกรับ / รอยตำหนิก่อนซ่อม):</span>
                  </span>
                  <label className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition shadow-2xs">
                    <Plus className="w-3.5 h-3.5" />
                    <span>แนบรูปถ่าย</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      className="hidden" 
                      onChange={(e) => handlePhotoUploadForStep(1, e)}
                    />
                  </label>
                </div>

                {/* Photo Previews */}
                {(stepPhotos[1] && stepPhotos[1].length > 0) ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                    {stepPhotos[1].map((img, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-square">
                        <img 
                          src={img} 
                          alt={`รูปรับเครื่อง ${idx + 1}`} 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                          onClick={() => setPreviewImage(img)}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhotoFromStep(1, idx)}
                          className="absolute top-1 right-1 bg-rose-600/90 hover:bg-rose-700 text-white p-1 rounded-full shadow-md cursor-pointer"
                          title="ลบรูปนี้"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center text-slate-400 text-xs">
                    ยังไม่มีรูปถ่ายแนบในขั้นตอนนี้ กดปุ่ม "แนบรูปถ่าย" ด้านบนเพื่อถ่ายรูปหรืออัปโหลด
                  </div>
                )}
              </div>

              {/* Step 1 Action Button */}
              {currentProgressStep === 1 && !isTerminal && (
                <button
                  type="button"
                  onClick={handleSaveStep1}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-98"
                >
                  <Check className="w-4 h-4" />
                  <span>บันทึกขั้นตอนที่ 1 แล้วไปขั้นตอนที่ 2 (ตรวจซ่อม)</span>
                </button>
              )}

              {/* 4) Edit Step 1 if passed */}
              {currentProgressStep > 1 && (
                <div className="pt-2 border-t border-slate-100">
                  {editingStep !== 1 ? (
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>บันทึกขั้นตอนที่ 1 เรียบร้อยแล้ว</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingStep(1)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>แก้ไขขั้นตอนนี้</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-50/80 border border-blue-300 rounded-xl space-y-2.5 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs font-bold text-blue-950">
                        <span>✏️ กำลังแก้ไขข้อมูลขั้นตอนที่ 1 (รูปถ่าย/บันทึกแรกรับ)</span>
                        <button
                          type="button"
                          onClick={() => setEditingStep(null)}
                          className="text-slate-500 hover:text-slate-800 text-xs underline cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveEditedStep(1)}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                      >
                        <Check className="w-4 h-4" />
                        <span>บันทึกการแก้ไขขั้นตอนที่ 1</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: 2. ตรวจซ่อม / อะไหล่ */}
          {/* ============================================================== */}
          {activeStepTab === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">2</span>
                    <span>ขั้นตอนที่ 2: ตรวจซ่อม / รออะไหล่ / เปลี่ยนอะไหล่</span>
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    ระบุรายการอะไหล่ที่รอหรือเปลี่ยน บันทึกอาการตรวจเช็ค และแนบรูปถ่าย
                  </p>
                </div>
                {currentProgressStep > 2 && (
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>ผ่านขั้นตอนนี้แล้ว</span>
                  </span>
                )}
              </div>

              {/* Sub-choice 2.1 vs 2.2 */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStep2Sub('2.1_waiting')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    step2Sub === '2.1_waiting'
                      ? 'bg-purple-100 border-purple-500 font-bold text-purple-900 ring-1 ring-purple-400 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span>2.1) รออะไหล่</span>
                    {step2Sub === '2.1_waiting' && <Check className="w-3.5 h-3.5 text-purple-700" />}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-normal">
                    กรอกรายการอะไหล่ที่สั่งซื้อ & ราคา
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setStep2Sub('2.2_replace')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    step2Sub === '2.2_replace'
                      ? 'bg-purple-100 border-purple-500 font-bold text-purple-900 ring-1 ring-purple-400 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span>2.2) เปลี่ยนอะไหล่</span>
                    {step2Sub === '2.2_replace' && <Check className="w-3.5 h-3.5 text-purple-700" />}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-normal">
                    กรอกรายการอะไหล่ที่เปลี่ยน & ราคา
                  </p>
                </button>
              </div>

              {/* Parts list inputs */}
              <div className="bg-white p-3 rounded-xl border border-purple-200 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-purple-900 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-purple-600" />
                    <span>
                      {step2Sub === '2.1_waiting' ? 'รายการอะไหล่ที่รอ & ราคา' : 'รายการอะไหล่ที่เปลี่ยน & ราคา'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddPartItem}
                    className="text-[11px] font-semibold bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ เพิ่มรายการ</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {partsList.map((item, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="รายละเอียดอะไหล่ เช่น หน้าจอ OLED, แบตเตอรี่..."
                        value={item.name}
                        onChange={(e) => handleUpdatePartItem(index, 'name', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-400"
                      />
                      <div className="w-28 relative">
                        <input
                          type="number"
                          min="0"
                          placeholder="ราคา"
                          value={item.price || ''}
                          onChange={(e) => handleUpdatePartItem(index, 'price', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-right pr-6 focus:ring-2 focus:ring-purple-400"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 pointer-events-none">฿</span>
                      </div>
                      {partsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePartItem(index)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="ลบรายการ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-purple-100 text-xs font-semibold text-purple-950">
                  <span>รวมราคาอะไหล่:</span>
                  <span className="font-mono text-sm font-bold text-purple-900">
                    {formatCurrency(totalPartsPrice)}
                  </span>
                </div>
              </div>

              {/* 2) Photo attachment button for Step 2 */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-purple-600" />
                    <span>รูปถ่ายขั้นตอนที่ 2 (ตรวจเช็คภายใน / อะไหล่ที่รอหรือเปลี่ยน):</span>
                  </span>
                  <label className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition shadow-2xs">
                    <Plus className="w-3.5 h-3.5" />
                    <span>แนบรูปถ่าย</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      className="hidden" 
                      onChange={(e) => handlePhotoUploadForStep(2, e)}
                    />
                  </label>
                </div>

                {/* Photo Previews */}
                {(stepPhotos[2] && stepPhotos[2].length > 0) ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                    {stepPhotos[2].map((img, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-square">
                        <img 
                          src={img} 
                          alt={`รูปตรวจซ่อม ${idx + 1}`} 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                          onClick={() => setPreviewImage(img)}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhotoFromStep(2, idx)}
                          className="absolute top-1 right-1 bg-rose-600/90 hover:bg-rose-700 text-white p-1 rounded-full shadow-md cursor-pointer"
                          title="ลบรูปนี้"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center text-slate-400 text-xs">
                    ยังไม่มีรูปถ่ายแนบในขั้นตอนนี้ กดปุ่ม "แนบรูปถ่าย" เพื่อบันทึกรูปอะไหล่หรือการซ่อม
                  </div>
                )}
              </div>

              {/* Step 2 Action Button */}
              {currentProgressStep === 2 && !isTerminal && (
                <button
                  type="button"
                  onClick={handleSaveStep2}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-98"
                >
                  <Check className="w-4 h-4" />
                  <span>บันทึกขั้นตอนที่ 2 แล้วไปขั้นตอนที่ 3 (ซ่อมเสร็จ)</span>
                </button>
              )}

              {/* 4) Edit Step 2 if passed */}
              {currentProgressStep > 2 && (
                <div className="pt-2 border-t border-slate-100">
                  {editingStep !== 2 ? (
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>บันทึกขั้นตอนที่ 2 เรียบร้อยแล้ว</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingStep(2)}
                        className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>แก้ไขขั้นตอนนี้</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-purple-50/80 border border-purple-300 rounded-xl space-y-2.5 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs font-bold text-purple-950">
                        <span>✏️ กำลังแก้ไขข้อมูลขั้นตอนที่ 2 (อะไหล่/ราคา/รูปถ่าย)</span>
                        <button
                          type="button"
                          onClick={() => setEditingStep(null)}
                          className="text-slate-500 hover:text-slate-800 text-xs underline cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveEditedStep(2)}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                      >
                        <Check className="w-4 h-4" />
                        <span>บันทึกการแก้ไขขั้นตอนที่ 2</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: 3. ซ่อมเสร็จแล้ว (มีระบุสถานะชำระเงิน + สลิปโอน + รูปถ่าย) */}
          {/* ============================================================== */}
          {activeStepTab === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">3</span>
                    <span>ขั้นตอนที่ 3: ซ่อมเสร็จแล้ว & สรุปราคา / ประกัน / การชำระเงิน</span>
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    ปรับแก้ราคาประเมิน, ต้นทุน, วันประกัน และระบุการชำระเงินของลูกค้า
                  </p>
                </div>
                {currentProgressStep > 3 && (
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>ผ่านขั้นตอนนี้แล้ว</span>
                  </span>
                )}
              </div>

              {/* Financial & Warranty Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. แก้ไข ราคาประเมิน */}
                <div className="sm:col-span-2 bg-emerald-100/60 p-2.5 rounded-xl border border-emerald-300">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                      <span>ราคาประเมินค่าซ่อม (บาท) [แก้ไขได้]</span>
                    </label>
                    <span className="text-[10px] text-emerald-700 font-medium">จะบันทึกลงหน้ารายได้</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={estimatedPrice || ''}
                    onChange={(e) => setEstimatedPrice(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-white border border-emerald-400 rounded-lg text-sm font-mono font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    placeholder="0"
                  />
                </div>

                {/* 2. ต้นทุนอะไหล่ */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800">
                      ต้นทุนอะไหล่ (บาท)
                    </label>
                    {totalPartsPrice > 0 && partsCost !== totalPartsPrice && (
                      <button
                        type="button"
                        onClick={handleSyncPartsCost}
                        className="text-[10px] text-emerald-700 hover:underline font-semibold cursor-pointer"
                      >
                        ดึงยอด ({formatCurrency(totalPartsPrice)})
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={partsCost || ''}
                    onChange={(e) => setPartsCost(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                    placeholder="0"
                  />
                </div>

                {/* 3. ค่าใช้จ่ายอื่น */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    ค่าใช้จ่ายอื่น (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={otherCost || ''}
                    onChange={(e) => setOtherCost(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                    placeholder="0"
                  />
                </div>

                {/* 4. ค่าบริการนอกสถานที่ */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    ค่าบริการนอกสถานที่ (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={onsiteServiceFee || ''}
                    onChange={(e) => setOnsiteServiceFee(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                    placeholder="0"
                  />
                </div>

                {/* 5. ระยะเวลารับประกันแท้จริง */}
                <div>
                  <label className="block text-xs font-bold text-emerald-950 mb-1">
                    ระยะเวลารับประกัน (วัน) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={actualWarrantyDays || ''}
                    onChange={(e) => setActualWarrantyDays(Math.max(1, Number(e.target.value)))}
                    className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500"
                    placeholder="เช่น 30, 60, 90"
                  />
                </div>
              </div>

              {/* 4) Section: เพิ่มสถานะชำระแล้ว ในหน้าสถานะซ่อมเสร็จเเล้ว (ระบุวิธีชำระ เงินสด, โอน + ปุ่มแนบรูปสลิป, รอชำระ) */}
              <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-3.5 rounded-xl border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-blue-950 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-blue-600" />
                    <span>สถานะการชำระเงิน (ตามสั่งข้อ 4):</span>
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {paymentStatus === 'paid' ? 'ชำระเงินแล้ว' : 'รอชำระเงิน'}
                  </span>
                </div>

                {/* Payment Status Buttons: ชำระแล้ว vs รอชำระ */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('paid')}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentStatus === 'paid'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ชำระแล้ว</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentStatus('pending')}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentStatus === 'pending'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>รอชำระ</span>
                  </button>
                </div>

                {/* Sub-options when "ชำระแล้ว": เงินสด vs โอน (พร้อมแนบสลิป) */}
                {paymentStatus === 'paid' && (
                  <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-2.5 animate-in fade-in">
                    <label className="block text-[11px] font-bold text-slate-700">
                      ระบุวิธีชำระเงิน:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={`py-1.5 px-2.5 rounded-lg border font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          paymentMethod === 'cash'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        <span>เงินสด</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('transfer')}
                        className={`py-1.5 px-2.5 rounded-lg border font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          paymentMethod === 'transfer'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>โอน (มีปุ่มแนบสลิป)</span>
                      </button>
                    </div>

                    {/* Button to attach slip when transfer is selected */}
                    {paymentMethod === 'transfer' && (
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                            <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                            <span>รูปสลิปหลักฐานการโอน:</span>
                          </span>
                          <label className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition shadow-2xs">
                            <Upload className="w-3 h-3" />
                            <span>แนบรูปสลิป</span>
                            <input 
                              ref={slipInputRef}
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleSlipUpload}
                            />
                          </label>
                        </div>

                        {paymentSlipUrl ? (
                          <div className="relative rounded-lg overflow-hidden border border-indigo-200 bg-slate-50 max-h-48 flex justify-center p-1">
                            <img 
                              src={paymentSlipUrl} 
                              alt="สลิปโอนเงิน" 
                              className="max-h-44 object-contain rounded cursor-pointer"
                              onClick={() => setPreviewImage(paymentSlipUrl)}
                            />
                            <button
                              type="button"
                              onClick={handleRemoveSlip}
                              className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full shadow cursor-pointer"
                              title="ลบสลิปนี้"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="border border-dashed border-indigo-200 rounded-lg p-2.5 text-center text-slate-400 text-[11px]">
                            กดปุ่ม "แนบรูปสลิป" ด้านบนเพื่ออัปโหลดหลักฐานการโอนเงิน
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2) Photo attachment button for Step 3 */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>รูปถ่ายขั้นตอนที่ 3 (เครื่องหลังซ่อมเสร็จ / ผลเทสการทำงาน):</span>
                  </span>
                  <label className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition shadow-2xs">
                    <Plus className="w-3.5 h-3.5" />
                    <span>แนบรูปถ่าย</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      className="hidden" 
                      onChange={(e) => handlePhotoUploadForStep(3, e)}
                    />
                  </label>
                </div>

                {/* Photo Previews */}
                {(stepPhotos[3] && stepPhotos[3].length > 0) ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                    {stepPhotos[3].map((img, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-square">
                        <img 
                          src={img} 
                          alt={`รูปซ่อมเสร็จ ${idx + 1}`} 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                          onClick={() => setPreviewImage(img)}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhotoFromStep(3, idx)}
                          className="absolute top-1 right-1 bg-rose-600/90 hover:bg-rose-700 text-white p-1 rounded-full shadow-md cursor-pointer"
                          title="ลบรูปนี้"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center text-slate-400 text-xs">
                    ยังไม่มีรูปถ่ายแนบในขั้นตอนนี้ กดปุ่ม "แนบรูปถ่าย" เพื่อบันทึกรูปเครื่องหลังซ่อมเสร็จ
                  </div>
                )}
              </div>

              {/* Financial Summary */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>ราคาประเมิน: {formatCurrency(estimatedPrice)} {onsiteServiceFee > 0 ? `+ บริการนอกสถานที่: ${formatCurrency(onsiteServiceFee)}` : ''}</span>
                  <span>ต้นทุนรวม: {formatCurrency(currentTotalCost)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-800 border-t border-slate-200 pt-1 text-sm">
                  <span>กำไรสุทธิประเมิน:</span>
                  <span className="font-mono">{formatCurrency(estimatedProfit)}</span>
                </div>
              </div>

              {/* 2) Notice if payment pending */}
              {paymentStatus === 'pending' && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>⚠️ <strong>กรณีซ่อมเสร็จแล้ว หากติดรอชำระ ยังไม่สามารถกดบันทึกได้:</strong> กรุณาเลือกวิธีชำระเงินเป็น <strong>"ชำระแล้ว (เงินสด หรือ โอนเงิน)"</strong> ด้านบนให้เรียบร้อยก่อนกดบันทึก</span>
                </div>
              )}

              {/* Step 3 Action Button */}
              {currentProgressStep === 3 && !isTerminal && (
                <button
                  type="button"
                  disabled={paymentStatus === 'pending'}
                  onClick={handleSaveStep3}
                  className={`w-full py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all ${
                    paymentStatus === 'pending'
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-98'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {paymentStatus === 'pending'
                      ? 'ติดสถานะรอชำระ (ยังไม่สามารถกดบันทึกได้)'
                      : 'บันทึกขั้นตอนที่ 3 แล้วไปขั้นตอนที่ 4 (รอส่งมอบ)'}
                  </span>
                </button>
              )}

              {/* 4) Edit Step 3 if passed */}
              {currentProgressStep > 3 && (
                <div className="pt-2 border-t border-slate-100">
                  {editingStep !== 3 ? (
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>บันทึกขั้นตอนที่ 3 เรียบร้อยแล้ว</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingStep(3)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>แก้ไขขั้นตอนนี้</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50/80 border border-emerald-300 rounded-xl space-y-2.5 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                        <span>✏️ กำลังแก้ไขข้อมูลขั้นตอนที่ 3 (ราคา, ประกัน, การชำระเงิน, สลิป, รูปถ่าย)</span>
                        <button
                          type="button"
                          onClick={() => setEditingStep(null)}
                          className="text-slate-500 hover:text-slate-800 text-xs underline cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                      </div>
                      <button
                        type="button"
                        disabled={paymentStatus === 'pending'}
                        onClick={() => handleSaveEditedStep(3)}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 ${
                          paymentStatus === 'pending'
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-98'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        <span>
                          {paymentStatus === 'pending'
                            ? 'ติดสถานะรอชำระ (ยังไม่สามารถกดบันทึกได้)'
                            : 'บันทึกการแก้ไขขั้นตอนที่ 3'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: 4. รอส่งมอบ */}
          {/* ============================================================== */}
          {activeStepTab === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-cyan-50/70 border border-cyan-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs">4</span>
                    <span>ขั้นตอนที่ 4: รอส่งมอบ (จัดส่งพัสดุ หรือ มารับเอง)</span>
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    เลือกรูปแบบการส่งมอบ ระบุเลขพัสดุและค่าส่ง หรือลูกค้ารับเครื่องที่ร้าน
                  </p>
                </div>
                {currentProgressStep > 4 && (
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>ผ่านขั้นตอนนี้แล้ว</span>
                  </span>
                )}
              </div>

              {/* Choice buttons: 4.1 จัดส่งทางพัสดุ vs 4.2 มารับเอง */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStep4Sub('4.1_shipping')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    step4Sub === '4.1_shipping'
                      ? 'bg-cyan-100 border-cyan-500 font-bold text-cyan-900 ring-1 ring-cyan-400 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-cyan-600" />
                      <span>จัดส่งทางพัสดุ</span>
                    </span>
                    {step4Sub === '4.1_shipping' && <Check className="w-3.5 h-3.5 text-cyan-700" />}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-normal">
                    กรอกเลขพัสดุ & ค่าส่ง
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setStep4Sub('4.2_pickup')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    step4Sub === '4.2_pickup'
                      ? 'bg-emerald-100 border-emerald-500 font-bold text-emerald-900 ring-1 ring-emerald-400 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>มารับเอง</span>
                    </span>
                    {step4Sub === '4.2_pickup' && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-normal">
                    ลูกค้ามารับเองที่ร้าน (ค่าส่ง 0)
                  </p>
                </button>
              </div>

              {/* Shipping Inputs if 4.1 vs Pickup info if 4.2 */}
              {step4Sub === '4.1_shipping' ? (
                <div className="bg-white p-3 rounded-xl border border-cyan-200 space-y-2.5 shadow-2xs">
                  <div>
                    <label className="block text-xs font-bold text-cyan-950 mb-1">
                      เลขพัสดุ (Tracking Number)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น Flash TH09281394, Kerry KEX991204, EMS ED123..."
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-cyan-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-cyan-950 mb-1">
                      ค่าส่ง (บาท) <span className="text-cyan-600 font-normal">(บันทึกลงในตารางหน้ารายได้)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={shippingCost || ''}
                        onChange={(e) => setShippingCost(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-cyan-300 rounded-lg text-xs font-mono font-bold text-cyan-950 pr-8 focus:ring-2 focus:ring-cyan-500"
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-400">บาท</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4 text-emerald-600" />
                    <span>ลูกค้ามารับเครื่องเองที่ร้าน</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    กำหนดค่าส่งอัตโนมัติเป็น 0 บาท และบันทึกสถานะรอรับมอบที่ร้าน
                  </p>
                </div>
              )}

              {/* 2) Photo attachment button for Step 4 */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-cyan-600" />
                    <span>รูปถ่ายขั้นตอนที่ 4 (การแพ็คเครื่อง / กล่องพัสดุ / เตรียมส่งมอบ):</span>
                  </span>
                  <label className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition shadow-2xs">
                    <Plus className="w-3.5 h-3.5" />
                    <span>แนบรูปถ่าย</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      className="hidden" 
                      onChange={(e) => handlePhotoUploadForStep(4, e)}
                    />
                  </label>
                </div>

                {/* Photo Previews */}
                {(stepPhotos[4] && stepPhotos[4].length > 0) ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                    {stepPhotos[4].map((img, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-square">
                        <img 
                          src={img} 
                          alt={`รูปเตรียมส่ง ${idx + 1}`} 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                          onClick={() => setPreviewImage(img)}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhotoFromStep(4, idx)}
                          className="absolute top-1 right-1 bg-rose-600/90 hover:bg-rose-700 text-white p-1 rounded-full shadow-md cursor-pointer"
                          title="ลบรูปนี้"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center text-slate-400 text-xs">
                    ยังไม่มีรูปถ่ายแนบในขั้นตอนนี้ กดปุ่ม "แนบรูปถ่าย" เพื่อถ่ายรูปกล่องพัสดุหรือเครื่อง
                  </div>
                )}
              </div>

              {/* Step 4 Action Button */}
              {currentProgressStep === 4 && !isTerminal && (
                <button
                  type="button"
                  onClick={handleSaveStep4}
                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-98"
                >
                  <Check className="w-4 h-4" />
                  <span>บันทึกขั้นตอนที่ 4 แล้วไปขั้นตอนที่ 5 (ส่งมอบสำเร็จ)</span>
                </button>
              )}

              {/* 4) Edit Step 4 if passed */}
              {currentProgressStep > 4 && (
                <div className="pt-2 border-t border-slate-100">
                  {editingStep !== 4 ? (
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>บันทึกขั้นตอนที่ 4 เรียบร้อยแล้ว</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingStep(4)}
                        className="px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>แก้ไขขั้นตอนนี้</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-cyan-50/80 border border-cyan-300 rounded-xl space-y-2.5 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs font-bold text-cyan-950">
                        <span>✏️ กำลังแก้ไขข้อมูลขั้นตอนที่ 4 (เลขพัสดุ, ค่าส่ง, รูปถ่าย)</span>
                        <button
                          type="button"
                          onClick={() => setEditingStep(null)}
                          className="text-slate-500 hover:text-slate-800 text-xs underline cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveEditedStep(4)}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                      >
                        <Check className="w-4 h-4" />
                        <span>บันทึกการแก้ไขขั้นตอนที่ 4</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: 5. ส่งมอบสำเร็จ */}
          {/* ============================================================== */}
          {activeStepTab === 5 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs">5</span>
                    <span>ขั้นตอนที่ 5: ส่งมอบสำเร็จ (บันทึกรายได้ & ประกัน)</span>
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    ตรวจสอบการส่งมอบ หลักฐานการรับเครื่อง และสรุปการชำระเงิน
                  </p>
                </div>
                {isTerminal && (
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>เสร็จสิ้นกระบวนการ</span>
                  </span>
                )}
              </div>

              {/* Delivery Summary Banner */}
              <div className="bg-white p-3 rounded-xl border border-teal-200 space-y-2 text-xs shadow-2xs">
                <div className="flex items-center justify-between text-teal-950 font-bold border-b border-teal-100 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-teal-600" />
                    <span>ยืนยันการส่งมอบเครื่อง</span>
                  </span>
                  <span className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded text-[11px]">
                    {step4Sub === '4.1_shipping' 
                      ? `จัดส่งพัสดุ (${trackingNumber || 'ไม่มีเลขพัสดุ'})` 
                      : 'ลูกค้ามารับเองที่ร้าน'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 pt-0.5">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">บันทึกหน้ารายได้:</span>
                    <span className="font-bold text-slate-800">
                      ราคา: {formatCurrency(estimatedPrice)} • กำไร: {formatCurrency(estimatedProfit)}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">สถานะชำระเงิน:</span>
                    <span className={`font-bold ${paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {paymentStatus === 'paid' 
                        ? `ชำระแล้ว (${paymentMethod === 'cash' ? 'เงินสด' : 'โอนเงิน'})` 
                        : 'รอชำระเงิน'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2) Photo attachment button for Step 5 */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-teal-600" />
                    <span>รูปถ่ายขั้นตอนที่ 5 (หลักฐานการส่งมอบ / ลูกค้ารับเครื่อง / ใบเสร็จ):</span>
                  </span>
                  <label className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition shadow-2xs">
                    <Plus className="w-3.5 h-3.5" />
                    <span>แนบรูปถ่าย</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      className="hidden" 
                      onChange={(e) => handlePhotoUploadForStep(5, e)}
                    />
                  </label>
                </div>

                {/* Photo Previews */}
                {(stepPhotos[5] && stepPhotos[5].length > 0) ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                    {stepPhotos[5].map((img, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-square">
                        <img 
                          src={img} 
                          alt={`รูปส่งมอบ ${idx + 1}`} 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                          onClick={() => setPreviewImage(img)}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhotoFromStep(5, idx)}
                          className="absolute top-1 right-1 bg-rose-600/90 hover:bg-rose-700 text-white p-1 rounded-full shadow-md cursor-pointer"
                          title="ลบรูปนี้"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center text-slate-400 text-xs">
                    ยังไม่มีรูปถ่ายแนบในขั้นตอนนี้ กดปุ่ม "แนบรูปถ่าย" เพื่อถ่ายรูปหลักฐานการส่งมอบ
                  </div>
                )}
              </div>

              {/* Step 5 Action Button */}
              {currentProgressStep === 5 && !isTerminal && (
                <button
                  type="button"
                  onClick={handleSaveStep5}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-98"
                >
                  <Check className="w-4 h-4" />
                  <span>บันทึกการส่งมอบสำเร็จ (เสร็จสิ้นกระบวนการ)</span>
                </button>
              )}

              {/* 4) Edit Step 5 if completed / terminal */}
              {isTerminal && (
                <div className="pt-2 border-t border-slate-100">
                  {editingStep !== 5 ? (
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>งานนี้ส่งมอบเรียบร้อยสมบูรณ์แล้ว</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingStep(5)}
                        className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>แก้ไขขั้นตอนนี้</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-teal-50/80 border border-teal-300 rounded-xl space-y-2.5 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs font-bold text-teal-950">
                        <span>✏️ กำลังแก้ไขข้อมูลขั้นตอนที่ 5 (รูปส่งมอบ/การเงิน)</span>
                        <button
                          type="button"
                          onClick={() => setEditingStep(null)}
                          className="text-slate-500 hover:text-slate-800 text-xs underline cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveEditedStep(5)}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                      >
                        <Check className="w-4 h-4" />
                        <span>บันทึกการแก้ไขขั้นตอนที่ 5</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Cancellation section */}
          {!isTerminal && (
            <div className="pt-2 border-t border-slate-200">
              {!showCancelMode ? (
                <button
                  type="button"
                  onClick={() => setShowCancelMode(true)}
                  className="text-xs text-rose-600 hover:text-rose-800 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>ลูกค้ายกเลิกงานซ่อม หรือซ่อมไม่ได้?</span>
                </button>
              ) : (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>ยกเลิกงานซ่อมนี้</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCancelMode(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ปิด
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {CANCELLATION_REASONS.map(reason => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setCancellationReason(reason)}
                        className={`p-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                          cancellationReason === reason
                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs font-bold'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-100'
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="เหตุผลเพิ่มเติม (ถ้ามี)"
                    value={cancellationNotes}
                    onChange={(e) => setCancellationNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-rose-300 rounded-lg text-xs"
                  />

                  <button
                    type="button"
                    onClick={handleConfirmCancel}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    ยืนยันยกเลิกงานซ่อมนี้
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            แท็บที่เปิดดู: <strong className="text-slate-800">ขั้นตอนที่ {activeStepTab}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition cursor-pointer shadow-2xs"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>

      {/* Lightbox Modal for Photo Preview */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 p-1"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={previewImage} 
              alt="ภาพขยาย" 
              className="max-h-[85vh] max-w-full object-contain rounded-xl border border-white/20 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
