import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface TotpEnrollment {
  factorId: string;
  challengeId: string | null;
  qrCode?: string;
  secret?: string;
}

type TotpFactor = {
  id: string;
  type: 'totp';
  status: 'verified' | 'unverified';
  friendly_name?: string | null;
};

const COOLDOWN_MS = 15_000;

const removeExistingTotpFactors = async () => {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  const totpFactors = data?.totp ?? [];
  await Promise.all(
    totpFactors.map((factor) =>
      supabase.auth.mfa.unenroll({ factorId: factor.id }).catch(() => undefined)
    )
  );
};

const hasVerifiedFactor = async (): Promise<boolean> => {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return (data?.totp ?? []).some((factor) => factor.status === 'verified');
};

const formatError = (error: unknown): string => {
  if (!error) return 'Nežinoma klaida';
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Nežinoma klaida';
};

const formatTimestamp = (iso?: string | null): string => {
  if (!iso) return 'Nenurodyta';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Nenurodyta';
  return date.toLocaleString('lt-LT');
};

const TwoFactorSection: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [removalLoading, setRemovalLoading] = useState(false);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<number | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const [enrolledFactor, setEnrolledFactor] = useState<TotpFactor | null>(null);
  const [pendingFactor, setPendingFactor] = useState<TotpFactor | null>(null);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const qrCodeSrc = useMemo(() => {
    const value = enrollment?.qrCode;
    if (!value) return null;

    if (value.startsWith('data:image')) {
      return value;
    }

    if (value.trim().startsWith('<svg')) {
      return `data:image/svg+xml;utf8,${encodeURIComponent(value)}`;
    }

    return value;
  }, [enrollment?.qrCode]);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const startChallenge = async (factorId: string): Promise<string | null> => {
    const { data, error } = await supabase.auth.mfa.challenge({ factorId });
    if (error) throw error;
    return data?.id ?? null;
  };

  const fetchFactors = async () => {
    try {
      setLoading(true);
      clearMessages();
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;

      const totpFactors = data?.totp ?? [];
      const verified = totpFactors.find((factor) => factor.status === 'verified') ?? null;
      const pending = totpFactors.find((factor) => factor.status === 'unverified') ?? null;

      if (verified) {
        try {
          await (supabase.auth.mfa as any).setDefaultFactor?.({ factorId: verified.id });
        } catch (defaultErr) {
          // Ignore: method may be unavailable on older SDK versions
        }
      }

      setEnrolledFactor(verified as TotpFactor | null);
      setPendingFactor(pending as TotpFactor | null);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError(`Nepavyko gauti 2FA informacijos: ${formatError(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const resumePendingEnrollment = async (factor: TotpFactor) => {
    try {
      clearMessages();
      const challengeId = await startChallenge(factor.id);
      setEnrollment({
        factorId: factor.id,
        challengeId,
      });
      setVerificationCode('');
      setSuccess('Jau turite nebaigtą 2FA registraciją. Įveskite programėlės kodą, kad ją užbaigtumėte.');
    } catch (err) {
      setError(`Nepavyko tęsti 2FA registracijos: ${formatError(err)}`);
    }
  };

  useEffect(() => {
    fetchFactors();
  }, []);

  useEffect(() => {
    if (pendingFactor && !enrollment) {
      resumePendingEnrollment(pendingFactor);
    }
  }, [pendingFactor, enrollment]);

  const handleStartEnrollment = async () => {
    if (lastGeneratedAt && Date.now() - lastGeneratedAt < COOLDOWN_MS) {
      setError('QR kodą galima generuoti kas 15 sekundžių. Palaukite ir bandykite dar kartą.');
      return;
    }

    try {
      clearMessages();
      setEnrollmentLoading(true);
      await removeExistingTotpFactors();
      const friendlyName =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? `totp-${crypto.randomUUID()}`
          : `totp-${Date.now()}`;
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName });
      if (error) throw error;

      if (!data) {
        if (await hasVerifiedFactor()) {
          const { data: refreshed } = await supabase.auth.mfa.listFactors();
          const verifiedFactor = refreshed?.totp?.find((factor) => factor.status === 'verified');
          setEnrolledFactor((verifiedFactor as unknown as TotpFactor) ?? null);
          setPendingFactor(null);
          setEnrollment(null);
          setSuccess('2FA jau įjungtas šiame įrenginyje.');
          return;
        }
        throw new Error('Gauta tuščia registracijos informacija');
      }

      const challengeId = await startChallenge(data.id);

      setEnrollment({
        factorId: data.id,
        challengeId,
        qrCode: data.totp?.qr_code,
        secret: data.totp?.secret,
      });
      setVerificationCode('');
      setLastGeneratedAt(Date.now());
      setSuccess('Sugeneruotas QR kodas. Nuskenuokite programėle ir įveskite kodą patvirtinimui.');
      setShowQrModal(true);
    } catch (err) {
      const message = formatError(err);
      if (message.includes('friendly name')) {
        try {
          await removeExistingTotpFactors();
          const friendlyName =
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? `totp-${crypto.randomUUID()}`
              : `totp-${Date.now()}`;
          const { data: retryData, error: retryError } = await supabase.auth.mfa.enroll({
            factorType: 'totp',
            friendlyName,
          });
          if (retryError || !retryData) {
            if (await hasVerifiedFactor()) {
              const { data: refreshed } = await supabase.auth.mfa.listFactors();
              const verifiedFactor = refreshed?.totp?.find((factor) => factor.status === 'verified');
              setEnrolledFactor((verifiedFactor as unknown as TotpFactor) ?? null);
              setPendingFactor(null);
              setEnrollment(null);
              setSuccess('2FA jau aktyvus. Naudokite savo autentifikatoriaus programėlę.');
            } else {
              setError('Nepavyko atnaujinti 2FA registracijos. Bandykite dar kartą vėliau.');
            }
          } else {
            const challengeId = await startChallenge(retryData.id);
            setEnrollment({
              factorId: retryData.id,
              challengeId,
              qrCode: retryData.totp?.qr_code,
              secret: retryData.totp?.secret,
            });
            setVerificationCode('');
            setLastGeneratedAt(Date.now());
            setSuccess('Sugeneruotas naujas QR kodas. Nuskenuokite programėle ir įveskite kodą patvirtinimui.');
            setShowQrModal(true);
          }
        } catch (innerErr) {
          setError(`Nepavyko atnaujinti 2FA registracijos: ${formatError(innerErr)}`);
        }
      } else {
        setError(`Nepavyko pradėti 2FA registracijos: ${message}`);
      }
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const handleVerifyEnrollment = async () => {
    if (!enrollment?.factorId || !enrollment.challengeId) {
      setError('Nerasta registracijos informacijos.');
      return;
    }

    if (!verificationCode.trim()) {
      setError('Įveskite 6 skaitmenų kodą.');
      return;
    }

    try {
      clearMessages();
      setVerificationLoading(true);
      const { error } = await supabase.auth.mfa.verify({
        factorId: enrollment.factorId,
        challengeId: enrollment.challengeId,
        code: verificationCode.replace(/\s+/g, ''),
      });
      if (error) throw error;

      try {
        await (supabase.auth.mfa as any).setDefaultFactor?.({ factorId: enrollment.factorId });
      } catch (defaultErr) {
        // Ignored: older supabase-js versions may not support setDefaultFactor
      }

      setSuccess('Daugiafaktoris patvirtinimas įjungtas.');
      setEnrollment(null);
      setVerificationCode('');
      setPendingFactor(null);
      setLastGeneratedAt(null);
      setShowQrModal(false);
      await fetchFactors();
    } catch (err) {
      setError(`Nepavyko patvirtinti 2FA: ${formatError(err)}`);
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!enrolledFactor) return;
    try {
      clearMessages();
      setRemovalLoading(true);
      const { error } = await supabase.auth.mfa.unenroll({ factorId: enrolledFactor.id });
      if (error) throw error;

      setSuccess('2FA išjungtas.');
      setEnrollment(null);
      setVerificationCode('');
      setPendingFactor(null);
      setLastGeneratedAt(null);
      setShowQrModal(false);
      await fetchFactors();
    } catch (err) {
      setError(`Nepavyko išjungti 2FA: ${formatError(err)}`);
    } finally {
      setRemovalLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-black/10 bg-black/5 px-3 py-2 text-sm text-black" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-[#2F8481]/30 bg-[#2F8481]/10 px-3 py-2 text-sm text-[#2F8481]" role="status">
          {success}
        </div>
      )}

      {enrolledFactor ? (
        <div className="p-4 border border-[#2F8481]/30 bg-[#2F8481]/10 rounded-2xl">
          <h3 className="text-sm font-semibold text-[#2F8481] mb-2">2FA įjungtas</h3>
          <p className="text-sm text-[#2F8481]/80 mb-4">
            Autentifikacijos programėlė aktyvi. Naudokite ją prisijungdami prie paskyros.
          </p>
          <button
            type="button"
            onClick={handleDisable}
            disabled={removalLoading}
            className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-black border border-black/15 rounded-xl hover:bg-black/5 transition-colors disabled:opacity-60"
          >
            {removalLoading ? 'Išjungiama...' : 'Išjungti 2FA'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 border border-black/10 rounded-2xl bg-white">
            <h3 className="text-sm font-semibold text-black mb-2">Įjunkite 2FA</h3>
            <p className="text-sm text-black/60">
              Sugeneruokite QR kodą, nuskenuokite jį autentifikacijos programėlėje ir patvirtinkite kodą.
            </p>
            <button
              type="button"
              onClick={handleStartEnrollment}
              disabled={enrollmentLoading || !!enrollment}
              className="mt-4 w-full sm:w-auto px-4 py-2 text-sm font-semibold text-white bg-[#2F8481] rounded-xl hover:opacity-90 disabled:opacity-60"
            >
              {enrollmentLoading ? 'Kuriamas QR kodas...' : enrollment ? 'QR kodas sugeneruotas' : 'Generuoti QR kodą'}
            </button>
          </div>

          {enrollment && (
            <div className="p-4 border border-black/10 rounded-2xl bg-white space-y-4">
              {showQrModal && qrCodeSrc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
                  <div className="relative bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-5">
                    <button
                      onClick={() => setShowQrModal(false)}
                      className="absolute top-4 right-4 p-3 rounded-full bg-black/5 hover:bg-black/10"
                      aria-label="Uždaryti QR kodą"
                    >
                      <svg className="w-6 h-6 text-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <img
                      src={qrCodeSrc}
                      alt="2FA QR kodas"
                      className="w-[20rem] h-[20rem] rounded-2xl border-4 border-black/10 shadow-xl bg-white"
                    />
                    {enrollment?.secret && (
                      <p className="text-sm text-black/70 font-mono break-all text-center">
                        Alternatyvus raktas: {enrollment.secret}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-4">
                {qrCodeSrc ? (
                  <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <img
                      src={qrCodeSrc}
                      alt="2FA QR kodas"
                      className="w-44 h-44 rounded-xl border border-black/20 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowQrModal(true)}
                      className="px-3 py-1.5 text-xs font-semibold text-[#2F8481] border border-[#2F8481]/40 rounded-lg hover:bg-[#2F8481]/10"
                    >
                      Atidaryti didelį QR
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-44 h-44 rounded-xl border border-dashed border-black/10 text-xs text-black/40">
                    Generuojamas QR kodas...
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-black/60">
                    Įdėkite šį QR kodą į autentifikacijos programėlę arba naudokite alternatyvų raktą.
                  </p>
                  {enrollment.secret && (
                    <p className="text-xs text-black/40 font-mono break-all">
                      Alternatyvus raktas: {enrollment.secret}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="totp-code" className="block text-sm font-semibold text-black mb-2">
                  Įveskite kodą
                </label>
                <input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full sm:w-48 px-3 py-2 border border-black/10 rounded-xl focus:ring-2 focus:ring-[#2F8481]/40 focus:border-[#2F8481]"
                  placeholder="123456"
                />
              </div>

              <button
                type="button"
                onClick={handleVerifyEnrollment}
                disabled={verificationLoading || verificationCode.length !== 6}
                className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-white bg-[#2F8481] rounded-xl hover:opacity-90 disabled:opacity-60"
              >
                {verificationLoading ? 'Tikrinama...' : 'Patvirtinti kodą'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TwoFactorSection;
