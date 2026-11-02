import React, { useState, useEffect } from 'react';
import {
  X,
  Monitor,
  Download,
  Cloud,
  Printer,
  ShieldCheck,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  Zap,
} from 'lucide-react';
import { saasApi } from '../../api/client.ts';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DownloadInfo {
  appName: string;
  version: string;
  fileName: string;
  platform: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  hasLocalBinary: boolean;
  directUrl: string;
  downloadUrl: string;
  githubReleaseUrl: string;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({ isOpen, onClose }) => {
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo>({
    appName: 'K-Connect',
    version: '1.2.0',
    fileName: 'K-Connect-Portable.exe',
    platform: 'Windows 10 / 11 (64-bit)',
    fileSizeBytes: 76193998,
    fileSizeFormatted: '72.6 MB',
    hasLocalBinary: true,
    directUrl: '/downloads/K-Connect-Portable.exe',
    downloadUrl: '/api/public/download/desktop',
    githubReleaseUrl: 'https://github.com/vigneshms2302/ktech-service-management/releases/latest/download/K-Connect-Portable.exe',
  });
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchInfo = async () => {
      try {
        const res = await saasApi.public.getDownloadInfo();
        if (res.success && res.data) {
          setDownloadInfo(res.data);
        }
      } catch (err) {
        console.warn('Could not load dynamic download info, using defaults:', err);
      }
    };
    fetchInfo();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = () => {
    setIsDownloading(true);
    // Trigger download via hidden anchor or window navigation
    const link = document.createElement('a');
    link.href = downloadInfo.downloadUrl || downloadInfo.directUrl;
    link.setAttribute('download', downloadInfo.fileName || 'K-Connect-Portable.exe');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsDownloading(false);
    }, 4000);
  };

  const handleCopyLink = async () => {
    try {
      const fullUrl = `${window.location.origin}${downloadInfo.downloadUrl}`;
      await navigator.clipboard.writeText(fullUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#1f1f1f] border border-[#e5e5e5] dark:border-[#2f2f2f] rounded-2xl p-6 sm:p-7 shadow-2xl relative text-[#0d0d0d] dark:text-[#ececec] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#676767] dark:text-[#8e8e93] hover:text-[#0d0d0d] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Top Header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-xl bg-[#0d0d0d] dark:bg-white text-white dark:text-[#0d0d0d] flex items-center justify-center shrink-0 shadow-sm">
            <Monitor size={24} />
          </div>
          <div className="flex-1 pr-6">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold tracking-tight">K-Connect Desktop Application</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#10a37f]/15 text-[#10a37f] border border-[#10a37f]/30">
                v{downloadInfo.version} Standalone
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#676767] dark:text-[#a0a0a0] mt-1">
              Use the exact same repair laboratory application on Windows desktop with real-time cloud database sync and native hardware access.
            </p>
          </div>
        </div>

        {/* Main Download Card */}
        <div className="bg-gray-50 dark:bg-[#181818] border border-[#e5e5e5] dark:border-[#2a2a2a] rounded-xl p-4 sm:p-5 mb-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Download size={20} />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#0d0d0d] dark:text-white">
                {downloadInfo.fileName}
              </div>
              <div className="text-xs text-[#676767] dark:text-[#8e8e93] flex items-center gap-2 mt-0.5">
                <span>{downloadInfo.platform}</span>
                <span>•</span>
                <span>{downloadInfo.fileSizeFormatted}</span>
                <span>•</span>
                <span className="text-emerald-500 font-medium">Portable (Zero Install)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#0d0d0d] hover:bg-[#262626] text-white dark:bg-white dark:hover:bg-gray-100 dark:text-[#0d0d0d] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
            >
              {isDownloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Starting Download...</span>
                </>
              ) : (
                <>
                  <Download size={15} />
                  <span>Download Desktop App</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              title="Copy direct download URL"
              className="p-2.5 rounded-xl border border-[#e5e5e5] dark:border-[#2f2f2f] hover:bg-gray-100 dark:hover:bg-[#262626] text-[#676767] dark:text-[#b4b4b4] transition-colors cursor-pointer shrink-0"
            >
              {isCopied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* 4 Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-[#181818]/60 border border-[#e5e5e5] dark:border-[#2a2a2a] flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 mt-0.5 shrink-0">
              <Sparkles size={15} />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#0d0d0d] dark:text-white">
                Identical UI &amp; Workflows
              </div>
              <div className="text-[11px] text-[#676767] dark:text-[#8e8e93] leading-relaxed mt-0.5">
                Exact same 13-stage repair workflow, customer CRM, inventory, and GST billing. Zero changes or retraining needed.
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-[#181818]/60 border border-[#e5e5e5] dark:border-[#2a2a2a] flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 mt-0.5 shrink-0">
              <Cloud size={15} />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#0d0d0d] dark:text-white">
                Real-Time Cloud Synced
              </div>
              <div className="text-[11px] text-[#676767] dark:text-[#8e8e93] leading-relaxed mt-0.5">
                Connects directly to your live cloud database. Anything you do on desktop is immediately synced with web, mobile, and tablets.
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-[#181818]/60 border border-[#e5e5e5] dark:border-[#2a2a2a] flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500 mt-0.5 shrink-0">
              <Printer size={15} />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#0d0d0d] dark:text-white">
                Direct Thermal &amp; A4 Printing
              </div>
              <div className="text-[11px] text-[#676767] dark:text-[#8e8e93] leading-relaxed mt-0.5">
                Native OS communication for instant thermal receipt slips (80mm/58mm) and GST invoices with zero browser dialogs.
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-[#181818]/60 border border-[#e5e5e5] dark:border-[#2a2a2a] flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 mt-0.5 shrink-0">
              <Zap size={15} />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#0d0d0d] dark:text-white">
                Zero-Install Portable .exe
              </div>
              <div className="text-[11px] text-[#676767] dark:text-[#8e8e93] leading-relaxed mt-0.5">
                Double-click to run directly from Desktop, USB pendrive, or local drive. No administrator setup privileges needed.
              </div>
            </div>
          </div>
        </div>

        {/* Quick Launch Guide */}
        <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#272727] text-xs flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#10a37f] shrink-0" />
            <span className="text-[#676767] dark:text-[#b4b4b4]">
              Unified login: Use your existing shop credentials or PIN. All live jobs, customers, and inventory load instantly.
            </span>
          </div>
          <a
            href={downloadInfo.githubReleaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[#10a37f] hover:underline flex items-center gap-1 shrink-0 font-medium"
          >
            GitHub Releases <ExternalLink size={11} />
          </a>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e5e5e5] dark:border-[#2a2a2a]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#676767] dark:text-[#8e8e93] hover:text-[#0d0d0d] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
