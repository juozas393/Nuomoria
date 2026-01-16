import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getDefaultRouteForRole } from '../utils/roleRouting';
import OnboardingProgress from './OnboardingProgress';
import OnboardingWelcome from './OnboardingWelcome';
import { UserRole } from '../types/user';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  isCompleted: boolean;
}

interface UserProfile {
  first_name: string;
  last_name: string;
  phone: string;
  role: UserRole;
  company_name?: string;
  company_phone?: string;
  company_email?: string;
}

const UserOnboarding: React.FC = () => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    first_name: '',
    last_name: '',
    phone: '',
    role: 'tenant',
    company_name: '',
    company_phone: '',
    company_email: ''
  });

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Sveiki atvykę! 👋',
      description: 'Pradėkime nuo pagrindų - susitvarkykime jūsų profilį',
      component: OnboardingWelcome,
      isCompleted: false
    },
    {
      id: 'profile',
      title: 'Jūsų profilis',
      description: 'Įveskite savo asmeninę informaciją',
      component: ProfileStep,
      isCompleted: false
    },
    {
      id: 'role',
      title: 'Jūsų rolė',
      description: 'Pasirinkite, kaip naudosite sistemą',
      component: RoleStep,
      isCompleted: false
    },
    {
      id: 'company',
      title: 'Įmonės informacija',
      description: 'Jei esate nuomotojas ar valdytojas, įveskite įmonės duomenis',
      component: CompanyStep,
      isCompleted: false
    },
    {
      id: 'complete',
      title: 'Baigta! 🎉',
      description: 'Jūsų profilis sėkmingai sukonfigūruotas',
      component: CompleteStep,
      isCompleted: false
    }
  ];

  // Check if user is new (first time login)
  const isNewUser = user && (
    !user.first_name || 
    user.first_name === 'User' || 
    !user.last_name || 
    user.last_name === 'Name'
  );

  useEffect(() => {
    if (user && !isNewUser) {
      // User already has profile, redirect to dashboard
      window.location.href = getDefaultRouteForRole(user.role);
    }
  }, [user, isNewUser]);

  useEffect(() => {
    if (user?.role && profile.role === 'tenant' && user.role !== 'tenant') {
      setProfile((prev) => ({
        ...prev,
        role: user.role as UserRole,
      }));
    }
  }, [user?.role, profile.role]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          role: profile.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) {
        console.error('❌ Error updating user profile:', error);
        return;
      }

      // Redirect to dashboard
      window.location.href = getDefaultRouteForRole(profile.role);
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Skip onboarding and redirect to dashboard
    window.location.href = getDefaultRouteForRole(profile.role);
  };

  // Show loading while user is being loaded
  // Also wait for AuthContext to finish loading
  const { loading: authLoading } = useAuth();
  
  if (!user || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Kraunama...</p>
          {process.env.NODE_ENV === 'development' && (
            <p className="mt-2 text-sm text-gray-500">
              {!user ? 'Laukiama vartotojo duomenų...' : 'Užkraunamas vartotojo profilis...'}
            </p>
          )}
        </div>
      </div>
    );
  }

  // If user already has complete profile and role, they shouldn't be here
  // This check is handled by the useEffect above, but we also check here for immediate redirect
  if (user && user.role && user.first_name && user.first_name !== 'User' && user.last_name && user.last_name !== 'Name') {
    // User already has complete profile, redirect immediately
    const defaultRoute = getDefaultRouteForRole(user.role);
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 User already has complete profile, redirecting to:', defaultRoute);
    }
    // Use setTimeout to avoid React state update warning
    setTimeout(() => {
      window.location.href = defaultRoute;
    }, 0);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Nukreipiama...</p>
        </div>
      </div>
    );
  }

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Progress Component */}
        <OnboardingProgress 
          currentStep={currentStep}
          totalSteps={steps.length}
          onSkip={handleSkip}
        />

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {steps[currentStep].title}
            </h1>
            <p className="text-gray-600">
              {steps[currentStep].description}
            </p>
          </div>

          <CurrentStepComponent
            profile={profile}
            setProfile={setProfile}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onComplete={handleComplete}
            isLoading={isLoading}
            isFirstStep={currentStep === 0}
            isLastStep={currentStep === steps.length - 1}
          />
        </div>
      </div>
    </div>
  );
};

// Step Components

