import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  RefreshCw, 
  Trash2, 
  Clock, 
  Phone, 
  Smartphone, 
  CheckCircle, 
  AlertTriangle, 
  ShieldAlert, 
  User, 
  DollarSign,
  Share2,
  Package,
  Truck,
  CreditCard,
  Banknote,
  Receipt,
  Camera,
  Layers,
  MapPin,
  CheckCircle2,
  Check,
  Eye
} from 'lucide-react';
import { RepairJob, ShopSettings } from '../types/repair';
import { 
  STATUS_MAP, 
  formatCurrency, 
  formatDateThai, 
  getJobWarrantyStatus 
} from '../utils/formatters';

interface JobDetailModalProps {
  job: RepairJob | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenStatusUpdate: (job: RepairJob) => void;
  onOpenPrint: (job: RepairJob) => void;
  onDeleteJob: (jobId: string) => void;
  shopSettings: ShopSettings;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  isOpen,
  onClose,
  onOpenStatusUpdate,
  onOpenPrint,
  onDeleteJob,
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (!isOpen || !job) return null;

  const warrantyResult = getJobWarrantyStatus(job);
  const balanceDue = (job.financials.price || 0) + (job.financials.onsiteServiceFee || 0) - (job.financials.paidAmount || 0);

  const handleDelete = () => {
    if (confirm(`คุณต้องการลบงานซ่อมรหัส "${job.id}" ของคุณ ${job.customer.name} ใช่หรือไม่?`)) {
      onDeleteJob(job.id);
      onClose();
    }
  };

