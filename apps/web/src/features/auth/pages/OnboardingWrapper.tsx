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
          navigate('/tenant/dashboard');
        }
        return;
      }

      // ALSO check users table - if user already has a role there, skip onboarding
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!userError && existingUser?.role) {
        // User already has a role in users table - skip onboarding
        console.log('User already has role in users table:', existingUser.role);
        if (existingUser.role === 'landlord') {
          navigate('/');
        } else {
          navigate('/tenant/dashboard');
        }
        return;
      }

      // Set user data for onboarding
      setUserEmail(session.user.email || '');
      setUserId(session.user.id);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6FAF9] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F8481] mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Kraunama...</p>
        </div>
      </div>
    );
  }

  return <OnboardingPage userEmail={userEmail} userId={userId} />;
};

export default OnboardingWrapper;
