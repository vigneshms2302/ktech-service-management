import React from 'react';
import {
  LayoutDashboard,
  Wrench,
  Database,
  Package,
  ShoppingBag,
  Cpu,
  Users,
  Receipt,
  ShieldCheck,
  BarChart3,
  Settings,
  Lock,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

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
}

interface SidebarNavItem {
  id: NavTabId;
  label: string;
  icon: LucideIcon;
  allowed: boolean;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { hasPermission } = useAuth();

  const navItems: SidebarNavItem[] = [
    {
      id: 'dashboard' as NavTabId,
      label: 'Dashboard',
      icon: LayoutDashboard,
      allowed: true, // Everyone can see dashboard
    },
    {
      id: 'technician' as NavTabId,
      label: 'Technician Workstation',
      icon: Wrench,
      allowed: hasPermission('jobs.diagnose') || hasPermission('jobs.repair') || hasPermission('jobs.read'),
    },
    {
      id: 'jobs' as NavTabId,
      label: 'Service Jobs Intake',
      icon: Receipt,
      allowed: hasPermission('jobs.read'),
    },
    {
      id: 'inventory' as NavTabId,
      label: 'Inventory & Stock',
      icon: Package,
      allowed: hasPermission('inventory.read'),
    },
    {
      id: 'billing' as NavTabId,
      label: 'Billing & GST Invoices',
      icon: Receipt,
      allowed: hasPermission('billing.create') || hasPermission('jobs.read'),
    },
    {
      id: 'data-recovery' as NavTabId,
      label: 'Data Recovery Studio',
      icon: Database,
      allowed: hasPermission('data_recovery.manage') || hasPermission('jobs.read'),
    },
    {
      id: 'refurb' as NavTabId,
      label: 'Refurbished Sales',
      icon: ShoppingBag,
      allowed: hasPermission('refurb.manage') || hasPermission('jobs.read'),
    },
    {
      id: 'pc-builder' as NavTabId,
      label: 'Custom PC Builder',
      icon: Cpu,
      allowed: hasPermission('pc_builder.manage') || hasPermission('jobs.read'),
    },
    {
      id: 'warranties' as NavTabId,
      label: 'Warranty Claims',
      icon: ShieldCheck,
      allowed: hasPermission('warranty.read') || hasPermission('jobs.read'),
    },
    {
      id: 'customers' as NavTabId,
      label: 'Customers CRM',
      icon: Users,
      allowed: hasPermission('customers.read'),
    },
    {
      id: 'whatsapp' as NavTabId,
      label: 'WhatsApp Queue',
      icon: MessageSquare,
      allowed: true,
    },
    {
      id: 'reports' as NavTabId,
      label: 'Analytics & Reports',
      icon: BarChart3,
      allowed: hasPermission('reports.view') || hasPermission('jobs.read'),
    },
    {
      id: 'settings' as NavTabId,
      label: 'System & Backups',
      icon: Settings,
      allowed: hasPermission('audit.view') || hasPermission('settings.edit') || true,
    },
  ];

  return (
    <aside
      style={{
        width: '230px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: 'var(--brand-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '16px',
            letterSpacing: '-0.5px',
          }}
        >
          K
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc', lineHeight: 1.2 }}>
            KTech Computers
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Service Management v1.0
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '7px 10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isActive ? 'var(--brand-primary)' : 'transparent',
                color: !isAllowed
                  ? 'var(--text-dim)'
                  : isActive
                  ? '#ffffff'
                  : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '12px',
                textAlign: 'left',
                cursor: isAllowed ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.12s ease, color 0.12s ease',
                opacity: isAllowed ? 1 : 0.45,
              }}
              onMouseEnter={(e) => {
                if (isAllowed && !isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                  e.currentTarget.style.color = 'var(--text-main)';
                }
              }}
              onMouseLeave={(e) => {
                if (isAllowed && !isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <Icon size={16} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {!isAllowed ? (
                <Lock size={12} style={{ opacity: 0.6 }} />
              ) : item.badge ? (
                <span
                  style={{
                    fontSize: '9px',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'var(--bg-surface)',
                    color: isActive ? '#ffffff' : 'var(--text-muted)',
                  }}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Offline Desktop Status Footer */}
      <div
        style={{
          padding: '10px 14px',
          borderTop: '1px solid var(--border-color)',
          fontSize: '11px',
          color: 'var(--text-dim)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-success)',
              display: 'inline-block',
            }}
          />
          Local SQLite Active
        </span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>WAL</span>
      </div>
    </aside>
  );
};
