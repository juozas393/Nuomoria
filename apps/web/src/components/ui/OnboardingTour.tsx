import React, { memo, useEffect, useState, useCallback, useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { TourStep } from '../../hooks/useOnboardingTour';

/* ─── Design tokens (dark glass — matches ptSurface) ─── */
const card = 'bg-[#0c1214]/95 backdrop-blur-xl border border-white/[0.14] rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.55)]';
const heading = 'text-[14px] font-bold text-white';
const body = 'text-[12px] text-gray-300 leading-relaxed';
const btnPrimary = 'px-4 py-2 bg-teal-500 text-white text-[12px] font-bold rounded-lg hover:bg-teal-600 transition-colors active:scale-[0.97]';
const btnSecondary = 'px-4 py-2 bg-white/[0.08] text-gray-300 text-[12px] font-medium rounded-lg hover:bg-white/[0.12] transition-colors active:scale-[0.97]';
const btnSkip = 'text-[11px] text-gray-500 hover:text-gray-300 transition-colors cursor-pointer';

interface OnboardingTourProps {
  isActive: boolean;
  currentStep: TourStep | null;
  currentStepIndex: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  /** Called to open/close sidebar for sidebar-targeted steps */
  onSidebarToggle?: (open: boolean) => void;
}

/** Compute spotlight rect for a DOM element */
function getElementRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  return el.getBoundingClientRect();
}

/** Scroll element into view if needed */
function scrollToElement(selector: string) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
}

/** Calculate tooltip position relative to the spotlight */
function getTooltipStyle(
  rect: DOMRect,
  position: TourStep['position'],
  tooltipWidth: number,
  tooltipHeight: number,
): React.CSSProperties {
  const OFFSET = 16;
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;

  let top = 0;
  let left = 0;

  switch (position) {
    case 'bottom':
      top = rect.bottom + OFFSET;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      break;
    case 'top':
      top = rect.top - tooltipHeight - OFFSET;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      break;
    case 'right':
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.right + OFFSET;
      break;
    case 'left':
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left - tooltipWidth - OFFSET;
      break;
  }

  // Clamp within viewport
  if (left < 12) left = 12;
  if (left + tooltipWidth > vpW - 12) left = vpW - tooltipWidth - 12;
  if (top < 12) top = 12;
  if (top + tooltipHeight > vpH - 12) top = vpH - tooltipHeight - 12;

  return { position: 'fixed', top, left, width: tooltipWidth, zIndex: 10002 };
}

