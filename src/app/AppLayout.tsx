import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Sidebar, type NavTabId } from '../components/layout/Sidebar.tsx';
import { Header } from '../components/layout/Header.tsx';
import { ExecutiveDashboard } from '../components/dashboard/ExecutiveDashboard.tsx';
import { CustomerList } from '../components/customers/CustomerList.tsx';
import { CustomerProfile } from '../components/customers/CustomerProfile.tsx';
import { EquipmentProfile } from '../components/equipment/EquipmentProfile.tsx';
import { JobList } from '../components/jobs/JobList.tsx';
import { JobDetail } from '../components/jobs/JobDetail.tsx';
import { NewJobWizard } from '../components/jobs/NewJobWizard.tsx';
import { TechnicianWorkspace } from '../components/technician/TechnicianWorkspace.tsx';
import { InventoryWorkspace } from '../components/inventory/InventoryWorkspace.tsx';
import { BillingWorkspace } from '../components/billing/BillingWorkspace.tsx';
import { SpecializedWorkspace } from '../components/specialized/SpecializedWorkspace.tsx';
import { WhatsAppCenter } from '../components/communication/WhatsAppCenter.tsx';
import { ReportsDashboard } from '../components/reports/ReportsDashboard.tsx';
import { GlobalSearchModal } from '../components/search/GlobalSearchModal.tsx';
import { LoginModal } from '../components/auth/LoginModal.tsx';
import { PinModal } from '../components/auth/PinModal.tsx';
import { ShopSettingsModal } from '../components/settings/ShopSettingsModal.tsx';
import { saasApi } from '../api/client.ts';
import { Sparkles, AlertTriangle, ArrowRight, Clock, ArrowUp, Plus } from 'lucide-react';

/**
 * Decoupled Authenticated Repair Shop SaaS Workspace (/app)
 * Protected ChatGPT-style sidebar + centered workspace + bottom floating action input.
 */
