import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Search,
  Phone,
  MapPin,
  Laptop,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { saasApi } from '../../api/client.ts';

interface PublicJobTrackerProps {
  initialJobNumber?: string;
}

const STAGES = [
  { key: 'RECEIVED', label: 'Intake Received' },
  { key: 'UNDER_INSPECTION', label: 'Technical Inspection' },
  { key: 'DIAGNOSIS_COMPLETED', label: 'Diagnosis Completed' },
  { key: 'APPROVED', label: 'Customer Approved' },
  { key: 'UNDER_REPAIR', label: 'Under Repair' },
  { key: 'QUALITY_CHECK', label: 'Quality Testing' },
  { key: 'READY_FOR_DELIVERY', label: 'Ready for Pickup' },
  { key: 'DELIVERED', label: 'Delivered' },
];

export const PublicJobTracker: React.FC<PublicJobTrackerProps> = ({ initialJobNumber }) => {
  const [jobNumber, setJobNumber] = useState(initialJobNumber || '');
  const [jobData, setJobData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async (numberToSearch: string) => {
    if (!numberToSearch.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await saasApi.public.trackJob(numberToSearch.trim());
      if (res.success && res.data) {
        setJobData(res.data);
      } else {
        setError(res.error || 'Job ticket not found. Please double check your ticket number.');
        setJobData(null);
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
      setJobData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialJobNumber) {
      fetchStatus(initialJobNumber);
    }
  }, [initialJobNumber]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStatus(jobNumber);
  };

  const getStageIndex = (currentStatus: string) => {
    const idx = STAGES.findIndex((s) => s.key === currentStatus);
    return idx >= 0 ? idx : 0;
  };

  const currentStageIndex = jobData ? getStageIndex(jobData.currentStatus) : 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#212121', color: '#ececec', padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ maxWidth: '640px', width: '100%' }}>
        {/* Brand Banner */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', borderRadius: '9999px', backgroundColor: 'rgba(16, 163, 127, 0.12)', border: '1px solid rgba(16, 163, 127, 0.3)', fontSize: '12px', color: '#10a37f', fontWeight: 600, marginBottom: '12px' }}>
            <ShieldCheck size={16} /> Live Service Repair Tracker
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.5px', color: '#f3f3f3' }}>
            Track Your Device Service
          </h1>
          <p style={{ fontSize: '13.5px', color: '#b4b4b4', margin: 0 }}>
            Enter your service ticket number to view live repair progress and technician notes.
          </p>
        </div>

        {/* Search Input Box */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '28px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="e.g. JOB-2026-00001"
              value={jobNumber}
              onChange={(e) => setJobNumber(e.target.value.toUpperCase())}
              style={{
                width: '100%',
                padding: '12px 20px',
                borderRadius: '9999px',
                backgroundColor: '#2f2f2f',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#ececec',
                fontSize: '14px',
                fontWeight: 600,
                outline: 'none',
                fontFamily: 'monospace',
                textTransform: 'uppercase',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '12px 24px',
              backgroundColor: '#10a37f',
              color: '#fff',
              border: 'none',
              borderRadius: '9999px',
              fontWeight: 600,
              fontSize: '13.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(16, 163, 127, 0.35)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#1a7f64')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#10a37f')}
          >
            <Search size={16} /> Track
          </button>
        </form>

        {error && (
          <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Live Tracking Card */}
        {jobData && (
          <div style={{ backgroundColor: '#2f2f2f', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 30px 80px -20px rgba(0,0,0,0.85)' }}>
            {/* Header info */}
            <div style={{ padding: '20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#10a37f', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {jobData.shop.name}
                </span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#f3f3f3', fontFamily: 'monospace', marginTop: '2px' }}>
                  {jobData.jobNumber}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ padding: '4px 12px', borderRadius: '9999px', backgroundColor: 'rgba(16, 163, 127, 0.15)', color: '#10a37f', border: '1px solid rgba(16, 163, 127, 0.3)', fontSize: '12px', fontWeight: 700 }}>
                  {jobData.currentStatus.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Device & Issue Summary */}
            <div style={{ padding: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: '#171717' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#212121', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10a37f' }}>
                  <Laptop size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#f3f3f3' }}>
                    {jobData.device.brand} {jobData.device.modelName}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#8e8ea0' }}>
                    Type: {jobData.device.equipmentType}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '12.5px', color: '#ececec', lineHeight: 1.5, backgroundColor: '#212121', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <strong style={{ color: '#8e8ea0' }}>Reported Problem: </strong>
                {jobData.reportedIssue}
              </div>
            </div>

            {/* Repair Progress Stepper */}
            <div style={{ padding: '24px 20px' }}>
              <h3 style={{ fontSize: '12.5px', fontWeight: 700, color: '#8e8ea0', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px' }}>
                Live Repair Progress
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {STAGES.map((stg, i) => {
                  const isCompleted = i < currentStageIndex;
                  const isCurrent = i === currentStageIndex;

                  return (
                    <div key={stg.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isCompleted ? '#10a37f' : isCurrent ? '#10a37f' : '#171717',
                          border: isCurrent ? '2px solid #ffffff' : isCompleted ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#fff',
                          flexShrink: 0,
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        {isCompleted ? <CheckCircle2 size={16} /> : i + 1}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: isCurrent ? 800 : 600, color: isCurrent ? '#10a37f' : isCompleted ? '#ececec' : '#8e8ea0' }}>
                          {stg.label}
                        </div>
                        {isCurrent && (
                          <div style={{ fontSize: '11.5px', color: '#b4b4b4', marginTop: '2px' }}>
                            Currently at this service workstation
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shop Contact & Help */}
            <div style={{ padding: '16px 20px', backgroundColor: '#171717', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#b4b4b4' }}>
                <MapPin size={14} color="#10a37f" />
                <span>{jobData.shop.address}</span>
              </div>

              <a
                href={`tel:${jobData.shop.phone}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: '#2f2f2f',
                  color: '#10a37f',
                  borderRadius: '9999px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  transition: 'background-color 0.15s ease',
                }}
              >
                <Phone size={14} /> Call Shop: {jobData.shop.phone}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
