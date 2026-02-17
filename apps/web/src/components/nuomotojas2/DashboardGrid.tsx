import React, { useState, useCallback, useMemo, ReactNode, memo } from 'react';
import { GripVertical, Settings, Check, RotateCcw, Move } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export interface WidgetConfig {
    key: string;
    title: string;
    component: ReactNode;
    defaultSize?: WidgetSize;
}

interface LayoutItem {
    key: string;
    size: WidgetSize;
}

interface DashboardGridProps {
    widgets: WidgetConfig[];
    storageKey?: string;
    className?: string;
}

// Size to grid classes mapping (3-column grid base)
const SIZE_CLASSES: Record<WidgetSize, string> = {
    'small': 'col-span-1',      // 1/3 width
    'medium': 'col-span-2',     // 2/3 width  
    'large': 'col-span-2',      // 2/3 width on lg, full on mobile
    'full': 'col-span-3',       // Full width
};

// =============================================================================
// WIDGET WRAPPER
// =============================================================================

interface WidgetWrapperProps {
    title: string;
    size: WidgetSize;
    isEditing: boolean;
    isDragging: boolean;
    isDragOver: boolean;
    onDragStart: () => void;
    onDragEnd: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: () => void;
    onChangeSize: (size: WidgetSize) => void;
    children: ReactNode;
}

