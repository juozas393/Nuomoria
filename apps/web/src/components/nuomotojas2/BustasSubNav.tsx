import React, { useState, useEffect, memo, useCallback } from 'react';
import { Camera, Home, Settings, Sparkles } from 'lucide-react';

// =============================================================================
// SUB-NAVIGATION FOR BŪSTAS TAB
// =============================================================================

interface BustasSubNavProps {
    activeSection: string;
    onSectionClick: (section: string) => void;
    photosCount?: number;
}

const SECTIONS = [
    { id: 'nuotraukos', label: 'Nuotraukos', icon: Camera },
    { id: 'info', label: 'Info', icon: Home },
    { id: 'parametrai', label: 'Parametrai', icon: Settings },
    { id: 'patogumai', label: 'Patogumai', icon: Sparkles },
];

export const BustasSubNav: React.FC<BustasSubNavProps> = memo(({
    activeSection,
    onSectionClick,
    photosCount = 0
}) => {
    return (
        <div className="sticky top-0 z-10 bg-white/95 border-b border-gray-100 -mx-6 px-6 py-2">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                {SECTIONS.map(({ id, label, icon: Icon }) => {
                    const isActive = activeSection === id;
                    return (
                        <button
                            key={id}
                            onClick={() => onSectionClick(id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${isActive
                                ? 'bg-teal-50 text-teal-700'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                            {id === 'nuotraukos' && photosCount > 0 && (
                                <span className={`text-xs px-1.5 rounded-full ${isActive ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {photosCount}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
});
BustasSubNav.displayName = 'BustasSubNav';

// =============================================================================
// HOOK: ACTIVE SECTION DETECTION
// =============================================================================

export const useActiveSectionDetection = (sectionIds: string[]): string => {
    const [activeSection, setActiveSection] = useState(sectionIds[0] || '');

    useEffect(() => {
        const handleScroll = () => {
            const scrollContainer = document.querySelector('[data-scroll-container]');
            if (!scrollContainer) return;

            const containerTop = scrollContainer.getBoundingClientRect().top;

            for (const id of sectionIds) {
                const element = document.getElementById(id);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    // If section top is within viewport (with offset)
                    if (rect.top <= containerTop + 100) {
                        setActiveSection(id);
                    }
                }
            }
        };

        const scrollContainer = document.querySelector('[data-scroll-container]');
        scrollContainer?.addEventListener('scroll', handleScroll);

        return () => {
            scrollContainer?.removeEventListener('scroll', handleScroll);
        };
    }, [sectionIds]);

    return activeSection;
};

// =============================================================================
// SCROLL TO SECTION
// =============================================================================

export const scrollToSection = (sectionId: string): void => {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

export default BustasSubNav;
