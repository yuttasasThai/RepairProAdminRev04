import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  Share2, 
  Calendar, 
  Clock, 
  Key, 
  Phone, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  ShieldCheck, 
  AlertTriangle, 
  Crown, 
  Download, 
  CheckCircle2, 
  FileText,
  User,
  Sparkles,
  History,
  X,
  MessageCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { BranchLinkItem, BranchRenewalEvent } from '../types/license';
import { 
  getStoredBranches, 
  saveBranchLinkItem, 
  updateStoredBranch, 
  deleteStoredBranch, 
  renewStoredBranch,
  buildBranchUrl,
  formatBranchDateThai,
  getBranchShareMessage,
  DEFAULT_ADMIN_PIN,
  getActiveTenantId
} from '../utils/license';

export const BranchLinksHistoryView: React.FC = () => {
  const [branches, setBranches] = useState<BranchLinkItem[]>(() => getStoredBranches());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring' | 'expired' | 'lifetime'>('all');
  
  // Copy states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const [copiedPinId, setCopiedPinId] = useState<string | null>(null);

  // QR Modal
  const [qrModalItem, setQrModalItem] = useState<BranchLinkItem | null>(null);

  // Edit Modal
  const [editModalItem, setEditModalItem] = useState<BranchLinkItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [editIsLifetime, setEditIsLifetime] = useState(false);
  const [editNotes, setEditNotes] = useState('');

  // History Log Modal
  const [historyModalItem, setHistoryModalItem] = useState<BranchLinkItem | null>(null);

  // Custom Days Adjust Modal (Increase + or Reduce -)
  const [adjustDaysModalItem, setAdjustDaysModalItem] = useState<BranchLinkItem | null>(null);
  const [adjustDaysInput, setAdjustDaysInput] = useState<string>('30');
  const [adjustMode, setAdjustMode] = useState<'add' | 'reduce'>('add');
  const [adjustNote, setAdjustNote] = useState<string>('');

  // Refresh branches on mount
  useEffect(() => {
    setBranches(getStoredBranches());
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    const now = Date.now();
    let active = 0;
    let expiring = 0;
    let expired = 0;
    let lifetime = 0;

    branches.forEach(b => {
      if (b.daysGranted === 'lifetime' || !b.expiresAt) {
        lifetime++;
        active++;
        return;
      }
      const exp = new Date(b.expiresAt).getTime();
      const diff = exp - now;
      if (diff <= 0) {
        expired++;
      } else {
        active++;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days <= 7) {
          expiring++;
        }
      }
    });

    return { total: branches.length, active, expiring, expired, lifetime };
  }, [branches]);

  // Filtered branches
  const filteredBranches = useMemo(() => {
    const now = Date.now();
    return branches.filter(b => {
      // Search
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = !q || 
        b.name.toLowerCase().includes(q) ||
        b.username.toLowerCase().includes(q) ||
        b.tenantCode.toLowerCase().includes(q) ||
        (b.phone && b.phone.includes(q)) ||
        (b.notes && b.notes.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Status Filter
      if (statusFilter === 'all') return true;

      const isLife = b.daysGranted === 'lifetime' || !b.expiresAt;
      if (statusFilter === 'lifetime') return isLife;

      const exp = b.expiresAt ? new Date(b.expiresAt).getTime() : null;
      const isExp = exp ? exp <= now : false;

      if (statusFilter === 'expired') return isExp;
      if (statusFilter === 'active') return !isExp;
      if (statusFilter === 'expiring') {
        if (!exp || isExp || isLife) return false;
        const days = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
        return days <= 7;
      }

      return true;
    });
  }, [branches, searchTerm, statusFilter]);



  // Handle Quick Renewal (supports positive and negative)
  const handleQuickRenew = (branch: BranchLinkItem, days: number | 'lifetime') => {
    const res = renewStoredBranch(branch.id, days);
    if (res.success) {
      setBranches(res.updatedBranches);
    }
  };

  // Handle Custom Days Adjustment (บวกเพิ่ม หรือ ลบลด)
  const handleApplyCustomDays = () => {
    if (!adjustDaysModalItem) return;
    const num = parseInt(adjustDaysInput, 10);
    if (isNaN(num) || num <= 0) return;
    const daysDelta = adjustMode === 'reduce' ? -num : num;
    const res = renewStoredBranch(
      adjustDaysModalItem.id, 
      daysDelta, 
      adjustNote.trim() || undefined
    );
    if (res.success) {
      setBranches(res.updatedBranches);
      setAdjustDaysModalItem(null);
      setAdjustDaysInput('30');
      setAdjustNote('');
    }
  };

  // Helper to shift expiration date in Edit modal
  const handleShiftEditExpires = (daysDelta: number) => {
    const base = editExpiresAt ? new Date(editExpiresAt).getTime() : Date.now();
    const shifted = new Date(base + daysDelta * 24 * 60 * 60 * 1000);
    setEditExpiresAt(shifted.toISOString().slice(0, 16));
    setEditIsLifetime(false);
  };

  // Handle Delete
  const handleDeleteBranch = (branch: BranchLinkItem) => {
    if (confirm(`คุณต้องการลบประวัติลิงก์สาขา "${branch.name}" (${branch.username}) หรือไม่?`)) {
      const updated = deleteStoredBranch(branch.id);
      setBranches(updated);
    }
  };

  // Handle Copy URL
  const handleCopyUrl = (branch: BranchLinkItem) => {
    navigator.clipboard.writeText(branch.url);
    setCopiedId(branch.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Handle Copy Share Message
  const handleCopyShareMessage = (branch: BranchLinkItem) => {
    const msg = getBranchShareMessage(branch);
    navigator.clipboard.writeText(msg);
    setCopiedShareId(branch.id);
    setTimeout(() => setCopiedShareId(null), 2500);
  };

  // Open Edit Modal
  const handleOpenEdit = (branch: BranchLinkItem) => {
    setEditModalItem(branch);
    setEditName(branch.name);
    setEditUsername(branch.username);
    setEditPin(branch.branchPin || '1234');
    setEditPhone(branch.phone || '');
    setEditNotes(branch.notes || '');
    setEditIsLifetime(branch.daysGranted === 'lifetime' || !branch.expiresAt);
    if (branch.expiresAt) {
      try {
        const d = new Date(branch.expiresAt);
        setEditExpiresAt(d.toISOString().slice(0, 16)); // YYYY-MM-DDTHH:MM
      } catch {
        setEditExpiresAt('');
      }
    } else {
      setEditExpiresAt('');
    }
  };

  // Save Edit
  const handleSaveEdit = () => {
    if (!editModalItem) return;

    let finalExpiresAt: string | null = null;
    let finalDays: number | 'lifetime' = editModalItem.daysGranted;

    if (editIsLifetime) {
      finalExpiresAt = null;
      finalDays = 'lifetime';
    } else if (editExpiresAt) {
      finalExpiresAt = new Date(editExpiresAt).toISOString();
    }

    const updatedBranch: BranchLinkItem = {
      ...editModalItem,
      name: editName.trim() || editModalItem.name,
      username: editUsername.trim() || editModalItem.username,
      initialPin: editModalItem.initialPin || editModalItem.branchPin || '1234',
      branchPin: editPin.trim() || editModalItem.branchPin || '1234',
      phone: editPhone.trim(),
      notes: editNotes.trim(),
      expiresAt: finalExpiresAt,
      daysGranted: finalDays,
      url: buildBranchUrl(editModalItem.tenantCode, finalDays, {
        username: editUsername.trim(),
        pin: editPin.trim(),
        expiresAt: finalExpiresAt,
        shopName: editName.trim(),
      }),
    };

    const updatedList = updateStoredBranch(updatedBranch);
    setBranches(updatedList);
    setEditModalItem(null);
  };

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(branches, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `repair-pro-branch-links-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);
  };

  // Helper for status badge
  const getBranchStatusDetails = (branch: BranchLinkItem) => {
    if (branch.daysGranted === 'lifetime' || !branch.expiresAt) {
      return {
        label: 'ตลอดชีพ',
        badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300 font-bold',
        icon: Crown,
        countdown: 'ไม่มีวันหมดอายุ',
        isExpired: false,
      };
    }

    const now = Date.now();
    const exp = new Date(branch.expiresAt).getTime();
    const diff = exp - now;

    if (diff <= 0) {
      return {
        label: 'หมดอายุแล้ว',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
        icon: AlertTriangle,
        countdown: 'สิ้นสุดการใช้งานแล้ว',
        isExpired: true,
      };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);

    if (days <= 7) {
      return {
        label: `ใกล้หมดอายุ (${days} วัน)`,
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-bold animate-pulse',
        icon: Clock,
        countdown: `เหลืออีก ${days} วัน ${hours} ชม.`,
        isExpired: false,
      };
    }

    return {
      label: `ใช้งานปกติ (${days} วัน)`,
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
      icon: ShieldCheck,
      countdown: `เหลืออีก ${days} วัน ${hours} ชม.`,
      isExpired: false,
    };
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-600/30 border border-blue-400/30 rounded-2xl text-blue-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                <span>ตารางบันทึกประวัติลิงก์สาขา</span>
                <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-mono">
                  ADMIN ONLY
                </span>
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                บันทึกประวัติของลิงก์สาขาที่สร้าง ตรวจสอบชื่อผู้ใช้ วันหมดอายุ และต่ออายุให้สาขาได้ทันที
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>สร้างลิงก์สาขาใหม่ได้ที่เมนู <strong>ต่ออายุใช้งาน</strong></span>
          </div>

          <button
            onClick={handleExportJSON}
            title="ส่งออกประวัติลิงก์สาขาเป็นไฟล์ JSON"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">ส่งออก JSON</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">ลิงก์สาขาทั้งหมด</div>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{stats.total}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">ในฐานข้อมูลแอดมิน</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-600 font-medium">กำลังใช้งานได้</div>
            <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">{stats.active}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">รวมตลอดชีพ ({stats.lifetime})</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-600 font-medium">ใกล้หมดอายุ (≤ 7 วัน)</div>
            <div className="text-2xl font-black text-amber-600 mt-1 font-mono">{stats.expiring}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">ควรติดต่อแจ้งต่ออายุ</div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-rose-600 font-medium">หมดอายุแล้ว</div>
            <div className="text-2xl font-black text-rose-600 mt-1 font-mono">{stats.expired}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">รอกดปุ่มต่ออายุ</div>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>



      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อสาขา, Username, PIN, เบอร์โทร..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Status Pill Filters */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'all', label: `ทั้งหมด (${branches.length})` },
            { id: 'active', label: `ใช้งานได้ (${stats.active})` },
            { id: 'expiring', label: `ใกล้หมด (${stats.expiring})` },
            { id: 'expired', label: `หมดอายุ (${stats.expired})` },
            { id: 'lifetime', label: `ตลอดชีพ (${stats.lifetime})` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Branch Links Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">ชื่อร้าน / สาขา</th>
                <th className="py-3.5 px-4">ชื่อผู้ใช้ (Username) / PIN</th>
                <th className="py-3.5 px-4">ลิงก์สาขา (URL) & การแชร์</th>
                <th className="py-3.5 px-4">วันหมดอายุ & สถานะ</th>
                <th className="py-3.5 px-4 text-center">ปรับเวลาการใช้งาน (+เพิ่ม / -ลด)</th>
                <th className="py-3.5 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold">ไม่พบข้อมูลประวัติลิงก์สาขา</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      กดปุ่ม "+ สร้างลิงก์สาขาใหม่" เพื่อบันทึกประวัติและสร้างลิงก์
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBranches.map((branch, index) => {
                  const status = getBranchStatusDetails(branch);
                  const StatusIcon = status.icon;

                  return (
                    <tr key={branch.id} className="hover:bg-slate-50/70 transition">
                      
                      {/* 1. Name & Shop Details */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>{branch.name}</span>
                        </div>
                        {branch.phone && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{branch.phone}</span>
                          </div>
                        )}
                        {branch.notes && (
                          <div className="text-[10px] text-slate-400 italic mt-0.5 truncate max-w-xs">
                            หมายเหตุ: {branch.notes}
                          </div>
                        )}
                      </td>

                      {/* 2. Username & PIN */}
                      <td className="py-3 px-4">
                        <div className="space-y-1.5 min-w-[170px]">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-800 rounded font-mono font-bold border border-blue-200 text-xs">
                            <User className="w-3 h-3 text-blue-600" />
                            <span>{branch.username || branch.tenantCode}</span>
                          </div>

                          {/* Initial PIN (Master Recovery) */}
                          <div className="flex items-center justify-between gap-1 text-[11px] bg-amber-50/70 border border-amber-200 px-2 py-1 rounded-lg">
                            <div className="flex items-center gap-1">
                              <Key className="w-3 h-3 text-amber-600 shrink-0" />
                              <span className="text-amber-800 text-[10px] font-semibold">รหัสเริ่มต้น:</span>
                              <span className="font-mono font-black text-amber-900 tracking-wider">
                                {branch.initialPin || branch.branchPin || '1234'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(branch.initialPin || branch.branchPin || '1234');
                                setCopiedPinId(`init_${branch.id}`);
                                setTimeout(() => setCopiedPinId(null), 1500);
                              }}
                              className="text-amber-700 hover:text-amber-900 p-0.5 rounded cursor-pointer transition"
                              title="คัดลอกรหัสเริ่มต้น (ใช้กู้คืนเมื่อผู้ใช้ลืมรหัส)"
                            >
                              {copiedPinId === `init_${branch.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <div className="text-[9px] text-slate-500 font-medium">
                            *ใช้กู้คืนเข้าสู่ระบบได้เสมอแม้ user เปลี่ยนรหัส
                          </div>

                          {/* Current PIN (if different from initial) */}
                          {branch.branchPin && branch.branchPin !== (branch.initialPin || '1234') && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                              <span>รหัสใหม่ปัจจุบัน:</span>
                              <span className="font-mono font-bold text-slate-800">
                                {branch.branchPin}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. Branch URL & Share Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {/* Copy Link Button */}
                          <button
                            onClick={() => handleCopyUrl(branch)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-2xs cursor-pointer ${
                              copiedId === branch.id
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700'
                            }`}
                            title="คัดลอกลิงก์สาขา"
                          >
                            {copiedId === branch.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-white" />
                                <span>คัดลอกแล้ว</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>คัดลอกลิงก์</span>
                              </>
                            )}
                          </button>

                          {/* Open external */}
                          <a
                            href={branch.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                            title="ทดสอบเปิดลิงก์ในแท็บใหม่"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          {/* QR Code */}
                          <button
                            onClick={() => setQrModalItem(branch)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-600 transition cursor-pointer"
                            title="แสดง QR Code สำหรับสแกนเข้าใช้งานบนมือถือ"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>

                          {/* LINE share */}
                          <button
                            onClick={() => handleCopyShareMessage(branch)}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              copiedShareId === branch.id
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700'
                            }`}
                            title="คัดลอกข้อความสรุปพร้อมส่งทาง LINE"
                          >
                            {copiedShareId === branch.id ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <MessageCircle className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono truncate max-w-xs">
                          {branch.url}
                        </div>
                      </td>

                      {/* 4. Expiry Date & Status */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] border ${status.badgeClass}`}>
                            <StatusIcon className="w-3 h-3" />
                            <span>{status.label}</span>
                          </div>
                          <div className="text-xs font-bold text-slate-800">
                            {formatBranchDateThai(branch.expiresAt)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {status.countdown}
                          </div>
                        </div>
                      </td>

                      {/* 5. Quick Renewal & Adjustment Buttons (+ / -) */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1.5 min-w-[210px]">
                          {/* Positive Add Presets */}
                          <div className="flex items-center gap-1 flex-wrap justify-center">
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                              +เพิ่ม:
                            </span>
                            <button
                              onClick={() => handleQuickRenew(branch, 30)}
                              className="px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-[10px] border border-blue-200 transition cursor-pointer active:scale-95"
                              title="ต่ออายุเพิ่ม 30 วัน (1 เดือน)"
                            >
                              +30วัน
                            </button>
                            <button
                              onClick={() => handleQuickRenew(branch, 90)}
                              className="px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-bold text-[10px] border border-indigo-200 transition cursor-pointer active:scale-95"
                              title="ต่ออายุเพิ่ม 90 วัน (3 เดือน)"
                            >
                              +90วัน
                            </button>
                            <button
                              onClick={() => handleQuickRenew(branch, 360)}
                              className="px-1.5 py-0.5 rounded bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-700 font-bold text-[10px] border border-purple-200 transition cursor-pointer active:scale-95"
                              title="ต่ออายุเพิ่ม 360 วัน (1 ปี)"
                            >
                              +1ปี
                            </button>
                            <button
                              onClick={() => handleQuickRenew(branch, 'lifetime')}
                              className="px-1.5 py-0.5 rounded bg-yellow-50 hover:bg-yellow-500 hover:text-white text-yellow-800 font-bold text-[10px] border border-yellow-300 transition cursor-pointer active:scale-95"
                              title="ปลดล็อคใช้งานตลอดชีพ"
                            >
                              ตลอดชีพ
                            </button>
                          </div>

                          {/* Negative Deduct Presets & Custom Adjustment */}
                          <div className="flex items-center gap-1 flex-wrap justify-center">
                            <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
                              -ลด:
                            </span>
                            <button
                              onClick={() => handleQuickRenew(branch, -7)}
                              className="px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 font-bold text-[10px] border border-rose-200 transition cursor-pointer active:scale-95"
                              title="ลดอายุการใช้งานลง 7 วัน"
                            >
                              -7วัน
                            </button>
                            <button
                              onClick={() => handleQuickRenew(branch, -15)}
                              className="px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 font-bold text-[10px] border border-rose-200 transition cursor-pointer active:scale-95"
                              title="ลดอายุการใช้งานลง 15 วัน"
                            >
                              -15วัน
                            </button>
                            <button
                              onClick={() => handleQuickRenew(branch, -30)}
                              className="px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 font-bold text-[10px] border border-rose-200 transition cursor-pointer active:scale-95"
                              title="ลดอายุการใช้งานลง 30 วัน"
                            >
                              -30วัน
                            </button>
                            <button
                              onClick={() => {
                                setAdjustDaysModalItem(branch);
                                setAdjustDaysInput('30');
                                setAdjustMode('add');
                                setAdjustNote('');
                              }}
                              className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-700 hover:text-white text-slate-700 font-bold text-[10px] border border-slate-300 transition cursor-pointer active:scale-95"
                              title="ระบุจำนวนวันปรับเพิ่มหรือลดเองตามต้องการ"
                            >
                              ⚙️ ปรับวันเอง
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* 6. Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* History log */}
                          <button
                            onClick={() => setHistoryModalItem(branch)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                            title="ดูประวัติการต่ออายุ"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEdit(branch)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 transition cursor-pointer"
                            title="แก้ไขข้อมูลสาขา / วันหมดอายุ"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteBranch(branch)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 transition cursor-pointer"
                            title="ลบรายการสาขา"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Code Modal */}
      {qrModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 animate-in zoom-in-95 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-sm">QR Code ลิงก์สาขา</h3>
              <button
                onClick={() => setQrModalItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrModalItem.url)}`}
                alt="Branch QR Code"
                className="w-48 h-48 mx-auto rounded-lg shadow-xs"
              />
            </div>

            <div>
              <div className="font-bold text-slate-800 text-base">{qrModalItem.name}</div>
              <div className="text-xs text-blue-600 font-mono mt-0.5">
                Username: <strong>{qrModalItem.username}</strong> | PIN: <strong>{qrModalItem.branchPin || '1234'}</strong>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                วันหมดอายุ: {formatBranchDateThai(qrModalItem.expiresAt)}
              </div>
            </div>

            <button
              onClick={() => handleCopyShareMessage(qrModalItem)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4" />
              <span>คัดลอกข้อความส่งทาง LINE</span>
            </button>
          </div>
        </div>
      )}

      {/* Edit Branch Modal */}
      {editModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 animate-in zoom-in-95 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>แก้ไขข้อมูลสาขา: {editModalItem.name}</span>
              </h3>
              <button
                onClick={() => setEditModalItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ชื่อร้าน / สาขา</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อผู้ใช้ (Username)</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">รหัสผ่าน PIN สาขา</label>
                  <input
                    type="password"
                    value={editPin}
                    onChange={(e) => setEditPin(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์สาขา</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              {/* Expiry Settings */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">กำหนดวันหมดอายุ</label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-amber-600">
                    <input
                      type="checkbox"
                      checked={editIsLifetime}
                      onChange={(e) => setEditIsLifetime(e.target.checked)}
                      className="rounded text-amber-500"
                    />
                    <span>ตลอดชีพ</span>
                  </label>
                </div>

                {!editIsLifetime && (
                  <div className="space-y-2">
                    <input
                      type="datetime-local"
                      value={editExpiresAt}
                      onChange={(e) => setEditExpiresAt(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-500 font-bold">ปรับวันด่วน:</span>
                      <button
                        type="button"
                        onClick={() => handleShiftEditExpires(30)}
                        className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-[10px] font-bold border border-blue-200 cursor-pointer"
                      >
                        +30 วัน
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShiftEditExpires(7)}
                        className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-[10px] font-bold border border-blue-200 cursor-pointer"
                      >
                        +7 วัน
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShiftEditExpires(-7)}
                        className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 text-[10px] font-bold border border-rose-200 cursor-pointer"
                      >
                        -7 วัน
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShiftEditExpires(-30)}
                        className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 text-[10px] font-bold border border-rose-200 cursor-pointer"
                      >
                        -30 วัน
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">หมายเหตุ</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditModalItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition cursor-pointer shadow-xs"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Days Adjust Modal (+ เพิ่มวัน หรือ - ลดวัน) */}
      {adjustDaysModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 animate-in zoom-in-95 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${adjustMode === 'add' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {adjustMode === 'add' ? '➕ เพิ่มอายุการใช้งาน' : '➖ ลดอายุการใช้งาน'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {adjustDaysModalItem.name} ({adjustDaysModalItem.username || adjustDaysModalItem.tenantCode})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAdjustDaysModalItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Expiry Info */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
              <span className="text-slate-500">วันหมดอายุปัจจุบัน:</span>
              <strong className="text-slate-800">{formatBranchDateThai(adjustDaysModalItem.expiresAt)}</strong>
            </div>

            {/* Mode Selector Toggle: Add vs Reduce */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                เลือกรูปแบบการปรับเปลี่ยน:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustMode('add')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    adjustMode === 'add'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>➕ เพิ่มอายุ (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustMode('reduce')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    adjustMode === 'reduce'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>➖ ลดอายุ (-)</span>
                </button>
              </div>
            </div>

            {/* Days presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {adjustMode === 'add' ? 'เลือกจำนวนวันที่ต้องการเพิ่ม (+):' : 'เลือกจำนวนวันที่ต้องการลด (-):'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(adjustMode === 'add' ? [7, 15, 30, 60, 90, 180, 365] : [7, 15, 30, 45, 60, 90]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setAdjustDaysInput(String(d))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      adjustDaysInput === String(d)
                        ? (adjustMode === 'add' ? 'bg-emerald-100 text-emerald-800 border-emerald-400 font-black' : 'bg-rose-100 text-rose-800 border-rose-400 font-black')
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {adjustMode === 'add' ? `+${d}` : `-${d}`} วัน
                  </button>
                ))}
              </div>
            </div>

            {/* Number of days custom input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                หรือระบุจำนวนวันเอง:
              </label>
              <div className="flex items-center gap-2">
                <span className={`text-base font-bold ${adjustMode === 'add' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {adjustMode === 'add' ? '+' : '-'}
                </span>
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={adjustDaysInput}
                  onChange={(e) => setAdjustDaysInput(e.target.value)}
                  className="w-28 px-3 py-2 bg-white border border-slate-300 rounded-xl text-center font-bold text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
                <span className="text-xs font-semibold text-slate-600">วัน</span>
              </div>
            </div>

            {/* Note input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                หมายเหตุการปรับปรุง (ถ้ามี):
              </label>
              <input
                type="text"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder={adjustMode === 'add' ? 'เช่น โปรโมชั่นขยายเวลา, ชำระเงินรอบใหม่' : 'เช่น ปรับลดวันคืนเงิน, ยกเลิกแพ็กเกจ'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdjustDaysModalItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleApplyCustomDays}
                className={`px-5 py-2 text-white rounded-xl font-bold text-xs transition cursor-pointer shadow-xs active:scale-95 ${
                  adjustMode === 'add'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {adjustMode === 'add' ? `ยืนยันเพิ่มเวลา (+${adjustDaysInput || 0} วัน)` : `ยืนยันลดเวลา (-${adjustDaysInput || 0} วัน)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Log Modal */}
      {historyModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 animate-in zoom-in-95 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                <History className="w-4 h-4 text-indigo-600" />
                <span>ประวัติการต่ออายุ: {historyModalItem.name}</span>
              </h3>
              <button
                onClick={() => setHistoryModalItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2.5 flex-1 text-xs">
              {(!historyModalItem.renewals || historyModalItem.renewals.length === 0) ? (
                <div className="py-8 text-center text-slate-400">
                  ยังไม่มีประวัติการต่ออายุเพิ่มเติม
                </div>
              ) : (
                historyModalItem.renewals.map((r, i) => (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>{r.note || `ต่ออายุ (${r.daysAdded === 'lifetime' ? 'ตลอดชีพ' : (typeof r.daysAdded === 'number' && r.daysAdded < 0 ? `${r.daysAdded} วัน` : `+${r.daysAdded} วัน`)})`}</span>
                      <span className="text-[10px] text-indigo-600 font-mono">
                        {new Date(r.renewedAt).toLocaleString('th-TH')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      วันหมดอายุ: <strong className="text-slate-700">{formatBranchDateThai(r.newExpiresAt)}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setHistoryModalItem(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