export const OnboardingTour = memo<OnboardingTourProps>(({
  isActive,
  currentStep,
  currentStepIndex,
  totalSteps,
  isFirstStep,
  isLastStep,
  onNext,
  onPrev,
  onSkip,
  onSidebarToggle,
}) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const TOOLTIP_WIDTH = 340;
  const TOOLTIP_HEIGHT_EST = 200;

  // Update target rect when step changes
  const updateRect = useCallback(() => {
    if (!currentStep) {
      setTargetRect(null);
      return;
    }
    scrollToElement(currentStep.targetSelector);
    // Wait for scroll to settle
    requestAnimationFrame(() => {
      const rect = getElementRect(currentStep.targetSelector);
      setTargetRect(rect);
    });
  }, [currentStep]);

  useEffect(() => {
    if (!isActive || !currentStep) {
      setVisible(false);
      return;
    }

    // Small delay for DOM to settle after step change
    const timer = setTimeout(() => {
      updateRect();
      setVisible(true);
    }, currentStep.requiresSidebar ? 350 : 150);

    // Listen for resize / scroll to reposition
    const handleReposition = () => updateRect();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isActive, currentStep, updateRect]);

  // Auto-open/close sidebar for sidebar steps via menu button click
  useEffect(() => {
    if (!isActive || !currentStep) return;
    const needsSidebar = !!currentStep.requiresSidebar;
    // Check if sidebar is currently open by looking for the sidebar element visibility
    const sidebarEl = document.querySelector('[data-tour="sidebar-dashboard"]');
    const isSidebarVisible = sidebarEl && sidebarEl.getBoundingClientRect().width > 0;

    if (needsSidebar && !isSidebarVisible) {
      // Click menu button to open sidebar
      const menuBtn = document.querySelector('[data-tour="menu"]') as HTMLButtonElement;
      menuBtn?.click();
    } else if (!needsSidebar && isSidebarVisible) {
      // Click menu button to close sidebar
      const menuBtn = document.querySelector('[data-tour="menu"]') as HTMLButtonElement;
      menuBtn?.click();
    }
  }, [isActive, currentStep]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
      if (e.key === 'ArrowRight' || e.key === 'Enter') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [isActive, onSkip, onNext, onPrev]);

  if (!isActive || !currentStep) return null;

  const PADDING = 8;
  const tooltipStyle = targetRect
    ? getTooltipStyle(targetRect, currentStep.position, TOOLTIP_WIDTH, TOOLTIP_HEIGHT_EST)
    : { position: 'fixed' as const, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: TOOLTIP_WIDTH, zIndex: 10002 };

  return (
    <>
      {/* Full-screen overlay with spotlight cutout */}
      <div
        className="fixed inset-0 z-[10000] transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
        onMouseDown={e => e.stopPropagation()}
      >
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <mask id="tour-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - PADDING}
                  y={targetRect.top - PADDING}
                  width={targetRect.width + PADDING * 2}
                  height={targetRect.height + PADDING * 2}
                  rx="12"
                  ry="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0" y="0" width="100%" height="100%"
            fill="rgba(0,0,0,0.65)"
            mask="url(#tour-spotlight-mask)"
          />
        </svg>

        {/* Spotlight border ring */}
        {targetRect && (
          <div
            className="absolute rounded-xl border-2 border-teal-400/60 pointer-events-none animate-pulse"
            style={{
              left: targetRect.left - PADDING,
              top: targetRect.top - PADDING,
              width: targetRect.width + PADDING * 2,
              height: targetRect.height + PADDING * 2,
              boxShadow: '0 0 20px rgba(45, 212, 191, 0.25), inset 0 0 20px rgba(45, 212, 191, 0.08)',
              zIndex: 10001,
            }}
          />
        )}
      </div>

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className={`${card} p-5 transition-all duration-300`}
        style={{
          ...tooltipStyle,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(8px)',
        }}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
              <span className="text-teal-400 text-[13px] font-bold">{currentStepIndex + 1}</span>
            </div>
            <h3 className={heading}>{currentStep.title}</h3>
          </div>
          <button
            onClick={onSkip}
            className="p-1 rounded-lg hover:bg-white/[0.08] transition-colors"
            aria-label="Uždaryti turą"
          >
            <XMarkIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <p className={`${body} mb-4`}>{currentStep.description}</p>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStepIndex
                  ? 'w-6 bg-teal-400'
                  : i < currentStepIndex
                    ? 'w-1.5 bg-teal-400/40'
                    : 'w-1.5 bg-white/[0.12]'
              }`}
            />
          ))}
          <span className="ml-auto text-[10px] text-gray-500 tabular-nums">
            {currentStepIndex + 1} / {totalSteps}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button onClick={onSkip} className={btnSkip}>
            Praleisti
          </button>
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button onClick={onPrev} className={btnSecondary}>
                <span className="flex items-center gap-1">
                  <ChevronLeftIcon className="w-3.5 h-3.5" />
                  Atgal
                </span>
              </button>
            )}
            <button onClick={onNext} className={btnPrimary}>
              <span className="flex items-center gap-1">
                {isLastStep ? 'Baigti' : 'Toliau'}
                {!isLastStep && <ChevronRightIcon className="w-3.5 h-3.5" />}
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
});

OnboardingTour.displayName = 'OnboardingTour';
