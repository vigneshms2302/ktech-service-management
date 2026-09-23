import React, { useState, useEffect } from 'react';
import { Search, User, Laptop, Wrench, CornerDownLeft } from 'lucide-react';
import type { GlobalSearchResults } from '../../types/index.ts';
import { formatPhoneDisplay } from '../../utils/phone.ts';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customerId: string) => void;
  onSelectDevice: (deviceId: string) => void;
  onSelectJob: (jobId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectCustomer,
  onSelectDevice,
  onSelectJob,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setResults(null);
      return;
    }

    setIsSearching(true);
    try {
      if (window.electronAPI?.search?.global) {
        const res = await window.electronAPI.search.global({ query: val.trim() });
        if (res.success && res.data) {
          setResults(res.data);
        }
      }
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  const hasAnyResults = results && (results.customers.length > 0 || results.devices.length > 0 || results.jobs.length > 0);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '80px',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '640px',
          maxHeight: '75vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-surface)',
          padding: '16px',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar Input */}
        <div
          className="search-box"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            backgroundColor: 'var(--bg-app)',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            marginBottom: '14px',
          }}
        >
          <Search size={18} color="var(--brand-primary)" />
          <input
            type="text"
            className="search-input"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search customer phone, name, Job #, serial number, or device brand..."
            autoFocus
            style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '13px', outline: 'none', boxShadow: 'none' }}
          />
          <kbd
            style={{
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-dim)',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isSearching && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '12px' }}>
              Searching across records...
            </div>
          )}

          {query && !isSearching && !hasAnyResults && (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)', fontSize: '12px' }}>
              No matches found for "{query}".
            </div>
          )}

          {/* 1. Service Jobs Category */}
          {results && results.jobs.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.05em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wrench size={13} color="var(--brand-primary)" />
                <span>SERVICE JOBS ({results.jobs.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {results.jobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => {
                      onSelectJob(job.id);
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
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
                        <strong style={{ color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                          {job.jobNumber}
                        </strong>
                        <span className="badge badge-info" style={{ fontSize: '9px' }}>{job.currentStatus}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {job.customerName} • {job.deviceBrand} {job.deviceModel} {job.deviceSerial ? `(SN: ${job.deviceSerial})` : ''}
                      </div>
                    </div>
                    <CornerDownLeft size={14} color="var(--text-dim)" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Customers Category */}
          {results && results.customers.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.05em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={13} color="#a855f7" />
                <span>CUSTOMERS ({results.customers.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {results.customers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectCustomer(c.id);
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-app)'; }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '12px' }}>{c.fullName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                        Phone: {formatPhoneDisplay(c.primaryPhone)} • Code: {c.customerCode}
                      </div>
                    </div>
                    <CornerDownLeft size={14} color="var(--text-dim)" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Equipment Category */}
          {results && results.devices.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.05em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Laptop size={13} color="#10b981" />
                <span>EQUIPMENT / DEVICES ({results.devices.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {results.devices.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => {
                      onSelectDevice(d.id);
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-app)'; }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="badge badge-info" style={{ fontSize: '9px' }}>{d.equipmentType}</span>
                        <strong style={{ fontSize: '12px' }}>{d.brand} {d.modelName}</strong>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                        Owner: {d.customerName} {d.serialNumber ? `• SN: ${d.serialNumber}` : ''}
                      </div>
                    </div>
                    <CornerDownLeft size={14} color="var(--text-dim)" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
