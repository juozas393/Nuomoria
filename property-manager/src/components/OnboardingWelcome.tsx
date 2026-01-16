import React from 'react';
import { useAuth } from '../context/AuthContext';
import logoImage from '../assets/LogoNormalSize-Photoroom.png';

interface OnboardingWelcomeProps {
  onStart?: () => void;
  onSkip?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  isFirstStep?: boolean;
  isLastStep?: boolean;
}

const OnboardingWelcome: React.FC<OnboardingWelcomeProps> = ({ onStart, onSkip, onNext }) => {
  const { user } = useAuth();

  return (
    <div className="text-center py-12">
      <div className="max-w-md mx-auto">
        {/* Welcome Icon */}
        <div className="w-96 h-96 mx-auto mb-4 flex items-center justify-center">
          <img 
            src={logoImage} 
            alt="Nuomoria Logo" 
            className="w-full h-full object-contain drop-shadow-xl"
          />
        </div>
        
        {/* Welcome Text */}
        <h2 className="text-2xl font-semibold text-primary mb-4">
          Sveiki atvykę!
        </h2>
        
        <p className="text-gray-600 mb-8 leading-relaxed text-lg">
          Šis trumpas nustatymų procesas padės jums susitvarkyti profilį ir pradėti valdyti nekilnojamąjį turtą su profesionalia sistema.
        </p>
        
        {/* User Info */}
        {user?.email && (
          <div className="bg-gray-50 rounded-lg p-4 mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary font-semibold">
                  {user.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Jūsų el. paštas</p>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Benefits */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-blue-900 mb-3">Ką gausite:</h3>
          <ul className="text-left text-sm text-blue-800 space-y-2">
            <li className="flex items-center space-x-2">
              <span className="text-blue-600">✓</span>
              <span>Asmeninį profilį su jūsų informacija</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-blue-600">✓</span>
              <span>Rolės pasirinkimą (nuomininkas/nuomotojas/valdytojas)</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-blue-600">✓</span>
              <span>Pilną sistemos funkcionalumą</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-blue-600">✓</span>
              <span>Asmeninį dashboard su jūsų duomenimis</span>
            </li>
          </ul>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onStart || onNext}
            className="flex-1 bg-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg"
          >
            Pradėti nustatymus
          </button>
          <button
            onClick={onSkip}
            className="flex-1 text-gray-600 border border-gray-300 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Praleisti dabar
          </button>
        </div>
        
        {/* Time Estimate */}
        <p className="text-xs text-gray-500 mt-4">
          ⏱️ Nustatymai užtruks apie 2-3 minutes
        </p>
      </div>
    </div>
  );
};

export default OnboardingWelcome;
