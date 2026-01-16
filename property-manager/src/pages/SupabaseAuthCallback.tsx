import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function SupabaseAuthCallback() {
  const navigate = useNavigate();
  const hasRun = useRef(false);

  useEffect(() => {
    const run = async () => {
      if (hasRun.current) return;
      hasRun.current = true;

      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');

      // ✅ Jei nėra code, tai nėra PKCE callback – tiesiog tikrinam sesiją
      if (!code) {
        console.log('ℹ️ No auth code in URL. Checking existing session...');
        const { data } = await supabase.auth.getSession();

        if (data.session) {
          console.log('✅ Session already exists. Checking profile...');
          
          // Check if user has profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.session.user.id)
            .single();

          if (!profileData) {
            console.log('ℹ️ No profile found. Redirecting to onboarding...');
            navigate('/onboarding', { replace: true });
            return;
          }

          const route = profileData.role === 'landlord' ? '/nuomotojas2' : '/tenant-dashboard';
          navigate(route, { replace: true });
        } else {
          console.warn('❌ No session. Redirecting to login...');
          navigate('/login', { replace: true });
        }
        return;
      }

      // ✅ Jei yra code – darom PKCE exchange
      console.log('🔄 Exchanging code for session...');
      const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);

      if (error) {
        console.error('❌ Exchange failed:', error.message);
        navigate('/login', { replace: true });
        return;
      }

      console.log('✅ Exchange success:', data.session?.user?.email);
      
      // Check if user has profile (after OAuth sign-in)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.session!.user.id)
        .single();

      if (!profileData) {
        console.log('ℹ️ New user - redirecting to onboarding...');
        navigate('/onboarding', { replace: true });
        return;
      }

      const route = profileData.role === 'landlord' ? '/nuomotojas2' : '/tenant-dashboard';
      navigate(route, { replace: true });
    };

    run();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F8481] mx-auto mb-4"></div>
        <p className="text-gray-600">🔄 Prisijungiama...</p>
      </div>
    </div>
  );
}