  const isPaid = job.financials.paymentStatus === 'paid';
  const hasSlip = !!job.financials.paymentSlipUrl;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-base bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2.5 py-1 rounded-lg">
              {job.id}
            </span>
            <div>
              <h2 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <span>{job.device.brand} {job.device.model}</span>
              </h2>
              <p className="text-xs text-slate-400">
                เปิดรับงาน: {formatDateThai(job.createdAt, true)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenPrint(job)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="พิมพ์เอกสาร"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          
          {/* Status & Quick Action Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Job Type: งานใหม่ / งานในประกัน */}
              {job.jobType === 'งานในประกัน' ? (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  🛡️ ในประกัน
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                  🆕 งานใหม่
                </span>
              )}

              {/* 1) ประเภทการรับงานตอนเปิดงาน: 1.ส่งมา 2.มาเอง 3.ซ่อมนอกสถานที่ */}
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                job.serviceChannel === 'ส่งมา'
                  ? 'bg-sky-100 text-sky-800 border border-sky-300'
                  : job.serviceChannel === 'ซ่อมนอกสถานที่'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {job.serviceChannel === 'ส่งมา' && <Package className="w-3.5 h-3.5" />}
                {job.serviceChannel === 'มาเอง' && <User className="w-3.5 h-3.5" />}
                {job.serviceChannel === 'ซ่อมนอกสถานที่' && <Truck className="w-3.5 h-3.5" />}
                <span>
                  {job.serviceChannel === 'ส่งมา' 
                    ? '1. ส่งมา' 
                    : job.serviceChannel === 'ซ่อมนอกสถานที่' 
                    ? '3. ซ่อมนอกสถานที่' 
                    : '2. มาเอง'}
                </span>
              </span>

              {/* Status Badge */}
              <span className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${STATUS_MAP[job.status]?.badgeClass}`}>
                {STATUS_MAP[job.status]?.label}
              </span>

              {job.trackingNumber && (
                <span className="text-xs bg-teal-50 text-teal-800 border border-teal-300 px-2.5 py-1 rounded-md font-mono font-bold">
                  เลขพัสดุ: {job.trackingNumber}
                </span>
              )}

              {job.status === 'cancelled' && job.cancellationReason && (
                <span className="text-xs bg-rose-100 text-rose-800 px-2.5 py-1 rounded-md font-medium">
                  เหตุผล: {job.cancellationReason}
                </span>
              )}
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenStatusUpdate(job);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>เปลี่ยนสถานะงาน</span>
            </button>
          </div>

          {/* Cancellation details if cancelled */}
          {job.status === 'cancelled' && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-800 space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>งานนี้ถูกยกเลิก: {job.cancellationReason}</span>
              </div>
              {job.cancellationNotes && (
                <p className="text-rose-700">หมายเหตุ: {job.cancellationNotes}</p>
              )}
            </div>
          )}

          {/* Customer & Device Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Box */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-white">
              <div className="flex items-center justify-between text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-500" />
                  <span>ข้อมูลลูกค้า</span>
                </div>
                <span className="text-[11px] text-slate-400">ช่องทาง: {job.serviceChannel || 'มาเอง'}</span>
              </div>
              <div className="text-base font-bold text-slate-800">{job.customer.name}</div>
              <div className="text-xs text-slate-600 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <a href={`tel:${job.customer.phone}`} className="hover:text-blue-600 font-medium">
                  {job.customer.phone}
                </a>
              </div>
              {job.customer.lineId && (
                <div className="text-xs text-slate-600">
                  <span className="text-slate-400">LINE ID: </span>
                  <span className="font-medium text-emerald-700">{job.customer.lineId}</span>
                </div>
              )}
              {job.customer.address && (
                <div className="text-xs text-slate-500">
                  <span>ที่อยู่: </span>
                  <span>{job.customer.address}</span>
                </div>
              )}
            </div>

            {/* Device Box */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-white">
              <div className="flex items-center gap-2 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <Smartphone className="w-4 h-4 text-indigo-500" />
                <span>ข้อมูลอุปกรณ์</span>
              </div>
              <div className="text-base font-bold text-slate-800">
                {job.device.brand} {job.device.model}
              </div>
              <div className="text-xs text-slate-600">
                ประเภท: <span className="font-medium">{job.device.categoryLabel}</span>
                {job.device.color && <span> • สี {job.device.color}</span>}
              </div>
              <div className="text-xs text-slate-600">
                S/N หรือ IMEI: <span className="font-mono font-medium">{job.device.serialNumber || '-'}</span>
              </div>
              {job.device.accessories && (
                <div className="text-xs text-slate-500">
                  อุปกรณ์ติดมา: {job.device.accessories}
                </div>
              )}
              {job.device.passcode && (
                <div className="text-xs text-amber-700 font-mono">
                  รหัสผ่านเครื่อง: {job.device.passcode}
                </div>
              )}
            </div>
          </div>

          {/* Issue & Technician */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">อาการเสีย</span>
              <p className="mt-1 text-sm font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {job.issueDescription}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-500">ช่างผู้ดูแล: </span>
                <span className="font-semibold text-slate-800">{job.technician}</span>
              </div>
              <div>
                <span className="text-slate-500">วันนัดรับเครื่อง: </span>
                <span className="font-semibold text-blue-600">
                  {job.dueDate ? formatDateThai(job.dueDate) : '-'}
                </span>
              </div>
            </div>
            {job.technicianNotes && (
              <div className="text-xs bg-amber-50/60 border border-amber-200 p-2.5 rounded-lg">
                <span className="font-bold text-amber-900 block">บันทึกตรวจเช็ค/ผลการซ่อม:</span>
                <p className="text-amber-800 mt-0.5">{job.technicianNotes}</p>
              </div>
            )}
          </div>

          {/* 4) Financials & Payment Card (ชำระแล้ว, เงินสด/โอน, สลิป) */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>สรุปการเงิน & สถานะการชำระเงิน</span>
              </span>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                  isPaid ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {isPaid ? `ชำระแล้ว (${job.financials.paymentMethod === 'cash' ? 'เงินสด' : 'โอนเงิน'})` : 'รอชำระเงิน'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-200">
                <span className="text-[11px] text-blue-600 font-medium">ค่าซ่อม (รายได้)</span>
                <div className="text-base font-bold text-blue-900 mt-0.5">
                  {formatCurrency(job.financials.price)}
                </div>
                {job.financials.onsiteServiceFee && job.financials.onsiteServiceFee > 0 && (
                  <div className="text-[10px] text-amber-700">+ นอกสถานที่ {formatCurrency(job.financials.onsiteServiceFee)}</div>
                )}
              </div>

              <div className="bg-rose-50/60 p-2.5 rounded-lg border border-rose-200">
                <span className="text-[11px] text-rose-600 font-medium">ต้นทุนรวม</span>
                <div className="text-base font-bold text-rose-800 mt-0.5">
                  {formatCurrency(job.financials.totalCost)}
                </div>
                <div className="text-[10px] text-slate-500">อะไหล่ {formatCurrency(job.financials.partsCost)}</div>
              </div>

              <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200">
                <span className="text-[11px] text-emerald-600 font-medium">กำไรสุทธิ</span>
                <div className="text-base font-bold text-emerald-800 mt-0.5">
                  {formatCurrency(job.financials.profit)}
                </div>
                <div className="text-[10px] text-emerald-700 font-medium">
                  {job.financials.price > 0 ? `${Math.round((job.financials.profit / job.financials.price) * 100)}%` : '0%'}
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 font-medium">ยอดคงค้าง</span>
                <div className={`text-base font-bold mt-0.5 ${balanceDue > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                  {balanceDue > 0 ? formatCurrency(balanceDue) : 'ชำระครบ'}
                </div>
                <div className="text-[10px] text-slate-500">มัดจำ {formatCurrency(job.financials.deposit)}</div>
              </div>
            </div>

            {/* Payment Slip Display if available */}
            {hasSlip && (
              <div className="mt-3 p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-950">หลักฐานสลิปโอนเงิน:</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewImage(job.financials.paymentSlipUrl!)}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>ดูรูปสลิป</span>
                </button>
              </div>
            )}
          </div>

          {/* Warranty Section */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-indigo-600" />
                <span>ข้อมูลการรับประกัน</span>
              </span>
              <span className={`px-2.5 py-0.5 rounded-md text-xs ${warrantyResult.badgeClass}`}>
                {warrantyResult.label}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1 text-slate-600">
              <div>ระยะเวลาประกัน: <strong>{job.warranty.warrantyDays} วัน</strong></div>
              <div>
                {job.status === 'delivered' ? (
                  <>วันส่งพัสดุ: <strong>{warrantyResult.deliveryDate ? formatDateThai(warrantyResult.deliveryDate) : '-'}</strong></>
                ) : (
                  <>เริ่มนับประกัน: <strong className="text-amber-700">เมื่อส่งมอบ</strong></>
                )}
              </div>
              <div>
                {job.status === 'delivered' ? (
                  <>หมดประกัน: <strong>{warrantyResult.endDate ? formatDateThai(warrantyResult.endDate) : '-'}</strong></>
                ) : (
                  <>สถานะ: <strong className="text-amber-700">ยังไม่เริ่มนับ</strong></>
                )}
              </div>
            </div>
          </div>

          {/* 2 & 5) รูปถ่ายที่แนบในแต่ละขั้นตอนของงานซ่อม (ทั้ง 5 ขั้นตอน) */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-blue-600" />
                <span>รูปถ่ายในแต่ละขั้นตอนของงานซ่อม (ทั้ง 5 สถานะ)</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenStatusUpdate(job);
                }}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>+ แนบรูปเพิ่ม</span>
              </button>
            </div>

            <div className="space-y-3 pt-1">
              {[1, 2, 3, 4, 5].map(stepNum => {
                const photos = job.stepPhotos?.[stepNum] || (stepNum === 5 && job.deliveryAttachment ? [job.deliveryAttachment] : []);
                const stepLabel = stepNum === 1 ? '1. รับงานซ่อม' : stepNum === 2 ? '2. ตรวจซ่อม/อะไหล่' : stepNum === 3 ? '3. ซ่อมเสร็จแล้ว' : stepNum === 4 ? '4. รอส่งมอบ' : '5. ส่งมอบสำเร็จ';
                
                if (photos.length === 0) return null;

                return (
                  <div key={stepNum} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                        {stepNum}
                      </span>
                      <span>รูปถ่ายขั้นตอนที่ {stepLabel}:</span>
                      <span className="text-slate-400 font-normal">({photos.length} รูป)</span>
                    </span>

                    <div className="grid grid-cols-4 gap-2">
                      {photos.map((img, pIdx) => (
                        <div key={pIdx} className="relative rounded-lg overflow-hidden border border-slate-200 bg-white aspect-square shadow-2xs">
                          <img 
                            src={img} 
                            alt={`รูปขั้น ${stepNum}-${pIdx + 1}`} 
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                            onClick={() => setPreviewImage(img)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* If no photos attached anywhere yet */}
              {(!job.stepPhotos || Object.values(job.stepPhotos).every(arr => !arr || arr.length === 0)) && !job.deliveryAttachment && (
                <div className="text-center py-4 border border-dashed border-slate-300 rounded-xl text-slate-400 text-xs">
                  ยังไม่มีรูปถ่ายแนบในงานนี้ สามารถกดปุ่ม "เปลี่ยนสถานะงาน" เพื่อแนบรูปถ่ายในแต่ละขั้นตอนได้
                </div>
              )}
            </div>
          </div>

          {/* 5) Status Timeline History (ประวัติการดำเนินงานซ่อมให้แสดงให้สอดคล้องกับสถานะงานซ่อม) */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3.5 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>ประวัติและขั้นตอนการดำเนินงาน (Timeline)</span>
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                สถานะปัจจุบัน: {STATUS_MAP[job.status]?.label}
              </span>
            </div>

            {/* 5-Step Visual Stepper Bar matching current repair status */}
            {job.status !== 'cancelled' && (() => {
              const currentStep = job.status === 'pending' ? 1 
                : (job.status === 'in_progress' || job.status === 'waiting_parts') ? 2
                : job.status === 'completed' ? 3
                : job.status === 'ready_to_ship' ? 4
                : 5;

              const steps = [
                { num: 1, label: '1. รับงาน' },
                { num: 2, label: '2. ตรวจซ่อม' },
                { num: 3, label: '3. ซ่อมเสร็จ' },
                { num: 4, label: '4. รอส่งมอบ' },
                { num: 5, label: '5. ส่งมอบ' },
              ];

              return (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="grid grid-cols-5 gap-1 text-center">
                    {steps.map(s => {
                      const isDone = currentStep > s.num;
                      const isCurrent = currentStep === s.num;
                      return (
                        <div key={s.num} className="flex flex-col items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                            isDone 
                              ? 'bg-emerald-600 text-white' 
                              : isCurrent
                              ? 'bg-blue-600 text-white ring-2 ring-blue-300 ring-offset-1 animate-pulse'
                              : 'bg-slate-200 text-slate-500'
                          }`}>
                            {isDone ? <Check className="w-3.5 h-3.5" /> : s.num}
                          </div>
                          <span className={`text-[10px] mt-1 font-semibold truncate max-w-full ${
                            isCurrent ? 'text-blue-700 font-bold' : isDone ? 'text-emerald-700' : 'text-slate-400'
                          }`}>
                            {s.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {job.history && job.history.length > 0 && (
              <div className="space-y-3 pt-1">
                {job.history.map((h, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs border-b border-slate-100 last:border-b-0 pb-2.5 last:pb-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-1 shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {STATUS_MAP[h.status]?.label || h.status}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatDateThai(h.timestamp, true)}
                        </span>
                      </div>
                      {h.note && <p className="text-slate-600 text-xs leading-relaxed">{h.note}</p>}
                      {h.paymentStatus && (
                        <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <span>สถานะชำระ: {h.paymentStatus === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}</span>
                          {h.paymentMethod && <span>({h.paymentMethod === 'cash' ? 'เงินสด' : 'โอน'})</span>}
                        </div>
                      )}
                      {h.photos && h.photos.length > 0 && (
                        <div className="flex gap-1.5 pt-1">
                          {h.photos.map((p, pI) => (
                            <img 
                              key={pI} 
                              src={p} 
                              alt="รูปประวัติ" 
                              className="w-12 h-12 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-80"
                              onClick={() => setPreviewImage(p)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={handleDelete}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>ลบงานนี้</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenPrint(job)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ใบรับซ่อม</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenStatusUpdate(job);
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>อัพเดตสถานะ</span>
            </button>
          </div>
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
