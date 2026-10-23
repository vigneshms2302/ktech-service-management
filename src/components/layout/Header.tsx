import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Moon,
  Sun,
  LogOut,
  Plus,
  Settings,
  ChevronDown,
  Check,
  PanelLeft,
  Bell,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { useShop } from '../../context/ShopContext.tsx';
import { PricingModal } from '../pricing/PricingModal.tsx';

interface HeaderProps {
  onOpenPinModal: () => void;
  onOpenLoginModal: () => void;
  onOpenSearch: () => void;
  onNewJob?: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenPinModal: _onOpenPinModal,
  onOpenLoginModal: _onOpenLoginModal,
  onOpenSearch,
  onNewJob,
  onToggleSidebar,
  isSidebarOpen = true,
}) => {
  const { currentUser, logout, userList } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { shopSettings } = useShop();

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userDropdownRef.current && !userDropdownRef.current.contains(target)) {
        setShowUserDropdown(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowUserDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const initials = currentUser?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  return (
    <>
      <header
        style={{
          height: '56px',
          backgroundColor: 'var(--bg-header)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          userSelect: 'none',
          flexShrink: 0,
          position: 'relative',
          zIndex: 20,
          gap: '8px',
        }}
      >
        {/* LEFT: Sidebar toggle + Shop name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <PanelLeft size={17} />
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '7px',
                backgroundColor: '#10a37f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img src="/icon.svg" alt="" style={{ width: '16px', height: '16px', filter: 'brightness(0) invert(1)' }} />
            </div>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-main)',
                letterSpacing: '-0.2px',
                maxWidth: '160px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {shopSettings.shopName || 'K-Connect'}
            </span>
          </div>
        </div>

        {/* CENTER: Search Bar */}
        <div style={{ flex: 1, maxWidth: '480px', margin: '0 12px' }}>
          <div
            onClick={onOpenSearch}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '6px 12px',
              cursor: 'pointer',
              transition: 'border-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-color-light)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
          >
            <Search size={14} color="var(--text-dim)" />
            <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-dim)' }}>
              Search jobs, customers, invoices...
            </span>
            <kbd
              style={{
                padding: '1px 6px',
                borderRadius: '5px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-dim)',
                fontSize: '11px',
                fontFamily: 'monospace',
              }}
            >
              ⌘K
            </kbd>
          </div>
        </div>

        {/* RIGHT: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {/* New Job Button */}
          {onNewJob && (
            <button
              onClick={onNewJob}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                backgroundColor: '#10a37f',
                color: '#ffffff',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 4px rgba(16, 163, 127, 0.3)',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0d8f6f')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#10a37f')}
            >
              <Plus size={15} />
              <span>New Job</span>
            </button>
          )}

          {/* Upgrade Button */}
          <button
            onClick={() => setIsPricingOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 11px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Upgrade
          </button>

          {/* Help */}
          <button
            title="Help & Documentation"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <HelpCircle size={16} />
          </button>

          {/* Notifications placeholder */}
          <button
            title="Notifications"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Bell size={16} />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title="Toggle theme"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* User Avatar + Dropdown */}
          <div ref={userDropdownRef} style={{ position: 'relative', marginLeft: '4px' }}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 6px 4px 4px',
                borderRadius: '8px',
                backgroundColor: showUserDropdown ? 'var(--bg-surface-hover)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = showUserDropdown ? 'var(--bg-surface-hover)' : 'transparent')}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#10a37f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '11px',
                }}
              >
                {initials}
              </div>
              <ChevronDown size={13} color="var(--text-dim)" />
            </button>

            {/* User Dropdown */}
            {showUserDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '44px',
                  right: 0,
                  width: '220px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  zIndex: 200,
                  animation: 'fadeIn 0.12s ease-out',
                }}
              >
                {/* User Info */}
                <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {currentUser?.fullName || 'User'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#10a37f', marginTop: '1px' }}>
                    {currentUser?.roleName || 'Staff'}
                  </div>
                </div>

                {/* User list for switching */}
                {userList.length > 1 && (
                  <>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', padding: '2px 8px 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Switch User
                    </div>
                    {userList.map((user) => {
                      const isCurrent = currentUser?.id === user.id;
                      return (
                        <button
                          key={user.id}
                          onClick={() => setShowUserDropdown(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: isCurrent ? 'var(--bg-surface-active)' : 'transparent',
                            color: 'var(--text-main)',
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                          onMouseEnter={(e) => {
                            if (!isCurrent) e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = isCurrent ? 'var(--bg-surface-active)' : 'transparent';
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: isCurrent ? 600 : 400 }}>{user.fullName}</div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>{user.roleName}</div>
                          </div>
                          {isCurrent && <Check size={13} color="#10a37f" />}
                        </button>
                      );
                    })}
                    <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />
                  </>
                )}

                {/* Settings */}
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Settings size={14} />
                  <span>Settings</span>
                </button>

                {/* Sign Out */}
                <button
                  onClick={async () => { setShowUserDropdown(false); await logout(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    color: '#ef4444',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <LogOut size={14} />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} />
    </>
  );
};
