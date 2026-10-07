import React, { useState, useEffect } from 'react';
import { Sidebar, type NavTabId } from './components/layout/Sidebar.tsx';
import { Header } from './components/layout/Header.tsx';
import { ExecutiveDashboard } from './components/dashboard/ExecutiveDashboard.tsx';
import { CustomerList } from './components/customers/CustomerList.tsx';
import { CustomerProfile } from './components/customers/CustomerProfile.tsx';
import { EquipmentProfile } from './components/equipment/EquipmentProfile.tsx';
import { JobList } from './components/jobs/JobList.tsx';
import { JobDetail } from './components/jobs/JobDetail.tsx';
import { NewJobWizard } from './components/jobs/NewJobWizard.tsx';
import { TechnicianWorkspace } from './components/technician/TechnicianWorkspace.tsx';
import { InventoryWorkspace } from './components/inventory/InventoryWorkspace.tsx';
import { BillingWorkspace } from './components/billing/BillingWorkspace.tsx';
import { SpecializedWorkspace } from './components/specialized/SpecializedWorkspace.tsx';
import { WhatsAppCenter } from './components/communication/WhatsAppCenter.tsx';
import { ReportsDashboard } from './components/reports/ReportsDashboard.tsx';
import { GlobalSearchModal } from './components/search/GlobalSearchModal.tsx';
import { LoginModal } from './components/auth/LoginModal.tsx';
import { PinModal } from './components/auth/PinModal.tsx';
import { ShopSettingsModal } from './components/settings/ShopSettingsModal.tsx';
import { LoginPage } from './components/auth/LoginPage.tsx';
import { SetupWizard } from './components/setup/SetupWizard.tsx';
import { useAuth } from './context/AuthContext.tsx';

export const App: React.FC = () => {
  const { currentUser, isLoading, isSetupComplete, checkSetupStatus } = useAuth();
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [licenseError, setLicenseError] = useState<string | null>(null);

  // Check Workstation Seat License on startup
  const checkLicense = async () => {
    try {
      if (window.electronAPI?.system?.getWorkstationLicenseStatus) {
        const res = await window.electronAPI.system.getWorkstationLicenseStatus();
        if (res.success && res.data) {
          if (!res.data.isAllowed) {
            setLicenseError(res.data.reason || 'Workstation seat limit exceeded for this shop installation.');
          } else {
            setLicenseError(null);
          }
        }
      }
    } catch (err) {
      console.error('Workstation license check error:', err);
    }
  };

  useEffect(() => {
    checkLicense();
  }, []);

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
        else if (isSettingsOpen) setIsSettingsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, isLoginOpen, isPinOpen, isSettingsOpen]);

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

  // Workstation License Seat Lockout Screen
  if (licenseError) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#090d16',
          color: '#f9fafb',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: '500px',
            width: '100%',
            backgroundColor: '#111827',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#ef4444',
              fontSize: '24px',
              fontWeight: 800,
            }}
          >
            !
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f9fafb', marginBottom: '8px' }}>
            Workstation Seat Limit Exceeded
          </h2>

          <p style={{ fontSize: '13px', color: '#9ca3af', lineHeight: 1.6, marginBottom: '20px' }}>
            {licenseError}
          </p>

          <div
            style={{
              padding: '12px',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '8px',
              border: '1px solid #1f2937',
              fontSize: '11px',
              color: '#94a3b8',
              marginBottom: '20px',
              textAlign: 'left',
            }}
          >
            <strong>How to resolve:</strong>
            <ul style={{ paddingLeft: '16px', marginTop: '6px' }}>
              <li>Open K-Connect on an authorized workstation.</li>
              <li>Go to <strong>Shop Settings &rarr; Security & Remote Support</strong>.</li>
              <li>Deactivate an unused or decommissioned computer to free up a license seat.</li>
              <li>Or contact KTech Computers Support to upgrade your seat package.</li>
            </ul>
          </div>

          <button
            onClick={checkLicense}
            style={{
              width: '100%',
              padding: '10px 16px',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Retry Verification
          </button>
        </div>
      </div>
    );
  }

  // 1. If First-Time Setup is not completed, display Setup & Onboarding Wizard
  if (!isSetupComplete) {
    return (
      <SetupWizard
        onSetupComplete={async () => {
          await checkSetupStatus();
        }}
      />
    );
  }

  // 2. Show Dedicated Premium Login Page if user is not authenticated
  if (!currentUser) {
    return <LoginPage />;
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

      if (selectedCustomerId) {
        return (
          <CustomerProfile
            customerId={selectedCustomerId}
            onBack={() => {
              setSelectedCustomerId(null);
              setSelectedDeviceId(null);
            }}
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
          />
        );
      }

      return (
        <CustomerList
          onSelectCustomer={(custId) => {
            setSelectedCustomerId(custId);
            setSelectedDeviceId(null);
          }}
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
              setSelectedDeviceId(null);
              setActiveTab('customers');
            }}
            onSelectDevice={(devId) => {
              setSelectedDeviceId(devId);
              setSelectedCustomerId(null);
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

    // 5. Inventory & Salvage Hub
    if (activeTab === 'inventory' || activeTab === 'salvage') {
      return <InventoryWorkspace />;
    }

    // 6. Billing & GST Invoices
    if (activeTab === 'billing') {
      return <BillingWorkspace />;
    }

    // 7. Specialized Modules: Data Recovery, Refurbished, PC Builder, Warranties
    if (activeTab === 'data-recovery' || activeTab === 'refurb' || activeTab === 'pc-builder' || activeTab === 'warranties') {
      return <SpecializedWorkspace />;
    }

    // 8. WhatsApp Communication
    if (activeTab === 'whatsapp') {
      return <WhatsAppCenter />;
    }

    // 9. Analytics & Business Intelligence
    if (activeTab === 'reports') {
      return <ReportsDashboard />;
    }

    // 10. Executive Dashboard & Overview
    return (
      <ExecutiveDashboard
        onNewJob={() => handleOpenNewJob()}
        onOpenJob={(jobId) => {
          setSelectedJobId(jobId);
          setActiveTab('jobs');
        }}
        onNavigateTab={(tab) => {
          if (tab === 'settings') {
            setIsSettingsOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
      />
    );
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'settings') {
            setIsSettingsOpen(true);
            return;
          }
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
          onOpenSearch={() => setIsSearchOpen(true)}
          onNewJob={() => handleOpenNewJob()}
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

      {/* Shop Settings & Data Backup Modal */}
      <ShopSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
