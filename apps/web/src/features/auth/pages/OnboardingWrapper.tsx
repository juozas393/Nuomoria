import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import OnboardingPage from './OnboardingPage';

/**
 * Onboarding Wrapper - Handles auth check and passes user data to onboarding
 */

const OnboardingWrapper: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Not authenticated -> redirect to login
        navigate('/login');
        return;
      }

      // Check if user already has a profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      // Handle 406 errors gracefully (table schema mismatch)
      if (profileError && profileError.code !== 'PGRST116') {
        console.warn('Profile check error (non-fatal):', profileError);
      }

      if (profile) {
        // Already onboarded -> redirect to dashboard
        if (profile.role === 'landlord') {
          navigate('/');
        } else {
          navigate('/tenant');
        }
        return;
      }

      // Note: We do NOT skip onboarding just because users table has a role.
      // The default 'tenant' role from ensure_user_row doesn't mean the user chose it.
      // Only a profiles record confirms completed onboarding.

      // Set user data for onboarding
      setUserEmail(session.user.email || '');
      setUserId(session.user.id);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/ImageIntroduction.jpg')", transform: 'scale(1.08)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(3,6,8,0.90) 0%, rgba(3,6,8,0.93) 50%, rgba(3,6,8,0.88) 100%)' }} />
        <div className="relative z-10 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4DB6AC] mx-auto mb-4"></div>
          <p className="text-white/40 text-sm">Kraunama...</p>
        </div>
      </div>
    );
  }

  return <OnboardingPage userEmail={userEmail} userId={userId} />;
};

export default OnboardingWrapper;
