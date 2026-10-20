import React, { useMemo, useState } from 'react';
import { 
  FileSpreadsheet, 
  Eye, 
  ArrowUpDown
} from 'lucide-react';
import { RepairJob, RepairStatus } from '../types/repair';
import { 
  STATUS_MAP, 
  formatDateThai 
} from '../utils/formatters';
import { exportJobsToExcel } from '../utils/excelExport';

interface JobsTableViewProps {
  jobs: RepairJob[];
  onOpenNewJob?: () => void;
  onOpenJobDetail: (job: RepairJob) => void;
  onOpenStatusUpdate?: (job: RepairJob) => void;
  onOpenCostUpdate?: (job: RepairJob) => void;
  onOpenPrint?: (job: RepairJob) => void;
}

export const JobsTableView: React.FC<JobsTableViewProps> = ({
  jobs,
  onOpenJobDetail,
}) => {
  // Sort state
  const [sortField, setSortField] = useState<'id' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Sorted Jobs
  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortOrder === 'asc') {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });
  }, [jobs, sortField, sortOrder]);

  // Status breakdown array for horizontal progress bars matching DashboardView
  const statusPerformanceList = useMemo(() => {
    const list: {
      status: RepairStatus;
      label: string;
      color: string;
      barClass: string;
      count: number;
      percentage: number;
    }[] = [
      { status: 'pending', label: 'รอซ่อม', color: '#f59e0b', barClass: 'bg-amber-500', count: jobs.filter(j => j.status === 'pending').length, percentage: 0 },
      { status: 'in_progress', label: 'กำลังซ่อม', color: '#3b82f6', barClass: 'bg-blue-500', count: jobs.filter(j => j.status === 'in_progress').length, percentage: 0 },
      { status: 'waiting_parts', label: 'รออะไหล่', color: '#a855f7', barClass: 'bg-purple-500', count: jobs.filter(j => j.status === 'waiting_parts').length, percentage: 0 },
      { status: 'completed', label: 'ซ่อมแล้ว', color: '#10b981', barClass: 'bg-emerald-500', count: jobs.filter(j => j.status === 'completed').length, percentage: 0 },
      { status: 'ready_to_ship', label: 'รอส่ง', color: '#06b6d4', barClass: 'bg-cyan-500', count: jobs.filter(j => j.status === 'ready_to_ship').length, percentage: 0 },
      { status: 'delivered', label: 'ส่งแล้ว', color: '#0f766e', barClass: 'bg-teal-600', count: jobs.filter(j => j.status === 'delivered').length, percentage: 0 },
      { status: 'picked_up', label: 'มารับเอง', color: '#059669', barClass: 'bg-emerald-600', count: jobs.filter(j => j.status === 'picked_up').length, percentage: 0 },
      { status: 'cancelled', label: 'ยกเลิก', color: '#ef4444', barClass: 'bg-rose-500', count: jobs.filter(j => j.status === 'cancelled').length, percentage: 0 },
    ];

    return list.map(item => ({
      ...item,
      percentage: jobs.length > 0 ? Math.round((item.count / jobs.length) * 100) : 0,
    }));
  }, [jobs]);

  const inWarrantyCount = useMemo(() => {
    return jobs.filter(j => j.jobType === 'งานในประกัน').length;
  }, [jobs]);

  const newJobTypeCount = useMemo(() => {
    return jobs.filter(j => j.jobType !== 'งานในประกัน').length;
  }, [jobs]);

  const handleToggleSort = (field: 'id' | 'createdAt') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleExportExcel = () => {
    if (sortedJobs.length === 0) {
      return;
    }
    exportJobsToExcel(sortedJobs, 'ตารางงานซ่อม_RepairProShop');
  };

  return (
    <div className="space-y-4 pb-12 w-full">
      {/* ส่วนบนเเสดงการกระจายสถานะงานและ KPI สอดคล้องกับหน้าแดชบอร์ด */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-stretch justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  สัดส่วนสถานะงานซ่อมในระบบ
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  รวมทั้งหมด {jobs.length} งาน • งานในประกัน {inWarrantyCount} งาน • งานเปิดใหม่ {newJobTypeCount} งาน
                </p>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 font-mono">
                {jobs.length} งานทั้งหมด
              </span>
            </div>

            {/* Horizontal Status Progress Bars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {statusPerformanceList.map((item) => (
                <div key={item.status} className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-slate-700 truncate">{item.label}</span>
                    </div>
                    <span className="font-bold text-slate-900 font-mono ml-1">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`${item.barClass} h-1.5 rounded-full transition-all duration-500`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table: เรียงลำดับ 3 คอลัมน์ตรงตามสั่ง: 1. เลขjob, 2. ประเภทงาน, 3. รายการ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden w-full">
        {/* Table Header Action Bar (ลบช่องค้นหาและปุ่มเปิดงานใหม่ออกตามสั่ง) */}
        <div className="p-3.5 sm:px-5 border-b border-slate-200 flex items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-sm">
              ตารางงานซ่อม ({sortedJobs.length} งาน)
            </span>
          </div>

          <button
            onClick={handleExportExcel}
            disabled={sortedJobs.length === 0}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 ${
              sortedJobs.length === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            title="ส่งออก Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>ส่งออก Excel</span>
          </button>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-700 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200 select-none">
              <tr>
                {/* 1. เลขjob */}
                <th 
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap w-[24%] sm:w-[20%]"
                  onClick={() => handleToggleSort('id')}
                >
                  <div className="flex items-center gap-1">
                    <span>1. เลข Job</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* 2. ประเภทงาน (เหมือนในหน้ารายได้) */}
                <th className="py-3.5 px-3 whitespace-nowrap text-center w-[20%] sm:w-[18%]">
                  <span>2. ประเภทงาน</span>
                </th>

                {/* 3. รายการ */}
                <th className="py-3.5 px-4 w-[56%] sm:w-[62%]">
                  <span>3. รายการ</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {sortedJobs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-16 text-center text-slate-400 text-sm">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <p className="font-semibold text-slate-700">
                        ยังไม่มีรายการงานซ่อมในระบบ
                      </p>
                      <p className="text-xs text-slate-400">
                        ระบบว่างเปล่า (0 งาน) พร้อมสำหรับการเปิดรับงานซ่อมใหม่
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedJobs.map((job) => {
                  return (
                    <tr 
                      key={job.id} 
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      {/* 1. เลขjob (กดเข้าไปดูรายละเอียด อัพเดตสถานะ หรือแก้ไขได้) */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <button
                          onClick={() => onOpenJobDetail(job)}
                          className="text-left group/btn focus:outline-none"
                          title="คลิกเพื่อดูรายละเอียด อัพเดตสถานะ หรือแก้ไขข้อมูลงาน"
                        >
                          <div className="font-mono font-bold text-blue-700 text-xs sm:text-sm group-hover/btn:underline flex items-center gap-1.5">
                            <span>{job.id}</span>
                            <Eye className="w-3.5 h-3.5 text-blue-400 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {formatDateThai(job.createdAt)}
                          </div>
                        </button>
                      </td>

                      {/* 2. ประเภทงาน: แสดงทั้ง งานใหม่/ในประกัน และ 1.ส่งมา 2.มาเอง 3.ซ่อมนอกสถานที่ */}
                      <td className="py-3.5 px-3 whitespace-nowrap align-top text-center space-y-1">
                        <div>
                          {job.jobType === 'งานในประกัน' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <span>ในประกัน</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs">
                              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                              <span>งานใหม่</span>
                            </span>
                          )}
                        </div>
                        <div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.2 rounded text-[10px] font-bold ${
                            job.serviceChannel === 'ส่งมา' 
                              ? 'bg-sky-50 text-sky-800 border border-sky-200' 
                              : job.serviceChannel === 'ซ่อมนอกสถานที่' 
                              ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}>
                            <span>{job.serviceChannel === 'ส่งมา' ? '📦 1. ส่งมา' : job.serviceChannel === 'ซ่อมนอกสถานที่' ? '🚗 3. นอกสถานที่' : '🚶‍♂️ 2. มาเอง'}</span>
                          </span>
                        </div>
                      </td>

                      {/* 3. รายการ: แสดงอุปกรณ์ รุ่น อาการ ลูกค้า และสถานะงานชัดเจน ไม่ตัดข้อความ */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                            {job.device.brand} {job.device.model}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${STATUS_MAP[job.status]?.badgeClass}`}>
                              {STATUS_MAP[job.status]?.label}
                            </span>
                            {job.trackingNumber && (
                              <span className="text-[10px] text-slate-600 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                พัสดุ: {job.trackingNumber}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-xs text-slate-600 mt-1 font-medium">
                          ลูกค้า: {job.customer.name} {job.customer.phone ? `(${job.customer.phone})` : ''}
                        </div>

                        {job.issueDescription && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            อาการ: {job.issueDescription}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