export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine initial activeTab from URL sub-path
  const getTabFromPath = (): NavTabId => {
    const p = location.pathname.replace('/app', '').replace(/^\//, '');
    if (p.startsWith('jobs')) return 'jobs';
    if (p.startsWith('customers')) return 'customers';
    if (p.startsWith('technician')) return 'technician';
    if (p.startsWith('inventory')) return 'inventory';
    if (p.startsWith('salvage')) return 'salvage';
    if (p.startsWith('billing')) return 'billing';
    if (p.startsWith('whatsapp')) return 'whatsapp';
    if (p.startsWith('reports')) return 'reports';
    if (p.startsWith('data-recovery')) return 'data-recovery';
    if (p.startsWith('refurb')) return 'refurb';
    if (p.startsWith('pc-builder')) return 'pc-builder';
    if (p.startsWith('warranties')) return 'warranties';
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState<NavTabId>(getTabFromPath);

  // Sync activeTab when location changes
  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [quickInputValue, setQuickInputValue] = useState('');

  // Subscription Status Banner State
  const [subStatus, setSubStatus] = useState<any>(null);

  useEffect(() => {
    const fetchSubStatus = async () => {
      try {
        const res = await saasApi.subscription.getStatus();
        if (res.success && res.data) {
          setSubStatus(res.data);
        }
      } catch (err) {
        console.warn('Could not load subscription status:', err);
      }
    };
    fetchSubStatus();
  }, []);

  // Check Workstation Seat License on startup (Electron desktop mode)
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
        navigate('/app/jobs');
      }
      if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('billing');
        navigate('/app/billing');
      }
      if (e.key === 'F3') {
        e.preventDefault();
        setSelectedCustomerId(null);
        setSelectedDeviceId(null);
        setActiveTab('customers');
        navigate('/app/customers');
      }
      if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab('inventory');
        navigate('/app/inventory');
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
  }, [isSearchOpen, isLoginOpen, isPinOpen, isSettingsOpen, navigate]);

  const handleOpenNewJob = (customerId?: string, deviceId?: string) => {
    setWizardCustomerId(customerId);
    setWizardDeviceId(deviceId);
    setIsNewJobWizardOpen(true);
    setActiveTab('jobs');
    navigate('/app/jobs');
  };

  const handleSelectTab = (tab: NavTabId) => {
    if (tab === 'settings') {
      setIsSettingsOpen(true);
      return;
    }
    setSelectedCustomerId(null);
    setSelectedDeviceId(null);
    setSelectedJobId(null);
    setIsNewJobWizardOpen(false);
    setActiveTab(tab);
    navigate(`/app/${tab}`);
  };

  // Workstation License Seat Lockout Screen
  if (licenseError) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#212121] text-[#ececec] p-6">
        <div className="max-w-[500px] w-full bg-[#171717] border border-red-500/40 rounded-2xl p-8 text-center shadow-xl">
          <div className="w-14 h-14 bg-red-500/15 rounded-xl flex items-center justify-center mx-auto mb-4 text-red-500 text-2xl font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-[#ececec] mb-2">
            Workstation Seat Limit Exceeded
          </h2>
          <p className="text-xs text-[#b4b4b4] leading-relaxed mb-5">
            {licenseError}
          </p>
          <button
            onClick={checkLicense}
            className="w-full py-2.5 px-4 bg-[#ececec] text-[#0d0d0d] hover:bg-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            Retry Verification
          </button>
        </div>
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
            navigate('/app/jobs');
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
              navigate('/app/jobs');
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
              navigate('/app/jobs');
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
              navigate('/app/customers');
            }}
            onSelectDevice={(devId) => {
              setSelectedDeviceId(devId);
              setSelectedCustomerId(null);
              setActiveTab('customers');
              navigate('/app/customers');
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
            navigate('/app/jobs');
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
    if (
      activeTab === 'data-recovery' ||
      activeTab === 'refurb' ||
      activeTab === 'pc-builder' ||
      activeTab === 'warranties'
    ) {
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
          navigate('/app/jobs');
        }}
        onNavigateTab={(tab) => {
          handleSelectTab(tab);
        }}
      />
    );
  };

  // Subscription Banner logic
  const isTrial = subStatus?.subscription?.isTrial;
  const daysRemaining = subStatus?.subscription?.daysRemaining;
  const isExpired = subStatus?.subscription?.status === 'EXPIRED' || (daysRemaining !== undefined && daysRemaining <= 0);
  const pendingClaim = subStatus?.latestClaim?.status === 'PENDING';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-[#212121] text-[#0d0d0d] dark:text-[#ececec] transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={isSidebarOpen}
        activeTab={activeTab}
        onNewJob={() => handleOpenNewJob()}
        onSelectJob={(jobId) => {
          setSelectedJobId(jobId);
          setSelectedCustomerId(null);
          setSelectedDeviceId(null);
          setIsNewJobWizardOpen(false);
          setActiveTab('jobs');
          navigate('/app/jobs');
        }}
        onSelectTab={handleSelectTab}
      />

      {/* Main App Workspace */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* Top Subscription / Trial Banner */}
        {isTrial && daysRemaining > 0 && !pendingClaim && (
          <div className="bg-[#064e3b] border-b border-emerald-500/30 text-[#ecfdf5] px-4 py-1.5 text-xs flex items-center justify-between font-medium z-30">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-[#34d399]" />
              <span>
                <strong>14-Day Free Trial Active:</strong> You have {daysRemaining} days remaining. All features and seats unlocked.
              </span>
            </div>
            <Link
              to="/checkout/annual"
              className="flex items-center gap-1.5 text-white bg-[#10a37f] px-3 py-1 rounded-full text-[11px] font-bold no-underline shadow-sm"
            >
              Upgrade to Annual Pro (₹14,999/yr) <ArrowRight size={12} />
            </Link>
          </div>
        )}

        {isExpired && !pendingClaim && (
          <div className="bg-[#7f1d1d] border-b border-red-500/40 text-[#fef2f2] px-4 py-1.5 text-xs flex items-center justify-between font-medium z-30">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-300" />
              <span>
                <strong>Subscription Expired:</strong> Your repair jobs and customer records are preserved. Please renew to continue full operations.
              </span>
            </div>
            <Link
              to="/checkout/annual"
              className="flex items-center gap-1.5 text-white bg-red-600 px-3 py-1 rounded-full text-[11px] font-bold no-underline"
            >
              Renew Annual Subscription <ArrowRight size={12} />
            </Link>
          </div>
        )}

        {pendingClaim && (
          <div className="bg-[#78350f] border-b border-amber-500/40 text-[#fffbeb] px-4 py-1.5 text-xs flex items-center justify-between font-medium z-30">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-amber-300" />
              <span>
                <strong>GPay Payment Verification Pending:</strong> Reference {subStatus?.latestClaim?.upiTransactionId} is under review by platform admin.
              </span>
            </div>
            <Link
              to="/checkout/annual"
              className="text-amber-200 text-[11px] font-bold underline"
            >
              View Verification Status &rarr;
            </Link>
          </div>
        )}

        <Header
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onOpenPinModal={() => setIsPinOpen(true)}
          onOpenLoginModal={() => setIsLoginOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onNewJob={() => handleOpenNewJob()}
        />

        <main className="flex-1 overflow-hidden bg-white dark:bg-[#212121] flex flex-col relative transition-colors duration-200">
          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto w-full flex flex-col items-center px-4 sm:px-6 py-5">
            <div className="w-full max-w-6xl flex-1 flex flex-col">
              {renderContent()}
            </div>
          </div>

          {/* ChatGPT Floating Input / Quick-Action Bar */}
          <div className="w-full pointer-events-none sticky bottom-0 left-0 pb-3 px-4 bg-gradient-to-t from-white via-white/90 dark:from-[#212121] dark:via-[#212121]/90 to-transparent pt-3 z-30">
            <div className="max-w-3xl mx-auto w-full pointer-events-auto">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = quickInputValue.trim();
                  if (!q) return;
                  if (q.toLowerCase() === 'new' || q.toLowerCase() === 'new job' || q.toLowerCase() === 'new repair') {
                    handleOpenNewJob();
                  } else {
                    setIsSearchOpen(true);
                  }
                  setQuickInputValue('');
                }}
                className="relative flex items-center bg-white dark:bg-[#2f2f2f] border border-[#e5e5e5] dark:border-[#383838] rounded-2xl shadow-sm hover:shadow-md px-3.5 py-2.5 transition-all focus-within:border-gray-400 dark:focus-within:border-gray-500"
              >
                {/* Attachment / Plus Icon on Left */}
                <button
                  type="button"
                  onClick={() => handleOpenNewJob()}
                  title="New Repair Job / Attach Item"
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#383838] text-[#676767] dark:text-[#b4b4b4] hover:text-[#0d0d0d] dark:hover:text-white transition-colors cursor-pointer mr-2 shrink-0"
                >
                  <Plus size={18} />
                </button>

                {/* Input Field */}
                <input
                  type="text"
                  value={quickInputValue}
                  onChange={(e) => setQuickInputValue(e.target.value)}
                  placeholder="Ask K-Connect, search jobs, customer phone, or type 'New Job'..."
                  className="flex-1 bg-transparent border-none outline-none text-sm text-[#0d0d0d] dark:text-[#ececec] placeholder:text-[#676767] dark:placeholder:text-[#8e8e93]"
                />

                {/* Send Arrow on Right */}
                <button
                  type="submit"
                  disabled={!quickInputValue.trim()}
                  title="Send query"
                  className="w-8 h-8 rounded-full bg-[#0d0d0d] text-white dark:bg-white dark:text-[#0d0d0d] flex items-center justify-center shrink-0 ml-2 disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all cursor-pointer"
                >
                  <ArrowUp size={16} />
                </button>
              </form>
              <div className="text-[11px] text-[#676767] dark:text-[#8e8e93] text-center mt-1.5 font-normal">
                K-Connect can make mistakes. Verify critical chip diagnostics and passcodes.
              </div>
            </div>
          </div>
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
          navigate('/app/customers');
        }}
        onSelectDevice={(devId) => {
          setSelectedDeviceId(devId);
          setSelectedCustomerId(null);
          setSelectedJobId(null);
          setIsNewJobWizardOpen(false);
          setActiveTab('customers');
          navigate('/app/customers');
        }}
        onSelectJob={(jobId) => {
          setSelectedJobId(jobId);
          setSelectedCustomerId(null);
          setSelectedDeviceId(null);
          setIsNewJobWizardOpen(false);
          setActiveTab('jobs');
          navigate('/app/jobs');
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
