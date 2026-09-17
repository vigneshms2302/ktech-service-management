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
import { useAuth } from './context/AuthContext.tsx';

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
