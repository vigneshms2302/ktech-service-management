import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Search,
  Phone,
  MapPin,
  Laptop,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { saasApi } from '../../api/client.ts';

interface PublicJobTrackerProps {
  initialJobNumber?: string;
}

const STAGES = [
  { key: 'RECEIVED', label: 'Intake Received' },
  { key: 'UNDER_INSPECTION', label: 'Technical Inspection' },
  { key: 'DIAGNOSIS_COMPLETED', label: 'Diagnosis Completed' },
  { key: 'APPROVED', label: 'Customer Approved' },
  { key: 'UNDER_REPAIR', label: 'Under Repair' },
  { key: 'QUALITY_CHECK', label: 'Quality Testing' },
  { key: 'READY_FOR_DELIVERY', label: 'Ready for Pickup' },
  { key: 'DELIVERED', label: 'Delivered' },
];

export const PublicJobTracker: React.FC<PublicJobTrackerProps> = ({ initialJobNumber }) => {
  const [jobNumber, setJobNumber] = useState(initialJobNumber || '');
  const [jobData, setJobData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async (numberToSearch: string) => {
    if (!numberToSearch.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await saasApi.public.trackJob(numberToSearch.trim());
      if (res.success && res.data) {
        setJobData(res.data);
      } else {
        setError(res.error || 'Job ticket not found. Please double check your ticket number.');
        setJobData(null);
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
      setJobData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialJobNumber) {
      fetchStatus(initialJobNumber);
    }
  }, [initialJobNumber]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStatus(jobNumber);
  };

  const getStageIndex = (currentStatus: string) => {
    const idx = STAGES.findIndex((s) => s.key === currentStatus);
    return idx >= 0 ? idx : 0;
  };

  const currentStageIndex = jobData ? getStageIndex(jobData.currentStatus) : 0;

  return (
    <div className="w-full bg-white dark:bg-[#212121] text-[#0d0d0d] dark:text-[#ececec] transition-colors duration-200 py-16 px-4 sm:px-6 flex flex-col items-center">
      <div className="max-w-xl w-full">
        {/* Brand Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#10a37f]/10 text-[#10a37f] border border-[#10a37f]/20 uppercase tracking-wider mb-4">
            <ShieldCheck size={14} />
            Live Service Repair Tracker
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#0d0d0d] dark:text-[#ececec] mb-2">
            Track Your Device Service
          </h1>
          <p className="text-xs sm:text-sm text-[#676767] dark:text-[#b4b4b4]">
            Enter your service ticket number to view live repair progress and technician notes.
          </p>
        </div>

        {/* Search Input Box */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2.5 mb-8">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="e.g. JOB-2026-00001"
              value={jobNumber}
              onChange={(e) => setJobNumber(e.target.value.toUpperCase())}
              className="w-full px-5 py-3 rounded-xl border border-[#e5e5e5] dark:border-[#2f2f2f] bg-white dark:bg-[#2f2f2f] text-[#0d0d0d] dark:text-[#ececec] text-sm font-mono uppercase font-semibold outline-none focus:border-[#0d0d0d] dark:focus:border-[#ececec] transition-colors shadow-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="py-3 px-6 bg-[#0d0d0d] text-white hover:bg-[#262626] dark:bg-[#ececec] dark:text-[#0d0d0d] dark:hover:bg-white rounded-xl font-medium text-sm flex items-center gap-2 cursor-pointer transition-colors shadow-none shrink-0"
          >
            <Search size={15} /> Track
          </button>
        </form>

        {error && (
          <div className="flex items-center gap-2.5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs sm:text-sm mb-6">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Live Tracking Card */}
        {jobData && (
          <div className="bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f] rounded-2xl overflow-hidden shadow-sm">
            {/* Header info */}
            <div className="p-5 sm:p-6 border-b border-[#e5e5e5] dark:border-[#2f2f2f] flex items-center justify-between flex-wrap gap-2.5">
              <div>
                <span className="text-[11px] font-semibold text-[#10a37f] uppercase tracking-wider">
                  {jobData.shop.name}
                </span>
                <div className="text-base sm:text-lg font-mono font-bold text-[#0d0d0d] dark:text-[#ececec] mt-0.5">
                  {jobData.jobNumber}
                </div>
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-[#10a37f]/10 text-[#10a37f] border border-[#10a37f]/20 text-xs font-semibold">
                  {jobData.currentStatus.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Device & Issue Summary */}
            <div className="p-5 sm:p-6 border-b border-[#e5e5e5] dark:border-[#2f2f2f] bg-[#f9f9f9] dark:bg-[#171717]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f] flex items-center justify-center text-[#10a37f]">
                  <Laptop size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#0d0d0d] dark:text-[#ececec]">
                    {jobData.device.brand} {jobData.device.modelName}
                  </div>
                  <div className="text-xs text-[#676767] dark:text-[#b4b4b4]">
                    Type: {jobData.device.equipmentType}
                  </div>
                </div>
              </div>

              <div className="text-xs sm:text-sm text-[#0d0d0d] dark:text-[#ececec] leading-relaxed bg-white dark:bg-[#212121] p-3.5 rounded-xl border border-[#e5e5e5] dark:border-[#2f2f2f]">
                <strong className="text-[#676767] dark:text-[#b4b4b4]">Reported Problem: </strong>
                {jobData.reportedIssue}
              </div>
            </div>

            {/* Repair Progress Stepper */}
            <div className="p-5 sm:p-6">
              <h3 className="text-xs font-semibold text-[#676767] dark:text-[#b4b4b4] uppercase tracking-wider mb-4">
                Live Repair Progress
              </h3>

              <div className="flex flex-col gap-4">
                {STAGES.map((stg, i) => {
                  const isCompleted = i < currentStageIndex;
                  const isCurrent = i === currentStageIndex;

                  return (
                    <div key={stg.key} className="flex items-start gap-3.5">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                          isCompleted
                            ? 'bg-[#10a37f] text-white'
                            : isCurrent
                            ? 'bg-[#0d0d0d] text-white dark:bg-white dark:text-[#0d0d0d] ring-2 ring-[#10a37f]'
                            : 'bg-[#f0f0f0] dark:bg-[#2a2a2a] text-[#676767] dark:text-[#8e8e93] border border-[#e5e5e5] dark:border-[#383838]'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 size={14} /> : i + 1}
                      </div>

                      <div className="flex-1">
                        <div
                          className={`text-xs sm:text-sm ${
                            isCurrent
                              ? 'font-bold text-[#0d0d0d] dark:text-[#ececec]'
                              : isCompleted
                              ? 'font-medium text-[#0d0d0d] dark:text-[#ececec]'
                              : 'text-[#676767] dark:text-[#8e8e93]'
                          }`}
                        >
                          {stg.label}
                        </div>
                        {isCurrent && (
                          <div className="text-[11px] text-[#10a37f] font-medium mt-0.5">
                            Currently at this service workstation
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shop Contact & Help */}
            <div className="p-4 sm:p-5 bg-[#f9f9f9] dark:bg-[#171717] border-t border-[#e5e5e5] dark:border-[#2f2f2f] flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-xs text-[#676767] dark:text-[#b4b4b4]">
                <MapPin size={13} className="text-[#10a37f]" />
                <span>{jobData.shop.address}</span>
              </div>

              <a
                href={`tel:${jobData.shop.phone}`}
                className="flex items-center gap-1.5 py-2 px-3.5 rounded-full bg-white dark:bg-[#212121] text-[#0d0d0d] dark:text-[#ececec] border border-[#e5e5e5] dark:border-[#2f2f2f] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold transition-colors no-underline"
              >
                <Phone size={13} /> Call Shop: {jobData.shop.phone}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
