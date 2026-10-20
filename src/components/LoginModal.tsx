import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Lock, 
  ShieldCheck, 
  Smartphone, 
  Share2, 
  Copy, 
  Check, 
  RefreshCw, 
  Download, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  LogOut, 
  Building2, 
  ArrowRight,
  Database,
  Sparkles
} from 'lucide-react';
import { 
  getCurrentSession, 
  saveAuthSession, 
  verifyAdminPin, 
  verifyBranchPin, 
  logoutSession,
  generateSyncCode,
  importSyncCode,
  downloadBackupFile,
  AuthSession 
} from '../utils/auth';
import { 
  getActiveTenantId, 
  switchToAdminMode, 
  switchToBranch,
  getStoredBranches,
  BranchLinkItem
} from '../utils/license';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataImported?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onDataImported,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'sync' | 'backup'>('login');
  const [roleChoice, setRoleChoice] = useState<'admin' | 'branch'>('admin');
  const [adminPin, setAdminPin] = useState('');
  const [branchCode, setBranchCode] = useState('branch-01');
  const [branchPin, setBranchPin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync state
  const [generatedSyncCode, setGeneratedSyncCode] = useState('');
  const [copiedSyncCode, setCopiedSyncCode] = useState(false);
  const [inputSyncCode, setInputSyncCode] = useState('');
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Current session & branches
  const [session, setSession] = useState<AuthSession>(() => getCurrentSession());
  const [storedBranches, setStoredBranches] = useState<BranchLinkItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSession(getCurrentSession());
      setStoredBranches(getStoredBranches());
      setErrorMessage(null);
      setSuccessMessage(null);
      setSyncStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!verifyAdminPin(adminPin)) {
      setErrorMessage('รหัสผ่าน PIN แอดมินไม่ถูกต้อง (ค่าเริ่มต้นคือ 1234)');
      return;
    }

    const newSession: AuthSession = {
      role: 'admin',
      tenantId: 'default',
      displayName: 'แอดมินหลัก (เจ้าของร้าน)',
      loggedInAt: new Date().toISOString(),
    };
    saveAuthSession(newSession);
    setSession(newSession);
    setSuccessMessage('เข้าสู่ระบบโหมดแอดมินหลักสำเร็จ!');
    setTimeout(() => {
      switchToAdminMode();
    }, 600);
  };

  const handleBranchLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const clean = branchCode.trim().toLowerCase().replace(/[^a-z0-9_\u0E00-\u0E7F-]/g, '');
    if (!clean) {
      setErrorMessage('กรุณาระบุรหัสสาขา เช่น branch-01');
      return;
    }

    if (!verifyBranchPin(branchPin)) {
      setErrorMessage('รหัสผ่าน PIN สาขาไม่ถูกต้อง (ค่าเริ่มต้นคือ 1234)');
      return;
    }

    const newSession: AuthSession = {
      role: 'branch',
      tenantId: clean,
      displayName: `สาขา (${clean})`,
      loggedInAt: new Date().toISOString(),
    };
    saveAuthSession(newSession);
    setSession(newSession);
    setSuccessMessage(`เข้าสู่ระบบสาขา ${clean} สำเร็จ!`);
    setTimeout(() => {
      switchToBranch(clean);
    }, 600);
  };

  const handleLogout = () => {
    logoutSession();
    setSuccessMessage('ออกจากระบบเรียบร้อย');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleGenerateSyncCode = () => {
    const code = generateSyncCode();
    setGeneratedSyncCode(code);
    setSyncStatus({
      type: 'success',
      text: 'สร้างรหัสย้ายเครื่องเรียบร้อย! คัดลอกรหัสนี้ไปใส่ในโทรศัพท์เครื่องใหม่ได้เลย',
    });
  };

  const handleCopySyncCode = () => {
    if (!generatedSyncCode) return;
    navigator.clipboard.writeText(generatedSyncCode);
    setCopiedSyncCode(true);
    setTimeout(() => setCopiedSyncCode(false), 2000);
  };

  const handleExecuteImport = () => {
    setSyncStatus(null);
    if (!inputSyncCode.trim()) {
      setSyncStatus({ type: 'error', text: 'กรุณาวางรหัสย้ายเครื่องก่อนกดยืนยัน' });
      return;
    }

    const res = importSyncCode(inputSyncCode);
    if (res.success) {
      setSyncStatus({ type: 'success', text: res.message });
      if (onDataImported) {
        onDataImported();
      }
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } else {
      setSyncStatus({ type: 'error', text: res.message });
    }
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const res = importSyncCode(text);
        if (res.success) {
          setSyncStatus({ type: 'success', text: 'กู้คืนข้อมูลจากไฟล์สำเร็จ!' });
          if (onDataImported) onDataImported();
          setTimeout(() => window.location.reload(), 1200);
        } else {
          setSyncStatus({ type: 'error', text: res.message });
        }
      } catch (err) {
        setSyncStatus({ type: 'error', text: 'ไฟล์สำรองข้อมูลเสียหายหรือไม่ถูกต้อง' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-sm">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">เข้าสู่ระบบ & ซิงค์ข้อมูลข้ามโทรศัพท์</h3>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-mono">
                  Multi-Device Sync
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                ล็อกอินเข้าใช้งานลิงก์แอดมิน/สาขา หรือย้ายข้อมูลไปยังโทรศัพท์เครื่องใหม่
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Session Banner */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">สถานะปัจจุบัน:</span>
            <span className={`px-2 py-0.5 rounded font-bold font-mono text-[11px] ${
              session.role === 'admin' 
                ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}>
              {session.role === 'admin' ? '👑 ' : '🏢 '}{session.displayName}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>ออกจากระบบ</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('login')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'login'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>1. เข้าสู่ระบบ (Login)</span>
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'sync'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>2. ย้ายข้อมูลข้ามเครื่อง (Sync)</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'backup'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>3. สำรอง/กู้คืนไฟล์</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 1: LOGIN */}
          {/* ============================================================== */}
          {activeTab === 'login' && (
            <div className="space-y-4">
              {/* Role Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  เลือกบทบาทเข้าใช้งาน:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setRoleChoice('admin'); setErrorMessage(null); }}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                      roleChoice === 'admin'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs ring-2 ring-blue-200'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                      👑
                    </div>
                    <div>
                      <strong className="block text-xs sm:text-sm">แอดมินหลัก (Admin)</strong>
                      <span className="text-[10px] text-slate-500">จัดการข้อมูลร้านและสร้างลิงก์</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setRoleChoice('branch'); setErrorMessage(null); }}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                      roleChoice === 'branch'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs ring-2 ring-emerald-200'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                      🏢
                    </div>
                    <div>
                      <strong className="block text-xs sm:text-sm">ลิงก์สาขา (Branch)</strong>
                      <span className="text-[10px] text-slate-500">เปิดงานและจัดการสาขาแยก</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Form Admin */}
              {roleChoice === 'admin' ? (
                <form onSubmit={handleAdminLogin} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>เข้าสู่ระบบโหมดแอดมินหลัก (ร้านค้าหลัก)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      รหัส PIN แอดมิน (เริ่มต้น: 1234):
                    </label>
                    <input
                      type="password"
                      required
                      value={adminPin}
                      onChange={(e) => setAdminPin(e.target.value)}
                      placeholder="กรอกรหัส PIN 4 หลัก (เช่น 1234)"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Key className="w-4 h-4" />
                    <span>เข้าสู่ระบบแอดมิน</span>
                  </button>
                </form>
              ) : (
                /* Form Branch */
                <form onSubmit={handleBranchLogin} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>เข้าสู่ระบบโหมดสาขา (Branch Login)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ระบุรหัสสาขา (Branch Code):
                    </label>
                    <input
                      type="text"
                      required
                      value={branchCode}
                      onChange={(e) => setBranchCode(e.target.value)}
                      placeholder="เช่น branch-01, branch-chumpae"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    {storedBranches.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-[10px] text-slate-400">เลือกสาขาที่เคยสร้าง:</span>
                        {storedBranches.slice(0, 4).map(b => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setBranchCode(b.tenantCode)}
                            className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded hover:bg-slate-100 font-mono text-slate-700"
                          >
                            {b.tenantCode}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      รหัส PIN สาขา (เริ่มต้น: 1234):
                    </label>
                    <input
                      type="password"
                      required
                      value={branchPin}
                      onChange={(e) => setBranchPin(e.target.value)}
                      placeholder="กรอกรหัส PIN 4 หลัก (เช่น 1234)"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono tracking-widest focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Key className="w-4 h-4" />
                    <span>เข้าสู่ระบบสาขานี้</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: CROSS-DEVICE DATA SYNC (ย้ายเครื่อง / ซิงค์ข้อมูลข้ามโทรศัพท์) */}
          {/* ============================================================== */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1">
                <strong className="text-blue-900 font-bold block flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  <span>วิธีเปิดข้อมูลเดิมบนโทรศัพท์เครื่องใหม่ (Cross-Device Data Migration)</span>
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  เนื่องจากข้อมูลในระบบถูกเก็บรักษาไว้อย่างปลอดภัยในหน่วยความจำของอุปกรณ์ หากท่านเปิดใช้งานบนโทรศัพท์เครื่องใหม่หรือเปลี่ยนเบราว์เซอร์ สามารถย้ายข้อมูลทั้งหมดตาม 2 ขั้นตอนง่ายๆ ด้านล่างนี้:
                </p>
              </div>

              {/* Step A: บนเครื่องเดิม */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">1</span>
                    <strong className="text-xs font-bold text-slate-800">เครื่องเดิม: สร้างรหัสย้ายข้อมูล</strong>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateSyncCode}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>สร้างรหัสย้ายเครื่อง</span>
                  </button>
                </div>

                {generatedSyncCode && (
                  <div className="space-y-2 pt-2 border-t border-slate-200 animate-in fade-in">
                    <div className="relative">
                      <textarea
                        readOnly
                        value={generatedSyncCode}
                        rows={3}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-[11px] text-slate-700 select-all"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-emerald-700 font-semibold">
                        ✓ รหัสย้ายเครื่องพร้อมแล้ว คัดลอกส่งทาง LINE ไปเปิดในมือถือเครื่องใหม่ได้ทันที
                      </span>
                      <button
                        type="button"
                        onClick={handleCopySyncCode}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                          copiedSyncCode ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
                        }`}
                      >
                        {copiedSyncCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedSyncCode ? 'คัดลอกแล้ว!' : 'คัดลอกรหัสย้ายเครื่อง'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Step B: บนโทรศัพท์เครื่องใหม่ */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">2</span>
                  <strong className="text-xs font-bold text-slate-800">โทรศัพท์เครื่องใหม่: วางรหัสเพื่อดึงข้อมูล</strong>
                </div>

                <div>
                  <textarea
                    rows={3}
                    value={inputSyncCode}
                    onChange={(e) => setInputSyncCode(e.target.value)}
                    placeholder="วางรหัสย้ายเครื่อง (Sync Code) ที่ได้จากเครื่องเดิมที่นี่..."
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {syncStatus && (
                  <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    syncStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-rose-50 text-rose-800 border border-rose-300'
                  }`}>
                    {syncStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                    <span>{syncStatus.text}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleExecuteImport}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>ดึงข้อมูลทั้งหมดเข้าโทรศัพท์เครื่องนี้</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: BACKUP & RESTORE FILE */}
          {/* ============================================================== */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-600" />
                  <strong className="text-xs font-bold text-slate-800">สำรองข้อมูลเป็นไฟล์ (JSON Backup)</strong>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  ดาวน์โหลดไฟล์สำรองข้อมูลของร้านและงานซ่อมทั้งหมดเก็บไว้ในคอมพิวเตอร์หรือโทรศัพท์ เพื่อนำไปกู้คืนได้ทุกเวลา
                </p>
                <button
                  type="button"
                  onClick={downloadBackupFile}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลดไฟล์สำรองข้อมูล (.JSON)</span>
                </button>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <strong className="text-xs font-bold text-slate-800">กู้คืนข้อมูลจากไฟล์ (Restore Backup)</strong>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  เลือกไฟล์สำรองข้อมูล (.json) เพื่อกู้คืนข้อมูลทั้งหมดลงในเครื่องนี้
                </p>
                <label className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>เลือกไฟล์กู้คืนข้อมูล (.JSON)</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileRestore}
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>ระบบรักษาความปลอดภัยข้อมูลแยกตามสาขาและแอดมิน</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
