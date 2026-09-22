import React, { useState, useEffect } from 'react';
import {
  User,
  Laptop,
  Wrench,
  Search,
  Plus,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Camera,
  MessageSquare,
  Printer,
  X,
} from 'lucide-react';
import type { EquipmentType } from '../../types/index.ts';
import { CustomerModal } from '../customers/CustomerModal.tsx';
import { EquipmentModal } from '../equipment/EquipmentModal.tsx';
import { formatPhoneDisplay } from '../../utils/phone.ts';
import {
  autoCorrectFaultText,
  autoCorrectTitle,
  autoCorrectGeneralText,
  handleAutoCorrectKeyDown,
} from '../../utils/autoCorrect.ts';

const FAULT_CATEGORY_OPTIONS = [
  'Motherboard / Chip-Level',
  'No Power / Dead',
  'No Display / Black Screen',
  'Screen / Glass Broken',
  'Liquid / Water Spill',
  'Auto Restart / BSOD',
  'Overheating / Fan Noise',
  'Keyboard / Touchpad',
  'Battery / Charging Port',
  'SSD / Data Recovery',
  'OS / Software / BIOS',
  'Hinge / Body Damage',
  'Sound / Mic / Camera',
];

const QUICK_COMPLAINT_TAGS = [
  'Dead / 0A current draw',
  'Water spilled on unit',
  'No display with power LED ON',
  'Screen flickering / lines',
  'Keyboard keys not working',
  'Battery not charging / 0%',
  'Hinge broken from corner',
  'Overheating & auto shutdown',
  'Blue screen crash (BSOD)',
  'SSD not detected / slow boot',
];

const COMMON_ACCESSORIES = [
  'Charger / Power Adapter',
  'Power Cable',
  'Laptop Bag / Sleeve',
  'Mouse',
  'Keyboard',
  'Remote Control',
  'DualSense / Xbox Controller',
  'Pen Drive / USB Drive',
  'Original Box',
  'RAM / SSD removed',
];

interface NewJobWizardProps {
  initialCustomerId?: string;
  initialDeviceId?: string;
  onCancel?: () => void;
  onJobCreated: (jobId: string) => void;
}

