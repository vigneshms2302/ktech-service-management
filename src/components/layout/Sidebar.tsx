import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Wrench,
  Package,
  Users,
  Receipt,
  Settings,
  Plus,
  Sparkles,
  MessageSquare,
  Cpu,
  Layers,
  BarChart3,
  Clock,
  Monitor,
  Download,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useShop } from '../../context/ShopContext.tsx';
import { PricingModal } from '../pricing/PricingModal.tsx';
import { DownloadAppModal } from '../common/DownloadAppModal.tsx';
import { saasApi } from '../../api/client.ts';

export type NavTabId =
  | 'dashboard'
  | 'technician'
  | 'jobs'
  | 'data-recovery'
  | 'inventory'
  | 'salvage'
  | 'refurb'
  | 'pc-builder'
  | 'customers'
  | 'billing'
  | 'warranties'
  | 'whatsapp'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  onNewJob?: () => void;
  onSelectJob?: (jobId: string) => void;
  isOpen?: boolean;
}

interface SidebarNavItem {
  id: NavTabId;
  label: string;
  icon: LucideIcon;
  allowed: boolean;
  badge?: string;
}

interface RecentJobSummary {
  id: string;
  jobNumber: string;
  customerName?: string;
  deviceType?: string;
  brand?: string;
  status: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onNewJob,
  onSelectJob,
  isOpen = true,
}) => {
  const { currentUser, hasPermission } = useAuth();
  const { shopSettings } = useShop();
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [recentJobs, setRecentJobs] = useState<RecentJobSummary[]>([]);

  const isDesktop = Boolean(window.electronAPI?.isDesktop);

  // Fetch recent jobs to display in ChatGPT "Recent Chats" style
  useEffect(() => {
    let isMounted = true;
    const fetchRecentJobs = async () => {
      try {
        const res = window.electronAPI?.jobs?.list
          ? await window.electronAPI.jobs.list({ limit: 6 })
          : await saasApi.jobs.list({ limit: 6 });
        if (res.success && Array.isArray(res.data) && isMounted) {
          setRecentJobs(
            res.data.slice(0, 6).map((j: any) => ({
              id: j.id,
              jobNumber: j.jobNumber || j.job_number,
              customerName: j.customerName || j.customer_name || 'Customer',
              deviceType: j.deviceType || j.equipment_type || 'Device',
              brand: j.brand || '',
              status: j.status || 'NEW_INTAKE',
            }))
          );
        }
      } catch (err) {
        console.warn('Could not load recent jobs for sidebar:', err);
      }
    };

    fetchRecentJobs();
    const interval = setInterval(fetchRecentJobs, 30000); // 30s auto-refresh
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems: SidebarNavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      allowed: true,
    },
    {
      id: 'jobs',
      label: 'Repair Jobs',
      icon: Wrench,
      allowed: hasPermission('jobs.read'),
    },
    {
      id: 'billing',
      label: 'Billing & Invoices',
      icon: Receipt,
      allowed: hasPermission('billing.create') || hasPermission('jobs.read'),
    },
    {
      id: 'inventory',
      label: 'Parts & Stock',
      icon: Package,
      allowed: hasPermission('inventory.read'),
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      allowed: hasPermission('customers.read'),
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp Center',
      icon: MessageSquare,
      allowed: true,
    },
    {
      id: 'salvage',
      label: 'Salvage & Harvesting',
      icon: Cpu,
      allowed: hasPermission('inventory.read'),
    },
    {
      id: 'technician',
      label: 'Bench Workspace',
      icon: Layers,
      allowed: hasPermission('jobs.read'),
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      allowed: hasPermission('owner.admin'),
    },
  ];

  if (!isOpen) return null;

  return (
    <>
      <aside className="w-[260px] h-full bg-[#f9f9f9] dark:bg-[#171717] border-r border-[#e5e5e5] dark:border-[#2f2f2f] flex flex-col shrink-0 select-none transition-colors duration-200">
        {/* Brand Header: K-Connect Product Brand + Tenant Shop Workspace */}
        <div className="p-3.5 pb-2 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center justify-between gap-2 overflow-hidden text-left bg-transparent border-none p-0 cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-[#0d0d0d] flex items-center justify-center shrink-0 overflow-hidden border border-[#e5e5e5] dark:border-[#2f2f2f] shadow-sm">
                <img
                  src={typeof window !== 'undefined' && window.location.protocol === 'file:' ? './icon.svg' : '/icon.svg'}
                  alt="K-Connect"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-[#0d0d0d] dark:text-[#ececec] leading-tight tracking-tight group-hover:text-[#10a37f] transition-colors">
                    K-Connect
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 leading-none">
                    Cloud OS
                  </span>
                </div>
                <div className="text-[11px] text-[#676767] dark:text-[#b4b4b4] truncate">
                  Repair Laboratory Platform
                </div>
              </div>
            </div>
          </button>

          {/* Active Tenant Shop Workspace */}
          <button
            type="button"
            onClick={() => onSelectTab('settings')}
            title="Shop Profile & Branding Settings"
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f] hover:border-[#10a37f]/50 transition-colors cursor-pointer text-left"
          >
            <span className="w-2 h-2 rounded-full bg-[#10a37f] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[11.5px] font-semibold text-[#0d0d0d] dark:text-[#ececec] truncate">
                {currentUser?.shopName || shopSettings.shopName || 'Shop Workspace'}
              </div>
            </div>
            <Store size={12} className="text-[#676767] dark:text-[#8e8e93] shrink-0" />
          </button>
        </div>

        {/* ChatGPT "New Chat" Style "New Job" Button */}
        <div className="px-3 py-2">
          <button
            type="button"
            onClick={onNewJob}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-[#e5e5e5] dark:border-[#2f2f2f] bg-white dark:bg-[#212121] hover:bg-gray-200 dark:hover:bg-[#282828] text-sm font-medium text-[#0d0d0d] dark:text-[#ececec] transition-colors cursor-pointer shadow-none"
          >
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-[#0d0d0d] dark:text-white" />
              <span>New Job</span>
            </div>
            <kbd className="text-[10px] font-mono text-[#676767] dark:text-[#b4b4b4] bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">
              F1
            </kbd>
          </button>
        </div>

        {/* Navigation items as simple text-only links with hover:bg-gray-200 */}
        <div className="flex-1 overflow-y-auto px-2 py-1 flex flex-col gap-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isAllowed = item.allowed;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (isAllowed) onSelectTab(item.id);
                }}
                disabled={!isAllowed}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-left transition-colors cursor-pointer ${
                  !isAllowed ? 'opacity-40 cursor-not-allowed' : ''
                } ${
                  isActive
                    ? 'bg-gray-200 dark:bg-[#212121] font-medium text-[#0d0d0d] dark:text-white'
                    : 'text-[#0d0d0d] dark:text-[#ececec] hover:bg-gray-200 dark:hover:bg-[#212121] font-normal'
                }`}
              >
                <Icon
                  size={16}
                  className={isActive ? 'text-[#0d0d0d] dark:text-white' : 'text-[#676767] dark:text-[#b4b4b4]'}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full border border-[#e5e5e5] dark:border-[#2f2f2f] text-[#676767] dark:text-[#b4b4b4]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* ChatGPT Style "Recent Repairs" History Stream */}
          {recentJobs.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[#e5e5e5] dark:border-[#2f2f2f] px-1">
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#676767] dark:text-[#b4b4b4] px-2 py-1 mb-1">
                Recent Repairs
              </div>
              <div className="flex flex-col gap-0.5">
                {recentJobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => {
                      if (onSelectJob) {
                        onSelectJob(job.id);
                      }
                      onSelectTab('jobs');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-xs text-[#676767] dark:text-[#b4b4b4] hover:text-[#0d0d0d] dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#212121] transition-colors cursor-pointer truncate"
                  >
                    <Clock size={12} className="shrink-0 text-[#676767] dark:text-[#b4b4b4]" />
                    <span className="truncate">
                      <strong className="text-[#0d0d0d] dark:text-[#ececec]">{job.jobNumber}</strong>{' '}
                      • {job.customerName}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Section: ChatGPT Plan & Profile */}
        <div className="p-2.5 border-t border-[#e5e5e5] dark:border-[#2f2f2f] flex flex-col gap-1.5">
          {/* Desktop App Download Button (Visible in web browser) */}
          {!isDesktop && (
            <button
              type="button"
              onClick={() => setIsDownloadOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[#e5e5e5] dark:border-[#2f2f2f] hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:border-emerald-500/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Monitor size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>Desktop App (.exe)</span>
              </div>
              <Download size={13} className="opacity-70" />
            </button>
          )}

          {/* Upgrade Plan Button */}
          <button
            type="button"
            onClick={() => setIsPricingOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[#e5e5e5] dark:border-[#2f2f2f] hover:bg-gray-200 dark:hover:bg-[#212121] text-xs font-medium text-[#0d0d0d] dark:text-[#ececec] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-[#0d0d0d] dark:text-white" />
              <span>Upgrade Plan</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/10 text-[#676767] dark:text-[#b4b4b4]">
              Pro
            </span>
          </button>

          {/* User Profile Pill at Bottom */}
          <button
            type="button"
            onClick={() => onSelectTab('settings')}
            className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#212121] transition-colors text-left cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-[#0d0d0d] dark:bg-white text-white dark:text-[#0d0d0d] flex items-center justify-center font-semibold text-xs shrink-0">
              {currentUser?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-xs font-medium text-[#0d0d0d] dark:text-[#ececec] truncate">
                {currentUser?.fullName || 'Shop Staff'}
              </div>
              <div className="text-[10px] text-[#676767] dark:text-[#b4b4b4] truncate">
                {currentUser?.roleName || 'Counter'}
              </div>
            </div>
            <Settings size={14} className="text-[#676767] dark:text-[#b4b4b4]" />
          </button>
        </div>
      </aside>

      {/* Pricing Modal */}
      <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} />
      {/* Desktop App Download Modal */}
      <DownloadAppModal isOpen={isDownloadOpen} onClose={() => setIsDownloadOpen(false)} />
    </>
  );
};