const WidgetWrapper = memo<WidgetWrapperProps>(({
    title,
    size,
    isEditing,
    isDragging,
    isDragOver,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    onChangeSize,
    children
}) => (
    <div
        className={`rounded-xl overflow-hidden transition-colors duration-200 ${SIZE_CLASSES[size]} ${isEditing ? 'ring-2 ring-teal-400/50 ring-offset-2' : ''
            } ${isDragging ? 'opacity-50 scale-95' : ''} ${isDragOver ? 'ring-2 ring-teal-500' : ''}`}
        draggable={isEditing}
        onDragStart={isEditing ? onDragStart : undefined}
        onDragEnd={isEditing ? onDragEnd : undefined}
        onDragOver={isEditing ? onDragOver : undefined}
        onDrop={isEditing ? onDrop : undefined}
    >
        {isEditing && (
            <div className="drag-handle flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white cursor-move">
                <div className="flex items-center gap-2">
                    <Move className="w-4 h-4" />
                    <span className="text-xs font-medium truncate">{title}</span>
                </div>
                {/* Size selector */}
                <div className="flex items-center gap-1">
                    {(['small', 'medium', 'full'] as WidgetSize[]).map(s => (
                        <button
                            key={s}
                            onClick={(e) => { e.stopPropagation(); onChangeSize(s); }}
                            className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${size === s
                                ? 'bg-white text-teal-600 font-semibold'
                                : 'bg-white/20 hover:bg-white/30'
                                }`}
                        >
                            {s === 'small' ? '⅓' : s === 'medium' ? '⅔' : '1'}
                        </button>
                    ))}
                </div>
            </div>
        )}
        <div className={isEditing ? 'pointer-events-none opacity-90' : ''}>
            {children}
        </div>
    </div>
));
WidgetWrapper.displayName = 'WidgetWrapper';

// =============================================================================
// DASHBOARD GRID
// =============================================================================

const DEFAULT_SIZES: Record<string, WidgetSize> = {
    // Row 1: Header (full width) - most important info at top
    'header': 'full',
    // Row 2: Photos (2/3) + Tenant (1/3) - visual + key stakeholder
    'photos': 'medium',
    'tenant': 'small',
    // Row 3: KPIs (full width) - quick stats overview  
    'kpis': 'full',
    // Row 4: Checklist (2/3) + Activity (1/3) - actions + timeline
    'checklist': 'medium',
    'activity': 'small',
    // Row 5: Summary (full width) - detailed breakdown
    'summary': 'full',
};

export const DashboardGrid: React.FC<DashboardGridProps> = ({
    widgets,
    storageKey = 'dashboard-layout',
    className = '',
}) => {
    // Load saved layout from localStorage
    const savedLayout = useMemo((): LayoutItem[] | null => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                return JSON.parse(saved) as LayoutItem[];
            }
        } catch (e) {
            console.warn('Failed to load dashboard layout:', e);
        }
        return null;
    }, [storageKey]);

    // Create default layout from widgets
    const defaultLayout = useMemo((): LayoutItem[] =>
        widgets.map(w => ({
            key: w.key,
            size: w.defaultSize || DEFAULT_SIZES[w.key] || 'full',
        }))
        , [widgets]);

    const [layout, setLayout] = useState<LayoutItem[]>(savedLayout || defaultLayout);
    const [isEditing, setIsEditing] = useState(false);
    const [draggedKey, setDraggedKey] = useState<string | null>(null);
    const [dragOverKey, setDragOverKey] = useState<string | null>(null);

    // Save layout to localStorage
    const saveLayout = useCallback((newLayout: LayoutItem[]) => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(newLayout));
        } catch (e) {
            console.warn('Failed to save dashboard layout:', e);
        }
    }, [storageKey]);

    const handleDragStart = useCallback((key: string) => {
        setDraggedKey(key);
    }, []);

    const handleDragEnd = useCallback(() => {
        setDraggedKey(null);
        setDragOverKey(null);
    }, []);

    const handleDragOver = useCallback((key: string, e: React.DragEvent) => {
        e.preventDefault();
        if (draggedKey && draggedKey !== key) {
            setDragOverKey(key);
        }
    }, [draggedKey]);

    const handleDrop = useCallback((targetKey: string) => {
        if (!draggedKey || draggedKey === targetKey) return;

        setLayout(prev => {
            const newLayout = [...prev];
            const draggedIdx = newLayout.findIndex(item => item.key === draggedKey);
            const targetIdx = newLayout.findIndex(item => item.key === targetKey);

            if (draggedIdx === -1 || targetIdx === -1) return prev;

            // Remove dragged item and insert at target position
            const [draggedItem] = newLayout.splice(draggedIdx, 1);
            newLayout.splice(targetIdx, 0, draggedItem);

            saveLayout(newLayout);
            return newLayout;
        });

        setDraggedKey(null);
        setDragOverKey(null);
    }, [draggedKey, saveLayout]);

    const handleChangeSize = useCallback((key: string, size: WidgetSize) => {
        setLayout(prev => {
            const newLayout = prev.map(item =>
                item.key === key ? { ...item, size } : item
            );
            saveLayout(newLayout);
            return newLayout;
        });
    }, [saveLayout]);

    const handleResetLayout = useCallback(() => {
        setLayout(defaultLayout);
        saveLayout(defaultLayout);
    }, [defaultLayout, saveLayout]);

    const toggleEditMode = useCallback(() => {
        setIsEditing(prev => !prev);
    }, []);

    // Get sorted widgets with their sizes
    const sortedWidgets = useMemo(() => {
        const widgetMap = new Map(widgets.map(w => [w.key, w]));
        return layout
            .map(item => {
                const widget = widgetMap.get(item.key);
                return widget ? { ...widget, size: item.size } : null;
            })
            .filter((w): w is WidgetConfig & { size: WidgetSize } => w !== null);
    }, [widgets, layout]);

    return (
        <div className={`relative ${className}`}>
            {/* Edit controls */}
            <div className="flex items-center justify-end gap-2 mb-4">
                {isEditing && (
                    <button
                        onClick={handleResetLayout}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-600 rounded-lg text-xs font-medium shadow-sm border border-gray-200 transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Atstatyti
                    </button>
                )}
                <button
                    onClick={toggleEditMode}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm border transition-colors ${isEditing
                        ? 'bg-teal-600 hover:bg-teal-700 text-white border-teal-600'
                        : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                >
                    {isEditing ? (
                        <>
                            <Check className="w-3.5 h-3.5" />
                            Baigti
                        </>
                    ) : (
                        <>
                            <Settings className="w-3.5 h-3.5" />
                            Išdėstymas
                        </>
                    )}
                </button>
            </div>

            {/* 3-column grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto">
                {sortedWidgets.map(widget => (
                    <WidgetWrapper
                        key={widget.key}
                        title={widget.title}
                        size={widget.size}
                        isEditing={isEditing}
                        isDragging={draggedKey === widget.key}
                        isDragOver={dragOverKey === widget.key}
                        onDragStart={() => handleDragStart(widget.key)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(widget.key, e)}
                        onDrop={() => handleDrop(widget.key)}
                        onChangeSize={(size) => handleChangeSize(widget.key, size)}
                    >
                        {widget.component}
                    </WidgetWrapper>
                ))}
            </div>
        </div>
    );
};

export default DashboardGrid;
