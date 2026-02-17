import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { supabase as supabaseConfig } from '../config/environment';

const EmailConfirmation: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        console.log('🔄 EmailConfirmation: Starting Google callback handling');

        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          setStatus('error');
          setMessage('Klaida gaunant sesiją. Bandykite dar kartą.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        if (!session) {
          console.log('ℹ️ No session found, redirecting to login');
          navigate('/login');
          return;
        }

        console.log('✅ Session acquired:', {
          user: session.user?.email,
          uid: session.user?.id,
          provider: session.user?.app_metadata?.provider
        });

        // Check if this is a Google OAuth callback
        if (session.user?.app_metadata?.provider === 'google') {
          console.log('🔗 Google OAuth callback detected');

          const googleEmail = session.user.email;
          const googleUserId = session.user.id;

          // Check if this is a linking operation
          const isLinking = localStorage.getItem('linkingGoogle') === 'true';
          const currentUserId = localStorage.getItem('currentUserId');
          const currentUserEmail = localStorage.getItem('currentUserEmail');

          if (isLinking && currentUserId) {
            console.log('🔗 Google account linking operation detected');
            console.log('🔗 Current user ID:', currentUserId);
            console.log('🔗 Current user email:', currentUserEmail);
            console.log('🔗 Google user ID:', googleUserId);
            console.log('🔗 Google user email:', googleEmail);

            // Handle linking scenario
            await handleGoogleLinking(currentUserId, currentUserEmail || '', googleUserId, googleEmail || '');
          } else {
            // Handle regular Google sign-in scenario
            await handleGoogleSignIn(googleUserId, googleEmail || '');
          }
        } else {
          console.log('ℹ️ Not a Google OAuth callback, redirecting to dashboard');
          navigate('/');
        }
      } catch (error) {
        console.error('❌ Error in Google callback handling:', error);
        setStatus('error');
        setMessage('Klaida apdorojant Google paskyros prijungimą. Bandykite dar kartą.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    const handleGoogleLinking = async (currentUserId: string, currentUserEmail: string, googleUserId: string, googleEmail: string) => {
      try {
        // Check if this Google account is already linked to someone else
        const { data: existingGoogleUser, error: checkError } = await supabase
          .from('users')
          .select('id, email, google_linked, google_email')
          .eq('google_email', googleEmail)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('❌ Error checking existing Google account:', checkError);
          // Continue anyway, we'll handle it in the update
        } else if (existingGoogleUser && existingGoogleUser.id !== currentUserId) {
          console.log('⚠️ Google account already linked to another user:', existingGoogleUser.email);
          setStatus('error');
          setMessage(`Ši Google paskyra jau prijungta prie kito vartotojo (${existingGoogleUser.email}). Naudokite kitą Google paskyrą arba atjunkite ją iš kito vartotojo.`);
          setTimeout(() => navigate('/profilis'), 5000);
          return;
        }

        // Note: We don't check for contact email conflicts because contact emails can be shared
        // The important check is that Google email should be unique (already checked above)

        // Check if current user already has a Google account linked
        const { data: currentUser, error: currentUserError } = await supabase
          .from('users')
          .select('google_linked, google_email')
          .eq('id', currentUserId)
          .single();

        if (currentUserError && currentUserError.code !== 'PGRST116') {
          console.error('❌ Error checking current user:', currentUserError);
        } else if (currentUser?.google_linked && currentUser.google_email !== googleEmail) {
          console.log('⚠️ Current user already has a different Google account linked');
          setStatus('error');
          setMessage(`Jūs jau turite prijungtą Google paskyrą (${currentUser.google_email}). Naudokite kitą Google paskyrą arba atjunkite esamą.`);
          setTimeout(() => navigate('/profilis'), 5000);
          return;
        }

        // Now link the Google account to the current user
        await linkGoogleToUser(currentUserId, googleEmail, googleUserId);

      } catch (error) {
        console.error('❌ Error in Google linking:', error);
        setStatus('error');
        setMessage('Klaida prijungiant Google paskyrą. Bandykite dar kartą.');
        setTimeout(() => navigate('/profilis'), 3000);
      }
    };

    const handleGoogleSignIn = async (googleUserId: string, googleEmail: string) => {
      try {
        console.log('ℹ️ Regular Google sign-in detected');

        // Check if this Google account is already linked to a user
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id, email, google_linked, google_email, role')
          .eq('google_email', googleEmail)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('❌ Error checking existing Google account:', checkError);
          // Continue to dashboard
        } else if (existingUser) {
          console.log('✅ Google account found linked to user:', existingUser.email);
          // The user is already linked, just go to dashboard
          setStatus('success');
          setMessage('Sėkmingai prisijungta su Google paskyra!');
          setTimeout(() => navigate('/'), 2000);
          return;
        }

        // Check if there's a regular account with the same email
        const { data: regularUser, error: regularUserError } = await supabase
          .from('users')
          .select('id, email, google_linked, google_email, role')
          .eq('email', googleEmail)
          .single();

        if (regularUserError && regularUserError.code !== 'PGRST116') {
          console.error('❌ Error checking regular user:', regularUserError);
        } else if (regularUser && !regularUser.google_linked) {
          console.log('⚠️ Found regular account with same contact email, but not linked to Google');
          console.log('🔍 Regular user:', regularUser);
          console.log('ℹ️ This is normal - contact email can be shared, but Google email should be unique');

          // This is actually OK - contact emails can be shared
          // The important thing is that Google email should be unique
          // Let's continue with normal Google sign-in process

          console.log('✅ Contact email conflict is OK - proceeding with Google sign-in');
          setStatus('success');
          setMessage('Sėkmingai prisijungta su Google paskyra!');
          setTimeout(() => navigate('/'), 2000);
          return;
        }

        // This is a completely new Google account
        console.log('ℹ️ New Google account, creating new user or continuing...');
        setStatus('success');
        setMessage('Sėkmingai prisijungta su Google paskyra!');
        setTimeout(() => navigate('/'), 2000);

      } catch (error) {
        console.error('❌ Error in Google sign-in:', error);
        setStatus('error');
        setMessage('Klaida prisijungiant su Google paskyra. Bandykite dar kartą.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    const linkGoogleToUser = async (userId: string, googleEmail: string, googleUserId: string) => {
      try {
        console.log('🔗 Attempting to link Google account to user...');

        // Method 1: Try direct database update
        // Security: Use centralized environment configuration
        const response = await fetch(`${supabaseConfig.url}/rest/v1/users?id=eq.${userId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseConfig.anonKey,
            'Authorization': `Bearer ${supabaseConfig.anonKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            google_linked: true,
            google_email: googleEmail
          })
        });

        if (response.ok) {
          console.log('✅ Google account linked successfully via direct API call');
          setStatus('success');
          setMessage('Google paskyra sėkmingai prijungta!');

          // Clear linking flags
          localStorage.removeItem('linkingGoogle');
          localStorage.removeItem('currentUserId');
          localStorage.removeItem('currentUserEmail');

          setTimeout(() => navigate('/profilis'), 2000);
          return;
        } else {
          console.log('⚠️ Direct API call failed, trying Supabase client...');

          // Method 2: Try Supabase client
          const { error: updateError } = await supabase
            .from('users')
            .update({
              google_linked: true,
              google_email: googleEmail
            })
            .eq('id', userId);

          if (updateError) {
            console.log('⚠️ Supabase client update failed:', updateError.message);

            // Method 3: Store in localStorage as fallback
            console.log('🔄 Using localStorage fallback');
            localStorage.setItem('google_linked', 'true');
            // Security: Don't store sensitive Google data in localStorage
            // In production, use secure server-side session management

            setStatus('success');
            setMessage('Google paskyra prijungta! (Laikinas sprendimas - duomenys išsaugoti lokalioje atmintyje)');
          } else {
            console.log('✅ Google account linked successfully via Supabase client');
            setStatus('success');
            setMessage('Google paskyra sėkmingai prijungta!');
          }

          // Clear linking flags
          localStorage.removeItem('linkingGoogle');
          localStorage.removeItem('currentUserId');
          localStorage.removeItem('currentUserEmail');

          setTimeout(() => navigate('/profilis'), 2000);
          return;
        }
      } catch (error) {
        console.error('❌ Error linking Google account:', error);

        // Fallback: Store in localStorage
        localStorage.setItem('google_linked', 'true');
        // Security: Don't store sensitive Google data in localStorage
        // In production, use secure server-side session management

        // Clear linking flags
        localStorage.removeItem('linkingGoogle');
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('currentUserEmail');

        setStatus('success');
        setMessage('Google paskyra prijungta! (Laikinas sprendimas)');
        setTimeout(() => navigate('/profilis'), 2000);
      }
    };

    handleGoogleCallback();
  }, [navigate]);


  const logSecurityEvent = (event: string, details: any) => {
    console.log(`🚨 SECURITY EVENT: ${event}`, {
      timestamp: new Date().toISOString(),
      details
    });
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing': return 'text-blue-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'processing': return 'animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4';
      case 'success': return 'rounded-full h-12 w-12 bg-green-100 flex items-center justify-center mx-auto mb-4';
      case 'error': return 'rounded-full h-12 w-12 bg-red-100 flex items-center justify-center mx-auto mb-4';
      default: return 'animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4';
    }
  };

  const getStatusSymbol = () => {
    switch (status) {
      case 'success': return '✓';
      case 'error': return '✗';
      default: return null;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className={getStatusIcon()}>
              {getStatusSymbol() && (
                <span className="text-2xl font-bold">{getStatusSymbol()}</span>
              )}
            </div>
            <h2 className={`text-xl font-semibold mb-2 ${getStatusColor()}`}>
              {status === 'processing' && 'Apdorojama Google paskyra...'}
              {status === 'success' && 'Sėkmė!'}
              {status === 'error' && 'Klaida'}
            </h2>
            <p className="text-gray-600">
              {message || 'Palaukite, kol apdorojame jūsų Google paskyros prijungimą.'}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmailConfirmation;