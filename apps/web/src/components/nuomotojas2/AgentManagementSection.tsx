import React, { useState, useEffect, useCallback, memo } from 'react';
import { Users, Search, Plus, Trash2, Loader2, CheckCircle, Building2, AlertCircle, X, ChevronDown, ChevronRight, Pencil, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { AgentPermissions, DEFAULT_PERMISSIONS } from '../../hooks/useAgentPermissions';

const PERMISSION_LABELS: { key: keyof AgentPermissions; label: string; }[] = [
  { key: 'can_view_overview', label: 'Matyti apžvalgą' },
  { key: 'can_view_property', label: 'Matyti būsto info' },
  { key: 'can_view_meters', label: 'Matyti skaitiklius' },
  { key: 'can_view_history', label: 'Matyti istoriją' },
  { key: 'can_view_financials', label: 'Matyti finansinę inf.' },
  { key: 'can_view_invoices', label: 'Matyti sąskaitas' },
  { key: 'can_view_maintenance', label: 'Matyti remonto skiltį' },
  { key: 'can_manage_tenants', label: 'Dėti nuomininkus / sutartis' },
  { key: 'can_terminate_contracts', label: 'Pašalinti nuom. / sutartis' },
  { key: 'can_upload_photos', label: 'Tvarkyti nuotraukas' },
  { key: 'can_edit_property', label: 'Redaguoti būsto info' },
];

interface AgentAssignment {
  id: string;
  agent_id: string;
  landlord_id: string;
  address_id: string | null;
  property_id: string | null;
  status: string;
  assigned_at: string;
  agent_email?: string;
  agent_name?: string;
  address_full?: string;
  apartment_number?: string;
  permissions?: any;
}

interface PropertyOption {
  id: string;
  apartment_number: string;
  tenant_name: string;
  status: string;
}

interface AddressOption {
  id: string;
  full_address: string;
  properties?: PropertyOption[];
}

// Selection state per address: 'all' = all apartments, or Set of specific property IDs
interface AddressSelection {
  mode: 'all' | 'specific';
  propertyIds: Set<string>;
}

const AgentManagementSection = memo(() => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AgentAssignment[]>([]);
  const [addresses, setAddresses] = useState<AddressOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState<{ id: string; email: string; username: string } | null>(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [globalAll, setGlobalAll] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(new Set());
  const [loadingProperties, setLoadingProperties] = useState<Set<string>>(new Set());
  // Per-address selection: addressId -> AddressSelection
  const [addressSelections, setAddressSelections] = useState<Record<string, AddressSelection>>({});
  // Edit mode: which agent is being edited
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editingAgentInfo, setEditingAgentInfo] = useState<{ email: string; name: string } | null>(null);
  const [agentPermissions, setAgentPermissions] = useState<AgentPermissions>(DEFAULT_PERMISSIONS);

  const renderPermissionsBlock = () => (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <p className="text-sm font-medium text-gray-700 mb-3">Agento teisės:</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-4 max-h-64 overflow-y-auto pr-1">
        {PERMISSION_LABELS.map(({ key, label }) => (
          <label key={key} className="flex items-start gap-2.5 cursor-pointer group">
            <div className="relative flex items-start mt-0.5">
              <input
                type="checkbox"
                checked={agentPermissions[key]}
                onChange={e => setAgentPermissions(prev => ({ ...prev, [key]: e.target.checked }))}
                className="rounded border-gray-300 text-teal-500 focus:ring-teal-500 w-4 h-4 cursor-pointer"
              />
            </div>
            <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors leading-tight">
              {label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );

  // Load landlord's addresses
  const loadAddresses = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('user_addresses')
      .select('address_id, addresses:address_id(id, full_address)')
      .eq('user_id', user.id)
      .in('role', ['owner', 'landlord']);
    if (data) {
      setAddresses(data.map((d: any) => ({
        id: d.addresses?.id || d.address_id,
        full_address: d.addresses?.full_address || 'Nežinomas adresas',
      })).filter((a: AddressOption) => a.id));
    }
  }, [user?.id]);

  // Load properties (apartments) for a specific address
  const loadPropertiesForAddress = useCallback(async (addressId: string) => {
    setLoadingProperties(prev => new Set(prev).add(addressId));

    const { data } = await supabase
      .from('properties')
      .select('id, apartment_number, tenant_name, status')
      .eq('address_id', addressId)
      .order('apartment_number', { ascending: true });

    if (data) {
      setAddresses(prev => prev.map(addr =>
        addr.id === addressId
          ? { ...addr, properties: data as PropertyOption[] }
          : addr
      ));
    }
    setLoadingProperties(prev => {
      const next = new Set(prev);
      next.delete(addressId);
      return next;
    });
  }, []);

  // Toggle address expansion
  const toggleExpand = useCallback((addressId: string) => {
    setExpandedAddresses(prev => {
      const next = new Set(prev);
      if (next.has(addressId)) {
        next.delete(addressId);
      } else {
        next.add(addressId);
        // Load properties if not already loaded
        const addr = addresses.find(a => a.id === addressId);
        if (addr && !addr.properties) {
          loadPropertiesForAddress(addressId);
        }
      }
      return next;
    });
  }, [addresses, loadPropertiesForAddress]);

  // Toggle "All apartments" for an address
  const toggleAddressAll = useCallback((addressId: string) => {
    setAddressSelections(prev => {
      const current = prev[addressId];
      if (current?.mode === 'all') {
        // Deselect
        const next = { ...prev };
        delete next[addressId];
        return next;
      }
      return { ...prev, [addressId]: { mode: 'all', propertyIds: new Set() } };
    });
  }, []);

  // Toggle a specific apartment
  const toggleProperty = useCallback((addressId: string, propertyId: string) => {
    setAddressSelections(prev => {
      const current = prev[addressId] || { mode: 'specific', propertyIds: new Set<string>() };
      const newIds = new Set(current.propertyIds);
      if (newIds.has(propertyId)) {
        newIds.delete(propertyId);
      } else {
        newIds.add(propertyId);
      }
      if (newIds.size === 0 && current.mode === 'specific') {
        const next = { ...prev };
        delete next[addressId];
        return next;
      }
      return { ...prev, [addressId]: { mode: 'specific', propertyIds: newIds } };
    });
  }, []);

  // Check if any selection exists
  const hasAnySelection = globalAll || Object.keys(addressSelections).length > 0;

  // Load current assignments
  const loadAssignments = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('agent_assignments')
      .select('*')
      .eq('landlord_id', user.id)
      .in('status', ['active', 'pending']);
    if (!data) { setLoading(false); return; }

    const enriched: AgentAssignment[] = [];
    for (const a of data) {
      let agent_email = '';
      let agent_name = '';
      let address_full = '';
      let apartment_number = '';

      const { data: agentUser } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', a.agent_id)
        .maybeSingle();
      if (agentUser) {
        agent_email = agentUser.email || '';
        agent_name = [agentUser.first_name, agentUser.last_name].filter(Boolean).join(' ') || '';
      }

      if (a.address_id) {
        const { data: addr } = await supabase
          .from('addresses')
          .select('full_address')
          .eq('id', a.address_id)
          .maybeSingle();
        if (addr) address_full = addr.full_address || '';
      }

      if (a.property_id) {
        const { data: prop } = await supabase
          .from('properties')
          .select('apartment_number')
          .eq('id', a.property_id)
          .maybeSingle();
        if (prop) apartment_number = prop.apartment_number || '';
      }

      enriched.push({ ...a, agent_email, agent_name, address_full, apartment_number });
    }
    setAssignments(enriched);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadAddresses();
    loadAssignments();
  }, [loadAddresses, loadAssignments]);

  // Search for agent by email
  const handleSearch = useCallback(async () => {
    if (!searchEmail.trim() || !searchEmail.includes('@')) {
      setSearchError('Įveskite teisingą el. paštą');
      return;
    }
    setSearching(true);
    setSearchError('');
    setSearchResult(null);

    const { data } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .ilike('email', searchEmail.trim())
      .maybeSingle();

    if (!data) {
      setSearchError('Vartotojas su šiuo el. paštu nerastas sistemoje.');
    } else {
      const dbFullName = [data.first_name, data.last_name].filter(Boolean).join(' ');
      setSearchResult({ id: data.id, email: data.email || '', username: dbFullName || data.email || '' });
    }
    setSearching(false);
  }, [searchEmail]);

  // Assign agent
  const handleAssign = useCallback(async () => {
    if (!searchResult || !user?.id) return;
    if (!hasAnySelection) {
      setMessage({ type: 'error', text: 'Pasirinkite bent vieną adresą arba butą' });
      return;
    }
    setAssigning(true);
    setMessage(null);

    try {
      if (globalAll) {
        // Global assignment (all addresses, all apartments)
        const { data: existing } = await supabase
          .from('agent_assignments')
          .select('id')
          .eq('agent_id', searchResult.id)
          .eq('landlord_id', user.id)
          .is('address_id', null)
          .is('property_id', null)
          .in('status', ['active', 'pending'])
          .maybeSingle();
        if (existing) {
          setMessage({ type: 'error', text: 'Šis agentas jau priskirtas prie visų adresų.' });
          setAssigning(false);
          return;
        }
        const { error } = await supabase.from('agent_assignments').insert({
          agent_id: searchResult.id,
          landlord_id: user.id,
          address_id: null,
          property_id: null,
          status: 'pending',
          permissions: agentPermissions,
        });
        if (error) throw error;
      } else {
        // Per-address assignments
        for (const [addrId, selection] of Object.entries(addressSelections)) {
          if (selection.mode === 'all') {
            // All apartments at this address
            const { data: existing } = await supabase
              .from('agent_assignments')
              .select('id')
              .eq('agent_id', searchResult.id)
              .eq('landlord_id', user.id)
              .eq('address_id', addrId)
              .is('property_id', null)
              .in('status', ['active', 'pending'])
              .maybeSingle();
            if (!existing) {
              const { error } = await supabase.from('agent_assignments').insert({
                agent_id: searchResult.id,
                landlord_id: user.id,
                address_id: addrId,
                property_id: null,
                status: 'pending',
                permissions: agentPermissions,
              });
              if (error) throw error;
            }
          } else {
            // Specific apartments
            for (const propId of selection.propertyIds) {
              const { data: existing } = await supabase
                .from('agent_assignments')
                .select('id')
                .eq('agent_id', searchResult.id)
                .eq('landlord_id', user.id)
                .eq('address_id', addrId)
                .eq('property_id', propId)
                .in('status', ['active', 'pending'])
                .maybeSingle();
              if (!existing) {
                const { error } = await supabase.from('agent_assignments').insert({
                  agent_id: searchResult.id,
                  landlord_id: user.id,
                  address_id: addrId,
                  property_id: propId,
                  status: 'pending',
                  permissions: agentPermissions,
                });
                if (error) throw error;
              }
            }
          }
        }
      }
      setMessage({ type: 'success', text: 'Kvietimas išsiųstas agentui!' });
      setSearchResult(null);
      setSearchEmail('');
      setGlobalAll(false);
      setAddressSelections({});
      setExpandedAddresses(new Set());
      setAgentPermissions(DEFAULT_PERMISSIONS);
      await loadAssignments();
    } catch {
      setMessage({ type: 'error', text: 'Klaida priskiriant agentą. Bandykite dar kartą.' });
    }
    setAssigning(false);
  }, [searchResult, user?.id, globalAll, hasAnySelection, addressSelections, agentPermissions, loadAssignments]);

  // Start editing an existing agent's assignments
  const startEdit = useCallback(async (agentId: string, agentAssignments: AgentAssignment[]) => {
    const first = agentAssignments[0];
    setEditingAgentId(agentId);
    setEditingAgentInfo({ email: first.agent_email || '', name: first.agent_name || '' });
    setAgentPermissions((first.permissions as unknown as AgentPermissions) || DEFAULT_PERMISSIONS);
    setSearchResult(null);
    setSearchEmail('');
    setSearchError('');

    const hasGlobal = agentAssignments.some(a => !a.address_id && !a.property_id);
    if (hasGlobal) {
      setGlobalAll(true);
      setAddressSelections({});
      setExpandedAddresses(new Set());
      return;
    }

    setGlobalAll(false);
    const newSelections: Record<string, AddressSelection> = {};
    const addrIdsToExpand = new Set<string>();

    for (const a of agentAssignments) {
      if (!a.address_id) continue;
      const addrId = a.address_id;
      addrIdsToExpand.add(addrId);

      if (!a.property_id) {
        // "all apartments" at this address
        newSelections[addrId] = { mode: 'all', propertyIds: new Set() };
      } else {
        if (!newSelections[addrId]) {
          newSelections[addrId] = { mode: 'specific', propertyIds: new Set() };
        }
        if (newSelections[addrId].mode === 'specific') {
          newSelections[addrId].propertyIds.add(a.property_id);
        }
      }
    }

    setAddressSelections(newSelections);
    setExpandedAddresses(addrIdsToExpand);

    // Load properties for expanded addresses
    for (const addrId of addrIdsToExpand) {
      const addr = addresses.find(a => a.id === addrId);
      if (addr && !addr.properties) {
        loadPropertiesForAddress(addrId);
      }
    }
  }, [addresses, loadPropertiesForAddress]);

  // Cancel edit mode
  const cancelEdit = useCallback(() => {
    setEditingAgentId(null);
    setEditingAgentInfo(null);
    setGlobalAll(false);
    setAddressSelections({});
    setExpandedAddresses(new Set());
    setAgentPermissions(DEFAULT_PERMISSIONS);
  }, []);

  // Save edited assignments (diff: revoke removed, insert added)
  const handleSaveEdit = useCallback(async () => {
    if (!editingAgentId || !user?.id) return;
    setAssigning(true);
    setMessage(null);

    try {
      const currentAssignments = assignments.filter(a => a.agent_id === editingAgentId);
      const isPending = currentAssignments.some(a => a.status === 'pending');
      const insertStatus = isPending ? 'pending' : 'active';

      // Build set of desired assignment keys
      const desiredKeys = new Set<string>();
      if (globalAll) {
        desiredKeys.add('__global__');
      } else {
        for (const [addrId, selection] of Object.entries(addressSelections)) {
          if (selection.mode === 'all') {
            desiredKeys.add(`addr:${addrId}`);
          } else {
            for (const propId of selection.propertyIds) {
              desiredKeys.add(`prop:${addrId}:${propId}`);
            }
          }
        }
      }

      // Build set of existing assignment keys
      const existingMap = new Map<string, string>(); // key -> assignment.id
      for (const a of currentAssignments) {
        if (!a.address_id && !a.property_id) {
          existingMap.set('__global__', a.id);
        } else if (a.address_id && !a.property_id) {
          existingMap.set(`addr:${a.address_id}`, a.id);
        } else if (a.address_id && a.property_id) {
          existingMap.set(`prop:${a.address_id}:${a.property_id}`, a.id);
        }
      }

      // Revoke removed assignments
      for (const [key, assignId] of existingMap) {
        if (!desiredKeys.has(key)) {
          await supabase
            .from('agent_assignments')
            .update({ status: 'revoked', revoked_at: new Date().toISOString() })
            .eq('id', assignId);
        }
      }

      // Insert new assignments
      for (const key of desiredKeys) {
        if (!existingMap.has(key)) {
          if (key === '__global__') {
            await supabase.from('agent_assignments').insert({
              agent_id: editingAgentId,
              landlord_id: user.id,
              address_id: null,
              property_id: null,
              status: insertStatus,
              permissions: agentPermissions,
            });
          } else if (key.startsWith('addr:')) {
            const addrId = key.slice(5);
            await supabase.from('agent_assignments').insert({
              agent_id: editingAgentId,
              landlord_id: user.id,
              address_id: addrId,
              property_id: null,
              status: insertStatus,
              permissions: agentPermissions,
            });
          } else if (key.startsWith('prop:')) {
            const parts = key.slice(5).split(':');
            await supabase.from('agent_assignments').insert({
              agent_id: editingAgentId,
              landlord_id: user.id,
              address_id: parts[0],
              property_id: parts[1],
              status: insertStatus,
              permissions: agentPermissions,
            });
          }
        }
      }

      // Update ALL active assignments for this agent to keep permissions in sync
      await supabase
        .from('agent_assignments')
        .update({ permissions: agentPermissions })
        .eq('agent_id', editingAgentId)
        .eq('landlord_id', user.id)
        .in('status', ['active', 'pending']);

      setMessage({ type: 'success', text: 'Agento prieiga atnaujinta!' });
      cancelEdit();
      await loadAssignments();
    } catch {
      setMessage({ type: 'error', text: 'Klaida atnaujinant prieigą. Bandykite dar kartą.' });
    }
    setAssigning(false);
  }, [editingAgentId, user?.id, globalAll, addressSelections, agentPermissions, assignments, cancelEdit, loadAssignments]);

  // Revoke assignment
  const handleRevoke = useCallback(async (assignmentId: string) => {
    const { error } = await supabase
      .from('agent_assignments')
      .update({ status: 'revoked', revoked_at: new Date().toISOString() })
      .eq('id', assignmentId);
    if (!error) {
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      setMessage({ type: 'success', text: 'Prieiga atšaukta.' });
    }
  }, []);

  // Group assignments by agent
  const groupedByAgent = assignments.reduce<Record<string, AgentAssignment[]>>((acc, a) => {
    const key = a.agent_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-200 mt-6">
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Agentų valdymas</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Priskirkite agentus prie savo adresų ir butų
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Message */}
        {message && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Search agent */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Pridėti agentą</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={searchEmail}
                onChange={e => { setSearchEmail(e.target.value); setSearchError(''); setSearchResult(null); }}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Agento el. paštas..."
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching || !searchEmail.trim()}
              className="px-4 py-2.5 bg-teal-500 text-white text-sm font-semibold rounded-xl hover:bg-teal-600 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ieškoti'}
            </button>
          </div>
          {searchError && <p className="mt-2 text-sm text-red-500">{searchError}</p>}
        </div>

        {/* Search result + address/apartment selection */}
        {searchResult && (
          <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/50 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-teal-500 flex items-center justify-center text-white text-sm font-bold">
                {searchResult.email[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{searchResult.username || searchResult.email}</p>
                <p className="text-xs text-gray-500">{searchResult.email}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Priskirti prieigą:</p>
              <div className="space-y-1.5">
                {/* Global all option */}
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:border-teal-300 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={globalAll}
                    onChange={e => {
                      setGlobalAll(e.target.checked);
                      if (e.target.checked) {
                        setAddressSelections({});
                        setExpandedAddresses(new Set());
                      }
                    }}
                    className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                  />
                  <Building2 className="w-4 h-4 text-teal-500" />
                  <span className="text-sm font-medium text-gray-900">Visi adresai ir butai</span>
                  <span className="text-xs text-gray-400 ml-auto">Pilna prieiga</span>
                </label>

                {/* Individual addresses with collapsible apartments */}
                {!globalAll && addresses.map(addr => {
                  const isExpanded = expandedAddresses.has(addr.id);
                  const selection = addressSelections[addr.id];
                  const isAllSelected = selection?.mode === 'all';
                  const selectedPropIds = selection?.propertyIds || new Set<string>();
                  const isLoadingProps = loadingProperties.has(addr.id);
                  const props = addr.properties;
                  const hasAnyForAddr = !!selection;

                  return (
                    <div key={addr.id} className={`rounded-lg border transition-colors overflow-hidden ${
                      hasAnyForAddr ? 'border-teal-400 bg-teal-50/30' : 'border-gray-200 bg-white hover:border-teal-300'
                    }`}>
                      {/* Address row */}
                      <div className="flex items-center gap-2 p-3">
                        <button
                          type="button"
                          onClick={() => toggleExpand(addr.id)}
                          className="flex items-center gap-1 text-gray-400 hover:text-teal-500 transition-colors p-0.5"
                          title={isExpanded ? 'Suskleisti' : 'Išskleisti butus'}
                        >
                          {isExpanded
                            ? <ChevronDown className="w-4 h-4" />
                            : <ChevronRight className="w-4 h-4" />
                          }
                        </button>
                        <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{addr.full_address}</span>
                        {/* "All apartments" checkbox for this address */}
                        <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0 ml-auto">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={() => toggleAddressAll(addr.id)}
                            className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                          />
                          <span className="text-[10px] text-gray-500 whitespace-nowrap">Visi butai</span>
                        </label>
                      </div>

                      {/* Expanded apartments */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 bg-gray-50/50 px-3 py-2">
                          {isLoadingProps ? (
                            <div className="flex items-center gap-2 py-2 justify-center">
                              <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                              <span className="text-xs text-gray-400">Kraunama...</span>
                            </div>
                          ) : props && props.length > 0 ? (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-44 overflow-y-auto">
                              {props.map(prop => {
                                const isChecked = isAllSelected || selectedPropIds.has(prop.id);
                                const dotColor = prop.status === 'occupied' ? 'bg-emerald-400' : prop.status === 'vacant' ? 'bg-gray-300' : 'bg-amber-400';
                                const statusText = prop.status === 'occupied' ? 'Užimtas' : prop.status === 'vacant' ? 'Laisvas' : 'Remontas';

                                return (
                                  <label
                                    key={prop.id}
                                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                                      isChecked ? 'bg-teal-50 border border-teal-300' : 'bg-white border border-gray-100 hover:border-teal-200'
                                    } ${isAllSelected ? 'opacity-50 pointer-events-none' : ''}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={isAllSelected}
                                      onChange={() => toggleProperty(addr.id, prop.id)}
                                      className="rounded border-gray-300 text-teal-500 focus:ring-teal-500 w-3.5 h-3.5 flex-shrink-0"
                                    />
                                    <span className="text-[11px] font-semibold text-gray-700 truncate">
                                      Nr. {prop.apartment_number}
                                    </span>
                                    <span className={`w-2 h-2 rounded-full ${dotColor} ml-auto flex-shrink-0`} title={statusText} />
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 py-1 text-center">Nėra butų</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {!globalAll && addresses.length === 0 && (
                  <p className="text-sm text-gray-400 py-2">Neturite pridėtų adresų.</p>
                )}
              </div>
            </div>

            {renderPermissionsBlock()}

            {/* Selection summary */}
            {hasAnySelection && !globalAll && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {Object.entries(addressSelections).map(([addrId, sel]) => {
                  const addr = addresses.find(a => a.id === addrId);
                  if (!addr) return null;
                  const shortAddr = addr.full_address.length > 30
                    ? addr.full_address.slice(0, 30) + '...'
                    : addr.full_address;
                  return (
                    <span key={addrId} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-teal-100 text-teal-700 text-[10px] font-medium">
                      <Building2 className="w-3 h-3" />
                      {shortAddr}
                      {sel.mode === 'all'
                        ? ' (visi butai)'
                        : ` (${sel.propertyIds.size} ${sel.propertyIds.size === 1 ? 'butas' : 'butai'})`
                      }
                    </span>
                  );
                })}
              </div>
            )}

            <button
              onClick={handleAssign}
              disabled={assigning || !hasAnySelection}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-500 text-white text-sm font-bold rounded-xl hover:bg-teal-600 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Priskirti agentą
            </button>
          </div>
        )}

        {/* Edit mode: address/apartment picker for existing agent */}
        {editingAgentId && editingAgentInfo && (
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                {editingAgentInfo.email[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{editingAgentInfo.name || editingAgentInfo.email}</p>
                <p className="text-xs text-gray-500">{editingAgentInfo.email}</p>
              </div>
              <button
                onClick={cancelEdit}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Atšaukti
              </button>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Redaguoti prieigą:</p>
              <div className="space-y-1.5">
                {/* Global all option */}
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:border-blue-300 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={globalAll}
                    onChange={e => {
                      setGlobalAll(e.target.checked);
                      if (e.target.checked) {
                        setAddressSelections({});
                        setExpandedAddresses(new Set());
                      }
                    }}
                    className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                  />
                  <Building2 className="w-4 h-4 text-teal-500" />
                  <span className="text-sm font-medium text-gray-900">Visi adresai ir butai</span>
                  <span className="text-xs text-gray-400 ml-auto">Pilna prieiga</span>
                </label>

                {!globalAll && addresses.map(addr => {
                  const isExpanded = expandedAddresses.has(addr.id);
                  const selection = addressSelections[addr.id];
                  const isAllSelected = selection?.mode === 'all';
                  const selectedPropIds = selection?.propertyIds || new Set<string>();
                  const isLoadingProps = loadingProperties.has(addr.id);
                  const props = addr.properties;
                  const hasAnyForAddr = !!selection;

                  return (
                    <div key={addr.id} className={`rounded-lg border transition-colors overflow-hidden ${
                      hasAnyForAddr ? 'border-teal-400 bg-teal-50/30' : 'border-gray-200 bg-white hover:border-teal-300'
                    }`}>
                      <div className="flex items-center gap-2 p-3">
                        <button
                          type="button"
                          onClick={() => toggleExpand(addr.id)}
                          className="flex items-center gap-1 text-gray-400 hover:text-teal-500 transition-colors p-0.5"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{addr.full_address}</span>
                        <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0 ml-auto">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={() => toggleAddressAll(addr.id)}
                            className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                          />
                          <span className="text-[10px] text-gray-500 whitespace-nowrap">Visi butai</span>
                        </label>
                      </div>
                      {isExpanded && (
                        <div className="border-t border-gray-100 bg-gray-50/50 px-3 py-2">
                          {isLoadingProps ? (
                            <div className="flex items-center gap-2 py-2 justify-center">
                              <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                              <span className="text-xs text-gray-400">Kraunama...</span>
                            </div>
                          ) : props && props.length > 0 ? (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-44 overflow-y-auto">
                              {props.map(prop => {
                                const isChecked = isAllSelected || selectedPropIds.has(prop.id);
                                const dotColor = prop.status === 'occupied' ? 'bg-emerald-400' : prop.status === 'vacant' ? 'bg-gray-300' : 'bg-amber-400';
                                return (
                                  <label
                                    key={prop.id}
                                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                                      isChecked ? 'bg-teal-50 border border-teal-300' : 'bg-white border border-gray-100 hover:border-teal-200'
                                    } ${isAllSelected ? 'opacity-50 pointer-events-none' : ''}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={isAllSelected}
                                      onChange={() => toggleProperty(addr.id, prop.id)}
                                      className="rounded border-gray-300 text-teal-500 focus:ring-teal-500 w-3.5 h-3.5 flex-shrink-0"
                                    />
                                    <span className="text-[11px] font-semibold text-gray-700 truncate">Nr. {prop.apartment_number}</span>
                                    <span className={`w-2 h-2 rounded-full ${dotColor} ml-auto flex-shrink-0`} />
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 py-1 text-center">Nėra butų</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {renderPermissionsBlock()}

            <button
              onClick={handleSaveEdit}
              disabled={assigning || (!globalAll && Object.keys(addressSelections).length === 0)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Išsaugoti pakeitimus
            </button>
          </div>
        )}

        {/* Current assignments */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Priskirti agentai</h3>
          {loading ? (
            <div className="flex items-center gap-2 py-6 justify-center">
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              <span className="text-sm text-gray-400">Kraunama...</span>
            </div>
          ) : Object.keys(groupedByAgent).length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              Neturite priskirtų agentų
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(groupedByAgent).map(([agentId, agentAssignments]) => {
                const first = agentAssignments[0];
                const hasGlobal = agentAssignments.some(a => !a.address_id && !a.property_id);

                // Group by address for display
                const byAddress = agentAssignments.reduce<Record<string, AgentAssignment[]>>((acc, a) => {
                  const key = a.address_id || '__global__';
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(a);
                  return acc;
                }, {});

                const isEditing = editingAgentId === agentId;

                return (
                  <div key={agentId} className={`p-4 rounded-xl border bg-gray-50/50 ${
                    isEditing ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'
                  }`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold">
                        {(first.agent_email || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">{first.agent_name || first.agent_email}</p>
                          {agentAssignments.some(a => a.status === 'pending') && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-medium whitespace-nowrap">
                              Laukiama patvirtinimo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{first.agent_email}</p>
                      </div>
                      <button
                        onClick={() => isEditing ? cancelEdit() : startEdit(agentId, agentAssignments)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all active:scale-[0.98] ${
                          isEditing
                            ? 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-600'
                        }`}
                        title={isEditing ? 'Atšaukti redagavimą' : 'Redaguoti prieigą'}
                      >
                        <Pencil className="w-3 h-3" />
                        {isEditing ? 'Atšaukti' : 'Redaguoti'}
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {hasGlobal ? (
                        <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white border border-gray-100">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-teal-500" />
                            <span className="text-xs font-medium text-gray-700">Visi adresai ir butai</span>
                          </div>
                          <button
                            onClick={() => handleRevoke(agentAssignments.find(a => !a.address_id && !a.property_id)!.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Atšaukti prieigą"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        Object.entries(byAddress).map(([addrKey, addrAssignments]) => {
                          if (addrKey === '__global__') return null;
                          const addrLabel = addrAssignments[0].address_full || 'Nežinomas adresas';
                          const hasAllProps = addrAssignments.some(a => !a.property_id);
                          const specificProps = addrAssignments.filter(a => a.property_id);

                          return (
                            <div key={addrKey} className="rounded-lg bg-white border border-gray-100 overflow-hidden">
                              {/* Address header */}
                              <div className="flex items-center gap-2 py-1.5 px-3">
                                <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                <span className="text-xs font-medium text-gray-700 flex-1 truncate">{addrLabel}</span>
                                {hasAllProps && (
                                  <>
                                    <span className="text-[10px] text-teal-600 font-medium">Visi butai</span>
                                    <button
                                      onClick={() => handleRevoke(addrAssignments.find(a => !a.property_id)!.id)}
                                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                      title="Atšaukti prieigą"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                              {/* Specific apartments */}
                              {!hasAllProps && specificProps.length > 0 && (
                                <div className="border-t border-gray-50 px-3 py-1.5 flex flex-wrap gap-1">
                                  {specificProps.map(a => (
                                    <div key={a.id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 border border-gray-100">
                                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                      <span className="text-[11px] text-gray-700 font-medium">Nr. {a.apartment_number}</span>
                                      <button
                                        onClick={() => handleRevoke(a.id)}
                                        className="p-0.5 text-gray-300 hover:text-red-500 transition-colors"
                                        title="Atšaukti prieigą"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

AgentManagementSection.displayName = 'AgentManagementSection';
export default AgentManagementSection;
