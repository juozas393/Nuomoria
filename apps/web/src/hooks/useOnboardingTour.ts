import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'nuomoria_tour_completed';

export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  /** If true, the step needs the sidebar to be opened first */
  requiresSidebar?: boolean;
}

const LANDLORD_TOUR_STEPS: TourStep[] = [
  {
    id: 'menu',
    targetSelector: '[data-tour="menu"]',
    title: 'Navigacijos meniu',
    description: 'Spauskite čia, kad atidarytumėte šoninį meniu su visomis sekcijomis.',
    position: 'right',
  },
  // ─── Sidebar items (requiresSidebar = true) ───
  {
    id: 'sidebar-dashboard',
    targetSelector: '[data-tour="sidebar-dashboard"]',
    title: 'Apžvalga',
    description: 'Pagrindinis skydelis — čia matote visų adresų ir butų suvestinę, nuomininkų sąrašą ir greitus veiksmus.',
    position: 'right',
    requiresSidebar: true,
  },
  {
    id: 'sidebar-turtas',
    targetSelector: '[data-tour="sidebar-turtas"]',
    title: 'Nekilnojamas turtas',
    description: 'Visų jūsų adresų sąrašas. Čia galite pridėti naujus adresus, redaguoti esamus ir valdyti butus.',
    position: 'right',
    requiresSidebar: true,
  },
  {
    id: 'sidebar-nuomininkai',
    targetSelector: '[data-tour="sidebar-nuomininkai"]',
    title: 'Nuomininkai',
    description: 'Visų nuomininkų sąrašas su sutarčių informacija, mokėjimų būsena ir kontaktais.',
    position: 'right',
    requiresSidebar: true,
  },
  {
    id: 'sidebar-saskaitos',
    targetSelector: '[data-tour="sidebar-saskaitos"]',
    title: 'Sąskaitos',
    description: 'Sąskaitų generavimas ir valdymas. Čia galite kurti, siųsti ir sekti nuomos bei komunalinių sąskaitas.',
    position: 'right',
    requiresSidebar: true,
  },
  {
    id: 'sidebar-remontas',
    targetSelector: '[data-tour="sidebar-remontas"]',
    title: 'Remontas',
    description: 'Remonto darbų sekimas — nuomininkai gali pranešti apie gedimus, o jūs galite valdyti užklausas.',
    position: 'right',
    requiresSidebar: true,
  },
  {
    id: 'sidebar-analitika',
    targetSelector: '[data-tour="sidebar-analitika"]',
    title: 'Ataskaitos',
    description: 'Finansinė analitika ir ataskaitos — pajamos, išlaidos, užimtumas ir kitos statistikos.',
    position: 'right',
    requiresSidebar: true,
  },
  {
    id: 'sidebar-pagalba',
    targetSelector: '[data-tour="sidebar-pagalba"]',
    title: 'Pagalba',
    description: 'Detalus vadovas su visomis funkcijomis — naudojimo instrukcijos ir DUK.',
    position: 'right',
    requiresSidebar: true,
  },
  // ─── Non-sidebar items ───
  {
    id: 'chat',
    targetSelector: '[data-tour="chat"]',
    title: 'Žinutės ir pagalba',
    description: 'Čia galite rašyti žinutes nuomininkams, matyti adresų grupinius pokalbius ir rasti atsakymus į dažniausius klausimus.',
    position: 'left',
  },
  {
    id: 'notifications',
    targetSelector: '[data-tour="notifications"]',
    title: 'Pranešimai',
    description: 'Čia matysite visus svarbius pranešimus apie mokėjimus, sutartis, skaitiklių rodmenis ir kitus įvykius.',
    position: 'bottom',
  },
  {
    id: 'profile',
    targetSelector: '[data-tour="profile"]',
    title: 'Jūsų profilis',
    description: 'Čia galite redaguoti savo profilį, keisti nustatymus arba atsijungti nuo sistemos.',
    position: 'bottom',
  },
];

export function useOnboardingTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Check if tour should be shown on mount
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Small delay to let dashboard render first
      const timer = setTimeout(() => setIsActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const steps = LANDLORD_TOUR_STEPS;
  const currentStep = steps[currentStepIndex] ?? null;
  const totalSteps = steps.length;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const isFirstStep = currentStepIndex === 0;

  const completeTour = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setIsActive(false);
    setCurrentStepIndex(0);
  }, []);

  const skipTour = useCallback(() => {
    completeTour();
  }, [completeTour]);

  const nextStep = useCallback(() => {
    if (isLastStep) {
      completeTour();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [isLastStep, completeTour]);

  const prevStep = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [isFirstStep]);

  /** Allow restarting the tour (e.g. from settings) */
  const restartTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentStepIndex(0);
    setIsActive(true);
  }, []);

  return {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    isFirstStep,
    isLastStep,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    restartTour,
  };
}
