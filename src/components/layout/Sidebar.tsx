import React from 'react';
import {
  LayoutDashboard,
  Wrench,
  Package,
  Users,
  Receipt,
  Settings,
  Lock,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useShop } from '../../context/ShopContext.tsx';

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
  const { shopSettings } = useShop();

  const navItems: SidebarNavItem[] = [
    {
      id: 'dashboard' as NavTabId,
      label: 'Dashboard',
      icon: LayoutDashboard,
      allowed: true,
    },
    {
      id: 'jobs' as NavTabId,
      label: 'Repairs & Job Cards',
      icon: Wrench,
      allowed: hasPermission('jobs.read'),
    },
    {
      id: 'billing' as NavTabId,
      label: 'Billing & Invoices',
      icon: Receipt,
      allowed: hasPermission('billing.create') || hasPermission('jobs.read'),
    },
    {
      id: 'inventory' as NavTabId,
      label: 'Parts & Stock',
      icon: Package,
      allowed: hasPermission('inventory.read'),
    },
    {
      id: 'customers' as NavTabId,
      label: 'Customers',
      icon: Users,
      allowed: hasPermission('customers.read'),
    },
    {
      id: 'settings' as NavTabId,
      label: 'Shop Settings & Backup',
      icon: Settings,
      allowed: true,
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
          padding: '16px 16px 14px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--brand-primary), #0284c7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '18px',
            letterSpacing: '-0.5px',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
            flexShrink: 0,
          }}
        >
          K
        </div>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: '15px',
              color: 'var(--text-main)',
              lineHeight: 1.2,
              letterSpacing: '-0.3px',
            }}
          >
            K-Connect
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--brand-primary)',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: '1px',
            }}
            title={shopSettings.shopName}
          >
            {shopSettings.shopName || 'Service Hub'}
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
          gap: '3px',
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
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
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
                    backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'var(--bg-surface-hover)',
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
