import React, { useState } from 'react';
import { 
  Network, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Play,
  Pause,
  Copy,
  Trash2,
  ExternalLink,
  X,
  Save,
  Globe,
  Database,
  Shield,
  Info,
  ChevronDown,
  Settings2,
  Link2,
  Calendar
} from 'lucide-react';
import { QuickDateRangePicker, type DateRangeValue, getDateRange } from '@/components/DateRangePicker';

const INITIAL_NETWORKS_DATA = [
  { id: '1', name: 'AdCombo', template: 'AdCombo', offers: 12, clicks: 4500, conversions: 120, revenue: '$2,400', roi: '45%', status: 'Active', postback: 'https://track.com/postback?clickid={clickid}&payout={payout}', offerParams: 'sub1={subid}&sub2={source_id}', notes: '', statusMappings: [{ network: 'approved', tracker: 'Sale' }, { network: 'pending', tracker: 'Lead' }] },
  { id: '2', name: 'ClickBank', template: 'ClickBank', offers: 8, clicks: 3200, conversions: 85, revenue: '$1,850', roi: '38%', status: 'Active', postback: 'https://track.com/postback?tid={tid}&amt={amt}', offerParams: 'aff_sub={subid}', notes: '', statusMappings: [] },
  { id: '3', name: 'MaxBounty', template: 'MaxBounty', offers: 15, clicks: 6800, conversions: 190, revenue: '$4,200', roi: '52%', status: 'Active', postback: 'https://track.com/postback?s1={s1}&rate={rate}', offerParams: 's1={subid}', notes: '', statusMappings: [] },
  { id: '4', name: 'TerraLeads', template: 'TerraLeads', offers: 5, clicks: 1200, conversions: 30, revenue: '$650', roi: '22%', status: 'Paused', postback: 'https://track.com/postback?subid={subid}&payout={payout}', offerParams: 'sub1={subid}', notes: '', statusMappings: [] },
  { id: '5', name: 'Everad', template: 'Everad', offers: 10, clicks: 2800, conversions: 75, revenue: '$1,400', roi: '31%', status: 'Active', postback: 'https://track.com/postback?cid={cid}&payout={payout}', offerParams: 'sid={subid}', notes: '', statusMappings: [] },
];