const ProfileStep: React.FC<any> = ({ profile, setProfile, onNext, onPrevious }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Vardas *
        </label>
        <input
          type="text"
          value={profile.first_name}
          onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Įveskite savo vardą"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pavardė *
        </label>
        <input
          type="text"
          value={profile.last_name}
          onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Įveskite savo pavardę"
          required
        />
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Telefono numeris
      </label>
      <input
        type="tel"
        value={profile.phone}
        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        placeholder="+370 6XX XXXXX"
      />
    </div>
    <div className="flex justify-between">
      <button
        onClick={onPrevious}
        className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Atgal
      </button>
      <button
        onClick={onNext}
        disabled={!profile.first_name || !profile.last_name}
        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Toliau
      </button>
    </div>
  </div>
);

const RoleStep: React.FC<any> = ({ profile, setProfile, onNext, onPrevious }) => {
  const roles: Array<{ value: UserRole; label: string; description: string; icon: string }> = [
    {
      value: 'tenant',
      label: 'Nuomininkas',
      description: 'Nuomoju butą ir moku už nuomą bei komunalinius paslaugas',
      icon: '🏠'
    },
    {
      value: 'landlord',
      label: 'Nuomotojas',
      description: 'Nuomoju butus, valdau nuomininkus ir renku nuomą bei komunalinius mokėjimus',
      icon: '🏢'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {roles.map((role) => (
          <label
            key={role.value}
            className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
              profile.role === role.value
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="role"
              value={role.value}
              checked={profile.role === role.value}
              onChange={(e) => setProfile({ ...profile, role: e.target.value as UserRole })}
              className="sr-only"
            />
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{role.icon}</span>
              <div>
                <div className="font-medium text-gray-900">{role.label}</div>
                <div className="text-sm text-gray-600">{role.description}</div>
              </div>
            </div>
          </label>
        ))}
      </div>
      <div className="flex justify-between">
        <button
          onClick={onPrevious}
          className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Atgal
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Toliau
        </button>
      </div>
    </div>
  );
};

const CompanyStep: React.FC<any> = ({ profile, setProfile, onNext, onPrevious, isLastStep }) => {
  const showCompanyFields = profile.role === 'landlord';

  if (!showCompanyFields) {
    return (
      <div className="text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✅</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Jums nereikia įmonės duomenų
          </h3>
          <p className="text-gray-600">
            Jūsų rolė ({profile.role === 'tenant' ? 'Nuomininkas' : 'Nuomotojas'}) nereikalauja papildomų įmonės duomenų.
          </p>
        </div>
        <div className="flex justify-between">
          <button
            onClick={onPrevious}
            className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Atgal
          </button>
          <button
            onClick={onNext}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Toliau
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <span className="text-blue-600">ℹ️</span>
          <span className="text-sm text-blue-800">
            Įmonės duomenys yra neprivalomi, bet gali būti naudingi valdant nekilnojamąjį turtą.
          </span>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Įmonės pavadinimas
          </label>
          <input
            type="text"
            value={profile.company_name || ''}
            onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Įveskite įmonės pavadinimą"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Įmonės telefonas
            </label>
            <input
              type="tel"
              value={profile.company_phone || ''}
              onChange={(e) => setProfile({ ...profile, company_phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="+370 6XX XXXXX"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Įmonės el. paštas
            </label>
            <input
              type="email"
              value={profile.company_email || ''}
              onChange={(e) => setProfile({ ...profile, company_email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="info@imone.lt"
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={onPrevious}
          className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Atgal
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Toliau
        </button>
      </div>
    </div>
  );
};

const CompleteStep: React.FC<any> = ({ profile, onComplete, onPrevious, isLoading }) => (
  <div className="text-center">
    <div className="mb-8">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-4xl">🎉</span>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Profilis sėkmingai sukonfigūruotas!
      </h2>
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">Jūsų profilis:</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>Vardas:</strong> {profile.first_name} {profile.last_name}</p>
          <p><strong>Rolė:</strong> {
            profile.role === 'tenant' ? 'Nuomininkas' :
            profile.role === 'landlord' ? 'Nuomotojas' :
            'Kita'
          }</p>
          {profile.phone && <p><strong>Telefonas:</strong> {profile.phone}</p>}
          {profile.company_name && <p><strong>Įmonė:</strong> {profile.company_name}</p>}
        </div>
      </div>
    </div>
    
    <div className="flex justify-between">
      <button
        onClick={onPrevious}
        className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Atgal
      </button>
      <button
        onClick={onComplete}
        disabled={isLoading}
        className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Išsaugoma...</span>
          </div>
        ) : (
          'Pradėti naudoti sistemą'
        )}
      </button>
    </div>
  </div>
);

export default UserOnboarding;
