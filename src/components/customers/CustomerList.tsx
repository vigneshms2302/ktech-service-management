import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Laptop,
  Wrench,
  RefreshCw,
} from 'lucide-react';
import type { CustomerSummary } from '../../types/index.ts';
import { CustomerModal } from './CustomerModal.tsx';
import { formatPhoneDisplay } from '../../utils/phone.ts';

interface CustomerListProps {
  onSelectCustomer: (customerId: string) => void;
  onNewJobForCustomer: (customerId: string) => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  onSelectCustomer,
  onNewJobForCustomer,
}) => {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCustomers = async (searchQuery = '') => {
    setIsLoading(true);
    try {
      if (window.electronAPI?.customers?.list) {
        const res = await window.electronAPI.customers.list({ search: searchQuery, limit: 100 });
        if (res.success && res.data) {
          setCustomers(res.data.customers);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    fetchCustomers(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: '20px' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="var(--brand-primary)" />
            <span>Customer Directory & CRM</span>
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Search by phone number, customer code, full name, or email address
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => fetchCustomers(search)}
            disabled={isLoading}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={14} />
            <span>Add New Customer</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '8px 12px',
            maxWidth: '500px',
          }}
        >
          <Search size={16} color="var(--text-dim)" />
          <input
            type="text"
            className="input-field"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Type 10-digit phone, customer name, CUST-10001, or email..."
            style={{ border: 'none', background: 'transparent', padding: 0 }}
          />
          {search && (
            <button
              onClick={() => handleSearchChange('')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Customer Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
        <table className="ktech-table">
          <thead>
            <tr>
              <th>Customer Code</th>
              <th>Full Name</th>
              <th>Primary Phone</th>
              <th>Email</th>
              <th>Type</th>
              <th>Devices</th>
              <th>Active Jobs</th>
              <th>Total Jobs</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                  {isLoading ? 'Searching customer database...' : 'No customer records found matching your search.'}
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr
                  key={c.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectCustomer(c.id)}
                >
                  <td>
                    <strong style={{ color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
                      {c.customerCode}
                    </strong>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.fullName}</span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{formatPhoneDisplay(c.primaryPhone)}</span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-muted)' }}>{c.email || '-'}</span>
                  </td>
                  <td>
                    <span className="badge badge-info" style={{ fontSize: '10px' }}>
                      {c.customerType}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Laptop size={12} color="var(--text-dim)" />
                      {c.deviceCount}
                    </span>
                  </td>
                  <td>
                    {c.activeJobsCount > 0 ? (
                      <span className="badge badge-warning">{c.activeJobsCount} Active</span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)' }}>0</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{c.totalJobsCount}</span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => onSelectCustomer(c.id)}
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                      >
                        Profile
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => onNewJobForCustomer(c.id)}
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                      >
                        <Wrench size={11} />
                        <span>Intake</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Customer Create Modal */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCustomerCreated={(newCust) => {
          fetchCustomers();
          onSelectCustomer(newCust.id);
        }}
        onSelectExisting={(existingId) => {
          setIsModalOpen(false);
          onSelectCustomer(existingId);
        }}
        initialPhone={search}
      />
    </div>
  );
};
