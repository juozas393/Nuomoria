import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplets, Zap, Flame, Thermometer, Camera, ArrowLeft,
  CheckCircle, AlertTriangle, Info, Trash2, Loader2, Gauge, Send, TrendingUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MeterConfig {
  id: string;
  address_id: string;
  name: string;
  type: 'individual' | 'communal';
  unit: string;
  price_per_unit: number;
  fixed_price?: number;
  distribution_method?: string;
  requires_photo: boolean;
  collection_mode?: string;
  created_at: string;
}

interface MeterReading {
  id: string;
  meterType: 'electricity' | 'water' | 'gas' | 'heating';
  meterConfigId: string;
  previousReading: number;
  currentReading: number;
  date: string;
  photos: string[];
  status: 'pending' | 'approved' | 'rejected';
  submissionDeadline: string;
  meterNumber: string;
  location: string;
  requirePhoto: boolean;
}

interface MeterValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ─── Meter type config ────────────────────────────────────────────────────────

const METER_TYPE_INFO: Record<string, {
  icon: React.FC<{ className?: string }>;
  solidBg: string;
  accentBg: string;
  accentText: string;
  accentStrip: string;
  unit: string;
  label: string;
  maxReasonable: number;
  minReasonable: number;
}> = {
  electricity: {
    icon: Zap,
    solidBg: 'bg-amber-500',
    accentBg: 'bg-amber-500/10',
    accentText: 'text-amber-400',
    accentStrip: 'bg-amber-500',
    unit: 'kWh',
    label: 'Elektra',
    maxReasonable: 800,
    minReasonable: 50,
  },
  water: {
    icon: Droplets,
    solidBg: 'bg-sky-500',
    accentBg: 'bg-sky-500/10',
    accentText: 'text-sky-400',
    accentStrip: 'bg-sky-500',
    unit: 'm\u00B3',
    label: 'Vanduo',
    maxReasonable: 30,
    minReasonable: 2,
  },
  gas: {
    icon: Flame,
    solidBg: 'bg-orange-500',
    accentBg: 'bg-orange-500/10',
    accentText: 'text-orange-400',
    accentStrip: 'bg-orange-500',
    unit: 'm\u00B3',
    label: 'Dujos',
    maxReasonable: 120,
    minReasonable: 10,
  },
  heating: {
    icon: Thermometer,
    solidBg: 'bg-rose-500',
    accentBg: 'bg-rose-500/10',
    accentText: 'text-rose-400',
    accentStrip: 'bg-rose-500',
    unit: 'kWh',
    label: 'Šildymas',
    maxReasonable: 1500,
    minReasonable: 100,
  },
};

function mapMeterType(name: string): string {
  const n = (name || '').toLowerCase();
  if (n.includes('vanduo') || n.includes('water') || n.includes('karštas') || n.includes('šaltas')) return 'water';
  if (n.includes('šildym') || n.includes('heat')) return 'heating';
  if (n.includes('duj') || n.includes('gas')) return 'gas';
  return 'electricity';
}

// ─── Shared tokens ───────────────────────────────────────────────────────────

// Card style with CardsBackground.webp
const cardStyle: React.CSSProperties = {
  backgroundImage: 'url(/images/CardsBackground.webp)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
};

// ═══════════════════════════════════════════════════════════════════════════════

