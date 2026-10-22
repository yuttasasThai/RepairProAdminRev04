import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Key, 
  Lock, 
  ShieldCheck, 
  Smartphone, 
  Calendar, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  RefreshCw,
  Phone,
  MessageCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { LicenseConfig, LicenseStatus } from '../types/license';
import { 
  loginBranchUser, 
  importSyncCode,
  changeBranchPassword
} from '../utils/auth';
import { 
  formatBranchDateThai, 
  DEFAULT_CONTACT_NAME, 
  DEFAULT_CONTACT_PHONE, 
  DEFAULT_CONTACT_PHONE_RAW, 
  DEFAULT_CONTACT_LINE 
} from '../utils/license';

interface BranchLoginGateProps {
  tenantId: string;
  licenseConfig: LicenseConfig;
  licenseStatus: LicenseStatus;
  onLoginSuccess: () => void;
  onDataImported?: () => void;
}

export const BranchLoginGate: React.FC<BranchLoginGateProps> = ({
  tenantId,
  licenseConfig,
  licenseStatus,
  onLoginSuccess,
  onDataImported,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'change_password'>('login');

  // Pre-fill username if remembered or passed in URL
  const [username, setUsername] = useState(() => {
    try {
      const savedUser = localStorage.getItem(`repair_pro_last_branch_user_${tenantId}`);
      if (savedUser) return savedUser;
      const urlUser = new URLSearchParams(window.location.search).get('user');
      if (urlUser) return urlUser;
    } catch {
      // ignore
    }
    return tenantId;
  });

  const [pin, setPin] = useState(() => {
    try {
      const urlPin = new URLSearchParams(window.location.search).get('pin');
      if (urlPin) return urlPin;
    } catch {
      // ignore
    }
    return '';
  });

  // Change password fields
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');

  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync / cross-device import state
  const [showSyncRestore, setShowSyncRestore] = useState(false);
  const [syncCodeInput, setSyncCodeInput] = useState('');
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const contactName = licenseConfig.contactName || DEFAULT_CONTACT_NAME;
  const contactPhone = licenseConfig.contactPhone || DEFAULT_CONTACT_PHONE;
  const contactLine = licenseConfig.contactLineId || DEFAULT_CONTACT_LINE;
  const cleanLine = contactLine.replace('@', '');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!username.trim()) {
      setErrorMessage('กรุณากรอกชื่อผู้ใช้สาขา');
      return;
    }
    if (!pin.trim()) {
      setErrorMessage('กรุณากรอกรหัสผ่าน PIN สาขา');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const res = loginBranchUser(tenantId, username, pin, rememberMe);
      if (res.success) {
        setSuccessMessage(res.message);
        setTimeout(() => {
          onLoginSuccess();
        }, 500);
      } else {
        setErrorMessage(res.message);
        setIsSubmitting(false);
      }
    }, 250);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!oldPin.trim()) {
      setErrorMessage('กรุณากรอกรหัสผ่านเดิม หรือรหัสเริ่มต้นที่ได้รับจากแอดมิน');
      return;
    }
    if (!newPin.trim()) {
      setErrorMessage('กรุณากรอกรหัสผ่านใหม่');
      return;
    }
    if (newPin.trim() !== confirmNewPin.trim()) {
      setErrorMessage('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    const res = changeBranchPassword(tenantId, oldPin, newPin);
    if (res.success) {
      setSuccessMessage(res.message);
      setPin(newPin);
      setOldPin('');
      setNewPin('');
      setConfirmNewPin('');
      setTimeout(() => {
        setAuthMode('login');
      }, 1500);
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleExecuteSyncImport = () => {
    setSyncStatus(null);
    if (!syncCodeInput.trim()) {
      setSyncStatus({ type: 'error', text: 'กรุณาวางรหัสย้ายเครื่อง (Sync Code)' });
      return;
    }

    const res = importSyncCode(syncCodeInput);
    if (res.success) {
      setSyncStatus({ type: 'success', text: res.message });
      if (onDataImported) {
        onDataImported();
      }
      setTimeout(() => {
        // Auto login with tenant credentials after sync
        loginBranchUser(tenantId, username || tenantId, pin || '1234', true);
        onLoginSuccess();
      }, 900);
    } else {
      setSyncStatus({ type: 'error', text: res.message });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (text) {
          const res = importSyncCode(text);
          if (res.success) {
            setSyncStatus({ type: 'success', text: `นำเข้าไฟล์สำรองสำเร็จ (${res.count || 0} งาน)` });
            if (onDataImported) onDataImported();
            setTimeout(() => {
              loginBranchUser(tenantId, username || tenantId, pin || '1234', true);
              onLoginSuccess();
            }, 900);
          } else {
            setSyncStatus({ type: 'error', text: res.message });
          }
        }
      } catch (err) {
        setSyncStatus({ type: 'error', text: 'ไม่สามารถอ่านไฟล์สำรองได้' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Visual Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="inline-flex p-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 mb-3 shadow-md">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">เข้าสู่ระบบสาขา</h2>
          <p className="text-xs text-blue-100 mt-1 font-mono">
            {licenseConfig.tenantName || `สาขา: ${tenantId}`}
          </p>

          {/* Expiration Banner directly on login gate */}
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/40 border border-white/20 text-xs">
            <Calendar className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-slate-200 text-[11px]">
              วันหมดอายุ: <strong className="text-amber-300">{licenseConfig.expiresAt ? formatBranchDateThai(licenseConfig.expiresAt) : 'ตลอดชีพ'}</strong>
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-slate-700">
          
          {/* Status Alert if Expired or Expiring Soon */}
          {licenseStatus.isExpired && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>ลิงก์สาขานี้หมดอายุการใช้งานแล้ว</strong>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  กรุณาติดต่อแอดมินร้าน ({contactName} โทร {contactPhone}) เพื่อขอรหัสต่ออายุ
                </p>
              </div>
            </div>
          )}

          {/* Tab Selector: เข้าสู่ระบบ vs ตั้งรหัสผ่านใหม่ */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                authMode === 'login' 
                  ? 'bg-white text-blue-700 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              เข้าสู่ระบบ (Login)
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('change_password');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                authMode === 'change_password' 
                  ? 'bg-white text-blue-700 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ตั้งรหัสผ่านใหม่
            </button>
          </div>

          {authMode === 'login' ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อผู้ใช้สาขา (Username)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="เช่น branch-01"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                  />
                  <Store className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รหัสผ่าน PIN สาขา
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="รหัสผ่าน PIN"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                  />
                  <Key className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                </div>
                <div className="mt-1.5 text-[11px] text-slate-500 bg-amber-50/80 border border-amber-200/80 p-2 rounded-lg">
                  💡 <strong>หากลืมรหัสผ่าน:</strong> สามารถใช้ <strong>รหัสเริ่มต้น</strong> ที่แอดมินสร้างให้เข้าสู่ระบบได้เสมอ หรือติดต่อแอดมินเพื่อขอรหัสเริ่มต้น
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span>จำการตั้งค่าและการเข้าสู่ระบบบนเครื่องนี้</span>
                </label>
              </div>

              {errorMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/25 transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>เข้าสู่ระบบเพื่อเริ่มใช้งาน</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Change Password Form */
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รหัสผ่านเดิม หรือ รหัสเริ่มต้นจากแอดมิน
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={oldPin}
                    onChange={(e) => setOldPin(e.target.value)}
                    placeholder="ใส่รหัสเดิม หรือ รหัสเริ่มต้นที่แอดมินสร้างให้"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                  />
                  <Key className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รหัสผ่านใหม่ที่ต้องการตั้ง
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="รหัสผ่านใหม่ (เช่น 5678)"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                  />
                  <Key className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ยืนยันรหัสผ่านใหม่อีกครั้ง
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmNewPin}
                    onChange={(e) => setConfirmNewPin(e.target.value)}
                    placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                  />
                  <Key className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                </div>
              </div>

              <div className="text-[11px] text-slate-600 bg-blue-50/80 border border-blue-200/80 p-2.5 rounded-xl space-y-1">
                <p className="font-semibold text-blue-900">📌 บันทึกความปลอดภัย:</p>
                <p>
                  ระบบจะบันทึกรหัสผ่านใหม่ของท่าน และยังคงเก็บ <strong>รหัสเริ่มต้น</strong> ไว้ในบันทึกของแอดมิน เพื่อให้กรณีท่านลืมรหัสผ่านใหม่ สามารถขอรหัสเริ่มต้นจากแอดมินมาใช้เข้าสู่ระบบได้ตลอดเวลา
                </p>
              </div>

              {errorMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>บันทึกรหัสผ่านใหม่</span>
              </button>
            </form>
          )}

          {/* Cross-Device Settings & Sync (ย้ายข้อมูล / จำค่าที่ตั้งไว้ข้ามเครื่อง) */}
          <div className="pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowSyncRestore(!showSyncRestore)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-blue-600 transition p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-600" />
                <span>📲 ใช้งานเครื่องใหม่ / กู้คืนการตั้งค่าจากเครื่องเดิม</span>
              </div>
              <span className="text-[11px] text-blue-600">
                {showSyncRestore ? 'ซ่อน' : 'เปิด'}
              </span>
            </button>

            {showSyncRestore && (
              <div className="mt-3 p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-3 animate-in fade-in text-xs">
                <div className="text-[11px] text-slate-600 leading-relaxed">
                  หากท่านเคยใช้งานบนโทรศัพท์หรืออุปกรณ์เครื่องอื่น และต้องการให้ข้อมูลงานซ่อมและค่าการตั้งค่าเดิม (ชื่อร้าน, ช่าง, หมวดหมู่) ตามมาที่เครื่องใหม่นี้:
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    วางรหัสย้ายเครื่อง (Sync Code):
                  </label>
                  <textarea
                    rows={2}
                    value={syncCodeInput}
                    onChange={(e) => setSyncCodeInput(e.target.value)}
                    placeholder="วางรหัส Sync Code ที่คัดลอกจากเครื่องเดิม..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleExecuteSyncImport}
                    className="mt-1.5 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                  >
                    นำเข้าและเปิดใช้งานบนเครื่องนี้
                  </button>
                </div>

                <div className="pt-2 border-t border-blue-200/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">หรือ นำเข้าจากไฟล์สำรอง:</span>
                  <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-50 border border-blue-300 rounded-lg text-blue-700 text-[11px] font-semibold transition shadow-2xs">
                    <Upload className="w-3 h-3" />
                    <span>เลือกไฟล์ .json</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {syncStatus && (
                  <div className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                    syncStatus.type === 'success' 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}>
                    {syncStatus.type === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    )}
                    <span>{syncStatus.text}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contact Admin Support Footer */}
          <div className="pt-2 text-center text-xs text-slate-500">
            <p className="text-[11px]">
              ติดต่อแอดมินหลัก: <strong>{contactName}</strong> โทร <a href={`tel:${contactPhone.replace(/[^0-9]/g, '') || DEFAULT_CONTACT_PHONE_RAW}`} className="text-blue-600 font-semibold underline">{contactPhone}</a>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              LINE ID: {contactLine}
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
