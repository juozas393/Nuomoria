import React from 'react';
import { useAuth } from '../context/AuthContext';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  onSkip?: () => void;
}

const OnboardingProgress: React.FC<OnboardingProgressProps> = ({ 
  currentStep, 
  totalSteps, 
  onSkip 
}) => {
  const { user } = useAuth();
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-primary font-semibold text-sm">
              {currentStep + 1}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Nustatymų vedlys</h3>
            <p className="text-sm text-gray-600">
              Žingsnis {currentStep + 1} iš {totalSteps}
            </p>
          </div>
        </div>
        
        {onSkip && (
          <button
            onClick={onSkip}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Praleisti
          </button>
        )}
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        {user?.email && (
          <span>Nustatymai vartotojui: {user.email}</span>
        )}
      </div>
    </div>
  );
};

export default OnboardingProgress;


















