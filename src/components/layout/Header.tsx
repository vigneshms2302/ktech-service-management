import React, { useState } from 'react';
import {
  Search,
  Moon,
  Sun,
  Shield,
  KeyRound,
  LogOut,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';

interface HeaderProps {
  onOpenPinModal: () => void;
  onOpenLoginModal: () => void;
  onOpenSearch: () => void;
  onNewJob?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenPinModal,
  onOpenLoginModal,
  onOpenSearch,
  onNewJob,
}) => {
  const { currentUser, logout, userList, pinLogin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const getRoleBadgeColor = (roleId?: string) => {
    switch (roleId) {
      case 'ROLE_OWNER':
        return { bg: 'var(--color-purple-bg)', text: 'var(--color-purple)', border: 'var(--color-purple-border)' };
      case 'ROLE_RECEPTION':
        return { bg: 'var(--color-info-bg)', text: 'var(--color-info)', border: 'var(--color-info)' };
      case 'ROLE_TECHNICIAN':
        return { bg: 'var(--color-warning-bg)', text: 'var(--color-warning)', border: 'var(--color-warning)' };
      case 'ROLE_ACCOUNTS':
        return { bg: 'var(--color-success-bg)', text: 'var(--color-success)', border: 'var(--color-success)' };
      default:
        return { bg: 'var(--bg-surface-hover)', text: 'var(--text-muted)', border: 'var(--border-color)' };
    }
  };

  const roleColors = getRoleBadgeColor(currentUser?.roleId);

  return (
    <header
      style={{
        height: '52px',
        backgroundColor: 'var(--bg-header)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        userSelect: 'none',
        flexShrink: 0,
        position: 'relative',
        zIndex: 20,
      }}
    >
      {/* Global Search Bar (Ctrl+K) & Fast + New Job */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '560px' }}>
        <div
          onClick={onOpenSearch}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '5px 10px',
            width: '100%',
            cursor: 'pointer',
          }}
        >
          <Search size={14} color="var(--text-dim)" />
          <input
            type="text"
            placeholder="Search Phone, Job #, Serial, Customer... (Ctrl+K)"
            readOnly
            onClick={onOpenSearch}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-main)',
              fontSize: '12px',
              width: '100%',
              cursor: 'pointer',
            }}
          />
          <kbd
            style={{
              padding: '1px 5px',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-dim)',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            ⌘K
          </kbd>
        </div>

        {onNewJob && (
          <button
            onClick={onNewJob}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: 'var(--brand-primary)',
              color: '#ffffff',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(59, 130, 246, 0.4)',
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={14} /> New Job Card
          </button>
        )}
      </div>

      {/* Right Controls: Database sync, Theme, User Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* System Online Badge */}
        <div
          title="K-Connect SQLite Engine: Active (WAL Mode)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            borderRadius: '6px',
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid var(--border-color)',
            fontSize: '11px',
            color: 'var(--color-success)',
            fontWeight: 600,
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />
          <span>K-Connect Ready</span>
        </div>

        {/* Theme Toggle */}
        <button
          className="btn btn-secondary"
          onClick={toggleTheme}
          title="Toggle Dark / Light Theme"
          style={{ padding: '6px 8px' }}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* Active Role & User Profile Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              color: 'var(--text-main)',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: roleColors.border,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '11px',
              }}
            >
              {currentUser?.fullName.charAt(0) || 'U'}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, lineHeight: 1.1 }}>
                {currentUser?.fullName || 'Not Logged In'}
              </div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: roleColors.text,
                  display: 'inline-block',
                }}
              >
                {currentUser?.roleName || 'Guest'}
              </span>
            </div>
          </button>

          {/* User Switching Popover */}
          {showUserDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '42px',
                right: 0,
                width: '260px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-lg)',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                zIndex: 100,
              }}
            >
              <div style={{ padding: '6px 8px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>
                QUICK PROFILE SWITCH (COUNTER)
              </div>

              {userList.map((user) => {
                const isCurrent = currentUser?.id === user.id;
                return (
                  <button
                    key={user.id}
                    onClick={async () => {
                      setShowUserDropdown(false);
                      // Direct PIN prompt for rapid switching
                      if (user.id === 'USR_OWNER') {
                        await pinLogin('1234');
                      } else if (user.id === 'USR_RECEPTION') {
                        await pinLogin('1111');
                      } else if (user.id === 'USR_TECH1') {
                        await pinLogin('2222');
                      } else if (user.id === 'USR_TECH2') {
                        await pinLogin('3333');
                      } else if (user.id === 'USR_ACCOUNTS') {
                        await pinLogin('4444');
                      } else {
                        onOpenPinModal();
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: '5px',
                      border: 'none',
                      backgroundColor: isCurrent ? 'var(--bg-surface-active)' : 'transparent',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: isCurrent ? 600 : 500 }}>{user.fullName}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{user.roleName}</div>
                    </div>
                    {isCurrent && <Shield size={12} color="var(--brand-primary)" />}
                  </button>
                );
              })}

              <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />

              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowUserDropdown(false);
                  onOpenPinModal();
                }}
                style={{ width: '100%', justifyContent: 'flex-start', fontSize: '11px' }}
              >
                <KeyRound size={13} />
                <span>Enter PIN Code</span>
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowUserDropdown(false);
                  onOpenLoginModal();
                }}
                style={{ width: '100%', justifyContent: 'flex-start', fontSize: '11px' }}
              >
                <Shield size={13} />
                <span>Password Login</span>
              </button>

              <button
                className="btn btn-danger"
                onClick={async () => {
                  setShowUserDropdown(false);
                  await logout();
                }}
                style={{ width: '100%', justifyContent: 'flex-start', fontSize: '11px', marginTop: '2px' }}
              >
                <LogOut size={13} />
                <span>Lock / Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