const TenantMeters: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [meterConfigs, setMeterConfigs] = useState<MeterConfig[]>([]);
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [addressId, setAddressId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingPhotos, setUploadingPhotos] = useState<Record<string, boolean>>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ─── Data fetching ────────────────────────────────────────────────────────

  useEffect(() => {
    const resolve = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
        const { data: notifData } = await supabase
          .from('notifications').select('data')
          .eq('user_id', user.id).eq('kind', 'meter_reading_request').eq('is_read', false)
          .order('created_at', { ascending: false }).limit(1).maybeSingle();

        if (notifData?.data?.address_id && notifData?.data?.property_id) {
          setAddressId(notifData.data.address_id);
          setPropertyId(notifData.data.property_id);
          return;
        }
        const { data: authData } = await supabase.auth.getUser();
        const email = authData?.user?.email;
        if (email) {
          const { data: inv } = await supabase.from('tenant_invitations').select('property_id').eq('status', 'accepted');
          const my = inv?.filter((i: any) => i.email?.toLowerCase() === email.toLowerCase()) || inv || [];
          if (my.length > 0) {
            const { data: p } = await supabase.from('properties').select('id, address_id').eq('id', my[0].property_id).maybeSingle();
            if (p) { setPropertyId(p.id); setAddressId(p.address_id); return; }
          }
        }
        setIsLoading(false);
      } catch { setIsLoading(false); }
    };
    resolve();
  }, [user]);

  useEffect(() => {
    const fetch = async () => {
      if (!user || !addressId) return;
      try {
        setIsLoading(true);
        const { data: am, error: e } = await supabase.from('address_meters')
          .select('id, address_id, name, type, unit, price_per_unit, fixed_price, distribution_method, requires_photo, is_active, collection_mode, created_at')
          .eq('address_id', addressId).eq('is_active', true);
        if (e || !am || am.length === 0) { setIsLoading(false); return; }
        setMeterConfigs(am);

        const { data: nd } = await supabase.from('notifications').select('data')
          .eq('user_id', user.id).eq('kind', 'meter_reading_request').eq('is_read', false)
          .order('created_at', { ascending: false }).limit(1).maybeSingle();

        const nids = nd?.data?.meters?.map((m: any) => m.id) || [];
        const deadline = nd?.data?.deadline || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
        const show = nids.length > 0 ? am.filter((m: any) => nids.includes(m.id)) : am.filter((m: any) => m.type === 'individual');
        const ids = show.map((m: any) => m.id);
        const { data: prev } = await supabase.from('meter_readings').select('meter_id, current_reading').in('meter_id', ids).order('reading_date', { ascending: false });
        const latest: Record<string, number> = {};
        prev?.forEach((r: any) => { if (!(r.meter_id in latest)) latest[r.meter_id] = r.current_reading ?? 0; });

        setReadings(show.map((c: any) => ({
          id: c.id, meterType: mapMeterType(c.name) as MeterReading['meterType'], meterConfigId: c.id,
          previousReading: latest[c.id] ?? 0, currentReading: 0, date: new Date().toISOString().split('T')[0],
          photos: [], status: 'pending', submissionDeadline: deadline, meterNumber: c.name, location: c.name,
          requirePhoto: c.requires_photo ?? false,
        })));
      } catch { /* silent */ } finally { setIsLoading(false); }
    };
    fetch();
  }, [user, addressId, propertyId]);

  // ─── Validation ────────────────────────────────────────────────────────────

  const validate = useCallback((r: MeterReading): MeterValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const info = METER_TYPE_INFO[r.meterType];
    if (!info) return { isValid: true, errors, warnings };
    if (r.currentReading === 0) errors.push('Rodmuo privalomas');
    if (r.currentReading > 0 && r.currentReading < r.previousReading) errors.push('Rodmuo negali b\u016Bti mažesnis');
    if (r.requirePhoto && r.photos.length === 0) errors.push('Nuotrauka privaloma');
    const c = r.currentReading - r.previousReading;
    if (c > 0 && c < info.minReasonable) warnings.push('Ne\u012Fprastai mažas suvartojimas');
    if (c > info.maxReasonable) warnings.push('Ne\u012Fprastai didelis suvartojimas');
    return { isValid: errors.length === 0, errors, warnings };
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleReadingChange = useCallback((id: string, v: string) => {
    setReadings(p => p.map(m => m.id === id ? { ...m, currentReading: parseFloat(v) || 0 } : m));
  }, []);

  const handlePhotoUpload = useCallback(async (meterId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !user) return;
    setUploadingPhotos(p => ({ ...p, [meterId]: true }));
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() || 'jpg';
        const fn = `readings/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
        const { error } = await supabase.storage.from('meter-readings').upload(fn, file, { cacheControl: '3600', upsert: false });
        if (error) continue;
        const { data } = supabase.storage.from('meter-readings').getPublicUrl(fn);
        if (data?.publicUrl) urls.push(data.publicUrl);
      }
      if (urls.length > 0) setReadings(p => p.map(m => m.id === meterId ? { ...m, photos: [...m.photos, ...urls] } : m));
    } catch { /* silent */ }
    finally {
      setUploadingPhotos(p => ({ ...p, [meterId]: false }));
      const ref = fileInputRefs.current[meterId];
      if (ref) ref.value = '';
    }
  }, [user]);

  const removePhoto = useCallback((id: string, idx: number) => {
    setReadings(p => p.map(m => m.id === id ? { ...m, photos: m.photos.filter((_, i) => i !== idx) } : m));
  }, []);

  const handleSubmit = useCallback(async () => {
    setHasAttemptedSubmit(true);
    setSubmitError(null);
    if (readings.some(r => !validate(r).isValid)) {
      setSubmitError('Ištaisykite klaidas prieš pateikdami rodmenis');
      return;
    }
    setIsSubmitting(true);
    try {
      const rows = readings.map(r => {
        const c = r.currentReading - r.previousReading;
        const cfg = meterConfigs.find(x => x.id === r.meterConfigId);
        const ppu = cfg?.price_per_unit || 0;
        const fp = cfg?.fixed_price || 0;
        const total = fp > 0 ? fp : c * ppu;
        return {
          property_id: propertyId, meter_id: r.meterConfigId,
          meter_type: cfg?.distribution_method === 'per_consumption' ? 'apartment' : 'address',
          type: mapMeterType(cfg?.name || ''), reading_date: r.date,
          previous_reading: r.previousReading, current_reading: r.currentReading,
          difference: c, price_per_unit: ppu, total_sum: total, amount: total,
          notes: 'Nuomininko pateiktas rodmuo',
          photo_urls: r.photos.length > 0 ? r.photos : [], submitted_by: user?.id,
        };
      });
      const { error } = await supabase.from('meter_readings').insert(rows);
      if (error) { setSubmitError('Nepavyko pateikti. Bandykite dar kartą.'); setIsSubmitting(false); return; }

      if (addressId) {
        try {
          const { data: a } = await supabase.from('addresses').select('created_by').eq('id', addressId).single();
          if (a?.created_by) {
            const period = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
            await supabase.from('notifications').insert({
              user_id: a.created_by, kind: 'meter_readings_submitted',
              title: 'Nuomininkas pateikė rodmenis',
              body: `Gauti rodmenys už ${period}. ${readings.length} skaitliukai.`,
              data: { address_id: addressId, property_id: propertyId, meter_count: readings.length, period },
            });
          }
        } catch { /* non-blocking */ }
      }
      if (user?.id) {
        await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() })
          .eq('user_id', user.id).eq('kind', 'meter_reading_request').eq('is_read', false);
      }
      setReadings(p => p.map(m => ({ ...m, status: 'approved' as const })));
      setIsSubmitting(false);
      setShowSuccess(true);
    } catch { setSubmitError('Klaida. Bandykite dar kartą.'); setIsSubmitting(false); }
  }, [readings, meterConfigs, propertyId, addressId, user, validate]);

  // ─── Computed ──────────────────────────────────────────────────────────────

  const readyCount = useMemo(() => readings.filter(r => validate(r).isValid).length, [readings, validate]);
  const progress = readings.length > 0 ? Math.round((readyCount / readings.length) * 100) : 0;
  const getDaysLeft = useCallback((d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000), []);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen text-white"
      style={{
        backgroundImage: 'url(/images/tenants\\ meters.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* ── Hero header ── */}
      <div className="relative">
        <div className="max-w-2xl mx-auto px-4 lg:px-6 pt-6 pb-6" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => navigate('/tenant')}
              className="w-8 h-8 bg-white/[0.15] border border-white/[0.20] rounded-lg flex items-center justify-center hover:bg-white/[0.25] transition-colors active:scale-[0.97] backdrop-blur-sm"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <span className="text-[10px] text-white/60 font-medium">{'Nuomininkas'}</span>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-9 h-9 rounded-xl bg-[#2F8481] flex items-center justify-center shadow-lg shadow-[#2F8481]/20">
                  <Gauge className="w-4.5 h-4.5 text-white" />
                </div>
                <h1 className="text-[18px] font-bold tracking-tight">{'Skaitlikų rodmenys'}</h1>
              </div>
              <p className="text-[11px] text-white/60 ml-[47px]">{'Pateikite savo mėnesio rodmenis'}</p>
            </div>
            {readings.length > 0 && !showSuccess && (
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] font-bold text-[#5ec4c1]">{readyCount}/{readings.length}</span>
                <div className="w-24 h-1.5 bg-white/[0.15] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2F8481] rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-2xl mx-auto px-4 lg:px-6 pb-8">
        {isLoading ? (
          <div className="rounded-xl overflow-hidden border border-gray-200/20" style={cardStyle}>
            <div className="text-center py-16">
              <Loader2 className="w-7 h-7 text-[#2F8481] mx-auto mb-3 animate-spin" />
              <p className="text-[11px] text-gray-500">{'Kraunama skaitliklų informacija...'}</p>
            </div>
          </div>
        ) : readings.length === 0 ? (
          <div className="rounded-xl overflow-hidden border border-gray-200/20" style={cardStyle}>
            <div className="text-center py-14 px-6">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Info className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-[13px] font-bold text-gray-800 mb-1">{'Nėra prašomų rodmenų'}</h3>
              <p className="text-[11px] text-gray-500 max-w-xs mx-auto">{'Nuomotojas dar neprašė skaitliklų rodmenų arba jie jau pateikti.'}</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Success ── */}
            {showSuccess && (
              <div className="rounded-xl overflow-hidden border border-emerald-200/30 mb-4" style={cardStyle}>
                <div className="bg-emerald-50/90 backdrop-blur-sm px-4 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[13px] font-bold text-emerald-800">{'Rodmenys sėkmingai pateikti!'}</h3>
                    <p className="text-[10px] text-emerald-600/70">{'Nuomotojas gavo pranešimą.'}</p>
                  </div>
                  <button
                    onClick={() => navigate('/tenant')}
                    className="px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    {'Grįžti'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Error ── */}
            {submitError && (
              <div className="mb-4 bg-red-50/90 backdrop-blur-sm border border-red-200/40 rounded-xl px-4 py-3 flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-[10px] text-red-700 font-medium">{submitError}</p>
              </div>
            )}

            {/* ── Meter Cards ── */}
            <div className="space-y-3">
              {readings.map((meter) => {
                const info = METER_TYPE_INFO[meter.meterType];
                if (!info) return null;
                const Icon = info.icon;
                const consumption = meter.currentReading - meter.previousReading;
                const v = validate(meter);
                const daysLeft = getDaysLeft(meter.submissionDeadline);
                const showErrors = hasAttemptedSubmit && v.errors.length > 0;

                return (
                  <div key={meter.id} className="rounded-xl overflow-hidden border border-gray-200/20 shadow-sm" style={cardStyle}>
                    {/* Colored top accent */}
                    <div className={`h-[2px] ${info.accentStrip}`} />

                    <div>
                      {/* Header */}
                      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg ${info.solidBg} flex items-center justify-center shadow-sm`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h3 className="text-[12px] font-bold text-gray-800">{meter.meterNumber}</h3>
                            <p className="text-[9px] text-gray-500">{info.label} {'\u00B7'} {info.unit}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${meter.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          daysLeft < 0 ? 'bg-red-100 text-red-700' :
                            daysLeft <= 3 ? 'bg-amber-100 text-amber-700' :
                              'bg-[#2F8481]/10 text-[#2F8481]'
                          }`}>
                          {meter.status === 'approved' ? 'Pateikta' :
                            daysLeft < 0 ? `Vėluoja ${Math.abs(daysLeft)}d.` :
                              daysLeft <= 3 ? `Liko ${daysLeft}d.` : 'Laukiama'}
                        </span>
                      </div>

                      {/* Errors */}
                      {showErrors && (
                        <div className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-200/40 rounded-lg flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                          <span className="text-[9px] text-red-600 font-medium">{v.errors.join(' \u00B7 ')}</span>
                        </div>
                      )}

                      {/* Input row */}
                      <div className="px-4 pb-3 space-y-2.5">
                        <div className="grid grid-cols-2 gap-3">
                          {/* Previous */}
                          <div>
                            <label className="text-[9px] font-medium text-gray-400 mb-1 block">{'Ankstesnis'}</label>
                            <div className="relative">
                              <input
                                type="number"
                                value={meter.previousReading || ''}
                                onChange={e => { const val = parseFloat(e.target.value) || 0; setReadings(p => p.map(r => r.id === meter.id ? { ...r, previousReading: val } : r)); }}
                                disabled={showSuccess}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-500 placeholder-gray-400 focus:ring-1 focus:ring-[#2F8481]/40 focus:border-[#2F8481]/40 transition-all disabled:opacity-30"
                                placeholder="0" min="0" step="0.01"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-gray-400">{info.unit}</span>
                            </div>
                          </div>
                          {/* Current */}
                          <div>
                            <label className="text-[9px] font-medium text-gray-600 mb-1 block">{'Dabartinis *'}</label>
                            <div className="relative">
                              <input
                                type="number"
                                value={meter.currentReading || ''}
                                onChange={e => handleReadingChange(meter.id, e.target.value)}
                                disabled={showSuccess}
                                className={`w-full px-3 py-2 bg-white border rounded-lg text-[13px] text-gray-800 placeholder-gray-400 focus:ring-1 focus:ring-[#2F8481]/40 focus:border-[#2F8481]/40 transition-all disabled:opacity-30 ${showErrors && v.errors.some(e => e.includes('Rodmuo')) ? 'border-red-400 bg-red-50/50' : 'border-gray-200'
                                  }`}
                                placeholder={'Įveskite'} min={meter.previousReading} step="0.01"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-gray-400">{info.unit}</span>
                            </div>
                          </div>
                        </div>

                        {/* Consumption chip */}
                        {meter.currentReading > 0 && consumption >= 0 && (
                          <div className={`flex items-center justify-between ${info.accentBg} rounded-lg px-3 py-2`}>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className={`w-3.5 h-3.5 ${info.accentText}`} />
                              <span className="text-[9px] text-gray-500 font-medium">{'Suvartota'}</span>
                            </div>
                            <span className={`text-[12px] font-bold ${info.accentText}`}>{consumption.toLocaleString('lt-LT')} {info.unit}</span>
                          </div>
                        )}

                        {/* Warnings */}
                        {v.warnings.length > 0 && meter.currentReading > 0 && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200/40 rounded-lg">
                            <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                            <span className="text-[9px] text-amber-700">{v.warnings[0]}</span>
                          </div>
                        )}

                        {/* Photo upload zone */}
                        {meter.requirePhoto && meter.photos.length === 0 && (
                          <div
                            onClick={() => fileInputRefs.current[meter.id]?.click()}
                            className={`border border-dashed rounded-lg px-3 py-3 flex items-center gap-3 cursor-pointer transition-all hover:border-[#2F8481] hover:bg-[#2F8481]/5 group ${showErrors && v.errors.some(e => e.includes('Nuotrauka')) ? 'border-red-400 bg-red-50/30' : 'border-gray-300'
                              }`}
                          >
                            <input ref={el => { fileInputRefs.current[meter.id] = el; }} type="file" accept="image/*" multiple onChange={e => handlePhotoUpload(meter.id, e)} className="hidden" />
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-[#2F8481]/10 transition-colors">
                              {uploadingPhotos[meter.id]
                                ? <Loader2 className="w-4 h-4 text-[#2F8481] animate-spin" />
                                : <Camera className="w-4 h-4 text-gray-400 group-hover:text-[#2F8481] transition-colors" />
                              }
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-gray-600">{uploadingPhotos[meter.id] ? 'Įkeliama...' : 'Pridėti nuotrauką'}</p>
                              <p className="text-[8px] text-gray-400">{'Nufotografuokite skaitliuką'}</p>
                            </div>
                          </div>
                        )}

                        {/* Photo thumbnails */}
                        {meter.photos.length > 0 && (
                          <div className="flex items-center gap-2 pt-1">
                            {meter.photos.map((photo, i) => (
                              <div key={i} className="relative group w-12 h-12 rounded-lg overflow-hidden ring-1 ring-gray-200">
                                <img src={photo} alt="" className="w-full h-full object-cover" />
                                <button onClick={() => removePhoto(meter.id, i)} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Trash2 className="w-3.5 h-3.5 text-white" />
                                </button>
                              </div>
                            ))}
                            {meter.requirePhoto && (
                              <div onClick={() => fileInputRefs.current[meter.id]?.click()} className="w-12 h-12 border border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-[#2F8481] transition-all">
                                <input ref={el => { fileInputRefs.current[meter.id] = el; }} type="file" accept="image/*" multiple onChange={e => handlePhotoUpload(meter.id, e)} className="hidden" />
                                <Camera className="w-3.5 h-3.5 text-gray-400" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Submit ── */}
            {!showSuccess && (
              <div className="mt-6">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#2F8481] hover:bg-[#276e6b] text-white text-[12px] font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#2F8481]/20 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {'Siunčiama...'}</>
                  ) : (
                    <><Send className="w-4 h-4" /> {'Pateikti rodmenis'} ({readyCount}/{readings.length})</>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TenantMeters;