export const AffiliateNetworks = () => {
  const [networks, setNetworks] = useState(INITIAL_NETWORKS_DATA);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('general');
  const [dateRange, setDateRange] = useState<string>('last7days');
  const [dateRangeValue, setDateRangeValue] = useState<DateRangeValue>(getDateRange('last7days'));

  const handleDateRangeChange = (preset: string, range?: DateRangeValue) => {
    setDateRange(preset);
    if (range) {
      setDateRangeValue(range);
    }
  };

  const handleEdit = (network: any) => {
    setSelectedNetwork({ ...network });
    setIsModalOpen(true);
    setActiveModalTab('general');
  };

  const handleCreate = () => {
    setSelectedNetwork({
      id: 'New',
      name: '',
      template: 'Custom',
      status: 'Active',
      postback: '',
      offerParams: '',
      notes: '',
      statusMappings: [
        { network: 'approved', tracker: 'Sale' },
        { network: 'pending', tracker: 'Lead' },
        { network: 'declined', tracker: 'Rejected' },
      ],
      offers: 0,
      clicks: 0,
      conversions: 0,
      revenue: '$0',
      roi: '0%'
    });
    setIsModalOpen(true);
    setActiveModalTab('general');
  };

  const handleSave = () => {
    if (selectedNetwork.id === 'New') {
      const newNetwork = {
        ...selectedNetwork,
        id: (networks.length + 1).toString(),
      };
      setNetworks([...networks, newNetwork]);
    } else {
      setNetworks(networks.map(n => n.id === selectedNetwork.id ? selectedNetwork : n));
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setNetworks(networks.filter(n => n.id !== id));
  };

  const handleCopy = (network: any) => {
    const newNetwork = {
      ...network,
      id: (networks.length + 1).toString(),
      name: `${network.name} (Copy)`,
    };
    setNetworks([...networks, newNetwork]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Optional: add a toast or temporary "Copied!" state
  };

  const addPlaceholder = (placeholder: string) => {
    const currentParams = selectedNetwork.offerParams || '';
    const separator = currentParams ? '&' : '';
    setSelectedNetwork({
      ...selectedNetwork,
      offerParams: `${currentParams}${separator}param=${placeholder}`
    });
  };

  const filteredNetworks = networks.filter(n => 
    n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.template.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-primary tracking-tight">Affiliate Networks</h2>
          <p className="text-sm text-on-surface-variant">Manage your affiliate network integrations and postback settings.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 日期范围选择器 */}
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-on-surface-variant" />
            <div className="w-[280px]">
              <QuickDateRangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                showTime={false}
                maxRangeDays={90}
              />
            </div>
          </div>
          <button 
            onClick={handleCreate}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all rounded-sm"
          >
            <Plus size={16} /> Create
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-surface-container-lowest p-3 whisper-shadow flex flex-wrap items-center justify-between gap-4 border border-outline-variant/10">
        <div className="flex items-center gap-1">
          <button className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all rounded-sm" title="Play"><Play size={16} /></button>
          <button className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all rounded-sm" title="Pause"><Pause size={16} /></button>
          <button className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all rounded-sm" title="Copy"><Copy size={16} /></button>
          <div className="w-px h-6 bg-outline-variant/30 mx-1" />
          <button className="p-2 text-error hover:bg-error/10 transition-all rounded-sm" title="Delete"><Trash2 size={16} /></button>
        </div>

        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Search networks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container border-none focus:ring-1 focus:ring-primary text-xs"
            />
          </div>
          <button 
            onClick={() => alert('Filter panel coming soon!')}
            className="flex items-center gap-2 px-3 py-2 border border-outline-variant/30 text-[10px] font-bold uppercase tracking-widest hover:bg-surface-container transition-all"
          >
            <Filter size={14} /> Filter
          </button>
        </div>
      </div>

      {/* Networks Table */}
      <div className="bg-surface-container-lowest whisper-shadow overflow-hidden border border-outline-variant/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/10">
                <th className="w-12 px-4 py-3">
                  <input type="checkbox" className="rounded-sm border-outline-variant text-primary focus:ring-primary" />
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">ID</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Name</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Template</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">Offers</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">Clicks</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">Conversions</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">Revenue</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">ROI</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {filteredNetworks.map((network) => (
                <tr key={network.id} className="group hover:bg-surface-container-low transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded-sm border-outline-variant text-primary focus:ring-primary" />
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant font-mono">{network.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Network size={14} className="text-primary" />
                      <span 
                        onClick={() => handleEdit(network)}
                        className="text-xs font-bold text-primary hover:underline cursor-pointer"
                      >
                        {network.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{network.template}</td>
                  <td className="px-4 py-3 text-xs text-primary font-medium text-right">{network.offers}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant text-right">{network.clicks.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant text-right">{network.conversions}</td>
                  <td className="px-4 py-3 text-xs font-bold text-secondary text-right">{network.revenue}</td>
                  <td className="px-4 py-3 text-xs font-bold text-primary text-right">{network.roi}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm",
                      network.status === 'Active' ? "bg-emerald-100 text-emerald-700" : "bg-surface-container-highest text-on-surface-variant"
                    )}>
                      {network.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(network)}
                        className="p-1.5 text-on-surface-variant hover:text-primary transition-colors"
                      >
                        <ExternalLink size={14} />
                      </button>
                      <button 
                        onClick={() => handleCopy(network)}
                        className="p-1.5 text-on-surface-variant hover:text-primary transition-colors"
                      >
                        <Copy size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(network.id)}
                        className="p-1.5 text-error hover:bg-error/10 transition-colors rounded-sm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/View Modal */}
      {isModalOpen && selectedNetwork && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface-container-lowest w-full max-w-3xl whisper-shadow border border-outline-variant/10 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-sm">
                  <Network size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold text-primary">
                    {selectedNetwork.id === 'New' ? 'Add Affiliate Network' : `Network: ${selectedNetwork.name}`}
                  </h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                    {selectedNetwork.id === 'New' ? 'Create a new integration' : `ID: ${selectedNetwork.id}`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-on-surface-variant hover:text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-outline-variant/10 px-6">
              {[
                { id: 'general', label: 'General', icon: Settings2 },
                { id: 'postback', label: 'Postback', icon: Database },
                { id: 'parameters', label: 'Parameters', icon: Link2 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveModalTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all",
                    activeModalTab === tab.id 
                      ? "border-primary text-primary" 
                      : "border-transparent text-on-surface-variant/60 hover:text-primary"
                  )}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
              {activeModalTab === 'general' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Network Name</label>
                      <input 
                        type="text" 
                        value={selectedNetwork.name}
                        onChange={(e) => setSelectedNetwork({ ...selectedNetwork, name: e.target.value })}
                        className="w-full p-2 bg-surface-container border border-outline-variant/30 text-sm focus:border-primary outline-none" 
                        placeholder="e.g. AdCombo"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Template</label>
                      <div className="relative">
                        <select 
                          value={selectedNetwork.template}
                          onChange={(e) => setSelectedNetwork({ ...selectedNetwork, template: e.target.value })}
                          className="w-full p-2 bg-surface-container border border-outline-variant/30 text-sm focus:border-primary outline-none appearance-none pr-10"
                        >
                          <option>AdCombo</option>
                          <option>ClickBank</option>
                          <option>MaxBounty</option>
                          <option>TerraLeads</option>
                          <option>Everad</option>
                          <option>Custom</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Notes</label>
                    <textarea 
                      rows={3}
                      value={selectedNetwork.notes}
                      onChange={(e) => setSelectedNetwork({ ...selectedNetwork, notes: e.target.value })}
                      className="w-full p-3 bg-surface-container border border-outline-variant/30 text-sm focus:border-primary outline-none"
                      placeholder="Optional notes about this network..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-primary border-b border-outline-variant/10 pb-2">
                        <Shield size={16} />
                        <h4 className="text-xs font-bold uppercase tracking-widest">Security</h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          id="ip-whitelist" 
                          checked={selectedNetwork.ipWhitelist}
                          onChange={(e) => setSelectedNetwork({ ...selectedNetwork, ipWhitelist: e.target.checked })}
                          className="rounded-sm border-outline-variant text-primary focus:ring-primary" 
                        />
                        <label htmlFor="ip-whitelist" className="text-xs text-on-surface-variant">Enable IP Whitelist</label>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-primary border-b border-outline-variant/10 pb-2">
                        <Globe size={16} />
                        <h4 className="text-xs font-bold uppercase tracking-widest">Status</h4>
                      </div>
                      <select 
                        value={selectedNetwork.status}
                        onChange={(e) => setSelectedNetwork({ ...selectedNetwork, status: e.target.value })}
                        className="w-full p-2 bg-surface-container border border-outline-variant/30 text-sm focus:border-primary outline-none"
                      >
                        <option>Active</option>
                        <option>Paused</option>
                        <option>Archived</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeModalTab === 'postback' && (
                <div className="space-y-8">
                  <div className="bg-primary/5 p-4 border-l-4 border-primary space-y-2">
                    <div className="flex items-center gap-2 text-primary">
                      <Info size={16} />
                      <span className="text-xs font-bold uppercase tracking-widest">Postback Configuration</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Copy this URL and paste it into your affiliate network's postback/webhook settings. 
                      This allows the tracker to receive conversion data automatically.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Postback URL</label>
                    <div className="relative">
                      <textarea 
                        readOnly
                        rows={3}
                        value={selectedNetwork.postback || "https://your-tracker.com/postback?subid={subid}&payout={payout}&status={status}"}
                        className="w-full p-3 bg-surface-container border border-outline-variant/30 text-xs font-mono focus:border-primary outline-none pr-24"
                      />
                      <button 
                        onClick={() => copyToClipboard(selectedNetwork.postback || "https://your-tracker.com/postback?subid={subid}&payout={payout}&status={status}")}
                        className="absolute right-2 top-2 px-3 py-1 bg-primary text-on-primary text-[10px] font-bold uppercase tracking-widest hover:bg-primary/90 transition-all rounded-sm"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Status Mapping</h4>
                    <div className="overflow-hidden border border-outline-variant/10">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-surface-container-low border-b border-outline-variant/10">
                            <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Network Status</th>
                            <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Tracker Status</th>
                            <th className="w-10 px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/5">
                          {(selectedNetwork.statusMappings || []).map((map: any, i: number) => (
                            <tr key={i} className="bg-surface-container-lowest">
                              <td className="px-4 py-2">
                                <input 
                                  type="text" 
                                  value={map.network} 
                                  onChange={(e) => {
                                    const newMappings = [...selectedNetwork.statusMappings];
                                    newMappings[i].network = e.target.value;
                                    setSelectedNetwork({ ...selectedNetwork, statusMappings: newMappings });
                                  }}
                                  className="w-full bg-transparent text-xs outline-none" 
                                />
                              </td>
                              <td className="px-4 py-2">
                                <select 
                                  value={map.tracker} 
                                  onChange={(e) => {
                                    const newMappings = [...selectedNetwork.statusMappings];
                                    newMappings[i].tracker = e.target.value;
                                    setSelectedNetwork({ ...selectedNetwork, statusMappings: newMappings });
                                  }}
                                  className="w-full bg-transparent text-xs outline-none"
                                >
                                  <option>Sale</option>
                                  <option>Lead</option>
                                  <option>Rejected</option>
                                </select>
                              </td>
                              <td className="px-4 py-2">
                                <button 
                                  onClick={() => {
                                    const newMappings = selectedNetwork.statusMappings.filter((_: any, index: number) => index !== i);
                                    setSelectedNetwork({ ...selectedNetwork, statusMappings: newMappings });
                                  }}
                                  className="text-error hover:bg-error/10 p-1 rounded-sm transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button 
                      onClick={() => {
                        const newMappings = [...(selectedNetwork.statusMappings || []), { network: '', tracker: 'Sale' }];
                        setSelectedNetwork({ ...selectedNetwork, statusMappings: newMappings });
                      }}
                      className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Status Mapping
                    </button>
                  </div>
                </div>
              )}

              {activeModalTab === 'parameters' && (
                <div className="space-y-8">
                  <div className="bg-secondary/5 p-4 border-l-4 border-secondary space-y-2">
                    <div className="flex items-center gap-2 text-secondary">
                      <Info size={16} />
                      <span className="text-xs font-bold uppercase tracking-widest">Offer Parameters</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      These parameters will be automatically appended to all offer URLs belonging to this network. 
                      Use placeholders to pass tracker data to the network.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Parameters String</label>
                    <input 
                      type="text" 
                      value={selectedNetwork.offerParams}
                      onChange={(e) => setSelectedNetwork({ ...selectedNetwork, offerParams: e.target.value })}
                      className="w-full p-2 bg-surface-container border border-outline-variant/30 text-xs font-mono focus:border-primary outline-none" 
                      placeholder="e.g. aff_sub={subid}&aff_id=123"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-surface-container-low border border-outline-variant/10 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Common Placeholders</p>
                      <ul className="space-y-1">
                        {[
                          { tag: '{subid}', label: 'Unique Click ID' },
                          { tag: '{source_id}', label: 'Traffic Source ID' },
                          { tag: '{campaign_id}', label: 'Campaign ID' },
                          { tag: '{external_id}', label: 'External ID from Source' },
                        ].map((p) => (
                          <li key={p.tag} className="flex items-center justify-between group">
                            <span className="text-[10px] font-mono text-primary">{p.tag} - {p.label}</span>
                            <button 
                              onClick={() => addPlaceholder(p.tag)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-primary hover:bg-primary/10 rounded-sm transition-all"
                            >
                              <Plus size={10} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4 bg-surface-container-low border border-outline-variant/10 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Example Result</p>
                      <p className="text-[10px] text-on-surface-variant break-all">
                        https://offer-link.com/?<span className="text-secondary font-bold">{selectedNetwork.offerParams || "aff_sub=123456"}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-outline-variant/10 flex justify-end gap-3 bg-surface-container-low/30">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 border border-outline-variant/30 text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all rounded-sm shadow-lg"
              >
                <Save size={16} /> Save Network
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export default AffiliateNetworks;
