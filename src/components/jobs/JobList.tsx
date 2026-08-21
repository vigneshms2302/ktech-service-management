import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Search,
  Plus,
  Filter,
  RefreshCw,
} from 'lucide-react';
import type { ServiceJobSummary } from '../../types/index.ts';
import { formatPhoneDisplay } from '../../utils/phone.ts';

interface JobListProps {
  onSelectJob: (jobId: string) => void;
  onNewJob: () => void;
}

export const JobList: React.FC<JobListProps> = ({ onSelectJob, onNewJob }) => {
  const [jobs, setJobs] = useState<ServiceJobSummary[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);

  const fetchJobs = async (searchQuery = search, status = statusFilter, priority = priorityFilter) => {
    setIsLoading(true);
    try {
      if (window.electronAPI?.jobs?.list) {
        const res = await window.electronAPI.jobs.list({
          search: searchQuery,
          status,
          priority,
          limit: 100,
        });
        if (res.success && res.data) {
          setJobs(res.data.jobs);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [statusFilter, priorityFilter]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    fetchJobs(val, statusFilter, priorityFilter);
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'RECEIVED': return 'badge-info';
      case 'WAITING_FOR_INSPECTION': return 'badge-warning';
      case 'UNDER_INSPECTION': return 'badge-warning';
      case 'DIAGNOSIS_COMPLETED': return 'badge-info';
      case 'REPAIR_COMPLETED':
      case 'DELIVERED': return 'badge-success';
      case 'UNREPAIRABLE':
      case 'CANCELLED': return 'badge-danger';
      default: return 'badge-info';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: '20px' }}>
      {/* Header */}
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
            <Wrench size={20} color="var(--brand-primary)" />
            <span>Service Jobs Management</span>
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Live intake queue, inspection status, priority tracking, and repair dispatch
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => fetchJobs(search, statusFilter, priorityFilter)}
            disabled={isLoading}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={onNewJob}
          >
            <Plus size={14} />
            <span>New Service Job (Intake)</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '6px 12px',
            minWidth: '320px',
          }}
        >
          <Search size={14} color="var(--text-dim)" />
          <input
            type="text"
            className="input-field"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search Job ID, customer, phone, serial #..."
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

        {/* Status Filter Pills */}
        <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-surface)', padding: '3px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          {['ALL', 'RECEIVED', 'WAITING_FOR_INSPECTION', 'UNDER_INSPECTION'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: statusFilter === st ? 'var(--brand-primary)' : 'transparent',
                color: statusFilter === st ? '#ffffff' : 'var(--text-muted)',
                fontSize: '11px',
                fontWeight: statusFilter === st ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Priority Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <Filter size={12} />
          <span>Priority:</span>
          <select
            className="input-field"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ padding: '4px 8px', fontSize: '11px', width: 'auto' }}
          >
            <option value="ALL">All Priorities</option>
            <option value="NORMAL">Normal</option>
            <option value="URGENT">Urgent</option>
            <option value="CRITICAL">Critical</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
        <table className="ktech-table">
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Customer</th>
              <th>Equipment / Device</th>
              <th>Category</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Reported Complaint</th>
              <th>Assigned Technician</th>
              <th>Created Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                  {isLoading ? 'Loading service jobs...' : 'No service jobs matching the selected criteria.'}
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr
                  key={job.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectJob(job.id)}
                >
                  <td>
                    <strong style={{ color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
                      {job.jobNumber}
                    </strong>
                  </td>
                  <td>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{job.customerName}</span>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{formatPhoneDisplay(job.customerPhone)}</div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-info" style={{ fontSize: '9px', marginRight: '4px' }}>
                      {job.equipmentType}
                    </span>
                    <span>{job.deviceBrand} {job.deviceModel}</span>
                    {job.deviceSerial && (
                      <span style={{ fontSize: '10px', color: 'var(--text-dim)', marginLeft: '4px', fontFamily: 'var(--font-mono)' }}>
                        ({job.deviceSerial})
                      </span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{job.serviceCategory}</span>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(job.currentStatus)}`}>
                      {job.currentStatus}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${job.priority === 'URGENT' || job.priority === 'CRITICAL' ? 'badge-danger' : 'badge-info'}`}>
                      {job.priority}
                    </span>
                  </td>
                  <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {job.reportedIssue}
                  </td>
                  <td>
                    {job.technicianName || <span style={{ color: 'var(--text-dim)' }}>Unassigned Pool</span>}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(job.createdAt).toLocaleDateString()}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => onSelectJob(job.id)}
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                    >
                      Open Detail
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
