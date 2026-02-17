import React, { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Building2, Home, User } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================
export interface MenuItem {
    id: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    disabled?: boolean;
}

export interface ContextPanelProps {
    /** Type of entity being displayed */
    entityType: 'address' | 'apartment' | 'tenant';
    /** Entity identifier */
    entityId: string;
    /** Entity display name (header title) */
    entityName: string;
    /** Entity subtitle (e.g., address for apartment) */
    entitySubtitle?: string;
    /** Navigation menu items */
    menuItems: MenuItem[];
    /** Currently active section */
    activeSection: string;
    /** Section change handler */
    onSectionChange: (sectionId: string) => void;
    /** Panel open state */
    isOpen: boolean;
    /** Close handler */
    onClose: () => void;
    /** Collapsed state (shows only icons) */
    isCollapsed?: boolean;
    /** Toggle collapsed */
    onToggleCollapse?: () => void;
    /** Panel content */
    children: React.ReactNode;
}

// ============================================================
// CONTEXT PANEL COMPONENT
// ============================================================
export const ContextPanel: React.FC<ContextPanelProps> = ({
    entityType,
    entityId,
    entityName,
    entitySubtitle,
    menuItems,
    activeSection,
    onSectionChange,
    isOpen,
    onClose,
    isCollapsed = false,
    onToggleCollapse,
    children
}) => {
    // Keyboard handler - ESC to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Entity type icons and colors
    const entityConfig = {
        address: {
            icon: <Building2 className="w-5 h-5" />,
            color: 'bg-[#2F8481]',
            label: 'Adresas'
        },
        apartment: {
            icon: <Home className="w-5 h-5" />,
            color: 'bg-blue-600',
            label: 'Butas'
        },
        tenant: {
            icon: <User className="w-5 h-5" />,
            color: 'bg-purple-600',
            label: 'Nuomininkas'
        }
    };

    const config = entityConfig[entityType];

    if (!isOpen) return null;

    return (
        <>
            {/* Mobile overlay */}
            <div
                className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className={`
          fixed lg:relative right-0 top-0 h-full z-50 lg:z-auto
          flex flex-col
          bg-white border-l border-gray-200 shadow-xl lg:shadow-none
          transition-colors duration-300 ease-in-out
          ${isCollapsed ? 'w-16' : 'w-[380px]'}
        `}
                role="complementary"
                aria-label={`${config.label} nustatymai`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Entity Icon */}
                        <div className={`w-10 h-10 ${config.color} rounded-xl flex items-center justify-center text-white text-lg shadow-sm flex-shrink-0`}>
                            {config.icon}
                        </div>

                        {/* Entity Info */}
                        {!isCollapsed && (
                            <div className="min-w-0">
                                <h2 className="text-sm font-bold text-gray-900 truncate">
                                    {entityName}
                                </h2>
                                {entitySubtitle && (
                                    <p className="text-xs text-gray-500 truncate">
                                        {entitySubtitle}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                        {onToggleCollapse && (
                            <button
                                onClick={onToggleCollapse}
                                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                aria-label={isCollapsed ? 'Išskleisti' : 'Sutraukti'}
                            >
                                {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            aria-label="Uždaryti"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Navigation Menu */}
                <nav className="px-3 py-3 border-b border-gray-100">
                    <div className="space-y-1">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeSection === item.id;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => !item.disabled && onSectionChange(item.id)}
                                    disabled={item.disabled}
                                    className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors
                    ${isActive
                                            ? 'bg-[#2F8481] text-white shadow-md'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        }
                    ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                                    title={isCollapsed ? item.label : undefined}
                                >
                                    {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                                    {!isCollapsed && (
                                        <>
                                            <span className="flex-1 text-left">{item.label}</span>
                                            {item.badge !== undefined && (
                                                <span className={`
                          px-2 py-0.5 rounded-full text-[11px] font-semibold
                          ${isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}
                        `}>
                                                    {item.badge}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </nav>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto">
                    {!isCollapsed && children}
                </div>
            </div>
        </>
    );
};

export default ContextPanel;
