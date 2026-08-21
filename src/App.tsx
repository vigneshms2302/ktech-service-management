import React, { useState, useEffect } from 'react';
import { Sidebar, type NavTabId } from './components/layout/Sidebar.tsx';
import { Header } from './components/layout/Header.tsx';
import { Phase1Dashboard } from './components/dashboard/Phase1Dashboard.tsx';
import { CustomerList } from './components/customers/CustomerList.tsx';
import { CustomerProfile } from './components/customers/CustomerProfile.tsx';
import { EquipmentProfile } from './components/equipment/EquipmentProfile.tsx';
import { JobList } from './components/jobs/JobList.tsx';
import { JobDetail } from './components/jobs/JobDetail.tsx';
import { NewJobWizard } from './components/jobs/NewJobWizard.tsx';
import { TechnicianWorkspace } from './components/technician/TechnicianWorkspace.tsx';
import { GlobalSearchModal } from './components/search/GlobalSearchModal.tsx';
import { LoginModal } from './components/auth/LoginModal.tsx';
import { PinModal } from './components/auth/PinModal.tsx';
import { useAuth } from './context/AuthContext.tsx';
import { Clock } from 'lucide-react';

export const App: React.FC = () => {
  const { isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTabId>('dashboard');

  // Deep Link States
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isNewJobWizardOpen, setIsNewJobWizardOpen] = useState(false);
  const [wizardCustomerId, setWizardCustomerId] = useState<string | undefined>();
  const [wizardDeviceId, setWizardDeviceId] = useState<string | undefined>();

  // Modals
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isPinOpen, setIsPinOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'F1') {
        e.preventDefault();
        setSelectedJobId(null);
        setIsNewJobWizardOpen(false);
        setActiveTab('jobs');
      }
      if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('billing');
      }
      if (e.key === 'F3') {
        e.preventDefault();
        setSelectedCustomerId(null);
        setSelectedDeviceId(null);
        setActiveTab('customers');
      }
      if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab('inventory');
      }
      if (e.key === 'Escape') {
        if (isSearchOpen) setIsSearchOpen(false);
        else if (isLoginOpen) setIsLoginOpen(false);
        else if (isPinOpen) setIsPinOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, isLoginOpen, isPinOpen]);

  const handleOpenNewJob = (customerId?: string, deviceId?: string) => {
    setWizardCustomerId(customerId);
    setWizardDeviceId(deviceId);
    setIsNewJobWizardOpen(true);
    setActiveTab('jobs');
  };

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

  // Render workspace content
  const renderContent = () => {
    // 1. New Service Job Wizard Overlay / View
    if (isNewJobWizardOpen) {
      return (
        <NewJobWizard
          initialCustomerId={wizardCustomerId}
          initialDeviceId={wizardDeviceId}
          onCancel={() => setIsNewJobWizardOpen(false)}
          onJobCreated={(newJobId) => {
            setIsNewJobWizardOpen(false);
            setSelectedJobId(newJobId);
            setActiveTab('jobs');
          }}
        />
      );
    }

    // 2. Customers Workspace
    if (activeTab === 'customers') {
      if (selectedCustomerId) {
        return (
          <CustomerProfile
            customerId={selectedCustomerId}
            onBack={() => setSelectedCustomerId(null)}
            onSelectJob={(jobId) => {
              setSelectedJobId(jobId);
              setActiveTab('jobs');
            }}
            onSelectDevice={(deviceId) => {
              setSelectedDeviceId(deviceId);
            }}
            onNewJobForCustomer={(custId, devId) => {
              handleOpenNewJob(custId, devId);
            }}
            onAddEquipment={() => {
              // Handled within CustomerProfile
            }}
          />
        );
      }

      if (selectedDeviceId) {
        return (
          <EquipmentProfile
            deviceId={selectedDeviceId}
            onBack={() => setSelectedDeviceId(null)}
            onSelectCustomer={(custId) => {
              setSelectedDeviceId(null);
              setSelectedCustomerId(custId);
            }}
            onSelectJob={(jobId) => {
              setSelectedJobId(jobId);
              setActiveTab('jobs');
            }}
            onNewJobForDevice={(custId, devId) => {
              handleOpenNewJob(custId, devId);
            }}
          />
        );
      }

      return (
        <CustomerList
          onSelectCustomer={(custId) => setSelectedCustomerId(custId)}
          onNewJobForCustomer={(custId) => handleOpenNewJob(custId)}
        />
      );
    }

    // 3. Service Jobs Workspace
    if (activeTab === 'jobs') {
      if (selectedJobId) {
        return (
          <JobDetail
            jobId={selectedJobId}
            onBack={() => setSelectedJobId(null)}
            onSelectCustomer={(custId) => {
              setSelectedCustomerId(custId);
              setActiveTab('customers');
            }}
            onSelectDevice={(devId) => {
              setSelectedDeviceId(devId);
              setActiveTab('customers');
            }}
          />
        );
      }

      return (
        <JobList
          onSelectJob={(jobId) => setSelectedJobId(jobId)}
          onNewJob={() => handleOpenNewJob()}
        />
      );
    }

    // 4. Technician Workstation
    if (activeTab === 'technician') {
      return (
        <TechnicianWorkspace
          onOpenJob={(jobId) => {
            setSelectedJobId(jobId);
            setActiveTab('jobs');
          }}
        />
      );
    }

    // 5. Phase 1 System Dashboard
    if (activeTab === 'dashboard') {
      return <Phase1Dashboard />;
    }

    // 5. Subsequent Phases Workspace Placeholders
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
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setSelectedCustomerId(null);
          setSelectedDeviceId(null);
          setSelectedJobId(null);
          setIsNewJobWizardOpen(false);
          setActiveTab(tab);
        }}
      />

      {/* Main App Workspace */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' }}>
        <Header
          onOpenPinModal={() => setIsPinOpen(true)}
          onOpenLoginModal={() => setIsLoginOpen(true)}
          onRefreshHealth={() => {}}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        <main style={{ flex: 1, overflow: 'hidden', backgroundColor: 'var(--bg-app)', position: 'relative' }}>
          {renderContent()}
        </main>
      </div>

      {/* Global Search Command Palette (Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectCustomer={(custId) => {
          setSelectedCustomerId(custId);
          setSelectedDeviceId(null);
          setSelectedJobId(null);
          setIsNewJobWizardOpen(false);
          setActiveTab('customers');
        }}
        onSelectDevice={(devId) => {
          setSelectedDeviceId(devId);
          setSelectedCustomerId(null);
          setSelectedJobId(null);
          setIsNewJobWizardOpen(false);
          setActiveTab('customers');
        }}
        onSelectJob={(jobId) => {
          setSelectedJobId(jobId);
          setSelectedCustomerId(null);
          setSelectedDeviceId(null);
          setIsNewJobWizardOpen(false);
          setActiveTab('jobs');
        }}
      />

      {/* Authentication Modals */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      <PinModal isOpen={isPinOpen} onClose={() => setIsPinOpen(false)} />
    </div>
  );
};
