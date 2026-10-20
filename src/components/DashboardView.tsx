import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Wrench, 
  Package, 
  Truck, 
  XCircle, 
  Phone, 
  ArrowUpRight, 
  Eye, 
  ShieldCheck, 
  ShieldX, 
  Sparkles, 
  Layers, 
  Inbox, 
  Search, 
  X, 
  Printer, 
  User, 
  BarChart3, 
  Calendar, 
  Percent, 
  Award,
  Zap
} from 'lucide-react';
import { RepairJob, RepairStatus, ShopSettings } from '../types/repair';
import { 
  STATUS_MAP, 
  formatCurrency, 
  formatDateThai, 
  getJobWarrantyStatus 
} from '../utils/formatters';

interface DashboardViewProps {
  jobs: RepairJob[];
  shopSettings: ShopSettings;
  onOpenNewJob: () => void;
  onOpenJobDetail: (job: RepairJob) => void;
  onOpenStatusUpdate: (job: RepairJob) => void;
  onOpenCostUpdate: (job: RepairJob) => void;
  onOpenPrint: (job: RepairJob) => void;
  onNavigateToWarranty: () => void;
  onNavigateToJobs: (filterStatus?: RepairStatus) => void;
}

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  jobs,
  shopSettings,
  onOpenNewJob,
  onOpenJobDetail,
  onOpenStatusUpdate,
  onOpenCostUpdate,
  onOpenPrint,
  onNavigateToWarranty,
  onNavigateToJobs,
}) => {
  // Quick Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [monthlyChartMetric, setMonthlyChartMetric] = useState<'financial' | 'volume'>('financial');
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);

  // 1. KPI Aggregates
  const totalJobsCount = jobs.length;

  const newJobsCount = useMemo(() => {
    return jobs.filter(j => j.status === 'pending').length;
  }, [jobs]);

  const inProgressCount = useMemo(() => {
    return jobs.filter(j => j.status === 'in_progress' || j.status === 'waiting_parts').length;
  }, [jobs]);

  const completedDeliveredCount = useMemo(() => {
    return jobs.filter(j => j.status === 'delivered' || j.status === 'picked_up' || j.status === 'completed' || j.status === 'ready_to_ship').length;
  }, [jobs]);

  const cancelledCount = useMemo(() => {
    return jobs.filter(j => j.status === 'cancelled').length;
  }, [jobs]);

  // Financial aggregates
  const totalRevenue = useMemo(() => {
    return jobs.reduce((sum, j) => sum + (j.financials.price || 0) + (j.financials.onsiteServiceFee || 0), 0);
  }, [jobs]);

  const totalPartsCost = useMemo(() => {
    return jobs.reduce((sum, j) => sum + (j.financials.partsCost || 0), 0);
  }, [jobs]);

  const totalShippingCost = useMemo(() => {
    return jobs.reduce((sum, j) => sum + (j.financials.shippingCost || 0), 0);
  }, [jobs]);

  const totalCost = useMemo(() => {
    return jobs.reduce((sum, j) => sum + (j.financials.totalCost || 0), 0);
  }, [jobs]);

  const totalProfit = useMemo(() => {
    return jobs.reduce((sum, j) => sum + (j.financials.profit || 0), 0);
  }, [jobs]);

  const profitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;
  const avgRevenuePerJob = totalJobsCount > 0 ? Math.round(totalRevenue / totalJobsCount) : 0;
  const completionRate = totalJobsCount > 0 ? Math.round((completedDeliveredCount / totalJobsCount) * 100) : 0;

  // Warranty status aggregates
  const warrantyCounts = useMemo(() => {
    let inWarranty = 0;
    let outWarranty = 0;
    let notStarted = 0;

    jobs.forEach(job => {
      const res = getJobWarrantyStatus(job);
      if (res.status === 'active' || res.status === 'expiring_soon') {
        inWarranty++;
      } else if (res.status === 'not_started') {
        notStarted++;
      } else {
        outWarranty++;
      }
    });

    return { inWarranty, outWarranty, notStarted };
  }, [jobs]);

  // Delivery breakdown
  const finishedJobs = useMemo(() => {
    return jobs.filter(j => j.status === 'delivered' || j.status === 'picked_up' || j.status === 'completed' || j.status === 'ready_to_ship');
  }, [jobs]);

  const parcelCount = useMemo(() => {
    return finishedJobs.filter(j => j.trackingNumber && j.trackingNumber.trim() !== '').length;
  }, [finishedJobs]);

  const pickupCount = Math.max(0, finishedJobs.length - parcelCount);

  // Status breakdown array for horizontal performance bars
  const statusPerformanceList = useMemo(() => {
    const list: {
      status: RepairStatus;
      label: string;
      color: string;
      badgeBg: string;
      barClass: string;
      count: number;
      percentage: number;
    }[] = [
      {
        status: 'pending',
        label: 'รอซ่อม (งานเข้าใหม่)',
        color: '#f59e0b',
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
        barClass: 'bg-amber-500',
        count: jobs.filter(j => j.status === 'pending').length,
        percentage: 0,
      },
      {
        status: 'in_progress',
        label: 'กำลังตรวจซ่อม',
        color: '#3b82f6',
        badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
        barClass: 'bg-blue-500',
        count: jobs.filter(j => j.status === 'in_progress').length,
        percentage: 0,
      },
      {
        status: 'waiting_parts',
        label: 'รออะไหล่',
        color: '#a855f7',
        badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
        barClass: 'bg-purple-500',
        count: jobs.filter(j => j.status === 'waiting_parts').length,
        percentage: 0,
      },
      {
        status: 'completed',
        label: 'ซ่อมเสร็จแล้ว',
        color: '#10b981',
        badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        barClass: 'bg-emerald-500',
        count: jobs.filter(j => j.status === 'completed').length,
        percentage: 0,
      },
      {
        status: 'ready_to_ship',
        label: 'รอส่งมอบ/รอพัสดุ',
        color: '#06b6d4',
        badgeBg: 'bg-cyan-50 text-cyan-800 border-cyan-200',
        barClass: 'bg-cyan-500',
        count: jobs.filter(j => j.status === 'ready_to_ship').length,
        percentage: 0,
      },
      {
        status: 'delivered',
        label: 'จัดส่งพัสดุเรียบร้อย',
        color: '#0f766e',
        badgeBg: 'bg-teal-50 text-teal-800 border-teal-200',
        barClass: 'bg-teal-600',
        count: jobs.filter(j => j.status === 'delivered').length,
        percentage: 0,
      },
      {
        status: 'picked_up',
        label: 'ลูกค้ารับเครื่องเอง',
        color: '#059669',
        badgeBg: 'bg-emerald-50 text-emerald-900 border-emerald-300',
        barClass: 'bg-emerald-600',
        count: jobs.filter(j => j.status === 'picked_up').length,
        percentage: 0,
      },
      {
        status: 'cancelled',
        label: 'ยกเลิกงานซ่อม',
        color: '#ef4444',
        badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
        barClass: 'bg-rose-500',
        count: jobs.filter(j => j.status === 'cancelled').length,
        percentage: 0,
      },
    ];

    return list.map(item => ({
      ...item,
      percentage: totalJobsCount > 0 ? Math.round((item.count / totalJobsCount) * 100) : 0,
    }));
  }, [jobs, totalJobsCount]);

  // 2. Monthly Performance Data Calculation (Last 6 Months)
  const monthlyData = useMemo(() => {
    const today = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const label = `${THAI_MONTHS_SHORT[month]} ${String(year + 543).slice(-2)}`;

      // Filter jobs matching this month
      const monthJobs = jobs.filter(j => {
        if (!j.createdAt) return false;
        return j.createdAt.startsWith(monthKey);
      });

      const revenue = monthJobs.reduce((sum, j) => sum + (j.financials.price || 0) + (j.financials.onsiteServiceFee || 0), 0);
      const cost = monthJobs.reduce((sum, j) => sum + (j.financials.totalCost || 0), 0);
      const profit = monthJobs.reduce((sum, j) => sum + (j.financials.profit || 0), 0);
      const completed = monthJobs.filter(j => j.status === 'delivered' || j.status === 'picked_up' || j.status === 'completed' || j.status === 'ready_to_ship').length;

      months.push({
        monthKey,
        label,
        year,
        month,
        totalJobs: monthJobs.length,
        completedJobs: completed,
        revenue,
        cost,
        profit,
        profitMargin: revenue > 0 ? Math.round((profit / revenue) * 100) : 0,
      });
    }

    return months;
  }, [jobs]);

  // Find best month by revenue
  const bestMonth = useMemo(() => {
    return [...monthlyData].sort((a, b) => b.revenue - a.revenue)[0];
  }, [monthlyData]);

  // Filtered jobs for search
  const filteredJobs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const normalizedQueryPhone = query.replace(/\D/g, '');

    return jobs.filter(job => {
      // 1. Status Filter
      if (statusFilter !== 'all') {
        if (job.status !== statusFilter) {
          return false;
        }
      }

      // 2. Search query filter
      if (!query) return true;

      const customerName = (job.customer.name || '').toLowerCase();
      if (customerName.includes(query)) return true;

      const rawPhone = job.customer.phone || '';
      if (rawPhone.toLowerCase().includes(query)) return true;
      if (normalizedQueryPhone.length > 0) {
        const cleanPhone = rawPhone.replace(/\D/g, '');
        if (cleanPhone.includes(normalizedQueryPhone)) return true;
      }

      const jobId = (job.id || '').toLowerCase();
      if (jobId.includes(query)) return true;

      const deviceDesc = `${job.device.brand || ''} ${job.device.model || ''}`.toLowerCase();
      if (deviceDesc.includes(query)) return true;

      return false;
    });
  }, [jobs, searchQuery, statusFilter]);

  return (
    <div className="space-y-4 pb-4">
      {/* 1. Header Card: Branding & Quick Action */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 sm:px-5 shadow-sm border border-slate-700/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/20">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight font-mono text-white">
                  RepairProShop
                </h1>
                <span className="bg-blue-500/30 text-blue-300 text-[10px] px-2.5 py-0.5 rounded-full font-semibold border border-blue-400/30">
                  แดชบอร์ดสรุปผลงาน
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-300 mt-1">
                <span className="font-medium text-slate-200">{shopSettings.shopName}</span>
                <span>•</span>
                <a 
                  href={`tel:${shopSettings.phone}`}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold"
                >
                  <Phone className="w-3 h-3" />
                  <span>{shopSettings.phone}</span>
                </a>
                <span>•</span>
                <span className="text-slate-300">LINE: {shopSettings.lineId}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {/* New incoming jobs metric */}
            <div className="bg-amber-500/15 border border-amber-400/60 rounded-xl px-3.5 py-1.5 flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <div>
                <span className="text-[10px] text-amber-300 font-medium block leading-tight">งานรอซ่อมใหม่</span>
                <span className="text-xs sm:text-sm font-black font-mono text-amber-400 leading-tight">
                  {newJobsCount} <span className="text-[10px] font-normal text-amber-200">งาน</span>
                </span>
              </div>
            </div>

            <button
              onClick={onOpenNewJob}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5 hover:scale-102 cursor-pointer"
            >
              <span>+ เปิด Job ใหม่</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Executive KPI Summary Grid (Replacing redundant circular charts with a balanced metric grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* KPI 1: รายได้รวม */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold text-slate-600">รายได้รวม</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-blue-700 tracking-tight">
            {formatCurrency(totalRevenue)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="text-blue-600 font-semibold font-mono">เฉลี่ย {formatCurrency(avgRevenuePerJob)}</span>
            <span>/ งาน</span>
          </div>
        </div>

        {/* KPI 2: กำไรสุทธิ */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold text-slate-600">กำไรสุทธิ</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-emerald-700 tracking-tight">
            {formatCurrency(totalProfit)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px]">
            <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold font-mono">
              Margin {profitMargin}%
            </span>
            <span className="text-slate-400">ของรายรับ</span>
          </div>
        </div>

        {/* KPI 3: ต้นทุนรวม */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold text-slate-600">ต้นทุนรวม</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-rose-600 tracking-tight">
            {formatCurrency(totalCost)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>อะไหล่ {formatCurrency(totalPartsCost)}</span>
            <span>ส่ง {formatCurrency(totalShippingCost)}</span>
          </div>
        </div>

        {/* KPI 4: งานซ่อมทั้งหมด / เสร็จสิ้น */}
        <div 
          onClick={() => onNavigateToJobs()}
          className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold text-slate-600 group-hover:text-blue-700 transition-colors">
              งานทั้งหมดในระบบ
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-slate-900 tracking-tight flex items-baseline gap-1.5">
            <span>{totalJobsCount}</span>
            <span className="text-xs font-normal text-slate-400">งาน</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px]">
            <span className="text-emerald-700 font-bold font-mono">ปิดแล้ว {completedDeliveredCount}</span>
            <span className="text-slate-300">•</span>
            <span className="text-blue-600 font-medium font-mono">กำลังทำ {inProgressCount}</span>
          </div>
        </div>

        {/* KPI 5: สถานะความคุ้มครองประกัน */}
        <div 
          onClick={onNavigateToWarranty}
          className="col-span-2 lg:col-span-1 bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold text-slate-600 group-hover:text-emerald-700 transition-colors">
              ความคุ้มครองประกัน
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-emerald-700 tracking-tight flex items-baseline gap-1.5">
            <span>{warrantyCounts.inWarranty}</span>
            <span className="text-xs font-normal text-slate-400">งานในประกัน</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
            <span className="text-orange-600 font-medium">หมด {warrantyCounts.outWarranty} งาน</span>
            <span className="text-blue-600 group-hover:underline flex items-center gap-0.5">
              ตรวจดู <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* 3. Monthly Performance Bar Chart (Primary Balanced Visualization replacing redundant pie charts) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4.5 h-4.5 text-blue-600" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                สถิติและผลงานรายเดือน (Monthly Performance Bar Chart)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              เปรียบเทียบแนวโน้มรายรับ กำไร และปริมาณงานซ่อมในแต่ละเดือนย้อนหลัง 6 เดือน
            </p>
          </div>

          {/* Toggle buttons between Financial and Volume metrics */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setMonthlyChartMetric('financial')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                monthlyChartMetric === 'financial'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              รายได้ & กำไรสุทธิ
            </button>
            <button
              onClick={() => setMonthlyChartMetric('volume')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                monthlyChartMetric === 'volume'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              จำนวนงานซ่อม
            </button>
          </div>
        </div>

        {/* Bar Chart Visualization */}
        <div className="pt-4">
          {monthlyChartMetric === 'financial' ? (
            // Mode 1: Financial Dual Bar Chart (Revenue vs Profit)
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-blue-600 shrink-0" />
                    <span className="font-semibold text-slate-700">รายได้รวม</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-700">กำไรสุทธิ</span>
                  </div>
                </div>

                {bestMonth && bestMonth.revenue > 0 && (
                  <div className="hidden sm:flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <Award className="w-3 h-3" />
                    <span>เดือนสูงสุด: {bestMonth.label} ({formatCurrency(bestMonth.revenue)})</span>
                  </div>
                )}
              </div>

              {/* Monthly Bars container */}
              {(() => {
                const maxFinancial = Math.max(
                  ...monthlyData.map(m => Math.max(m.revenue, m.cost, m.profit)),
                  1000
                );

                return (
                  <div className="grid grid-cols-6 gap-2 sm:gap-4 h-48 sm:h-56 items-end pt-6 pb-2 border-b border-slate-100">
                    {monthlyData.map((item, idx) => {
                      const revPercent = Math.max(6, Math.round((item.revenue / maxFinancial) * 100));
                      const profitPercent = Math.max(4, Math.round((Math.max(0, item.profit) / maxFinancial) * 100));
                      const isHovered = hoveredMonthIndex === idx;

                      return (
                        <div
                          key={item.monthKey}
                          onMouseEnter={() => setHoveredMonthIndex(idx)}
                          onMouseLeave={() => setHoveredMonthIndex(null)}
                          className={`relative flex flex-col items-center h-full justify-end group transition-all duration-150 p-1 rounded-xl cursor-pointer ${
                            isHovered ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          {/* Floating Tooltip */}
                          {isHovered && (
                            <div className="absolute -top-12 z-20 bg-slate-900 text-white text-[11px] px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap pointer-events-none animate-in fade-in duration-100">
                              <div className="font-bold">{item.label}</div>
                              <div className="text-blue-300">รายได้: {formatCurrency(item.revenue)}</div>
                              <div className="text-emerald-300">กำไร: {formatCurrency(item.profit)} ({item.profitMargin}%)</div>
                            </div>
                          )}

                          {/* Bars Pair */}
                          <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full max-w-[64px]">
                            {/* Revenue Bar */}
                            <div 
                              className="w-1/2 bg-gradient-to-t from-blue-700 to-blue-500 rounded-t-md transition-all duration-500 shadow-2xs group-hover:brightness-110 relative"
                              style={{ height: `${item.revenue > 0 ? revPercent : 4}%` }}
                            >
                              {item.revenue > 0 && (
                                <span className="hidden sm:block absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold font-mono text-blue-700 whitespace-nowrap">
                                  {Math.round(item.revenue / 1000)}k
                                </span>
                              )}
                            </div>

                            {/* Profit Bar */}
                            <div 
                              className="w-1/2 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md transition-all duration-500 shadow-2xs group-hover:brightness-110 relative"
                              style={{ height: `${item.profit > 0 ? profitPercent : 4}%` }}
                            >
                              {item.profit > 0 && (
                                <span className="hidden sm:block absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold font-mono text-emerald-700 whitespace-nowrap">
                                  {Math.round(item.profit / 1000)}k
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Month Label */}
                          <span className="text-[11px] font-bold text-slate-700 mt-2 truncate max-w-full">
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          ) : (
            // Mode 2: Volume Bar Chart (Job counts)
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-indigo-600 shrink-0" />
                    <span className="font-semibold text-slate-700">งานเข้าใหม่</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-700">ซ่อมเสร็จ & ส่งมอบ</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 font-mono">
                  รวม 6 เดือน: {monthlyData.reduce((s, m) => s + m.totalJobs, 0)} งาน
                </div>
              </div>

              {/* Monthly Volume Bars container */}
              {(() => {
                const maxVolume = Math.max(
                  ...monthlyData.map(m => Math.max(m.totalJobs, m.completedJobs)),
                  5
                );

                return (
                  <div className="grid grid-cols-6 gap-2 sm:gap-4 h-48 sm:h-56 items-end pt-6 pb-2 border-b border-slate-100">
                    {monthlyData.map((item, idx) => {
                      const totalPercent = Math.max(6, Math.round((item.totalJobs / maxVolume) * 100));
                      const compPercent = Math.max(4, Math.round((item.completedJobs / maxVolume) * 100));
                      const isHovered = hoveredMonthIndex === idx;

                      return (
                        <div
                          key={item.monthKey}
                          onMouseEnter={() => setHoveredMonthIndex(idx)}
                          onMouseLeave={() => setHoveredMonthIndex(null)}
                          className={`relative flex flex-col items-center h-full justify-end group transition-all duration-150 p-1 rounded-xl cursor-pointer ${
                            isHovered ? 'bg-indigo-50/50' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          {/* Tooltip */}
                          {isHovered && (
                            <div className="absolute -top-12 z-20 bg-slate-900 text-white text-[11px] px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap pointer-events-none animate-in fade-in duration-100">
                              <div className="font-bold">{item.label}</div>
                              <div className="text-indigo-300">งานเข้าใหม่: {item.totalJobs} งาน</div>
                              <div className="text-emerald-300">ปิดงานแล้ว: {item.completedJobs} งาน</div>
                            </div>
                          )}

                          {/* Bars */}
                          <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full max-w-[64px]">
                            {/* Total incoming */}
                            <div 
                              className="w-1/2 bg-gradient-to-t from-indigo-700 to-indigo-500 rounded-t-md transition-all duration-500 shadow-2xs group-hover:brightness-110 relative"
                              style={{ height: `${item.totalJobs > 0 ? totalPercent : 4}%` }}
                            >
                              {item.totalJobs > 0 && (
                                <span className="block absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold font-mono text-indigo-700">
                                  {item.totalJobs}
                                </span>
                              )}
                            </div>

                            {/* Completed */}
                            <div 
                              className="w-1/2 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md transition-all duration-500 shadow-2xs group-hover:brightness-110 relative"
                              style={{ height: `${item.completedJobs > 0 ? compPercent : 4}%` }}
                            >
                              {item.completedJobs > 0 && (
                                <span className="block absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold font-mono text-emerald-700">
                                  {item.completedJobs}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Label */}
                          <span className="text-[11px] font-bold text-slate-700 mt-2 truncate max-w-full">
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Quick Metrics Strip below chart */}
          <div className="pt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-slate-400 text-[10px] block">อัตราปิดงานซ่อม</span>
              <strong className="text-emerald-700 font-mono text-sm">{completionRate}%</strong>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-slate-400 text-[10px] block">รายได้เฉลี่ย/งาน</span>
              <strong className="text-blue-700 font-mono text-sm">{formatCurrency(avgRevenuePerJob)}</strong>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-slate-400 text-[10px] block">อัตรากำไรเฉลี่ย</span>
              <strong className="text-emerald-700 font-mono text-sm">{profitMargin}%</strong>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-slate-400 text-[10px] block">งานที่ยกเลิก</span>
              <strong className="text-rose-600 font-mono text-sm">{cancelledCount} งาน</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Operational Breakdown Section: Status Distribution & Delivery/Warranty */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Card: Status Distribution Horizontal Progress Bars (Cleaner than circular pie charts) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>การกระจายตัวของสถานะงานซ่อม</span>
              </h2>
              <span className="text-[10px] text-slate-400">
                สัดส่วนงานตามขั้นตอนการปฏิบัติงาน (ทั้งหมด {totalJobsCount} งาน)
              </span>
            </div>
            <button
              onClick={() => onNavigateToJobs()}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <span>ไปตาราง</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="pt-3 space-y-2.5 flex-1">
            {statusPerformanceList.map((item) => (
              <button
                key={item.status}
                onClick={() => onNavigateToJobs(item.status)}
                className="w-full text-left group p-1.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: item.color }} 
                    />
                    <span className="font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-[11px] font-bold text-slate-900">
                      {item.count} งาน
                    </span>
                    <span className="text-[10px] text-slate-400 w-9 text-right">
                      ({item.percentage}%)
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`${item.barClass} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>💡 คลิกที่สถานะเพื่อกรองดูรายการงานในตาราง</span>
            <span className="font-mono font-bold text-slate-700">สำเร็จ {completionRate}%</span>
          </div>
        </div>

        {/* Right Card: Delivery Methods & Protection Gauge */}
        <div className="space-y-4">
          {/* Card 2A: การส่งมอบและช่องทางการรับบริการ */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-sky-600" />
                  <span>การส่งมอบและช่องทางรับเครื่อง</span>
                </h3>
                <span className="text-[10px] text-slate-400">เปรียบเทียบจัดส่งพัสดุ vs มารับเองที่ร้าน</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono">
                ปิดจ๊อบ {finishedJobs.length} งาน
              </span>
            </div>

            <div className="pt-3 space-y-3">
              {/* Parcel Bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <Truck className="w-3.5 h-3.5 text-sky-600" />
                    <span>จัดส่งพัสดุ (มีเลข Tracking)</span>
                  </div>
                  <span className="font-bold text-sky-700 font-mono text-xs">
                    {parcelCount} งาน ({finishedJobs.length > 0 ? Math.round((parcelCount / finishedJobs.length) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-sky-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${finishedJobs.length > 0 ? (parcelCount / finishedJobs.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Pickup Bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <Package className="w-3.5 h-3.5 text-emerald-600" />
                    <span>มารับเองที่ร้าน</span>
                  </div>
                  <span className="font-bold text-emerald-700 font-mono text-xs">
                    {pickupCount} งาน ({finishedJobs.length > 0 ? Math.round((pickupCount / finishedJobs.length) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${finishedJobs.length > 0 ? (pickupCount / finishedJobs.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Channel Breakdown Pills */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-1.5 text-center text-[10px]">
                <div className="bg-sky-50/70 p-1.5 rounded-lg border border-sky-100">
                  <span className="text-slate-500 block">📦 ส่งมาซ่อม</span>
                  <strong className="text-sky-800 font-mono text-xs">
                    {jobs.filter(j => j.serviceChannel === 'ส่งมา').length}
                  </strong>
                </div>
                <div className="bg-emerald-50/70 p-1.5 rounded-lg border border-emerald-100">
                  <span className="text-slate-500 block">🚶 นำมาเอง</span>
                  <strong className="text-emerald-800 font-mono text-xs">
                    {jobs.filter(j => !j.serviceChannel || j.serviceChannel === 'มาเอง').length}
                  </strong>
                </div>
                <div className="bg-amber-50/70 p-1.5 rounded-lg border border-amber-100">
                  <span className="text-slate-500 block">🚗 นอกสถานที่</span>
                  <strong className="text-amber-800 font-mono text-xs">
                    {jobs.filter(j => j.serviceChannel === 'ซ่อมนอกสถานที่').length}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2B: Warranty Gauge & Metrics */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>การรับประกันและบริการหลังการขาย</span>
                </h3>
                <span className="text-[10px] text-slate-400">ในประกัน vs ใกล้หมด vs หมดประกัน</span>
              </div>
              <button
                onClick={onNavigateToWarranty}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold cursor-pointer flex items-center gap-0.5"
              >
                <span>ดูตาราง</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="pt-3 space-y-3">
              {/* Segmented Meter Bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">สัดส่วนประกัน:</span>
                  <span className="text-[11px] font-bold text-emerald-700 font-mono">
                    {jobs.length > 0 ? Math.round((warrantyCounts.inWarranty / jobs.length) * 100) : 0}% อยู่ในระยะคุ้มครอง
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden p-0.5 border border-slate-200">
                  <div 
                    className="bg-emerald-500 rounded-l-full transition-all"
                    style={{ width: `${jobs.length > 0 ? (warrantyCounts.inWarranty / jobs.length) * 100 : 0}%` }}
                    title="อยู่ในประกัน"
                  />
                  <div 
                    className="bg-orange-500 transition-all"
                    style={{ width: `${jobs.length > 0 ? (warrantyCounts.outWarranty / jobs.length) * 100 : 0}%` }}
                    title="หมดประกัน"
                  />
                  <div 
                    className="bg-slate-400 rounded-r-full transition-all"
                    style={{ width: `${jobs.length > 0 ? (warrantyCounts.notStarted / jobs.length) * 100 : 0}%` }}
                    title="ยังไม่เริ่มนับ"
                  />
                </div>
              </div>

              {/* Grid Cards */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-emerald-50/80 p-2 rounded-xl border border-emerald-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto mb-0.5" />
                  <span className="text-[10px] text-emerald-800 font-medium block">อยู่ในประกัน</span>
                  <strong className="text-emerald-900 font-mono text-sm">{warrantyCounts.inWarranty}</strong>
                </div>

                <div className="bg-orange-50/80 p-2 rounded-xl border border-orange-200">
                  <ShieldX className="w-4 h-4 text-orange-600 mx-auto mb-0.5" />
                  <span className="text-[10px] text-orange-800 font-medium block">หมดประกัน</span>
                  <strong className="text-orange-900 font-mono text-sm">{warrantyCounts.outWarranty}</strong>
                </div>

                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <Clock className="w-4 h-4 text-slate-500 mx-auto mb-0.5" />
                  <span className="text-[10px] text-slate-600 font-medium block">ยังไม่เริ่มนับ</span>
                  <strong className="text-slate-800 font-mono text-sm">{warrantyCounts.notStarted}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Quick Job Search & Instant Management Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Search Bar Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-blue-500/20">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    ค้นหางานซ่อมด่วน (Quick Job Search)
                  </h2>
                  <span className="bg-blue-50 text-blue-700 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-200/60 font-mono">
                    {filteredJobs.length} / {jobs.length} งาน
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  ค้นหาด้วยชื่อลูกค้า หรือเบอร์โทรศัพท์ เพื่อเข้าถึงและอัปเดตงานซ่อมได้ทันที
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateToJobs()}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>ดูตารางงานทั้งหมด</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search Input and Status Pills */}
          <div className="flex flex-col lg:flex-row gap-2.5">
            {/* Input with Search & Clear icon */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อลูกค้า หรือเบอร์โทรศัพท์ (เช่น สมชาย หรือ 0812345678)..."
                className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800 placeholder-slate-400 transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="ล้างคำค้นหา"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick status filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none text-xs">
              {[
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'pending', label: 'รอซ่อม' },
                { id: 'in_progress', label: 'กำลังซ่อม' },
                { id: 'waiting_parts', label: 'รออะไหล่' },
                { id: 'completed', label: 'ซ่อมแล้ว' },
                { id: 'delivered', label: 'ส่งแล้ว' },
                { id: 'picked_up', label: 'มารับเอง' },
              ].map((pill) => {
                const isActive = statusFilter === pill.id;
                const count = pill.id === 'all' 
                  ? jobs.length 
                  : jobs.filter(j => j.status === pill.id).length;

                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setStatusFilter(pill.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span className={`text-[10px] font-mono px-1 rounded ${isActive ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-600'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Jobs List - Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3 whitespace-nowrap w-[15%]">รหัส Job / วันที่</th>
                <th className="py-2.5 px-3 whitespace-nowrap w-[22%]">ลูกค้า / เบอร์โทร</th>
                <th className="py-2.5 px-3 w-[25%]">อุปกรณ์ / อาการ</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center w-[14%]">สถานะงาน</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right w-[12%]">ราคา</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center w-[12%]">จัดการด่วน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Inbox className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-700">
                        {jobs.length === 0 
                          ? 'ยังไม่มีรายการงานซ่อมในระบบ' 
                          : `ไม่พบงานซ่อมที่ตรงกับชื่อลูกค้าหรือเบอร์โทร "${searchQuery}"`}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {jobs.length === 0 
                          ? 'เปิดรับงานซ่อมใหม่เพื่อเริ่มต้นบันทึกข้อมูล' 
                          : 'ลองตรวจสอบความถูกต้องของชื่อ หรือค้นหาด้วยเลขเบอร์โทรศัพท์'}
                      </p>
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                          className="mt-1 text-xs text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                        >
                          ล้างคำค้นหาทั้งหมด
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const statusInfo = STATUS_MAP[job.status] || { label: job.status, badgeClass: 'bg-slate-100 text-slate-700' };
                  const totalPrice = (job.financials.price || 0) + (job.financials.onsiteServiceFee || 0);

                  return (
                    <tr 
                      key={job.id} 
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      {/* 1. Job ID & Date */}
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenJobDetail(job)}
                          className="text-left group/btn focus:outline-none cursor-pointer"
                          title="คลิกเพื่อดูรายละเอียดงานซ่อม"
                        >
                          <div className="font-mono font-bold text-blue-700 text-xs group-hover/btn:underline flex items-center gap-1">
                            <span>{job.id}</span>
                            <Eye className="w-3 h-3 text-blue-400 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {formatDateThai(job.createdAt)}
                          </div>
                        </button>
                      </td>

                      {/* 2. Customer Name & Phone */}
                      <td className="py-3 px-3 align-top">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{job.customer.name}</span>
                        </div>
                        {job.customer.phone ? (
                          <a 
                            href={`tel:${job.customer.phone}`}
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 font-mono font-medium mt-0.5 hover:underline"
                            title="คลิกเพื่อโทรออก"
                          >
                            <Phone className="w-3 h-3 text-emerald-500" />
                            <span>{job.customer.phone}</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400">- ไม่ระบุเบอร์ -</span>
                        )}
                      </td>

                      {/* 3. Device & Issue */}
                      <td className="py-3 px-3 align-top">
                        <div className="font-semibold text-slate-800">
                          {job.device.brand} {job.device.model}
                        </div>
                        {job.issueDescription && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5" title={job.issueDescription}>
                            อาการ: {job.issueDescription}
                          </div>
                        )}
                      </td>

                      {/* 4. Status Badge */}
                      <td className="py-3 px-3 align-top text-center whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${statusInfo.badgeClass}`}>
                          {statusInfo.label}
                        </span>
                        {job.trackingNumber && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            พัสดุ: {job.trackingNumber}
                          </div>
                        )}
                      </td>

                      {/* 5. Price */}
                      <td className="py-3 px-3 align-top text-right whitespace-nowrap">
                        <div className="font-bold font-mono text-slate-900">
                          {formatCurrency(totalPrice)}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-mono">
                          กำไร: {formatCurrency(job.financials.profit || 0)}
                        </div>
                      </td>

                      {/* 6. Quick Action Buttons */}
                      <td className="py-3 px-3 align-top text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenJobDetail(job)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100/60 rounded-lg transition-colors cursor-pointer"
                            title="ดูรายละเอียดงาน"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenStatusUpdate(job)}
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-100/60 rounded-lg transition-colors cursor-pointer"
                            title="อัปเดตสถานะงาน"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenCostUpdate(job)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/60 rounded-lg transition-colors cursor-pointer"
                            title="อัปเดตราคา / ต้นทุน"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenPrint(job)}
                            className="p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                            title="พิมพ์ใบรับงาน / ใบเสร็จ"
                          >
                            <Printer className="w-3.5 h-3.5" />
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

        {/* Jobs List - Mobile Card View */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredJobs.length === 0 ? (
            <div className="py-10 px-4 text-center text-slate-400">
              <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700 text-xs">
                {jobs.length === 0 
                  ? 'ยังไม่มีรายการงานซ่อมในระบบ' 
                  : `ไม่พบงานซ่อมที่ตรงกับ "${searchQuery}"`}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                  className="mt-2 text-xs text-blue-600 font-semibold underline"
                >
                  ล้างคำค้นหา
                </button>
              )}
            </div>
          ) : (
            filteredJobs.map((job) => {
              const statusInfo = STATUS_MAP[job.status] || { label: job.status, badgeClass: 'bg-slate-100 text-slate-700' };
              const totalPrice = (job.financials.price || 0) + (job.financials.onsiteServiceFee || 0);

              return (
                <div key={job.id} className="p-3 space-y-2 hover:bg-slate-50 transition-colors">
                  {/* Top: Job ID & Status & Date */}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onOpenJobDetail(job)}
                      className="font-mono font-bold text-blue-700 text-xs underline cursor-pointer"
                    >
                      {job.id}
                    </button>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusInfo.badgeClass}`}>
                        {statusInfo.label}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDateThai(job.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Customer & Phone */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 font-bold text-slate-900 truncate">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{job.customer.name}</span>
                    </div>
                    {job.customer.phone && (
                      <a 
                        href={`tel:${job.customer.phone}`}
                        className="flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono font-bold shrink-0"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{job.customer.phone}</span>
                      </a>
                    )}
                  </div>

                  {/* Device & Issue */}
                  <div className="text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="font-semibold text-slate-800">
                      {job.device.brand} {job.device.model}
                    </div>
                    {job.issueDescription && (
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        อาการ: {job.issueDescription}
                      </div>
                    )}
                  </div>

                  {/* Bottom: Price & Quick Action Buttons */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="font-mono font-bold text-xs text-slate-900">
                      {formatCurrency(totalPrice)}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenJobDetail(job)}
                        className="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 rounded border border-blue-200 cursor-pointer"
                      >
                        ดูงาน
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenStatusUpdate(job)}
                        className="px-2 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 rounded border border-amber-200 cursor-pointer"
                      >
                        สถานะ
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenCostUpdate(job)}
                        className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded border border-emerald-200 cursor-pointer"
                      >
                        ราคา
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenPrint(job)}
                        className="p-1 text-slate-600 bg-slate-100 rounded border border-slate-200 cursor-pointer"
                        title="พิมพ์ใบรับงาน"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
