import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Clock, 
  Key, 
  QrCode, 
  Copy, 
  Check, 
  ExternalLink, 
  Share2, 
  Lock, 
  Unlock, 
  Calendar, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Phone, 
  MessageCircle, 
  Crown, 
  Layers,
  EyeOff,
  Plus,
  Building2,
  User,
  Search,
  RefreshCw,
  Send
} from 'lucide-react';
import { LicenseConfig, LicenseStatus } from '../types/license';
import { 
  applyRenewalCode, 
  generateActivationCode, 
  buildBranchUrl, 
  getActiveTenantId, 
  saveStoredLicense,
  DEFAULT_CONTACT_NAME,
  DEFAULT_CONTACT_PHONE,
  DEFAULT_CONTACT_PHONE_RAW,
  DEFAULT_CONTACT_LINE,
  DEFAULT_ADMIN_PIN,
  BranchLinkItem,
  getStoredBranches,
  saveBranchLinkItem,
  deleteStoredBranch,
  renewStoredBranch,
  formatBranchDateThai,
  getBranchShareMessage,
  registerRenewalCode,
  isBranchUser
} from '../utils/license';

interface LicenseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  licenseConfig: LicenseConfig;
  licenseStatus: LicenseStatus;
  onLicenseUpdated: (newConfig: LicenseConfig) => void;
  initialTab?: 'status' | 'create_branch' | 'renew_branch' | 'admin';
}

