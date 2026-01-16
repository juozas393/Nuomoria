import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const EMAIL_REGEX = /[^\s@]+@[^\s@]+\.[^\s@]+/;

type FormState = {
  email: string;
};

const initialState: FormState = {
  email: '',
};

const ForgotPasswordPage: React.FC = () => {
  const { requestPasswordReset } = useAuth();
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await requestPasswordReset(form.email.trim());
      setSuccess('Slaptažodžio atkūrimo nuoroda išsiųsta. Patikrinkite el. paštą.');
      setForm(initialState);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nepavyko išsiųsti atkūrimo nuorodos.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const emailIsValid = EMAIL_REGEX.test(form.email.trim());

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#f3fbfb] to-white flex items-center">
      <div className="w-full max-w-6xl mx-auto px-4 lg:px-12 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="hidden lg:flex flex-col gap-12">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
                Slaptažodžio atkūrimas
              </span>
              <h1 className="text-3xl font-semibold text-gray-900">
                Atkurkite prisijungimą vos keliais žingsniais
              </h1>
              <p className="text-base text-gray-600 leading-relaxed max-w-lg">
                Įveskite el. pašto adresą, kurį naudojate Nuomoria paskyrai. Siųsime saugią nuorodą slaptažodžiui atkurti.
              </p>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5 shadow-sm space-y-2 max-w-md">
              <p className="text-sm font-semibold text-primary">Saugi procedūra</p>
              <p className="text-sm text-primary/80">Nuoroda galioja ribotą laiką. Jei jos negavote – patikrinkite šlamšto aplanką.</p>
            </div>
          </div>

          <div className="w-full flex justify-center">
            <div className="w-full max-w-md">
              <div className="rounded-[26px] border border-gray-100 bg-white shadow-xl backdrop-blur px-8 py-10 space-y-8">
                <div className="text-center space-y-3">
                  <h2 className="text-2xl font-semibold text-gray-900">Prisiminti slaptažodį</h2>
                  <p className="text-sm text-gray-600">
                    Įveskite el. paštą ir atsiųsime nuorodą slaptažodžio atkūrimui.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-1 text-left">
                    <label htmlFor="reset-email" className="text-sm font-medium text-gray-700">
                      El. paštas
                    </label>
                    <div className="relative">
                      <input
                        id="reset-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={form.email}
                        onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                        className="w-full cursor-text rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm placeholder:text-gray-400 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary"
                        placeholder="pvz. vardas@nuomoria.lt"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary" role="status">
                      {success}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !emailIsValid}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-primary/90 active:bg-primary/80 active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/35 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? 'Siunčiama nuoroda...' : 'Siųsti atkūrimo nuorodą'}
                  </button>
                </form>

                <div className="text-center text-sm text-gray-600">
                  <Link to="/login" className="text-primary font-medium hover:text-primary/80 hover:underline">
                    Grįžti į prisijungimą
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;














