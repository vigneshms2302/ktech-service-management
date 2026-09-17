import React, { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  User,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import type { ServiceJobSummary, TechnicianDashboardMetrics, EquipmentType } from '../../types/index.ts';

interface TechnicianWorkspaceProps {
  onOpenJob: (jobId: string) => void;
}

const EQUIPMENT_TYPES: EquipmentType[] = [
  'LAPTOP',
  'DESKTOP',
  'CUSTOM_PC',
  'MONITOR',
  'PRINTER',
  'PLAYSTATION',
  'XBOX',
  'GAMING_CONSOLE',
  'HDD',
  'SSD',
  'M_2',
  'PEN_DRIVE',
  'SMPS',
  'POWER_SUPPLY',
  'EV_CHARGER',
  'ADAPTER',
  'MOTHERBOARD',
  'OTHER',
];

export const TechnicianWorkspace: React.FC<TechnicianWorkspaceProps> = ({ onOpenJob }) => {
  const { currentUser } = useAuth();
  const [jobs, setJobs] = useState<ServiceJobSummary[]>([]);
  const [metrics, setMetrics] = useState<TechnicianDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active filter states
  const [activeBucket, setActiveBucket] = useState<string>(
    currentUser?.roleId === 'ROLE_TECHNICIAN' ? 'ASSIGNED_TO_ME' : 'ALL_ACTIVE'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState('ALL');

  const fetchWorkspaceData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch Metrics
      if (window.electronAPI?.jobs?.getTechnicianMetrics) {
        const metRes = await window.electronAPI.jobs.getTechnicianMetrics();
        if (metRes.success && metRes.data) {
          setMetrics(metRes.data);
        }
      }

      // 2. Fetch Filtered Jobs
      let statusParam: string | undefined = undefined;
      let techParam: string | undefined = undefined;

      if (activeBucket === 'ASSIGNED_TO_ME') {
        techParam = currentUser?.id;
      } else if (activeBucket === 'WAITING_FOR_INSPECTION') {
        statusParam = 'WAITING_FOR_INSPECTION';
      } else if (activeBucket === 'UNDER_INSPECTION') {
        statusParam = 'UNDER_INSPECTION';
      } else if (activeBucket === 'DIAGNOSIS_COMPLETED') {
        statusParam = 'DIAGNOSIS_COMPLETED';
      } else if (activeBucket === 'UNDER_REPAIR') {
        statusParam = 'UNDER_REPAIR';
      } else if (activeBucket === 'WAITING_FOR_PARTS') {
        statusParam = 'WAITING_FOR_PARTS';
      } else if (activeBucket === 'REPAIR_COMPLETED') {
        statusParam = 'REPAIR_COMPLETED';
      } else if (activeBucket === 'UNREPAIRABLE') {
        statusParam = 'UNREPAIRABLE';
      }

      const res = await window.electronAPI?.jobs?.list({
        status: statusParam,
        technicianId: techParam,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
        equipmentType: equipmentTypeFilter !== 'ALL' ? equipmentTypeFilter : undefined,
        search: searchQuery.trim() || undefined,
        limit: 100,
      });

      if (res?.success && res.data) {
        setJobs(res.data.jobs);
      } else {
        setError(res?.error || 'Failed to load technician jobs');
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [activeBucket, priorityFilter, equipmentTypeFilter, searchQuery, currentUser?.id]);

  useEffect(() => {
    fetchWorkspaceData();
  }, [fetchWorkspaceData]);

  const handleClaimJob = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    if (!currentUser) return;
    try {
      const res = await window.electronAPI?.jobs?.assignTechnician({
        jobId,
        technicianId: currentUser.id,
      });
      if (res?.success) {
        fetchWorkspaceData();
      } else {
        alert(res?.error || 'Failed to claim ticket');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'RECEIVED':
      case 'WAITING_FOR_INSPECTION':
        return { bg: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: 'rgba(234, 179, 8, 0.3)' };
      case 'UNDER_INSPECTION':
        return { bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
      case 'DIAGNOSIS_COMPLETED':
        return { bg: 'var(--color-purple-bg)', color: 'var(--color-purple)', border: 'var(--color-purple-border)' };
      case 'UNDER_REPAIR':
        return { bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: 'rgba(34, 197, 94, 0.3)' };
      case 'WAITING_FOR_PARTS':
        return { bg: 'rgba(249, 115, 22, 0.15)', color: '#fb923c', border: 'rgba(249, 115, 22, 0.3)' };
      case 'REPAIR_COMPLETED':
      case 'READY_FOR_DELIVERY':
      case 'DELIVERED':
        return { bg: 'rgba(34, 197, 94, 0.25)', color: '#86efac', border: 'rgba(34, 197, 94, 0.5)' };
      case 'UNREPAIRABLE':
      case 'CANCELLED':
        return { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
      default:
        return { bg: 'var(--bg-surface)', color: 'var(--text-muted)', border: 'var(--border-color)' };
    }
  };

  const getPriorityBadgeStyle = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return { bg: '#ef4444', color: '#ffffff' };
      case 'URGENT':
        return { bg: '#f97316', color: '#ffffff' };
      case 'LOW':
        return { bg: '#64748b', color: '#ffffff' };
      default:
        return { bg: 'var(--brand-primary)', color: '#ffffff' };
    }
  };

  const metricTabs = [
    {
      id: 'ASSIGNED_TO_ME',
      label: 'Assigned to Me',
      count: metrics?.assignedToMe || 0,
      icon: User,
      color: 'var(--brand-primary)',
    },
    {
      id: 'WAITING_FOR_INSPECTION',
      label: 'Waiting Inspection',
      count: metrics?.waitingInspection || 0,
      icon: Clock,
      color: '#facc15',
    },
    {
      id: 'UNDER_INSPECTION',
      label: 'Under Inspection',
      count: metrics?.underInspection || 0,
      icon: Search,
      color: '#38bdf8',
    },
    {
      id: 'DIAGNOSIS_COMPLETED',
      label: 'Diagnosis Done',
      count: metrics?.diagnosisCompleted || 0,
      icon: Cpu,
      color: 'var(--color-purple)',
    },
    {
      id: 'UNDER_REPAIR',
      label: 'Under Repair',
      count: metrics?.underRepair || 0,
      icon: Wrench,
      color: '#4ade80',
    },
    {
      id: 'WAITING_FOR_PARTS',
      label: 'Waiting for Parts',
      count: metrics?.waitingParts || 0,
      icon: Layers,
      color: '#fb923c',
    },
    {
      id: 'REPAIR_COMPLETED',
      label: 'Repair Completed',
      count: metrics?.repairCompleted || 0,
      icon: CheckCircle2,
      color: '#86efac',
    },
    {
      id: 'UNREPAIRABLE',
      label: 'Unrepairable',
      count: metrics?.unrepairable || 0,
      icon: AlertTriangle,
      color: '#f87171',
    },
    {
      id: 'ALL_ACTIVE',
      label: 'All Active Jobs',
      count: metrics?.totalActive || 0,
      icon: SlidersHorizontal,
      color: 'var(--text-main)',
    },
  ];

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto' }}>
      {/* Workspace Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-primary)',
            }}
          >
            <Wrench size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Technician Workstation
            </h1>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Inspection, diagnostic triage, hardware repair log & parts workbench
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={fetchWorkspaceData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              color: 'var(--brand-primary)',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <User size={14} />
            {currentUser?.fullName || 'Technician'} ({currentUser?.roleName})
          </div>
        </div>
      </div>

      {/* Metric Filter Tabs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '8px',
        }}
      >
        {metricTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeBucket === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveBucket(tab.id)}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: isActive ? `1.5px solid ${tab.color}` : '1px solid var(--border-color)',
                backgroundColor: isActive ? 'var(--bg-surface)' : 'var(--bg-card)',
                color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Icon size={14} color={tab.color} />
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: tab.color,
                  }}
                >
                  {tab.count}
                </span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: isActive ? 600 : 500 }}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: '1 1 250px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder="Search job ID, customer, serial, brand or complaint..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px 8px 32px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: '12px',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={14} style={{ color: 'var(--text-dim)' }} />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: '12px',
            }}
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical Priority</option>
            <option value="URGENT">Urgent Priority</option>
            <option value="NORMAL">Normal Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          <select
            value={equipmentTypeFilter}
            onChange={(e) => setEquipmentTypeFilter(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: '12px',
            }}
          >
            <option value="ALL">All Equipment Types</option>
            {EQUIPMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {/* Jobs Workstation List */}
      <div style={{ flex: 1, minHeight: '300px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            Loading technician workstation tickets...
          </div>
        ) : jobs.length === 0 ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-card)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <CheckCircle2 size={36} color="var(--color-success)" style={{ opacity: 0.7 }} />
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>
              No service jobs found in this view
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '400px' }}>
              All tickets in this category are completed or currently assigned to other workflows.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {jobs.map((job) => {
              const statusStyle = getStatusBadgeStyle(job.currentStatus);
              const priorityStyle = getPriorityBadgeStyle(job.priority);
              const isAssignedToCurrent = job.assignedTechnicianId === currentUser?.id;

              return (
                <div
                  key={job.id}
                  onClick={() => onOpenJob(job.id)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                    e.currentTarget.style.borderColor = 'var(--brand-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                  }}
                >
                  {/* Top Row: Job ID, Badges, Dates, Quick Action */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>
                        {job.jobNumber}
                      </span>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                          backgroundColor: priorityStyle.bg,
                          color: priorityStyle.color,
                        }}
                      >
                        {job.priority}
                      </span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.color,
                          border: `1px solid ${statusStyle.border}`,
                        }}
                      >
                        {job.currentStatus.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        {new Date(job.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>

                      {!job.assignedTechnicianId && currentUser?.roleId === 'ROLE_TECHNICIAN' && (
                        <button
                          onClick={(e) => handleClaimJob(e, job.id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--brand-primary)',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Claim Ticket
                        </button>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--brand-primary)',
                        }}
                      >
                        Workstation <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: Device Info & Customer Info */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Equipment / Hardware
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                        <span style={{ color: 'var(--brand-primary)' }}>[{job.equipmentType}]</span> {job.deviceBrand} {job.deviceModel}
                      </div>
                      {job.deviceSerial && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          S/N: {job.deviceSerial}
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Customer Contact
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                        {job.customerName}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Phone: {job.customerPhone}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Technician Assigned
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: isAssignedToCurrent ? 'var(--color-success)' : 'var(--text-main)', marginTop: '2px' }}>
                        {job.technicianName ? (
                          <span>
                            {job.technicianName} {isAssignedToCurrent && '(You)'}
                          </span>
                        ) : (
                          <span style={{ color: '#facc15' }}>Unassigned Queue</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Customer Reported Complaint */}
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-surface)',
                      borderLeft: '3px solid var(--brand-primary)',
                      fontSize: '12px',
                      color: 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontWeight: 700, color: 'var(--brand-primary)', fontSize: '11px', textTransform: 'uppercase' }}>
                      Customer Complaint:
                    </span>
                    <span style={{ color: 'var(--text-main)' }}>{job.reportedIssue}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
