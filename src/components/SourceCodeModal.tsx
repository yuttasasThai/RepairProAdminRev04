import React, { useState } from 'react';
import { X, Download, Copy, Check, FileCode, Folder, ExternalLink, Terminal, AlertCircle, RefreshCw } from 'lucide-react';
import { PROJECT_SOURCE_FILES } from '../data/projectSourceCode';
import { downloadProjectZip } from '../utils/exportProjectZip';

interface SourceCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SourceCodeModal: React.FC<SourceCodeModalProps> = ({ isOpen, onClose }) => {
  const fileKeys = Object.keys(PROJECT_SOURCE_FILES).sort();
  const [selectedFile, setSelectedFile] = useState<string>(
    fileKeys.includes('src/App.tsx') ? 'src/App.tsx' : fileKeys[0] || ''
  );
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const currentContent = PROJECT_SOURCE_FILES[selectedFile] || '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy
      const textArea = document.createElement('textarea');
      textArea.value = currentContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadSuccess(false);
    try {
      const ok = await downloadProjectZip();
      if (ok) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-md">
              <FileCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold">RepairPro Source Code Rev.04</h2>
                <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 rounded-full font-mono font-bold">
                  Rev.04 (Multi-Device Sync & Financial Flow)
                </span>
                <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full font-mono">
                  {fileKeys.length} ไฟล์
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                ซอร์สโค้ดฉบับสมบูรณ์ ปรับแก้เชื่อมโยงต้นทุนอะไหล่ กราฟทุกหน้าตรงกัน และเพิ่มระบบ Login พร้อมย้ายเครื่องข้ามโทรศัพท์ (Rev.04)
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice Banner: Verification changelog & Vercel deployment guarantee */}
        <div className="bg-gradient-to-r from-emerald-50 via-blue-50 to-indigo-50 border-b border-blue-200 px-4 py-2.5 text-xs text-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>สรุปการแก้ไข Rev.04:</strong> 1) แก้ไขอะไหล่ขั้นตอน 2 ปรับซิงค์ต้นทุนในขั้นตอน 3 และหน้ารายได้อัตโนมัติ 2) ปรับกราฟหน้ารายได้, งานซ่อมเสร็จ, และประกันให้ตรงกับหน้าแดชบอร์ด 3) เพิ่มระบบ Login แอดมิน/สาขา + รหัสย้ายข้อมูลข้ามโทรศัพท์เครื่องใหม่ 4) ไฟล์พร้อม Deploy บน Vercel 100%
            </span>
          </div>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95 ${
              downloadSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isDownloading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>กำลังสร้าง repair-pro-source-code-rev.04.zip...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>ดาวน์โหลด Rev.04 สำเร็จแล้ว!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลด Source Code Rev.04 (.ZIP)</span>
              </>
            )}
          </button>
        </div>

        {/* Body: Two columns layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          
          {/* Left: File Tree */}
          <div className="w-full md:w-72 bg-slate-50 border-r border-slate-200 flex flex-col overflow-hidden shrink-0">
            <div className="p-3 bg-slate-100/80 border-b border-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Folder className="w-4 h-4 text-slate-500" />
              <span>รายการไฟล์ในโปรเจกต์ ({fileKeys.length})</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs">
              {fileKeys.map((filePath) => {
                const isSelected = selectedFile === filePath;
                const isComponent = filePath.startsWith('src/components/');
                const isRoot = !filePath.includes('/');

                return (
                  <button
                    key={filePath}
                    onClick={() => setSelectedFile(filePath)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg font-mono truncate transition flex items-center gap-2 ${
                      isSelected
                        ? 'bg-blue-600 text-white font-medium shadow-sm'
                        : 'text-slate-700 hover:bg-slate-200/80'
                    }`}
                    title={filePath}
                  >
                    <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{filePath}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Code Viewer */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-100 min-h-0">
            {/* Code header bar */}
            <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs text-blue-400 font-semibold truncate">
                  {selectedFile}
                </span>
                <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                  ({(currentContent.length / 1024).toFixed(1)} KB)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>คัดลอกแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>คัดลอกไฟล์นี้</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code content */}
            <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed selection:bg-blue-500 selection:text-white">
              <pre className="text-slate-300 whitespace-pre font-mono">
                {currentContent}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-500" />
            <span>คำสั่งเริ่มรันโปรเจกต์: <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-mono">npm install</code> แล้ว <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-mono">npm run dev</code></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-xs flex items-center gap-2 shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลดไฟล์ ZIP ทั้งโปรเจกต์</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-medium text-xs transition"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