export const NewJobWizard: React.FC<NewJobWizardProps> = ({
  initialCustomerId,
  initialDeviceId,
  onJobCreated,
}) => {
  // Wizard Step: 1 = Customer, 2 = Equipment, 3 = Admission & Issue, 4 = Review & Create, 5 = Success
  const [step, setStep] = useState<number>(initialCustomerId && initialDeviceId ? 3 : initialCustomerId ? 2 : 1);

  // Customer State
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Array<{ id: string; customerCode: string; fullName: string; primaryPhone: string; email: string | null; deviceCount: number }>>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; customerCode: string; fullName: string; primaryPhone: string } | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Equipment State
  const [customerDevices, setCustomerDevices] = useState<Array<{
    id: string;
    equipmentType: EquipmentType;
    brand: string;
    modelName: string;
    serialNumber?: string | null;
    specsSummary?: string | null;
    hasPasscode: boolean;
  }>>([]);
  const [selectedDevice, setSelectedDevice] = useState<{
    id: string;
    equipmentType: EquipmentType;
    brand: string;
    modelName: string;
    serialNumber?: string | null;
  } | null>(null);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);

  // Intake Form State
  const [selectedFaults, setSelectedFaults] = useState<string[]>(['Motherboard / Chip-Level']);
  const [customFault, setCustomFault] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'URGENT' | 'CRITICAL'>('NORMAL');
  const [reportedIssue, setReportedIssue] = useState('');
  const [powerStatus, setPowerStatus] = useState('NO_POWER');
  const [customPowerStatus, setCustomPowerStatus] = useState('');
  const [displayStatus, setDisplayStatus] = useState('NO_DISPLAY');
  const [customDisplayStatus, setCustomDisplayStatus] = useState('');
  const [bodyCondition, setBodyCondition] = useState('NORMAL_WEAR');
  const [customBodyCondition, setCustomBodyCondition] = useState('');
  const [waterDamageDetected, setWaterDamageDetected] = useState(false);
  const [shortCircuitDetected, setShortCircuitDetected] = useState(false);
  const [physicalConditionNotes, setPhysicalConditionNotes] = useState('');
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>(['Charger / Power Adapter']);
  const [customAccessory, setCustomAccessory] = useState('');
  const [estimatedCostStr, setEstimatedCostStr] = useState<string>('');
  const [advanceDepositStr, setAdvanceDepositStr] = useState<string>('');
  const [promisedDeliveryDate, setPromisedDeliveryDate] = useState<string>('');
  const [initialNote, setInitialNote] = useState('');

  // Photos
  const [photos, setPhotos] = useState<Array<{ base64Data: string; caption: string }>>([]);

  // Submitting / Result
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdJob, setCreatedJob] = useState<{ id: string; jobNumber: string; warning?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPrintIntakeModal, setShowPrintIntakeModal] = useState(false);

  const estimatedCost = Number(estimatedCostStr) || 0;
  const advanceDeposit = Number(advanceDepositStr) || 0;

  // Auto load initial customer if provided
  useEffect(() => {
    if (initialCustomerId) {
      loadCustomerDetails(initialCustomerId);
    }
  }, [initialCustomerId]);

  const loadCustomerDetails = async (custId: string) => {
    if (window.electronAPI?.customers?.getById) {
      const res = await window.electronAPI.customers.getById({ customerId: custId });
      if (res.success && res.data) {
        setSelectedCustomer({
          id: res.data.customer.id,
          customerCode: res.data.customer.customerCode,
          fullName: res.data.customer.fullName,
          primaryPhone: res.data.customer.primaryPhone,
        });
        setCustomerDevices(res.data.devices);

        if (initialDeviceId) {
          const dev = res.data.devices.find((d) => d.id === initialDeviceId);
          if (dev) {
            setSelectedDevice(dev);
            setStep(3);
          }
        } else if (res.data.devices.length === 1) {
          setSelectedDevice(res.data.devices[0]);
        }
      }
    }
  };

  // Search Customers
  const handleCustomerSearch = async (val: string) => {
    setCustomerSearch(val);
    if (!val.trim()) {
      setCustomerResults([]);
      return;
    }
    if (window.electronAPI?.customers?.search) {
      const res = await window.electronAPI.customers.search({ query: val });
      if (res.success && res.data) {
        setCustomerResults(res.data);
      }
    }
  };

  const handleSelectCustomer = async (cust: { id: string; customerCode: string; fullName: string; primaryPhone: string }) => {
    setSelectedCustomer(cust);
    if (window.electronAPI?.devices?.list) {
      const res = await window.electronAPI.devices.list({ customerId: cust.id });
      if (res.success && res.data) {
        setCustomerDevices(res.data);
      }
    }
    setStep(2);
  };

  const handleSelectDevice = (dev: { id: string; equipmentType: EquipmentType; brand: string; modelName: string; serialNumber?: string | null }) => {
    setSelectedDevice(dev);
    setStep(3);
  };

  const toggleAccessory = (acc: string) => {
    if (selectedAccessories.includes(acc)) {
      setSelectedAccessories(selectedAccessories.filter((a) => a !== acc));
    } else {
      setSelectedAccessories([...selectedAccessories, acc]);
    }
  };

  const handleAddCustomAccessory = () => {
    if (customAccessory.trim() && !selectedAccessories.includes(customAccessory.trim())) {
      setSelectedAccessories([...selectedAccessories, customAccessory.trim()]);
      setCustomAccessory('');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setPhotos((prev) => [
            ...prev,
            { base64Data: evt.target!.result as string, caption: file.name },
          ]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos(photos.filter((_, i) => i !== idx));
  };

  // Submit & Create Service Job
  const handleFinalSubmit = async () => {
    if (!selectedCustomer || !selectedDevice) return;
    if (!reportedIssue.trim()) {
      setErrorMessage('Customer reported issue is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (!window.electronAPI?.jobs?.create) {
        setErrorMessage('Electron jobs API unavailable');
        return;
      }

      const res = await window.electronAPI.jobs.create({
        customerId: selectedCustomer.id,
        deviceId: selectedDevice.id,
        serviceCategory: selectedFaults.length > 0 ? selectedFaults.join(', ') : 'Motherboard / Chip-Level',
        priority,
        reportedIssue: reportedIssue.trim(),
        accessoriesReceived: selectedAccessories,
        physicalConditionNotes: physicalConditionNotes.trim() || undefined,
        powerStatus: powerStatus === 'OTHER' && customPowerStatus.trim() ? customPowerStatus.trim() : powerStatus,
        displayStatus: displayStatus === 'OTHER' && customDisplayStatus.trim() ? customDisplayStatus.trim() : displayStatus,
        bodyCondition: bodyCondition === 'OTHER' && customBodyCondition.trim() ? customBodyCondition.trim() : bodyCondition,
        waterDamageDetected,
        shortCircuitDetected,
        estimatedCost: Number(estimatedCost) || 0,
        advanceDeposit: Number(advanceDeposit) || 0,
        promisedDeliveryDate: promisedDeliveryDate || undefined,
        initialNote: initialNote.trim() || undefined,
        photosBase64: photos.map((p) => ({ base64Data: p.base64Data, caption: p.caption })),
      });

      if (res.success && res.data) {
        setCreatedJob({
          id: res.data.id,
          jobNumber: res.data.jobNumber,
          warning: res.data.warning,
        });
        setStep(5); // Success step
      } else {
        setErrorMessage(res.error || 'Failed to create service job');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendWhatsAppSlip = () => {
    if (!selectedCustomer || !createdJob || !selectedDevice) return;
    const cleanPhone = selectedCustomer.primaryPhone.replace(/[^0-9]/g, '');
    const waPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone.slice(-10)}`;
    const text = `🔧 *KTech Computers - Service Admission Receipt*\n\n` +
      `Hello *${selectedCustomer.fullName}*,\n` +
      `We have admitted your *${selectedDevice.brand} ${selectedDevice.modelName}* for service.\n\n` +
      `📋 *Job Card No:* ${createdJob.jobNumber}\n` +
      `⚠️ *Reported Problem:* ${reportedIssue}\n` +
      `📦 *Accessories Received:* ${selectedAccessories.length > 0 ? selectedAccessories.join(', ') : 'Unit only'}\n` +
      `💰 *Estimated Cost:* ₹${estimatedCost.toFixed(2)}\n` +
      `💵 *Advance Received:* ₹${advanceDeposit.toFixed(2)}\n` +
      (promisedDeliveryDate ? `📅 *Promised Delivery:* ${promisedDeliveryDate}\n` : '') +
      `\n📍 *KTech Computers* | 📞 Helpline: +91 98765 43210\n` +
      `We will notify you once diagnostic inspection is complete!`;
    window.open(`https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: '20px' }}>
      {/* Wizard Header & Stepper */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wrench size={20} color="var(--brand-primary)" />
            <span>New Service Job Admission (Reception Intake)</span>
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Customer → Equipment → Admission Checklist → Review & Job ID
          </p>
        </div>

        {/* Step Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[
            { num: 1, label: 'Customer' },
            { num: 2, label: 'Equipment' },
            { num: 3, label: 'Intake & Issue' },
            { num: 4, label: 'Review' },
          ].map((s) => (
            <div
              key={s.num}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: step === s.num ? 'var(--brand-primary)' : step > s.num ? 'var(--bg-surface-active)' : 'transparent',
                color: step === s.num ? '#ffffff' : step > s.num ? 'var(--color-success)' : 'var(--text-dim)',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              <span>{s.num}. {s.label}</span>
              {step > s.num && <CheckCircle2 size={12} />}
            </div>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            backgroundColor: 'var(--color-danger-bg)',
            color: 'var(--color-danger)',
            fontSize: '12px',
            marginBottom: '16px',
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* STEP 1: Select or Create Customer */}
      {step === 1 && (
        <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} color="var(--brand-primary)" />
              <span>Step 1: Find or Register Customer</span>
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Always search by phone number first to prevent creating duplicate customer profiles.
            </p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  flex: 1,
                }}
              >
                <Search size={16} color="var(--text-dim)" />
                <input
                  type="text"
                  className="input-field"
                  value={customerSearch}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  placeholder="Type 10-digit mobile number or customer name..."
                  autoFocus
                  style={{ border: 'none', background: 'transparent', padding: 0 }}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={() => setIsCustomerModalOpen(true)}
              >
                <Plus size={14} />
                <span>New Customer</span>
              </button>
            </div>

            {/* Results dropdown */}
            {customerResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>
                  MATCHING CUSTOMERS FOUND ({customerResults.length}):
                </div>
                {customerResults.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'background-color 0.12s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-app)'; }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{c.fullName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Phone: {formatPhoneDisplay(c.primaryPhone)} • Code: {c.customerCode} • Devices: {c.deviceCount}
                      </div>
                    </div>
                    <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11px' }}>
                      Select
                    </button>
                  </div>
                ))}
              </div>
            )}

            {customerSearch && customerResults.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', backgroundColor: 'var(--bg-app)', borderRadius: '6px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  No customer found matching "{customerSearch}".
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => setIsCustomerModalOpen(true)}
                >
                  <Plus size={14} />
                  <span>Register "{customerSearch}" as New Customer</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: Select or Register Equipment */}
      {step === 2 && selectedCustomer && (
        <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }}>
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Laptop size={18} color="var(--brand-primary)" />
                  <span>Step 2: Select Equipment for Service</span>
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Customer: <strong>{selectedCustomer.fullName}</strong> ({formatPhoneDisplay(selectedCustomer.primaryPhone)})
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setIsDeviceModalOpen(true)}
              >
                <Plus size={14} />
                <span>Add Equipment</span>
              </button>
            </div>

            {/* List of customer equipment */}
            {customerDevices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', backgroundColor: 'var(--bg-app)', borderRadius: '6px' }}>
                <Laptop size={32} color="var(--text-dim)" style={{ margin: '0 auto 10px' }} />
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  No equipment currently registered for {selectedCustomer.fullName}.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => setIsDeviceModalOpen(true)}
                >
                  <Plus size={14} />
                  <span>Register Customer's Equipment</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {customerDevices.map((dev) => (
                  <div
                    key={dev.id}
                    onClick={() => handleSelectDevice(dev)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-app)'; }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge badge-info" style={{ fontSize: '10px' }}>{dev.equipmentType}</span>
                        <strong style={{ fontSize: '13px' }}>{dev.brand} {dev.modelName}</strong>
                      </div>
                      {dev.serialNumber && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                          SN: {dev.serialNumber}
                        </div>
                      )}
                    </div>
                    <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11px' }}>
                      Select for Intake
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={14} />
                <span>Change Customer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Admission, Reported Issue, Condition & Accessories Checklist */}
      {step === 3 && selectedCustomer && selectedDevice && (
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Summary Banner */}
          <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>CUSTOMER: </span>
              <strong>{selectedCustomer.fullName}</strong> ({formatPhoneDisplay(selectedCustomer.primaryPhone)})
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>EQUIPMENT: </span>
              <strong>{selectedDevice.brand} {selectedDevice.modelName}</strong> ({selectedDevice.equipmentType})
            </div>
            <button className="btn btn-secondary" onClick={() => setStep(2)} style={{ fontSize: '11px', padding: '3px 8px' }}>
              Change
            </button>
          </div>

          {/* Admission Form */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700 }}>Step 3: Initial Admission & Problem Intake</h2>

            {/* Multi-Select Fault Categories */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
                  FAULT CATEGORIES (MULTI-SELECT) *
                </label>
                <span style={{ fontSize: '11px', color: 'var(--brand-primary)', fontWeight: 600 }}>
                  {selectedFaults.length} selected
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {FAULT_CATEGORY_OPTIONS.map((cat) => {
                  const isChecked = selectedFaults.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setSelectedFaults(selectedFaults.filter((f) => f !== cat));
                        } else {
                          setSelectedFaults([...selectedFaults, cat]);
                        }
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: isChecked ? '1px solid var(--brand-primary)' : '1px solid var(--border-color)',
                        backgroundColor: isChecked ? 'rgba(2, 132, 199, 0.15)' : 'var(--bg-app)',
                        color: isChecked ? 'var(--brand-primary)' : 'var(--text-main)',
                        fontWeight: isChecked ? 700 : 400,
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.1s ease',
                      }}
                    >
                      <span>{isChecked ? '✓' : '+'}</span>
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>

              {/* Add Custom Fault Tag */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="+ Type custom fault / issue and press Add..."
                  value={customFault}
                  onChange={(e) => setCustomFault(e.target.value)}
                  onBlur={() => setCustomFault(autoCorrectFaultText(customFault))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const corrected = autoCorrectFaultText(customFault.trim());
                      if (corrected && !selectedFaults.includes(corrected)) {
                        setSelectedFaults([...selectedFaults, corrected]);
                        setCustomFault('');
                      }
                    }
                  }}
                  spellCheck={true}
                  autoCorrect="on"
                  style={{ flex: 1, padding: '5px 10px', fontSize: '11px' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    const corrected = autoCorrectFaultText(customFault.trim());
                    if (corrected && !selectedFaults.includes(corrected)) {
                      setSelectedFaults([...selectedFaults, corrected]);
                      setCustomFault('');
                    }
                  }}
                  style={{ padding: '5px 12px', fontSize: '11px' }}
                >
                  + Add Fault Tag
                </button>
              </div>
            </div>

            {/* Priority Select */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                PRIORITY
              </label>
              <select
                className="input-field"
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'LOW' | 'NORMAL' | 'URGENT' | 'CRITICAL')}
              >
                <option value="NORMAL">Normal (Standard Turnaround)</option>
                <option value="URGENT">Urgent (Express Service)</option>
                <option value="CRITICAL">Critical (Immediate Lab Bench Assignment)</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {/* Customer Complaint / Reported Issue */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                CUSTOMER REPORTED ISSUE & SYMPTOMS *
              </label>
              <textarea
                className="input-field"
                rows={3}
                value={reportedIssue}
                onChange={(e) => setReportedIssue(e.target.value)}
                onKeyDown={(e) => handleAutoCorrectKeyDown(e, reportedIssue, setReportedIssue)}
                onBlur={() => setReportedIssue(autoCorrectFaultText(reportedIssue))}
                placeholder="e.g. Device does not turn on. Power light blinks orange. Customer states it happened after a lightning surge."
                spellCheck={true}
                autoCorrect="on"
                required
              />

              {/* Quick Complaint Insert Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-dim)', alignSelf: 'center', marginRight: '4px' }}>Quick Add:</span>
                {QUICK_COMPLAINT_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setReportedIssue((prev) => (prev ? `${prev}. ${tag}` : tag));
                    }}
                    style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    +{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Initial Condition Checks */}
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-app)', borderRadius: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px' }}>
                INITIAL HARDWARE ADMISSION CONDITION:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>Power Status</label>
                  <select
                    className="input-field"
                    value={powerStatus}
                    onChange={(e) => setPowerStatus(e.target.value)}
                  >
                    <option value="NO_POWER">No Power / Dead</option>
                    <option value="NORMAL_POWER">Turns On Normally</option>
                    <option value="INTERMITTENT_POWER">Turns on and off / Restarts</option>
                    <option value="CHARGER_ONLY">Works on Charger Only</option>
                    <option value="OTHER">Other (Type Custom...)</option>
                  </select>
                  {powerStatus === 'OTHER' && (
                    <input
                      type="text"
                      className="input-field"
                      style={{ marginTop: '4px', fontSize: '11px' }}
                      placeholder="e.g. Blinks 3 times then dies"
                      value={customPowerStatus}
                      onChange={(e) => setCustomPowerStatus(e.target.value)}
                      autoFocus
                    />
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>Display Status</label>
                  <select
                    className="input-field"
                    value={displayStatus}
                    onChange={(e) => setDisplayStatus(e.target.value)}
                  >
                    <option value="NO_DISPLAY">No Display / Black Screen</option>
                    <option value="WORKING_DISPLAY">Display Working</option>
                    <option value="LINES_ON_SCREEN">Lines on Screen</option>
                    <option value="CRACKED_PANEL">Cracked Screen</option>
                    <option value="NOT_APPLICABLE">N/A (Non-display gear)</option>
                    <option value="OTHER">Other (Type Custom...)</option>
                  </select>
                  {displayStatus === 'OTHER' && (
                    <input
                      type="text"
                      className="input-field"
                      style={{ marginTop: '4px', fontSize: '11px' }}
                      placeholder="e.g. Dim backlight / White screen"
                      value={customDisplayStatus}
                      onChange={(e) => setCustomDisplayStatus(e.target.value)}
                      autoFocus
                    />
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>Casing Condition</label>
                  <select
                    className="input-field"
                    value={bodyCondition}
                    onChange={(e) => setBodyCondition(e.target.value)}
                  >
                    <option value="NORMAL_WEAR">Normal Minor Wear</option>
                    <option value="HEAVY_SCRATCHES">Heavy Scratches / Dents</option>
                    <option value="BROKEN_HINGE">Broken Hinge / Casing</option>
                    <option value="PRISTINE">Like New / Pristine</option>
                    <option value="OTHER">Other (Type Custom...)</option>
                  </select>
                  {bodyCondition === 'OTHER' && (
                    <input
                      type="text"
                      className="input-field"
                      style={{ marginTop: '4px', fontSize: '11px' }}
                      placeholder="e.g. Missing rubber feet, loose bezel"
                      value={customBodyCondition}
                      onChange={(e) => setCustomBodyCondition(e.target.value)}
                      autoFocus
                    />
                  )}
                </div>
              </div>

              {/* Checkbox flags */}
              <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={waterDamageDetected}
                    onChange={(e) => setWaterDamageDetected(e.target.checked)}
                  />
                  <span>Liquid / Water Spillage Observed</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={shortCircuitDetected}
                    onChange={(e) => setShortCircuitDetected(e.target.checked)}
                  />
                  <span>Burnt Smell / Short Circuit Suspected</span>
                </label>
              </div>

              <div style={{ marginTop: '8px' }}>
                <input
                  type="text"
                  className="input-field"
                  value={physicalConditionNotes}
                  onChange={(e) => setPhysicalConditionNotes(e.target.value)}
                  onKeyDown={(e) => handleAutoCorrectKeyDown(e, physicalConditionNotes, setPhysicalConditionNotes)}
                  onBlur={() => setPhysicalConditionNotes(autoCorrectGeneralText(physicalConditionNotes))}
                  placeholder="Physical observations (e.g. 2 bottom screws missing, crack near left hinge)"
                  spellCheck={true}
                  autoCorrect="on"
                />
              </div>
            </div>

            {/* Accessory Checklist */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                ACCESSORIES RECEIVED WITH EQUIPMENT
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {COMMON_ACCESSORIES.map((acc) => {
                  const isChecked = selectedAccessories.includes(acc);
                  return (
                    <button
                      key={acc}
                      type="button"
                      onClick={() => toggleAccessory(acc)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: isChecked ? '1px solid var(--brand-primary)' : '1px solid var(--border-color)',
                        backgroundColor: isChecked ? 'rgba(14, 165, 233, 0.15)' : 'var(--bg-app)',
                        color: isChecked ? 'var(--brand-primary)' : 'var(--text-muted)',
                        fontSize: '11px',
                        fontWeight: isChecked ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      {isChecked ? '✓ ' : '+ '} {acc}
                    </button>
                  );
                })}
              </div>

              {/* Custom Accessory Input */}
              <div style={{ display: 'flex', gap: '8px', maxWidth: '360px' }}>
                <input
                  type="text"
                  className="input-field"
                  value={customAccessory}
                  onChange={(e) => setCustomAccessory(e.target.value)}
                  onBlur={() => setCustomAccessory(autoCorrectTitle(customAccessory))}
                  placeholder="Custom accessory (e.g. HDMI Cable)"
                  spellCheck={true}
                  autoCorrect="on"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomAccessory();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddCustomAccessory}
                  style={{ fontSize: '11px' }}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Photos Upload */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                INTAKE & DAMAGE PHOTOS
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <label className="btn btn-secondary" style={{ cursor: 'pointer', fontSize: '11px' }}>
                  <Camera size={14} />
                  <span>Attach Photos</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handlePhotoUpload}
                  />
                </label>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  {photos.length} photo(s) selected (Stored in local app storage)
                </span>
              </div>

              {photos.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '4px 0' }}>
                  {photos.map((p, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <img src={p.base64Data} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          background: 'rgba(0,0,0,0.7)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontSize: '10px',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Advance Deposit & Delivery Estimate */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  ESTIMATED CHARGE (₹)
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={estimatedCostStr}
                  onChange={(e) => setEstimatedCostStr(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="e.g. 1500"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  ADVANCE DEPOSIT (₹)
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={advanceDepositStr}
                  onChange={(e) => setAdvanceDepositStr(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="e.g. 500"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  PROMISED DELIVERY DATE
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={promisedDeliveryDate}
                  onChange={(e) => setPromisedDeliveryDate(e.target.value)}
                />
              </div>
            </div>

            {/* Internal Intake Note */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                INITIAL INTERNAL INTAKE NOTE (OPTIONAL)
              </label>
              <input
                type="text"
                className="input-field"
                value={initialNote}
                onChange={(e) => setInitialNote(e.target.value)}
                onBlur={() => setInitialNote(autoCorrectGeneralText(initialNote))}
                placeholder="Staff remarks, customer urgency reason, or special instructions..."
                spellCheck={true}
                autoCorrect="on"
              />
            </div>

            {/* Stepper Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)}>
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!reportedIssue.trim()) {
                    setErrorMessage('Please describe the customer reported issue');
                    return;
                  }
                  setErrorMessage(null);
                  setStep(4);
                }}
              >
                <span>Review Admission Slip</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Finalize Admission */}
      {step === 4 && selectedCustomer && selectedDevice && (
        <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="var(--brand-primary)" />
              <span>Step 4: Review Service Job Admission Slip</span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
              <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-app)', borderRadius: '6px' }}>
                <div style={{ fontWeight: 600, color: 'var(--brand-primary)', marginBottom: '4px' }}>CUSTOMER DETAILS</div>
                <div><strong>{selectedCustomer.fullName}</strong></div>
                <div style={{ color: 'var(--text-muted)' }}>Phone: {formatPhoneDisplay(selectedCustomer.primaryPhone)} • Code: {selectedCustomer.customerCode}</div>
              </div>

              <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-app)', borderRadius: '6px' }}>
                <div style={{ fontWeight: 600, color: 'var(--brand-primary)', marginBottom: '4px' }}>EQUIPMENT DETAILS</div>
                <div><strong>{selectedDevice.brand} {selectedDevice.modelName}</strong> ({selectedDevice.equipmentType})</div>
                {selectedDevice.serialNumber && <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Serial Number: {selectedDevice.serialNumber}</div>}
              </div>

              <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-app)', borderRadius: '6px' }}>
                <div style={{ fontWeight: 600, color: 'var(--brand-primary)', marginBottom: '4px' }}>REPORTED COMPLAINT & INITIAL CONDITION</div>
                <div style={{ fontWeight: 500, marginBottom: '6px' }}>{reportedIssue}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '11px' }}>
                  <span className="badge badge-info">Power: {powerStatus}</span>
                  <span className="badge badge-info">Display: {displayStatus}</span>
                  <span className="badge badge-info">Condition: {bodyCondition}</span>
                  {waterDamageDetected && <span className="badge badge-danger">Liquid Spillage</span>}
                  {shortCircuitDetected && <span className="badge badge-danger">Short Circuit</span>}
                </div>
              </div>

              <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-app)', borderRadius: '6px' }}>
                <div style={{ fontWeight: 600, color: 'var(--brand-primary)', marginBottom: '4px' }}>ACCESSORIES RECEIVED ({selectedAccessories.length})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {selectedAccessories.length === 0 ? (
                    <span style={{ color: 'var(--text-dim)' }}>No accessories received (Device Only)</span>
                  ) : (
                    selectedAccessories.map((a) => (
                      <span key={a} className="badge badge-info">{a}</span>
                    ))
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-app)', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Estimated Cost: </span>
                  <strong>₹{estimatedCost.toFixed(2)}</strong>
                </div>
                <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-app)', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Advance Deposit: </span>
                  <strong>₹{advanceDeposit.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-secondary" onClick={() => setStep(3)} disabled={isSubmitting}>
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <button
                className="btn btn-primary"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                {isSubmitting ? 'Generating Job Ticket...' : 'Confirm Admission & Create Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Success Ticket Screen */}
      {step === 5 && createdJob && (
        <div style={{ maxWidth: '580px', margin: '40px auto', width: '100%', textAlign: 'center' }}>
          <div className="card" style={{ padding: '40px 24px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-success-bg)',
                color: 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CheckCircle2 size={32} />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
              Service Job Created Successfully!
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Intake admission completed and status initialized to <strong>RECEIVED</strong>.
            </p>

            {/* Big Human Readable Job ID Badge */}
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--bg-app)',
                borderRadius: '8px',
                border: '2px solid var(--brand-primary)',
                marginBottom: '20px',
                display: 'inline-block',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>OFFICIAL JOB IDENTIFIER</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                {createdJob.jobNumber}
              </div>
            </div>

            {createdJob.warning && (
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)', borderRadius: '6px', fontSize: '11px', marginBottom: '16px' }}>
                {createdJob.warning}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <button
                type="button"
                className="btn btn-whatsapp"
                onClick={handleSendWhatsAppSlip}
                style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 700 }}
              >
                <MessageSquare size={15} />
                <span>Send WhatsApp Intake Slip</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowPrintIntakeModal(true)}
                style={{ padding: '8px 14px', fontSize: '12px' }}
              >
                <Printer size={15} />
                <span>Print Job Card</span>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setStep(1);
                  setSelectedCustomer(null);
                  setSelectedDevice(null);
                  setReportedIssue('');
                  setPhotos([]);
                  setCreatedJob(null);
                  setEstimatedCostStr('');
                  setAdvanceDepositStr('');
                }}
              >
                Intake Another Device
              </button>
              <button
                className="btn btn-primary"
                onClick={() => onJobCreated(createdJob.id)}
                style={{ padding: '8px 20px' }}
              >
                Open Job Workstation →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Customer & Equipment Modals */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onCustomerCreated={(newCust) => handleSelectCustomer(newCust)}
        onSelectExisting={(existingId) => {
          setIsCustomerModalOpen(false);
          loadCustomerDetails(existingId);
          setStep(2);
        }}
        initialPhone={customerSearch}
      />

      {selectedCustomer && (
        <EquipmentModal
          isOpen={isDeviceModalOpen}
          onClose={() => setIsDeviceModalOpen(false)}
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.fullName}
          onEquipmentCreated={(newDev) => {
            setCustomerDevices((prev) => [...prev, newDev as any]);
            handleSelectDevice(newDev as any);
          }}
          onSelectExisting={(existingDevId) => {
            setIsDeviceModalOpen(false);
            const dev = customerDevices.find((d) => d.id === existingDevId);
            if (dev) handleSelectDevice(dev);
          }}
        />
      )}

      {/* Printable Job Intake Counter Slip Modal */}
      {showPrintIntakeModal && createdJob && selectedCustomer && selectedDevice && (
        <div className="modal-backdrop" onClick={() => setShowPrintIntakeModal(false)}>
          <div
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderRadius: '8px',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <span style={{ fontWeight: 700, fontSize: '14px' }}>Counter Intake Slip Preview</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => window.print()}
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  <Printer size={14} /> Print Slip
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowPrintIntakeModal(false)}
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div style={{ padding: '10px 0', fontFamily: 'var(--font-sans)', fontSize: '12px', lineHeight: 1.5 }}>
              {/* Slip Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>KTECH COMPUTERS</h2>
                <div style={{ fontSize: '11px', color: '#475569' }}>
                  Cross-Cut Road, Gandhipuram, Coimbatore - 641012 • 📞 +91 98765 43210
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Equipment Service Admission Slip
                </div>
              </div>

              {/* Job ID & Date Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#f1f5f9', borderRadius: '4px', marginBottom: '12px', fontWeight: 700 }}>
                <span>JOB CARD #: {createdJob.jobNumber}</span>
                <span>Date: {new Date().toLocaleDateString('en-IN')} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              {/* Customer & Equipment 2-col info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px' }}>
                  <div style={{ fontWeight: 700, fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Customer Details</div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{selectedCustomer.fullName}</div>
                  <div>Phone: {formatPhoneDisplay(selectedCustomer.primaryPhone)}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Code: {selectedCustomer.customerCode}</div>
                </div>

                <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px' }}>
                  <div style={{ fontWeight: 700, fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Device Information</div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{selectedDevice.brand} {selectedDevice.modelName}</div>
                  <div>Type: {selectedDevice.equipmentType}</div>
                  <div>Serial #: {selectedDevice.serialNumber || 'N/A'}</div>
                </div>
              </div>

              {/* Problem & Condition */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', marginBottom: '12px' }}>
                <div style={{ fontWeight: 700, marginBottom: '2px' }}>Reported Problem:</div>
                <div style={{ fontStyle: 'italic', marginBottom: '8px' }}>"{reportedIssue}"</div>

                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '11px', borderTop: '1px dashed #cbd5e1', paddingTop: '6px' }}>
                  <span><strong>Accessories:</strong> {selectedAccessories.length > 0 ? selectedAccessories.join(', ') : 'Unit Only'}</span>
                  <span><strong>Initial Power:</strong> {powerStatus.replace(/_/g, ' ')}</span>
                  <span><strong>Display:</strong> {displayStatus.replace(/_/g, ' ')}</span>
                </div>
              </div>

              {/* Financials Strip */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', marginBottom: '14px' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Estimated Service Cost: </span>
                  <strong>₹{estimatedCost.toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Advance Deposit Paid: </span>
                  <strong>₹{advanceDeposit.toFixed(2)}</strong>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div style={{ fontSize: '9px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginBottom: '24px' }}>
                <strong>TERMS:</strong> 1. Customers must produce this original admission slip to collect the device. 2. KTech is not responsible for existing software/data loss; customer acknowledges prior data backup responsibility. 3. Devices unclaimed after 30 days of completion will be subject to nominal storage/disposal.
              </div>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '20px' }}>
                <div style={{ textAlign: 'center', width: '180px', borderTop: '1px solid #0f172a', paddingTop: '4px', fontSize: '11px' }}>
                  Customer Signature
                </div>
                <div style={{ textAlign: 'center', width: '180px', borderTop: '1px solid #0f172a', paddingTop: '4px', fontSize: '11px' }}>
                  For KTech Computers
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
