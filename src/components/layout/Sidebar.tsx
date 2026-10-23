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
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useShop } from '../../context/ShopContext.tsx';
import { PricingModal } from '../pricing/PricingModal.tsx';
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
  const [recentJobs, setRecentJobs] = useState<RecentJobSummary[]>([]);

  // Fetch recent jobs to display in ChatGPT "Recent Chats" style
  useEffect(() => {
    let isMounted = true;
    const fetchRecentJobs = async () => {
      try {
        const res = await saasApi.jobs.list({ limit: 6 });
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
      <aside
        style={{
          width: '260px',
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          userSelect: 'none',
          flexShrink: 0,
          transition: 'width 0.2s ease',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '16px 14px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                backgroundColor: '#171717',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(16, 163, 127, 0.2)',
              }}
            >
              <img src="/icon.svg" alt="K-Connect" style={{ width: '22px', height: '22px' }} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: '14px',
                  color: 'var(--text-main)',
                  lineHeight: 1.2,
                  letterSpacing: '-0.3px',
                }}
              >
                K-Connect SaaS
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#10a37f',
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={shopSettings.shopName}
              >
                {shopSettings.shopName || 'KTech Computers'}
              </div>
            </div>
          </div>
        </div>

        {/* ChatGPT Style "New Job" Button */}
        <div style={{ padding: '0 12px 10px' }}>
          <button
            onClick={onNewJob}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '9999px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'background-color 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-surface-hover)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color-light)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-card)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 163, 127, 0.2)',
                  color: '#10a37f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus size={14} />
              </div>
              <span>New Repair Job</span>
            </div>
            <kbd
              style={{
                fontSize: '10px',
                color: 'var(--text-dim)',
                fontFamily: 'var(--font-mono)',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                padding: '2px 5px',
                borderRadius: '4px',
              }}
            >
              F1
            </kbd>
          </button>
        </div>

        {/* Navigation & Recent History Scroll Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '4px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {/* Main App Navigation */}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isAllowed = item.allowed;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isAllowed) onSelectTab(item.id);
                }}
                disabled={!isAllowed}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                style={{
                  borderRadius: '10px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Icon size={16} color={isActive ? '#10a37f' : 'var(--text-dim)'} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span
                    style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(16, 163, 127, 0.15)',
                      color: '#10a37f',
                      fontWeight: 700,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* ChatGPT Style "Recent Repairs" History Stream */}
          {recentJobs.length > 0 && (
            <div style={{ marginTop: '16px', padding: '0 4px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-dim)',
                  padding: '6px 8px',
                  letterSpacing: '0.4px',
                  textTransform: 'uppercase',
                }}
              >
                Recent Repairs
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {recentJobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => {
                      if (onSelectJob) {
                        onSelectJob(job.id);
                      }
                      onSelectTab('jobs');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 8px',
                      borderRadius: '8px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'background-color 0.12s ease, color 0.12s ease',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-surface-hover)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-main)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                    }}
                  >
                    <Clock size={13} color="var(--text-dim)" style={{ flexShrink: 0 }} />
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                    >
                      <strong style={{ color: 'var(--text-main)' }}>{job.jobNumber}</strong>{' '}
                      <span style={{ color: 'var(--text-dim)' }}>• {job.customerName}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Section: ChatGPT "Upgrade Plan" & Profile Pill */}
        <div
          style={{
            padding: '10px 10px 14px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {/* Upgrade Plan Pill Button */}
          <button
            onClick={() => setIsPricingOpen(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: '12px',
              backgroundColor: 'rgba(16, 163, 127, 0.1)',
              border: '1px solid rgba(16, 163, 127, 0.25)',
              color: 'var(--text-main)',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(16, 163, 127, 0.2)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(16, 163, 127, 0.1)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#10a37f',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={13} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ lineHeight: 1.1, fontSize: '12.5px', fontWeight: 700 }}>Upgrade Plan</div>
                <div style={{ fontSize: '10px', color: '#10a37f' }}>Pro Multi-Seat Cloud</div>
              </div>
            </div>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '9999px',
                backgroundColor: '#10a37f',
                color: '#fff',
                fontWeight: 700,
              }}
            >
              FREE
            </span>
          </button>

          {/* User Profile Pill at Bottom */}
          <button
            onClick={() => onSelectTab('settings')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              borderRadius: '12px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-main)',
              textAlign: 'left',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-surface-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#10a37f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                flexShrink: 0,
              }}
            >
              {currentUser?.fullName?.charAt(0) || 'U'}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {currentUser?.fullName || 'Shop Staff'}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', marginTop: '1px' }}>
                {currentUser?.roleName || 'Counter'} • Settings
              </div>
            </div>
            <Settings size={15} color="var(--text-dim)" />
          </button>
        </div>
      </aside>

      {/* Pricing Modal */}
      <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} />
    </>
  );
};
