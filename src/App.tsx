import React, { useState, useEffect } from 'react';
import { Sidebar, type NavTabId } from './components/layout/Sidebar.tsx';
import { Header } from './components/layout/Header.tsx';
import { Phase1Dashboard } from './components/dashboard/Phase1Dashboard.tsx';
import { LoginModal } from './components/auth/LoginModal.tsx';
import { PinModal } from './components/auth/PinModal.tsx';
import { useAuth } from './context/AuthContext.tsx';
import { Clock } from 'lucide-react';

export const App: React.FC = () => {
  const { isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTabId>('dashboard');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isPinOpen, setIsPinOpen] = useState(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // Focus search bar if present
      }
      if (e.key === 'F1') {
        e.preventDefault();
        setActiveTab('jobs');
      }
      if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('billing');
      }
      if (e.key === 'F3') {
        e.preventDefault();
        setActiveTab('customers');
      }
      if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab('inventory');
      }
      if (e.key === 'Escape') {
        setIsLoginOpen(false);
        setIsPinOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--bg-app)',
          color: 'var(--text-main)',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        Initializing KTech Service Management Desktop Engine...
      </div>
    );
  }

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Phase1Dashboard />;
      default:
        return (
          <div style={{ padding: '30px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <div className="card" style={{ padding: '40px 24px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-info-bg)',
                  color: 'var(--color-info)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <Clock size={24} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                Module Scheduled for Subsequent Phase
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                The relational database tables, Drizzle ORM schema, and IPC controllers for <strong>{activeTab.toUpperCase()}</strong> are fully compiled and active in the database engine. The full UI workflows will be constructed in their dedicated phases according to the approved roadmap.
              </p>
              <button className="btn btn-primary" onClick={() => setActiveTab('dashboard')}>
                Return to Phase 1 System Dashboard
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main App Workspace */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' }}>
        <Header
          onOpenPinModal={() => setIsPinOpen(true)}
          onOpenLoginModal={() => setIsLoginOpen(true)}
          onRefreshHealth={() => {}}
        />

        <main style={{ flex: 1, overflow: 'hidden', backgroundColor: 'var(--bg-app)', position: 'relative' }}>
          {renderContent()}
        </main>
      </div>

      {/* Authentication Modals */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      <PinModal isOpen={isPinOpen} onClose={() => setIsPinOpen(false)} />
    </div>
  );
};
