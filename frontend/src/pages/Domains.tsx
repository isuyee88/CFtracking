import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Edit3,
  Globe,
  Loader2,
  Network,
  Plus,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { EntityForm, type FormField } from '../components/EntityForm';
import { VirtualTableEnhanced, type VirtualTableColumn } from '../components/VirtualTableEnhanced';
import { createDomain, deleteDomain, fetchCampaigns, fetchDomains, fetchLandings, updateDomain } from '../services/api';
import { useToast } from '../components/Toast';
import type { Domain } from '../types/domain';
import { readBootstrapPage } from '../services/bootstrap';
import { FIELD_MAX_LENGTH, DISPLAY_MAX_LENGTH } from '../constants/fieldConstraints';
import { truncateLabel } from '../utils/text';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function buildDomainFields(
  campaigns: Array<{ id: string; name: string }>,
  landings: Array<{ id: string; name: string }>
): FormField[] {
  return [
  {
    name: 'hostname',
    label: 'Hostname',
    type: 'text',
    required: true,
    placeholder: 'trk.example.com',
    maxLength: FIELD_MAX_LENGTH.HOSTNAME,
    validation: (value) => {
      const hostname = String(value || '').trim();
      return /^(?:\*\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(hostname) ? null : 'Please enter a valid hostname';
    },
  },
  {
    name: 'usage',
    label: 'Usage',
    type: 'select',
    required: true,
    options: [
      { value: 'tracking', label: 'Tracking Domain' },
      { value: 'landing', label: 'Landing Hosting' },
      { value: 'admin', label: 'Admin Access' },
      { value: 'mixed', label: 'Mixed Use' },
    ],
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: [
      { value: 'pending', label: 'Pending Verification' },
      { value: 'active', label: 'Active' },
      { value: 'paused', label: 'Paused' },
      { value: 'error', label: 'Error' },
    ],
  },
  {
    name: 'sslStatus',
    label: 'SSL Mode',
    type: 'select',
    required: true,
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'auto', label: 'Auto Managed' },
      { value: 'custom', label: 'Custom Certificate' },
      { value: 'disabled', label: 'Disabled' },
    ],
  },
  {
    name: 'dnsProvider',
    label: 'DNS Provider',
    type: 'select',
    required: true,
    options: [
      { value: 'cloudflare', label: 'Cloudflare' },
      { value: 'route53', label: 'Route53' },
      { value: 'godaddy', label: 'GoDaddy' },
      { value: 'namecheap', label: 'Namecheap' },
      { value: 'manual', label: 'Manual DNS' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    name: 'registrar',
    label: 'Registrar',
    type: 'text',
    placeholder: 'Cloudflare Registrar',
    maxLength: FIELD_MAX_LENGTH.REGISTRAR,
  },
  {
    name: 'cloudflareZoneId',
    label: 'Cloudflare Zone ID',
    type: 'text',
    placeholder: 'Optional zone id',
    maxLength: FIELD_MAX_LENGTH.CLOUDFLARE_ZONE_ID,
  },
  {
    name: 'cloudflareProxyEnabled',
    label: 'Cloudflare Proxy',
    type: 'checkbox',
    description: 'Traffic goes through Cloudflare proxy and SSL automation.',
  },
  {
    name: 'defaultCampaignId',
    label: 'Default Campaign',
    type: 'select',
    optionLabelMaxLength: DISPLAY_MAX_LENGTH.SELECT_OPTION_LABEL,
    options: campaigns.map((campaign) => ({
      value: campaign.id,
      label: `${campaign.name} (${campaign.id})`,
    })),
  },
  {
    name: 'defaultLandingPageId',
    label: 'Default Landing',
    type: 'select',
    optionLabelMaxLength: DISPLAY_MAX_LENGTH.SELECT_OPTION_LABEL,
    options: landings.map((landing) => ({
      value: landing.id,
      label: `${landing.name} (${landing.id})`,
    })),
  },
  {
    name: 'notes',
    label: 'Notes',
    type: 'textarea',
    placeholder: 'DNS handover steps, SSL plan, access notes...',
    maxLength: FIELD_MAX_LENGTH.NOTES,
  },
];
}

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

function getStatusTone(status: Domain['status']) {
  switch (status) {
    case 'active':
      return 'bg-secondary-container/50 text-secondary';
    case 'error':
      return 'bg-error/10 text-error';
    case 'paused':
      return 'bg-warning/10 text-warning';
    default:
      return 'bg-surface-container text-on-surface-variant';
  }
}

function getStatusIcon(status: Domain['status']) {
  switch (status) {
    case 'active':
      return CheckCircle2;
    case 'error':
      return XCircle;
    case 'paused':
      return AlertCircle;
    default:
      return ShieldCheck;
  }
}

export default function Domains() {
  const toast = useToast();
  const bootstrap = readBootstrapPage<{
    domains?: Domain[];
    campaigns?: Array<{ id: string; displayId?: string; name: string }>;
    landings?: Array<{ id: string; displayId?: string; name: string }>;
  }>('domains');
  const hasBootstrap = Boolean(bootstrap);
  const [domains, setDomains] = useState<Domain[]>(Array.isArray(bootstrap?.data?.domains) ? bootstrap.data.domains : []);
  const [campaignOptions, setCampaignOptions] = useState<Array<{ id: string; name: string }>>(
    Array.isArray(bootstrap?.data?.campaigns)
      ? bootstrap.data.campaigns.map((campaign: any) => ({
          id: String(campaign.displayId || campaign.id),
          name: String(campaign.name || campaign.id),
        }))
      : []
  );
  const [landingOptions, setLandingOptions] = useState<Array<{ id: string; name: string }>>(
    Array.isArray(bootstrap?.data?.landings)
      ? bootstrap.data.landings.map((landing: any) => ({
          id: String(landing.displayId || landing.id),
          name: String(landing.name || landing.id),
        }))
      : []
  );
  const [loading, setLoading] = useState(!hasBootstrap);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | Domain['status']>('All');
  const [usageFilter, setUsageFilter] = useState<'All' | Domain['usage']>('All');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState<'activate' | 'pause' | 'delete' | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedDomain, setSelectedDomain] = useState<Partial<Domain> | undefined>(undefined);

  const loadDomains = async () => {
    try {
      if (!hasBootstrap && domains.length === 0) {
        setLoading(true);
      }
      setError(null);
      const [domainsData, campaignsData, landingsData] = await Promise.all([
        fetchDomains(),
        fetchCampaigns().catch(() => []),
        fetchLandings(false).catch(() => []),
      ]);

      setDomains(Array.isArray(domainsData) ? domainsData : []);
      setCampaignOptions(
        Array.isArray(campaignsData)
          ? campaignsData.map((campaign: any) => ({
              id: String(campaign.displayId || campaign.id),
              name: String(campaign.name || campaign.id),
            }))
          : []
      );
      setLandingOptions(
        Array.isArray(landingsData)
          ? landingsData.map((landing: any) => ({
              id: String(landing.displayId || landing.id),
              name: String(landing.name || landing.id),
            }))
          : []
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load domains');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDomains();
  }, []);

  const filteredDomains = useMemo(() => {
    return domains.filter((domain) => {
      const matchesSearch =
        !searchTerm ||
        [domain.hostname, domain.registrar, domain.dnsProvider, domain.defaultCampaignId]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'All' || domain.status === statusFilter;
      const matchesUsage = usageFilter === 'All' || domain.usage === usageFilter;
      return matchesSearch && matchesStatus && matchesUsage;
    });
  }, [domains, searchTerm, statusFilter, usageFilter]);

  const domainFields = useMemo(() => buildDomainFields(campaignOptions, landingOptions), [campaignOptions, landingOptions]);

  const governanceIssues = useMemo(() => {
    return domains.flatMap((domain) => {
      const issues: Array<{ id: string; domainId: string; tone: 'error' | 'warning'; title: string; detail: string }> = [];

      if ((domain.usage === 'tracking' || domain.usage === 'mixed') && !domain.defaultCampaignId) {
        issues.push({
          id: `${domain.id}-campaign`,
          domainId: domain.id,
          tone: 'warning',
          title: `${domain.hostname} has no default campaign`,
          detail: 'Tracking and mixed domains should map a default campaign for fallback continuity.',
        });
      }

      if ((domain.usage === 'landing' || domain.usage === 'mixed') && !domain.defaultLandingPageId) {
        issues.push({
          id: `${domain.id}-landing`,
          domainId: domain.id,
          tone: 'warning',
          title: `${domain.hostname} has no default landing`,
          detail: 'Landing and mixed domains should map a default landing page for index behavior.',
        });
      }

      if (domain.dnsProvider === 'cloudflare' && domain.cloudflareProxyEnabled && !domain.cloudflareZoneId) {
        issues.push({
          id: `${domain.id}-zone`,
          domainId: domain.id,
          tone: 'error',
          title: `${domain.hostname} is proxied without a zone id`,
          detail: 'Cloudflare-managed domains should record the zone identifier for automation and governance.',
        });
      }

      if (domain.status === 'active' && (domain.sslStatus === 'pending' || domain.sslStatus === 'disabled')) {
        issues.push({
          id: `${domain.id}-ssl`,
          domainId: domain.id,
          tone: 'error',
          title: `${domain.hostname} is active without healthy SSL`,
          detail: 'Active domains should not remain pending or disabled on SSL.',
        });
      }

      if (domain.usage === 'admin' && !domain.cloudflareProxyEnabled) {
        issues.push({
          id: `${domain.id}-admin-proxy`,
          domainId: domain.id,
          tone: 'warning',
          title: `${domain.hostname} is an admin domain without proxy`,
          detail: 'Admin access domains should usually sit behind Cloudflare proxy / access controls before production.',
        });
      }

      return issues;
    });
  }, [domains]);

  const usageBreakdown = useMemo(() => {
    return {
      tracking: domains.filter((domain) => domain.usage === 'tracking').length,
      landing: domains.filter((domain) => domain.usage === 'landing').length,
      admin: domains.filter((domain) => domain.usage === 'admin').length,
      mixed: domains.filter((domain) => domain.usage === 'mixed').length,
    };
  }, [domains]);

  const handleCreate = () => {
    setFormMode('create');
    setSelectedDomain(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (domain: Domain) => {
    setFormMode('edit');
    setSelectedDomain(domain);
    setIsFormOpen(true);
  };

  const handleFixIssue = (domainId: string) => {
    const target = domains.find((domain) => domain.id === domainId);
    if (!target) {
      toast.warning('Domain not found', 'The selected domain is no longer available.');
      return;
    }

    setSearchTerm(target.hostname);
    setStatusFilter('All');
    setUsageFilter('All');
    handleEdit(target);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this domain record?')) return;
    try {
      await deleteDomain(id);
      setDomains((current) => current.filter((domain) => domain.id !== id));
      toast.success('Domain deleted', 'Domain inventory has been updated.');
    } catch (err) {
      toast.error('Delete failed', err instanceof Error ? err.message : 'Unable to delete domain');
    }
  };

  const handleBulkStatusUpdate = async (nextStatus: Domain['status']) => {
    const ids = Array.from(selectedRows);
    if (ids.length === 0) {
      toast.warning('No domains selected', 'Select at least one domain to update.');
      return;
    }

    setBulkActionLoading(nextStatus === 'active' ? 'activate' : 'pause');
    try {
      await Promise.all(
        ids.map((id) => {
          const target = domains.find((domain) => domain.id === id);
          if (!target) {
            return Promise.resolve(null);
          }
          return updateDomain(id, { ...target, status: nextStatus });
        })
      );
      setDomains((current) =>
        current.map((domain) => (selectedRows.has(domain.id) ? { ...domain, status: nextStatus } : domain))
      );
      setSelectedRows(new Set());
      toast.success('Domains updated', `${ids.length} domains set to ${nextStatus}.`);
    } catch (err) {
      toast.error('Bulk update failed', err instanceof Error ? err.message : 'Unable to update selected domains');
    } finally {
      setBulkActionLoading(null);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedRows);
    if (ids.length === 0) {
      toast.warning('No domains selected', 'Select at least one domain to delete.');
      return;
    }
    if (!confirm(`Delete ${ids.length} selected domains?`)) {
      return;
    }

    setBulkActionLoading('delete');
    try {
      await Promise.all(ids.map((id) => deleteDomain(id)));
      setDomains((current) => current.filter((domain) => !selectedRows.has(domain.id)));
      setSelectedRows(new Set());
      toast.success('Domains deleted', `${ids.length} domains removed from inventory.`);
    } catch (err) {
      toast.error('Bulk delete failed', err instanceof Error ? err.message : 'Unable to delete selected domains');
    } finally {
      setBulkActionLoading(null);
    }
  };

  const handleSubmit = async (formData: Record<string, any>) => {
    try {
      if (formMode === 'create') {
        const created = await createDomain(formData);
        setDomains((current) => [created, ...current]);
        toast.success('Domain added', `Domain ${created.hostname} is now tracked.`);
      } else if (selectedDomain?.id) {
        const updated = await updateDomain(selectedDomain.id, formData);
        setDomains((current) => current.map((domain) => (domain.id === selectedDomain.id ? updated : domain)));
        toast.success('Domain updated', `Domain ${updated.hostname} has been updated.`);
      }
      setIsFormOpen(false);
    } catch (err) {
      toast.error('Save failed', err instanceof Error ? err.message : 'Unable to save domain');
    }
  };

  const columns = useMemo<VirtualTableColumn<Domain>[]>(
    () => [
      {
        key: 'hostname',
        title: 'Hostname',
        width: 240,
        render: (_, domain) => (
          <div className="min-w-0">
            <div className="font-medium text-fg-default truncate">{domain.hostname}</div>
            <div className="text-xs text-fg-muted">{domain.displayId || domain.id}</div>
          </div>
        ),
      },
      {
        key: 'usage',
        title: 'Usage',
        width: 140,
        render: (_, domain) => <span className="uppercase text-xs tracking-widest text-fg-muted">{domain.usage}</span>,
      },
      {
        key: 'status',
        title: 'Status',
        width: 150,
        render: (_, domain) => {
          const Icon = getStatusIcon(domain.status);
          return (
            <span className={cn('inline-flex items-center gap-2 px-3 py-1 rounded-sm text-xs font-semibold', getStatusTone(domain.status))}>
              <Icon size={14} />
              {domain.status}
            </span>
          );
        },
      },
      {
        key: 'sslStatus',
        title: 'SSL',
        width: 140,
        render: (_, domain) => <span className="text-sm text-fg-default">{domain.sslStatus}</span>,
      },
      {
        key: 'dnsProvider',
        title: 'DNS / Registrar',
        width: 220,
        render: (_, domain) => (
          <div className="min-w-0">
            <div className="text-sm text-fg-default">{domain.dnsProvider}</div>
            <div className="text-xs text-fg-muted truncate">{domain.registrar || 'Registrar not set'}</div>
          </div>
        ),
      },
      {
        key: 'mapping',
        title: 'Default Mapping',
        width: 210,
        render: (_, domain) => (
          <div className="text-sm text-fg-default min-w-0">
            <div className="truncate" title={domain.defaultCampaignId || 'No default campaign'}>
              {truncateLabel(domain.defaultCampaignId || 'No default campaign', DISPLAY_MAX_LENGTH.TABLE_PRIMARY_TEXT)}
            </div>
            <div className="text-xs text-fg-muted truncate" title={domain.defaultLandingPageId || 'No default landing'}>
              {truncateLabel(domain.defaultLandingPageId || 'No default landing', DISPLAY_MAX_LENGTH.TABLE_SECONDARY_TEXT)}
            </div>
          </div>
        ),
      },
      {
        key: 'campaignCount',
        title: 'Campaigns',
        width: 110,
        align: 'right',
        render: (_, domain) => <span className="font-medium text-fg-default">{domain.campaignCount || 0}</span>,
      },
      {
        key: 'updatedAt',
        title: 'Updated',
        width: 180,
        render: (_, domain) => <span className="text-sm text-fg-muted">{formatDate(domain.updatedAt)}</span>,
      },
      {
        key: 'actions',
        title: 'Actions',
        width: 160,
        render: (_, domain) => (
          <div className="flex items-center gap-2">
            <button
              onClick={(event) => {
                event.stopPropagation();
                void navigator.clipboard.writeText(domain.hostname);
                toast.success('Hostname copied', domain.hostname);
              }}
              className="p-2 rounded-sm text-fg-muted hover:text-fg-default hover:bg-surface-container"
              aria-label={`Copy ${domain.hostname}`}
            >
              <Copy size={16} />
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                handleEdit(domain);
              }}
              className="p-2 rounded-sm text-fg-muted hover:text-fg-default hover:bg-surface-container"
              aria-label={`Edit ${domain.hostname}`}
            >
              <Edit3 size={16} />
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                void handleDelete(domain.id);
              }}
              className="p-2 rounded-sm text-error hover:bg-error/10"
              aria-label={`Delete ${domain.hostname}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ),
      },
    ],
    [toast]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-secondary-container">
              <Globe size={20} className="text-secondary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-primary">Domains</h1>
              <p className="text-sm text-on-surface-variant">
                Inventory tracking, landing, and admin domains with SSL and DNS metadata.
              </p>
            </div>
          </div>
          <div className="rounded-sm border border-outline-variant/30 bg-surface-container-low p-4 text-sm text-on-surface-variant">
            This module is the foundation for domain lifecycle management, campaign entry mapping, and Cloudflare proxy visibility.
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="btn-create inline-flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest rounded-sm"
        >
          <Plus size={18} />
          Add Domain
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-sm bg-surface-container-lowest p-4 whisper-shadow">
          <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Managed</div>
          <div className="mt-2 text-3xl font-display font-bold text-primary">{domains.length}</div>
        </div>
        <div className="rounded-sm bg-surface-container-lowest p-4 whisper-shadow">
          <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Active</div>
          <div className="mt-2 text-3xl font-display font-bold text-secondary">
            {domains.filter((domain) => domain.status === 'active').length}
          </div>
        </div>
        <div className="rounded-sm bg-surface-container-lowest p-4 whisper-shadow">
          <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Pending SSL</div>
          <div className="mt-2 text-3xl font-display font-bold text-warning">
            {domains.filter((domain) => domain.sslStatus === 'pending').length}
          </div>
        </div>
        <div className="rounded-sm bg-surface-container-lowest p-4 whisper-shadow">
          <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Cloudflare Proxied</div>
          <div className="mt-2 text-3xl font-display font-bold text-primary">
            {domains.filter((domain) => domain.cloudflareProxyEnabled).length}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr),minmax(360px,1fr)]">
        <div className="rounded-sm bg-surface-container-lowest p-5 whisper-shadow">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
              <Network size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Domain Governance</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Surface SSL, Cloudflare, and fallback mapping gaps before they impact routing continuity.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <GovernanceMetric label="Tracking" value={String(usageBreakdown.tracking)} />
            <GovernanceMetric label="Landing" value={String(usageBreakdown.landing)} />
            <GovernanceMetric label="Admin" value={String(usageBreakdown.admin)} />
            <GovernanceMetric label="Mixed" value={String(usageBreakdown.mixed)} />
          </div>

          <div className="mt-5 space-y-3">
            {governanceIssues.length === 0 ? (
              <div className="rounded-sm border border-secondary/20 bg-secondary-container/20 p-4 text-sm text-secondary">
                No obvious domain governance gaps detected in the current inventory.
              </div>
            ) : (
              governanceIssues.slice(0, 6).map((issue) => (
                <div
                  key={issue.id}
                  className={cn(
                    'rounded-sm border p-4',
                    issue.tone === 'error'
                      ? 'border-error/20 bg-error/10'
                      : 'border-warning/20 bg-warning/10'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className={cn('text-sm font-semibold', issue.tone === 'error' ? 'text-error' : 'text-warning')}>
                      {issue.title}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFixIssue(issue.domainId)}
                      className="rounded-sm border border-outline-variant/30 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-on-surface hover:bg-surface-container"
                    >
                      Fix now
                    </button>
                  </div>
                  <div className="mt-1 text-sm text-on-surface-variant">{issue.detail}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-sm bg-surface-container-lowest p-5 whisper-shadow">
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Readiness Snapshot</h2>
          <div className="mt-4 space-y-3 text-sm">
            <ReadinessRow
              label="Cloudflare Zones"
              value={`${domains.filter((domain) => Boolean(domain.cloudflareZoneId)).length}/${domains.length || 0}`}
            />
            <ReadinessRow
              label="Default Campaigns"
              value={`${domains.filter((domain) => Boolean(domain.defaultCampaignId)).length}/${domains.length || 0}`}
            />
            <ReadinessRow
              label="Default Landings"
              value={`${domains.filter((domain) => Boolean(domain.defaultLandingPageId)).length}/${domains.length || 0}`}
            />
            <ReadinessRow
              label="Proxy Enabled"
              value={`${domains.filter((domain) => domain.cloudflareProxyEnabled).length}/${domains.length || 0}`}
            />
            <ReadinessRow
              label="Healthy SSL"
              value={`${domains.filter((domain) => domain.sslStatus === 'auto' || domain.sslStatus === 'custom').length}/${domains.length || 0}`}
            />
          </div>
          <div className="mt-5 rounded-sm bg-surface p-4 text-sm text-on-surface-variant">
            Keitaro-style domain management is no longer just a CRUD list here. This view now tracks fallback mappings, SSL posture, and Cloudflare governance signals in one place.
          </div>
        </div>
      </div>

      <div className="rounded-sm bg-surface-container-lowest p-5 whisper-shadow space-y-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr),180px,180px]">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search hostname, registrar, DNS provider..."
            className="w-full rounded-sm border border-outline-variant bg-surface px-4 py-3 text-sm outline-none transition-all focus:border-primary"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="rounded-sm border border-outline-variant bg-surface px-4 py-3 text-sm outline-none transition-all focus:border-primary"
          >
            <option value="All">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="paused">Paused</option>
            <option value="error">Error</option>
          </select>
          <select
            value={usageFilter}
            onChange={(event) => setUsageFilter(event.target.value as typeof usageFilter)}
            className="rounded-sm border border-outline-variant bg-surface px-4 py-3 text-sm outline-none transition-all focus:border-primary"
          >
            <option value="All">All usage</option>
            <option value="tracking">Tracking</option>
            <option value="landing">Landing</option>
            <option value="admin">Admin</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>

        {selectedRows.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-sm border border-outline-variant/20 bg-surface p-3">
            <span className="text-sm text-on-surface-variant">{selectedRows.size} selected</span>
            <button
              type="button"
              onClick={() => void handleBulkStatusUpdate('active')}
              disabled={bulkActionLoading !== null}
              className="rounded-sm border border-secondary/30 px-3 py-1 text-xs font-bold uppercase tracking-widest text-secondary disabled:opacity-50"
            >
              {bulkActionLoading === 'activate' ? 'Activating...' : 'Activate'}
            </button>
            <button
              type="button"
              onClick={() => void handleBulkStatusUpdate('paused')}
              disabled={bulkActionLoading !== null}
              className="rounded-sm border border-warning/30 px-3 py-1 text-xs font-bold uppercase tracking-widest text-warning disabled:opacity-50"
            >
              {bulkActionLoading === 'pause' ? 'Pausing...' : 'Pause'}
            </button>
            <button
              type="button"
              onClick={() => void handleBulkDelete()}
              disabled={bulkActionLoading !== null}
              className="rounded-sm border border-error/30 px-3 py-1 text-xs font-bold uppercase tracking-widest text-error disabled:opacity-50"
            >
              {bulkActionLoading === 'delete' ? 'Deleting...' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedRows(new Set())}
              disabled={bulkActionLoading !== null}
              className="ml-auto rounded-sm border border-outline-variant/30 px-3 py-1 text-xs font-bold uppercase tracking-widest text-on-surface-variant disabled:opacity-50"
            >
              Clear Selection
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-sm border border-error/20 bg-error/10 p-4 text-sm text-error">{error}</div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12 text-on-surface-variant">
            <Loader2 size={24} className="animate-spin mr-3" />
            Loading domains...
          </div>
        ) : (
          <VirtualTableEnhanced
            tableId="domains-table"
            columns={columns}
            data={filteredDomains}
            height={520}
            selectable
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            getRowId={(row) => row.id}
            onRowClick={(row) => handleEdit(row)}
            emptyMessage="No domains found"
          />
        )}
      </div>

      <EntityForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
        title="Domain"
        fields={domainFields}
        initialData={selectedDomain}
        mode={formMode}
      />
    </div>
  );
}

function GovernanceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm bg-surface p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</div>
      <div className="mt-2 text-2xl font-display font-bold text-primary">{value}</div>
    </div>
  );
}

function ReadinessRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</div>
      <div className="text-right text-on-surface">{value}</div>
    </div>
  );
}
