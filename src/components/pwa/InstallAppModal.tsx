import React from 'react';
import { X, Monitor, Smartphone, Check, Download, Zap, Cloud } from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerInstall: () => void;
  isInstalled: boolean;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  onTriggerInstall,
  isInstalled,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#212121',
          color: '#ececec',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: '#8e8ea0',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#ececec')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#8e8ea0')}
        >
          <X size={20} />
        </button>

        {/* Header Icon + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              backgroundColor: '#171717',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(16, 163, 127, 0.25)',
            }}
          >
            <img src="/icon.svg" alt="K-Connect" style={{ width: '36px', height: '36px' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f3f3', margin: 0, letterSpacing: '-0.3px' }}>
              Install K-Connect App
            </h2>
            <p style={{ fontSize: '13px', color: '#b4b4b4', margin: '3px 0 0' }}>
              Native desktop and mobile experience powered by the Cloud
            </p>
          </div>
        </div>

        {/* Installed Status or Value Prop */}
        {isInstalled ? (
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(16, 163, 127, 0.12)',
              border: '1px solid rgba(16, 163, 127, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
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
                color: '#fff',
                flexShrink: 0,
              }}
            >
              <Check size={18} strokeWidth={3} />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#ececec' }}>
                App Already Installed
              </div>
              <div style={{ fontSize: '12px', color: '#b4b4b4' }}>
                You are running the standalone desktop/mobile app synced with the cloud.
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            {[
              {
                icon: Monitor,
                title: 'Desktop Windows & Mac App',
                desc: 'Runs in its own window without browser toolbars, tabs, or address bars.',
              },
              {
                icon: Cloud,
                title: 'Real-time Cloud Backend',
                desc: 'Same database on all computers. Create a job on PC #1, view it instantly on PC #2.',
              },
              {
                icon: Smartphone,
                title: 'Mobile & Tablet Ready',
                desc: 'Install on Android or iPhone to take intake photos and track repairs on the go.',
              },
              {
                icon: Zap,
                title: 'Offline Resilient & Fast',
                desc: 'Instant startup with local caching, thermal printing, and WhatsApp shortcuts.',
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '10px 12px',
                    backgroundColor: '#171717',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(16, 163, 127, 0.15)',
                      color: '#10a37f',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <Icon size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#f3f3f3' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8e8ea0', marginTop: '2px', lineHeight: 1.4 }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* How to install instructions box */}
        {!isInstalled && (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#2f2f2f',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '12px',
              color: '#b4b4b4',
              marginBottom: '20px',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: '#ececec' }}>Browser Tip:</strong> You can also click the{' '}
            <span style={{ color: '#10a37f', fontWeight: 600 }}>Install</span> icon (⊕ or ⬇️) directly inside
            your Chrome/Edge address bar at any time to add to your desktop or taskbar.
          </div>
        )}

        {/* Action Button */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              onTriggerInstall();
              onClose();
            }}
            style={{
              flex: 1,
              padding: '11px 18px',
              borderRadius: '9999px',
              backgroundColor: '#10a37f',
              color: '#ffffff',
              border: 'none',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(16, 163, 127, 0.3)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#1a7f64')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#10a37f')}
          >
            <Download size={16} />
            {isInstalled ? 'App Already Installed' : 'Install Desktop App'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '11px 18px',
              borderRadius: '9999px',
              backgroundColor: '#2f2f2f',
              color: '#ececec',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '13.5px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#383838')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#2f2f2f')}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
