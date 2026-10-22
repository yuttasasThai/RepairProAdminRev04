import React, { useState } from 'react';
import { 
  X, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  Phone, 
  MessageCircle, 
  Key, 
  CheckCircle2, 
  Calendar,
  Sparkles,
  ExternalLink,
  Store,
  Eye,
  EyeOff
} from 'lucide-react';
import { LicenseConfig, LicenseStatus } from '../types/license';
import { 
  applyRenewalCode, 
  formatBranchDateThai, 
  DEFAULT_CONTACT_NAME, 
  DEFAULT_CONTACT_PHONE, 
  DEFAULT_CONTACT_PHONE_RAW, 
  DEFAULT_CONTACT_LINE 
} from '../utils/license';

interface BranchLicenseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  licenseConfig: LicenseConfig;
  licenseStatus: LicenseStatus;
  onLicenseUpdated: (newConfig: LicenseConfig) => void;
}

export const BranchLicenseStatusModal: React.FC<BranchLicenseStatusModalProps> = ({
  isOpen,
  onClose,
  licenseConfig,
  licenseStatus,
  onLicenseUpdated,
}) => {
  const [renewalCode, setRenewalCode] = useState('');
  const [showRenewalCode, setShowRenewalCode] = useState(false);
  const [renewalMessage, setRenewalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleApplyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setRenewalMessage(null);

    if (!renewalCode.trim()) {
      setRenewalMessage({ type: 'error', text: 'กรุณากรอกรหัสต่ออายุที่ได้รับจากแอดมิน' });
      return;
    }

    const res = applyRenewalCode(renewalCode, licenseConfig);
    if (res.success) {
      setRenewalMessage({ type: 'success', text: res.message });
      onLicenseUpdated(res.updatedConfig);
      setRenewalCode('');
    } else {
      setRenewalMessage({ type: 'error', text: res.message });
    }
  };

  const contactName = licenseConfig.contactName || DEFAULT_CONTACT_NAME;
  const contactPhone = licenseConfig.contactPhone || DEFAULT_CONTACT_PHONE;
  const contactLine = licenseConfig.contactLineId || DEFAULT_CONTACT_LINE;
  const cleanLine = contactLine.replace('@', '');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        
        {/* Header (Branch Specific - Clean & Dedicated) */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-400/30 rounded-xl">
              <Store className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">อายุการใช้งานสาขา</h3>
              <p className="text-xs text-blue-300 font-mono">
                {licenseConfig.tenantName || `สาขา: ${licenseConfig.tenantId}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-slate-700">
          
          {/* Main Expiry & Countdown Card */}
          <div className={`p-5 rounded-2xl border ${
            licenseStatus.isExpired
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : licenseStatus.isExpiringSoon
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : licenseStatus.isLifetime
              ? 'bg-amber-50/50 border-yellow-300 text-amber-950'
              : 'bg-emerald-50 border-emerald-200 text-emerald-950'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-xl ${
                  licenseStatus.isExpired
                    ? 'bg-rose-100 text-rose-600'
                    : licenseStatus.isExpiringSoon
                    ? 'bg-amber-100 text-amber-600'
                    : licenseStatus.isLifetime
                    ? 'bg-yellow-100 text-yellow-600'
                    : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {licenseStatus.isExpired ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : licenseStatus.isExpiringSoon ? (
                    <Clock className="w-6 h-6" />
                  ) : (
                    <ShieldCheck className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-medium opacity-80">สถานะปัจจุบัน</div>
                  <div className="text-lg font-bold">
                    {licenseStatus.isExpired ? 'หมดอายุการใช้งานแล้ว' : licenseStatus.isLifetime ? 'ใช้งานได้ตลอดชีพ' : 'กำลังใช้งานได้ปกติ'}
                  </div>
                </div>
              </div>

              <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                licenseStatus.isExpired
                  ? 'bg-rose-200/80 text-rose-800 border-rose-300'
                  : licenseStatus.isExpiringSoon
                  ? 'bg-amber-200/80 text-amber-800 border-amber-300 animate-pulse'
                  : licenseStatus.isLifetime
                  ? 'bg-yellow-200/80 text-yellow-800 border-yellow-300'
                  : 'bg-emerald-200/80 text-emerald-800 border-emerald-300'
              }`}>
                {licenseStatus.isLifetime ? 'ตลอดชีพ' : `เหลือ ${licenseStatus.daysRemaining} วัน`}
              </span>
            </div>

            {/* Detailed Expiration Dates */}
            <div className="mt-4 pt-4 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white/80 p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-slate-500 flex items-center gap-1 font-medium mb-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>วันหมดอายุ</span>
                </div>
                <div className="font-bold text-slate-800 text-sm">
                  {licenseConfig.expiresAt ? formatBranchDateThai(licenseConfig.expiresAt) : 'ตลอดชีพ (ไม่มีวันหมดอายุ)'}
                </div>
              </div>

              <div className="bg-white/80 p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-slate-500 flex items-center gap-1 font-medium mb-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>นับถอยหลัง</span>
                </div>
                <div className="font-bold text-slate-800 text-sm">
                  {licenseStatus.countdownText || '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Renewal Code Entry Box (Masked Password - No Plaintext Clues) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Key className="w-4 h-4 text-amber-500" />
              <span>ใส่รหัสต่ออายุการใช้งาน (Renewal Code)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              กรอกรหัสต่ออายุที่ได้รับจากแอดมินผู้ดูแลระบบเท่านั้น (รหัสผ่านจะถูกปิดบังเพื่อความปลอดภัย)
            </p>

            <form onSubmit={handleApplyCode} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showRenewalCode ? "text" : "password"}
                  value={renewalCode}
                  onChange={(e) => setRenewalCode(e.target.value)}
                  placeholder="กรอกรหัสต่ออายุที่ได้รับจากแอดมิน"
                  autoComplete="off"
                  className="w-full pl-3 pr-9 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono tracking-wider focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowRenewalCode(!showRenewalCode)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  title={showRenewalCode ? "ซ่อนรหัส" : "แสดงรหัส"}
                >
                  {showRenewalCode ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer whitespace-nowrap active:scale-95"
              >
                ยืนยันต่ออายุ
              </button>
            </form>

            {renewalMessage && (
              <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                renewalMessage.type === 'success'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}>
                {renewalMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{renewalMessage.text}</span>
              </div>
            )}
          </div>

          {/* Contact Admin for Renewal */}
          <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl text-xs space-y-2">
            <div className="font-bold text-blue-950 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-600" />
              <span>ติดต่อแอดมินเพื่อขอต่ออายุ / สอบถามข้อมูล</span>
            </div>
            <p className="text-slate-600 text-[11px]">
              ติดต่อแอดมินผู้ดูแลระบบหลัก: <strong className="text-slate-800">{contactName}</strong>
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={`tel:${contactPhone.replace(/[^0-9]/g, '') || DEFAULT_CONTACT_PHONE_RAW}`}
                className="inline-flex items-center gap-1.5 bg-white hover:bg-blue-600 hover:text-white text-blue-700 px-3 py-1.5 rounded-lg border border-blue-300 text-xs font-semibold transition shadow-2xs"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>โทร {contactPhone}</span>
              </a>
              <a
                href={`https://line.me/ti/p/~${cleanLine}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-2xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>LINE: {contactLine}</span>
              </a>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