export const LicenseManagerModal: React.FC<LicenseManagerModalProps> = ({
  isOpen,
  onClose,
  licenseConfig,
  licenseStatus,
  onLicenseUpdated,
  initialTab = 'status',
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'create_branch' | 'renew_branch' | 'admin'>(initialTab);

  // Status Tab - Renewal code input
  const [renewalCode, setRenewalCode] = useState('');
  const [renewalMsg, setRenewalMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab 2: Create Branch Form State
  const [createName, setCreateName] = useState('');
  const [createUsername, setCreateUsername] = useState('');
  const [createPin, setCreatePin] = useState('1234');
  const [createPhone, setCreatePhone] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [createDurationChoice, setCreateDurationChoice] = useState<number | 'lifetime' | 'custom'>(7);
  const [createCustomDays, setCreateCustomDays] = useState('30');
  const [createdBranchItem, setCreatedBranchItem] = useState<BranchLinkItem | null>(null);
  const [createSuccessMsg, setCreateSuccessMsg] = useState<string | null>(null);

  // Tab 3: Renew Branch State (2.1 & 2.2)
  const [storedBranches, setStoredBranches] = useState<BranchLinkItem[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [branchSearchInput, setBranchSearchInput] = useState<string>('');
  const [renewDurationChoice, setRenewDurationChoice] = useState<number | 'lifetime' | 'custom'>(30);
  const [renewCustomDays, setRenewCustomDays] = useState('30');
  const [customRenewalCode, setCustomRenewalCode] = useState('');
  const [renewResultMsg, setRenewResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedLineMessage, setCopiedLineMessage] = useState(false);
  const [copiedRenewalCode, setCopiedRenewalCode] = useState(false);

  // Tab 4: Admin Controls State
  const [adminPinInput, setAdminPinInput] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPinError, setAdminPinError] = useState('');
  const [editExpiresAt, setEditExpiresAt] = useState(
    licenseConfig.expiresAt ? licenseConfig.expiresAt.slice(0, 10) : ''
  );
  const [isLifetimeSetting, setIsLifetimeSetting] = useState(!licenseConfig.expiresAt);
  const [editContactName, setEditContactName] = useState(licenseConfig.contactName || DEFAULT_CONTACT_NAME);
  const [editPhone, setEditPhone] = useState(licenseConfig.contactPhone || DEFAULT_CONTACT_PHONE);
  const [editLineId, setEditLineId] = useState(licenseConfig.contactLineId || DEFAULT_CONTACT_LINE);
  const [editNewPin, setEditNewPin] = useState(licenseConfig.adminPin || DEFAULT_ADMIN_PIN);
  const [adminSaveSuccess, setAdminSaveSuccess] = useState(false);

  // Copy helper states
  const [copiedCreateUrl, setCopiedCreateUrl] = useState(false);
  const [copiedCreateLineMsg, setCopiedCreateLineMsg] = useState(false);
  const [copiedInitPin, setCopiedInitPin] = useState(false);

  // Load branches
  useEffect(() => {
    const list = getStoredBranches();
    setStoredBranches(list);
    if (list.length > 0 && !selectedBranchId) {
      setSelectedBranchId(list[0].id);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const contactName = licenseConfig.contactName || DEFAULT_CONTACT_NAME;
  const contactPhone = licenseConfig.contactPhone || DEFAULT_CONTACT_PHONE;
  const rawPhone = contactPhone.replace(/[^0-9]/g, '') || DEFAULT_CONTACT_PHONE_RAW;
  const contactLine = licenseConfig.contactLineId || DEFAULT_CONTACT_LINE;
  const lineUrl = `https://line.me/R/ti/p/${encodeURIComponent(contactLine)}`;
  const activeTenant = getActiveTenantId();

  // Helper copy function
  const handleCopy = (text: string, cb: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    cb(true);
    setTimeout(() => cb(false), 2000);
  };

  // 1. Submit Apply Renewal
  const handleApplyRenewal = (e: React.FormEvent) => {
    e.preventDefault();
    setRenewalMsg(null);
    if (!renewalCode.trim()) {
      setRenewalMsg({ type: 'error', text: 'กรุณากรอกรหัสต่ออายุ' });
      return;
    }

    const res = applyRenewalCode(renewalCode, licenseConfig);
    if (res.success) {
      setRenewalMsg({ type: 'success', text: res.message });
      onLicenseUpdated(res.updatedConfig);
      setRenewalCode('');
    } else {
      setRenewalMsg({ type: 'error', text: res.message });
    }
  };

  // 2. Submit Create Branch (Requirement 1.1 & 1.2 & 1.3)
  const handleCreateBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSuccessMsg(null);

    const cleanUser = (createUsername || `branch-${Date.now().toString().slice(-4)}`)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_\u0E00-\u0E7F-]/g, '');

    const shopName = createName.trim() || `สาขา ${cleanUser}`;
    const initialPin = createPin.trim() || '1234';

    const effectiveDays = createDurationChoice === 'custom'
      ? (parseInt(createCustomDays, 10) > 0 ? parseInt(createCustomDays, 10) : 30)
      : createDurationChoice;

    const now = new Date();
    const expiresAt = effectiveDays === 'lifetime'
      ? null
      : new Date(now.getTime() + (effectiveDays as number) * 24 * 60 * 60 * 1000).toISOString();

    const generatedUrl = buildBranchUrl(cleanUser, effectiveDays, {
      username: cleanUser,
      pin: initialPin,
      expiresAt,
      shopName,
    });

    const newBranch: BranchLinkItem = {
      id: `br_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantCode: cleanUser,
      username: cleanUser,
      name: shopName,
      initialPin: initialPin, // รหัสเริ่มต้นสำหรับกู้คืน
      branchPin: initialPin,  // รหัสปัจจุบันเริ่มต้น
      phone: createPhone.trim(),
      notes: createNotes.trim(),
      daysGranted: effectiveDays,
      createdAt: now.toISOString(),
      expiresAt,
      url: generatedUrl,
      renewals: [
        {
          renewedAt: now.toISOString(),
          daysAdded: effectiveDays,
          previousExpiresAt: null,
          newExpiresAt: expiresAt,
          note: 'สร้างและบันทึกลิงก์สาขาเริ่มต้น',
        }
      ]
    };

    const updated = saveBranchLinkItem(newBranch);
    setStoredBranches(updated);
    setCreatedBranchItem(newBranch);
    setSelectedBranchId(newBranch.id);
    setCreateSuccessMsg(`สร้างลิงก์สาขา "${shopName}" สำเร็จ! สามารถส่งลิงก์และรหัสผ่านให้ผู้ใช้ได้ทันที`);
  };

  // 3. Tab 3: Resolve Selected Branch (by dropdown or search / pasted URL)
  const resolvedBranch = (() => {
    if (branchSearchInput.trim()) {
      const q = branchSearchInput.trim().toLowerCase();
      // Try extract tenant from url if pasted
      try {
        if (q.includes('http') || q.includes('?')) {
          const urlObj = new URL(branchSearchInput.trim());
          const tenantP = urlObj.searchParams.get('tenant') || urlObj.searchParams.get('branch') || urlObj.searchParams.get('store');
          if (tenantP) {
            const found = storedBranches.find(b => b.tenantCode.toLowerCase() === tenantP.toLowerCase() || b.username.toLowerCase() === tenantP.toLowerCase());
            if (found) return found;
          }
        }
      } catch {
        // ignore url parse error
      }

      const match = storedBranches.find(b => 
        b.tenantCode.toLowerCase() === q ||
        b.username.toLowerCase() === q ||
        b.name.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q)
      );
      if (match) return match;
    }
    return storedBranches.find(b => b.id === selectedBranchId) || storedBranches[0] || null;
  })();

  const effectiveRenewDays = renewDurationChoice === 'custom'
    ? (parseInt(renewCustomDays, 10) > 0 ? parseInt(renewCustomDays, 10) : 30)
    : renewDurationChoice;

  // Generate Renewal Code
  const handleGenerateBranchCode = () => {
    if (!resolvedBranch) return;
    const prefix = resolvedBranch.tenantCode.toUpperCase().slice(0, 8);
    const dayTag = effectiveRenewDays === 'lifetime' ? 'LIFE' : `${effectiveRenewDays}D`;
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newCode = `RP-${prefix}-${dayTag}-${rand}`;
    setCustomRenewalCode(newCode);

    // Register into system
    registerRenewalCode({
      code: newCode,
      daysAdded: effectiveRenewDays,
      planName: effectiveRenewDays === 'lifetime' ? 'ตลอดชีพ' : `ต่ออายุ ${effectiveRenewDays} วัน`,
      targetTenantId: resolvedBranch.tenantCode,
      note: `สร้างรหัสต่ออายุให้สาขา ${resolvedBranch.name}`,
    });
  };

  // Instant Renew Branch (Directly extend in DB)
  const handleInstantRenewBranch = () => {
    if (!resolvedBranch) return;
    const res = renewStoredBranch(resolvedBranch.id, effectiveRenewDays, `แอดมินต่ออายุตรงผ่านหน้าต่างจัดการ`);
    if (res.success) {
      setStoredBranches(res.updatedBranches);
      setRenewResultMsg({ 
        type: 'success', 
        text: `ต่ออายุให้ "${resolvedBranch.name}" เรียบร้อยแล้ว (${effectiveRenewDays === 'lifetime' ? 'ตลอดชีพ' : `+${effectiveRenewDays} วัน`})` 
      });
      setTimeout(() => setRenewResultMsg(null), 4000);
    } else {
      setRenewResultMsg({ type: 'error', text: res.message });
    }
  };

  // Build LINE message to send to user
  const branchLineMessage = resolvedBranch ? (
    `📢 แจ้งรหัสต่ออายุการใช้งานระบบงานซ่อม RepairPro\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🏪 สาขา: ${resolvedBranch.name}\n` +
    `👤 ชื่อผู้ใช้: ${resolvedBranch.username || resolvedBranch.tenantCode}\n` +
    `${customRenewalCode ? `🔑 รหัสต่ออายุ: ${customRenewalCode}\n⏳ ระยะเวลาที่ได้รับ: ${effectiveRenewDays === 'lifetime' ? 'ตลอดชีพ (ไม่มีวันหมดอายุ)' : `+${effectiveRenewDays} วัน`}\n` : ''}` +
    `🔐 รหัสเริ่มต้นสำหรับล็อกอิน (กู้คืนเมื่อลืมรหัส): ${resolvedBranch.initialPin || resolvedBranch.branchPin || '1234'}\n` +
    `🔗 ลิงก์เข้าใช้งาน: ${resolvedBranch.url}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📌 วิธีต่ออายุ:\n` +
    `1. เปิดลิงก์สาขาของท่าน\n` +
    `2. เข้าไปที่เมนู "ต่ออายุใช้งาน"\n` +
    `3. นำรหัสต่ออายุไปกรอกในช่อง "กรอกรหัสต่ออายุ" แล้วกดยืนยัน\n\n` +
    `* หากลืมรหัสผ่าน ให้ใช้รหัสเริ่มต้น ${resolvedBranch.initialPin || resolvedBranch.branchPin || '1234'} ในการล็อกอินเข้าใช้งานได้ทันทีครับ\n` +
    `📞 ติดต่อสอบถาม: ${contactName} โทร ${contactPhone} LINE: ${contactLine}`
  ) : '';

  // 4. Admin Unlock & Save
  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPinError('');
    const targetPin = licenseConfig.adminPin || DEFAULT_ADMIN_PIN;
    if (adminPinInput.trim() === targetPin || adminPinInput.trim() === DEFAULT_ADMIN_PIN) {
      setIsAdminUnlocked(true);
      setAdminPinInput('');
    } else {
      setAdminPinError(`รหัส PIN ไม่ถูกต้อง (รหัสแอดมินเริ่มต้นคือ ${DEFAULT_ADMIN_PIN})`);
    }
  };

  const handleSaveAdminConfig = () => {
    const newConfig: LicenseConfig = {
      ...licenseConfig,
      expiresAt: isLifetimeSetting ? null : (editExpiresAt ? new Date(editExpiresAt).toISOString() : null),
      contactName: editContactName.trim() || DEFAULT_CONTACT_NAME,
      contactPhone: editPhone.trim() || DEFAULT_CONTACT_PHONE,
      contactLineId: editLineId.trim() || DEFAULT_CONTACT_LINE,
      adminPin: editNewPin.trim() || DEFAULT_ADMIN_PIN,
      planName: isLifetimeSetting 
        ? 'ตลอดชีพ (Lifetime)' 
        : (editExpiresAt ? `กำหนดวันสิ้นสุด (${editExpiresAt})` : licenseConfig.planName),
    };

    saveStoredLicense(newConfig);
    onLicenseUpdated(newConfig);
    setAdminSaveSuccess(true);
    setTimeout(() => setAdminSaveSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-400/30 rounded-2xl">
              <ShieldCheck className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span>ระบบต่ออายุ & จัดการลิงก์สาขา</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-mono">
                  ADMIN MANAGER
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                ผู้ดูแลระบบ: <strong className="text-blue-300">{contactName}</strong> โทร {contactPhone} LINE: {contactLine}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 space-x-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold transition border-b-2 whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'status'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>สถานะ & รหัสต่ออายุ</span>
          </button>

          {!isBranchUser() && (
            <>
              {/* Tab 2: Create Branch (Requirement 1.1 & 1.2) */}
              <button
                onClick={() => setActiveTab('create_branch')}
                className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold transition border-b-2 whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'create_branch'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>+ สร้างลิงก์สาขาใหม่</span>
              </button>

              {/* Tab 3: Renew Branch (Requirement 2.1 & 2.2) */}
              <button
                onClick={() => setActiveTab('renew_branch')}
                className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold transition border-b-2 whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'renew_branch'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                <span>ต่ออายุลิงก์สาขา</span>
              </button>

              {/* Tab 4: Admin Settings */}
              <button
                onClick={() => setActiveTab('admin')}
                className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold transition border-b-2 whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>ตั้งค่าผู้ดูแล (Admin)</span>
              </button>
            </>
          )}
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">

          {/* TAB 1: STATUS & RENEWAL */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              {/* Status Card */}
              <div className={`p-5 rounded-2xl border ${
                licenseStatus.isExpired
                  ? 'bg-red-50 border-red-200'
                  : licenseStatus.isExpiringSoon
                  ? 'bg-amber-50 border-amber-200'
                  : licenseStatus.isLifetime
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3.5">
                    <div className={`p-3 rounded-xl shrink-0 ${
                      licenseStatus.isExpired
                        ? 'bg-red-100 text-red-600'
                        : licenseStatus.isExpiringSoon
                        ? 'bg-amber-100 text-amber-600'
                        : licenseStatus.isLifetime
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      {licenseStatus.isLifetime ? (
                        <Crown className="w-6 h-6" />
                      ) : (
                        <Clock className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          แพ็กเกจปัจจุบัน:
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white shadow-xs border border-slate-200">
                          {licenseStatus.planName}
                        </span>
                      </div>
                      <h4 className="text-xl font-bold mt-1 text-slate-900">
                        {licenseStatus.isLifetime
                          ? 'เปิดใช้งานตลอดชีพ (ไม่มีวันหมดอายุ)'
                          : licenseStatus.isExpired
                          ? 'ระยะเวลาการใช้งานสิ้นสุดแล้ว'
                          : `${licenseStatus.countdownText || `เหลือระยะเวลาใช้งานอีก ${licenseStatus.daysRemaining} วัน`}`}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        สิ้นสุดวันที่: <strong className="text-slate-800">{licenseStatus.expiresAtFormatted}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 sm:self-center">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                      licenseStatus.isExpired
                        ? 'bg-red-600 text-white'
                        : licenseStatus.isExpiringSoon
                        ? 'bg-amber-600 text-white'
                        : licenseStatus.isLifetime
                        ? 'bg-yellow-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}>
                      {licenseStatus.isExpired ? 'หมดอายุ' : 'สถานะปกติ'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Renewal Code Input Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-2 mb-1.5">
                  <Key className="w-4 h-4 text-blue-600" />
                  <span>กรอกรหัสต่ออายุ (Activation Code)</span>
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  นำรหัสที่ได้รับจากแอดมินช่างหน่อยชุมแพ มากรอกเพื่อเพิ่มวันใช้งาน
                </p>

                <form onSubmit={handleApplyRenewal} className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={renewalCode}
                      onChange={(e) => setRenewalCode(e.target.value.toUpperCase())}
                      placeholder="กรอกรหัสต่ออายุ เช่น RENEW-30 หรือ RP-..."
                      className="flex-1 px-3.5 py-2.5 text-sm font-mono uppercase bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none tracking-wider"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition whitespace-nowrap cursor-pointer flex items-center justify-center space-x-1.5 active:scale-95"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>ยืนยันต่ออายุ</span>
                    </button>
                  </div>

                  {renewalMsg && (
                    <div className={`text-xs p-3 rounded-xl flex items-center space-x-2 ${
                      renewalMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      {renewalMsg.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                      )}
                      <span>{renewalMsg.text}</span>
                    </div>
                  )}
                </form>
              </div>

              {/* Contact Admin */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>ติดต่อขอรับรหัสต่ออายุ / สมัครใช้งาน</span>
                  </h4>
                  <span className="text-xs font-bold text-blue-800">{contactName}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <a
                    href={`tel:${rawPhone}`}
                    className="flex items-center justify-between p-3 bg-white rounded-xl border border-blue-200 text-xs font-semibold text-slate-800 hover:border-blue-400 hover:shadow-xs transition"
                  >
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-blue-600" />
                      <span>โทร: {contactPhone}</span>
                    </div>
                  </a>
                  <a
                    href={lineUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 bg-white rounded-xl border border-emerald-300 text-xs font-semibold text-emerald-800 hover:border-emerald-400 hover:shadow-xs transition"
                  >
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      <span>LINE: {contactLine}</span>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CREATE BRANCH (Requirements 1.1, 1.2, 1.3) */}
          {activeTab === 'create_branch' && !isBranchUser() && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-blue-900">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>สร้างลิงก์สาขาใหม่และบันทึกประวัติเข้าระบบ</span>
                </div>
                <p className="text-slate-600">
                  กรอกข้อมูลร้าน กำหนดชื่อผู้ใช้ และรหัสผ่านล็อกอินเริ่มต้น เพื่อสร้างลิงก์เฉพาะให้สาขา
                </p>
              </div>

              <form onSubmit={handleCreateBranchSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ชื่อร้าน / ชื่อสาขา *
                    </label>
                    <input
                      type="text"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="เช่น สาขาขอนแก่น, ร้านเพื่อนช่าง"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ชื่อผู้ใช้สาขา (Username สำหรับ Login) *
                    </label>
                    <input
                      type="text"
                      value={createUsername}
                      onChange={(e) => setCreateUsername(e.target.value)}
                      placeholder="เช่น branch-01, branch-udon"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      กำหนดรหัสผ่าน PIN สำหรับ user ตอนเอาไป Login *
                    </label>
                    <input
                      type="password"
                      value={createPin}
                      onChange={(e) => setCreatePin(e.target.value)}
                      placeholder="กำหนดรหัส PIN เช่น 1234 หรือ 9876"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none tracking-widest"
                    />
                    <div className="text-[10px] text-amber-700 mt-1">
                      * รหัสนี้จะถูกบันทึกเป็น "รหัสเริ่มต้น" หาก user เปลี่ยนรหัสใหม่แล้วลืม สามารถใช้รหัสเริ่มต้นนี้เข้าสู่ระบบได้เสมอ
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      เบอร์โทรติดต่อสาขา (ถ้ามี)
                    </label>
                    <input
                      type="text"
                      value={createPhone}
                      onChange={(e) => setCreatePhone(e.target.value)}
                      placeholder="เช่น 081-xxx-xxxx"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Duration Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    เลือกระยะเวลาการใช้งาน (วันหมดอายุ)
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                    {[
                      { label: '7 วัน (ทดลอง)', value: 7 },
                      { label: '30 วัน (1 เดือน)', value: 30 },
                      { label: '90 วัน (3 เดือน)', value: 90 },
                      { label: '180 วัน (6 เดือน)', value: 180 },
                      { label: '360 วัน (1 ปี)', value: 360 },
                      { label: '👑 ตลอดชีพ', value: 'lifetime' as const },
                      { label: 'กำหนดเอง', value: 'custom' as const },
                    ].map((preset) => {
                      const isSelected = createDurationChoice === preset.value;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setCreateDurationChoice(preset.value)}
                          className={`px-2 py-2 rounded-xl text-xs font-bold transition border cursor-pointer text-center ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  {createDurationChoice === 'custom' && (
                    <div className="mt-2.5 flex items-center gap-2 max-w-xs">
                      <span className="text-xs text-slate-600">ระบุจำนวนวัน:</span>
                      <input
                        type="number"
                        min="1"
                        max="3650"
                        value={createCustomDays}
                        onChange={(e) => setCreateCustomDays(e.target.value)}
                        className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <span className="text-xs text-slate-600">วัน</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    หมายเหตุเพิ่มเติม (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={createNotes}
                    onChange={(e) => setCreateNotes(e.target.value)}
                    placeholder="เช่น ช่างบอยขอนแก่น, สัญญา 1 ปี, โอนเงินแล้ว"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>บันทึกและสร้างลิงก์สาขา</span>
                  </button>
                </div>
              </form>

              {/* Creation Result Box */}
              {createSuccessMsg && createdBranchItem && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-3 animate-in zoom-in-95">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{createSuccessMsg}</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-200 text-xs space-y-1.5">
                    <div className="font-bold text-slate-800">
                      🏪 สาขา: {createdBranchItem.name} ({createdBranchItem.username})
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>รหัสผ่านเริ่มต้นสำหรับ Login:</span>
                      <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {createdBranchItem.initialPin || '1234'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono break-all">
                      {createdBranchItem.url}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(createdBranchItem.url, setCopiedCreateUrl)}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCreateUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCreateUrl ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกลิงก์สาขา'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(getBranchShareMessage(createdBranchItem), setCopiedCreateLineMsg)}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCreateLineMsg ? <Check className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
                      <span>{copiedCreateLineMsg ? 'คัดลอกข้อความ LINE แล้ว' : 'คัดลอกข้อความส่ง LINE'}</span>
                    </button>

                    <a
                      href={createdBranchItem.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>เปิดทดสอบ</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RENEW BRANCH (Requirement 2: 2.1 & 2.2) */}
          {activeTab === 'renew_branch' && !isBranchUser() && (
            <div className="space-y-6">
              
              {/* 2.1 Select / Search branch to renew */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>2.1 ใส่ลิงก์สาขา หรือเลือกสาขาที่ต้องการต่ออายุ</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    มีสาขาในระบบ {storedBranches.length} สาขา
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      เลือกจากรายชื่อสาขาที่มีอยู่:
                    </label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => {
                        setSelectedBranchId(e.target.value);
                        setBranchSearchInput('');
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {storedBranches.length === 0 && (
                        <option value="">(ยังไม่มีประวัติสาขา กรุณาสร้างลิงก์สาขาก่อน)</option>
                      )}
                      {storedBranches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.username || b.tenantCode}) - {b.daysGranted === 'lifetime' ? 'ตลอดชีพ' : formatBranchDateThai(b.expiresAt)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      หรือ วางลิงก์สาขา / รหัสสาขา เพื่อค้นหา:
                    </label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={branchSearchInput}
                        onChange={(e) => setBranchSearchInput(e.target.value)}
                        placeholder="วางลิงก์สาขา เช่น http://.../?tenant=branch-01 หรือพิมพ์ชื่อ"
                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Selected Branch Info Card */}
                {resolvedBranch ? (
                  <div className="mt-2 p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl text-xs space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="font-bold text-blue-950 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <span>สาขาที่เลือก: {resolvedBranch.name}</span>
                        <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-300">
                          {resolvedBranch.username || resolvedBranch.tenantCode}
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-700">
                        วันหมดอายุปัจจุบัน: <strong>{formatBranchDateThai(resolvedBranch.expiresAt)}</strong>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-blue-100">
                      {/* Initial PIN (for recovery) */}
                      <div className="flex items-center gap-1 text-[11px] bg-white px-2 py-1 rounded border border-amber-300">
                        <span className="text-amber-800 font-bold">รหัสเริ่มต้น (ใช้กู้คืนเมื่อลืมรหัส):</span>
                        <span className="font-mono font-black text-amber-900 tracking-wider">
                          {resolvedBranch.initialPin || resolvedBranch.branchPin || '1234'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(resolvedBranch.initialPin || resolvedBranch.branchPin || '1234', setCopiedInitPin)}
                          className="ml-1 text-amber-700 hover:text-amber-950 cursor-pointer"
                          title="คัดลอกรหัสเริ่มต้น"
                        >
                          {copiedInitPin ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>

                      {/* Current PIN */}
                      {resolvedBranch.branchPin && resolvedBranch.branchPin !== (resolvedBranch.initialPin || '1234') && (
                        <div className="text-[11px] text-slate-600 bg-white px-2 py-1 rounded border border-slate-200">
                          <span>รหัสใหม่ปัจจุบัน:</span>
                          <span className="font-mono font-bold text-slate-800 ml-1">
                            {resolvedBranch.branchPin}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs">
                    ไม่พบข้อมูลสาขาที่ค้นหา กรุณาเลือกจากรายการหรือตรวจสอบลิงก์สาขา
                  </div>
                )}
              </div>

              {/* 2.2 Configure renewal code & duration for user */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-blue-600" />
                  <span>2.2 กำหนดรหัสต่ออายุ เพื่อส่งให้ user ไปกรอก</span>
                </h4>

                {/* Duration presets */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    เลือกระยะเวลาที่ต้องการต่ออายุ:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    {[
                      { label: '+30 วัน', value: 30 },
                      { label: '+90 วัน (3 ด.)', value: 90 },
                      { label: '+180 วัน (6 ด.)', value: 180 },
                      { label: '+360 วัน (1 ปี)', value: 360 },
                      { label: '👑 ตลอดชีพ', value: 'lifetime' as const },
                      { label: 'กำหนดเอง', value: 'custom' as const },
                    ].map((preset) => {
                      const isSelected = renewDurationChoice === preset.value;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setRenewDurationChoice(preset.value)}
                          className={`px-2 py-2 rounded-xl text-xs font-bold transition border cursor-pointer text-center ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  {renewDurationChoice === 'custom' && (
                    <div className="mt-2.5 flex items-center gap-2 max-w-xs">
                      <span className="text-xs text-slate-600">ระบุจำนวนวัน:</span>
                      <input
                        type="number"
                        min="1"
                        max="3650"
                        value={renewCustomDays}
                        onChange={(e) => setRenewCustomDays(e.target.value)}
                        className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <span className="text-xs text-slate-600">วัน</span>
                    </div>
                  )}
                </div>

                {/* Renewal code field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      รหัสต่ออายุ (Activation Code ที่จะส่งให้ user):
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateBranchCode}
                      className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>สร้างรหัสต่ออายุอัตโนมัติ</span>
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customRenewalCode}
                      onChange={(e) => setCustomRenewalCode(e.target.value.toUpperCase())}
                      placeholder="เช่น RP-BRANCH01-30D-XXXX หรือพิมพ์เอง"
                      className="flex-1 px-3.5 py-2.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl uppercase tracking-wider focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!customRenewalCode.trim()) {
                          handleGenerateBranchCode();
                        } else if (resolvedBranch) {
                          registerRenewalCode({
                            code: customRenewalCode.trim().toUpperCase(),
                            daysAdded: effectiveRenewDays,
                            planName: effectiveRenewDays === 'lifetime' ? 'ตลอดชีพ' : `ต่ออายุ ${effectiveRenewDays} วัน`,
                            targetTenantId: resolvedBranch.tenantCode,
                          });
                          handleCopy(customRenewalCode.trim().toUpperCase(), setCopiedRenewalCode);
                        }
                      }}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      {copiedRenewalCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedRenewalCode ? 'คัดลอกแล้ว' : 'บันทึก & คัดลอกรหัส'}</span>
                    </button>
                  </div>
                </div>

                {/* Instant Renew Action Button */}
                <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs text-indigo-900">
                    <span className="font-bold">⚡ หรือต่ออายุให้สาขานี้โดยตรงทันที:</span>
                    <span className="text-[11px] text-slate-500 block">
                      แอดมินสามารถกดปุ่มนี้เพื่อขยายวันใช้งานให้สาขานี้ทันทีในฐานข้อมูล ไม่ต้องให้ user กรอกรหัสเอง
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleInstantRenewBranch}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shrink-0 active:scale-95 shadow-xs"
                  >
                    ต่ออายุให้สาขานี้ทันที
                  </button>
                </div>

                {renewResultMsg && (
                  <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    renewResultMsg.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
                      : 'bg-rose-50 text-rose-800 border border-rose-300'
                  }`}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{renewResultMsg.text}</span>
                  </div>
                )}

                {/* LINE message box for sending to user */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      <span>ข้อความแจ้งเตือนสำหรับส่งให้ User ทาง LINE:</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleCopy(branchLineMessage, setCopiedLineMessage)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      {copiedLineMessage ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLineMessage ? 'คัดลอกข้อความแล้ว' : 'คัดลอกข้อความส่ง LINE'}</span>
                    </button>
                  </div>

                  <textarea
                    rows={7}
                    readOnly
                    value={branchLineMessage}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-700 leading-relaxed outline-none"
                  />
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: ADMIN SETTINGS & PIN (Requirement 4: Admin PIN RepairPro0992256601) */}
          {activeTab === 'admin' && !isBranchUser() && (
            <div className="space-y-6">
              {!isAdminUnlocked ? (
                /* Admin PIN Lock Screen (masked password input) */
                <div className="max-w-md mx-auto text-center py-6 space-y-4">
                  <div className="w-14 h-14 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center mx-auto text-blue-600">
                    <Lock className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">แผงควบคุมผู้ดูแล (Admin Control)</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      กรุณากรอกรหัส PIN ผู้ดูแลเพื่อเข้าสู่โหมดตั้งค่าขั้นสูง
                    </p>
                  </div>

                  <form onSubmit={handleUnlockAdmin} className="space-y-3">
                    <input
                      type="password"
                      value={adminPinInput}
                      onChange={(e) => setAdminPinInput(e.target.value)}
                      placeholder="กรอกรหัส PIN ผู้ดูแล"
                      className="w-full text-center px-4 py-2.5 text-base font-mono tracking-widest bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />

                    {adminPinError && (
                      <p className="text-xs text-red-600">{adminPinError}</p>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm cursor-pointer active:scale-95"
                    >
                      เข้าสู่ระบบผู้ดูแล
                    </button>
                    <p className="text-[11px] text-slate-400">
                      * รหัสผ่านผู้ดูแลเริ่มต้นคือ <strong>{DEFAULT_ADMIN_PIN}</strong>
                    </p>
                  </form>
                </div>
              ) : (
                /* Unlocked Admin Controls */
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center space-x-2 text-emerald-600 text-sm font-bold">
                      <Unlock className="w-4 h-4" />
                      <span>โหมดผู้ดูแลระบบ (Admin Mode เปิดใช้งานแล้ว)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAdminUnlocked(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      ออกจากโหมดผู้ดูแล
                    </button>
                  </div>

                  {/* Direct Expiry Date Configuration */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>กำหนดวันหมดอายุของเครื่องแอดมินนี้โดยตรง</span>
                    </h4>

                    <div className="space-y-3">
                      <label className="flex items-center space-x-2 text-sm text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isLifetimeSetting}
                          onChange={(e) => setIsLifetimeSetting(e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-semibold">เปิดใช้งานตลอดชีพ (ไม่มีวันหมดอายุ)</span>
                      </label>

                      {!isLifetimeSetting && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            ระบุวันที่หมดอายุ (ค.ศ.):
                          </label>
                          <input
                            type="date"
                            value={editExpiresAt}
                            onChange={(e) => setEditExpiresAt(e.target.value)}
                            className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Info and PIN Settings */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                    <h4 className="text-sm font-bold text-slate-900">
                      ตั้งค่าข้อมูลติดต่อผู้ดูแล & รหัส PIN แอดมิน
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          ชื่อผู้ดูแลระบบ (Admin Name):
                        </label>
                        <input
                          type="text"
                          value={editContactName}
                          onChange={(e) => setEditContactName(e.target.value)}
                          placeholder="ช่างหน่อยชุมแพ"
                          className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          เบอร์โทรติดต่อต่ออายุ:
                        </label>
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="0992256601"
                          className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          LINE ID ติดต่อต่ออายุ:
                        </label>
                        <input
                          type="text"
                          value={editLineId}
                          onChange={(e) => setEditLineId(e.target.value)}
                          placeholder="@228snzee"
                          className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          เปลี่ยนรหัส PIN แอดมิน (Admin PIN):
                        </label>
                        <input
                          type="password"
                          value={editNewPin}
                          onChange={(e) => setEditNewPin(e.target.value)}
                          placeholder={`ค่าเริ่มต้น: ${DEFAULT_ADMIN_PIN}`}
                          className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono tracking-widest"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          รหัสแอดมินเริ่มต้น: {DEFAULT_ADMIN_PIN}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      {adminSaveSuccess ? (
                        <span className="text-xs text-emerald-600 font-semibold flex items-center space-x-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>บันทึกการตั้งค่าสำเร็จ!</span>
                        </span>
                      ) : <div />}

                      <button
                        type="button"
                        onClick={handleSaveAdminConfig}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shadow-sm cursor-pointer active:scale-95"
                      >
                        บันทึกการตั้งค่าผู้ดูแล
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {activeTenant !== 'default' ? (
              <span>กำลังใช้งานรหัสสาขา: <strong className="text-blue-600">{activeTenant}</strong></span>
            ) : (
              <span>สาขาหลัก (เครื่องแอดมินเริ่มต้น)</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
