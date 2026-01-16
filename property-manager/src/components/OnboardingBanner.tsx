import React from 'react';
import { useAuth } from '../context/AuthContext';

interface OnboardingBannerProps {
  onStartOnboarding: () => void;
}

const OnboardingBanner: React.FC<OnboardingBannerProps> = ({ onStartOnboarding }) => {
  const { user } = useAuth();

  // Don't show banner if user doesn't need onboarding
  if (!user || !(user as any).needsOnboarding) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4 rounded-lg shadow-lg mb-6">
      <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-xl">🏠</span>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Sveiki atvykę į Nuomoria!</h3>
              <p className="text-white/90 text-sm">
                Susitvarkykite savo profilį, kad galėtumėte pilnai valdyti nekilnojamąjį turtą
              </p>
            </div>
          </div>
        <button
          onClick={onStartOnboarding}
          className="bg-white text-primary px-6 py-2 rounded-lg font-medium hover:bg-white/90 transition-colors"
        >
          Pradėti
        </button>
      </div>
    </div>
  );
};

export default OnboardingBanner;
