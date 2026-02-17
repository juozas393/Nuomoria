import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import ReactGridLayout from 'react-grid-layout';
const GridLayout = ReactGridLayout as any;
import { GripVertical } from 'lucide-react';
import { useLayoutEditor } from './LayoutEditorProvider';
import { GRID_CONFIG, DENSITY_GRID_CONFIG, CARD_IDS, CardId, LayoutItem } from './layoutConstants';
import { useDensity } from '../../../context/DensityContext';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// =============================================================================
// TYPES
// =============================================================================

interface EditableGridProps {
    children: ReactNode;
}

// =============================================================================
// DRAG HANDLE COMPONENT
// =============================================================================

const DragHandle = () => (
    <div className="drag-handle absolute top-1 left-1 w-5 h-5 bg-white/90 border border-gray-200 rounded flex items-center justify-center cursor-grab active:cursor-grabbing z-10 hover:bg-primary-light hover:border-primary/30 transition-colors">
        <GripVertical className="w-3 h-3 text-gray-400" />
    </div>
);

// =============================================================================
// GRID ITEM WRAPPER
// =============================================================================

interface GridItemProps {
    id: CardId;
    isEditing: boolean;
    children: ReactNode;
}

const GridItem: React.FC<GridItemProps> = ({ id, isEditing, children }) => {
    return (
        <div
            key={id}
            className={`relative h-full ${isEditing ? 'ring-2 ring-primary/20 ring-offset-1 rounded-lg' : ''}`}
        >
            {isEditing && <DragHandle />}
            <div className={`h-full ${isEditing ? 'pointer-events-none' : ''}`}>
                {children}
            </div>
        </div>
    );
};

// =============================================================================
// BREAKPOINT DETECTION
// =============================================================================

const getBreakpoint = (): 'lg' | 'md' | 'sm' => {
    if (typeof window === 'undefined') return 'lg';
    const width = window.innerWidth;
    if (width >= GRID_CONFIG.breakpoints.lg) return 'lg';
    if (width >= GRID_CONFIG.breakpoints.md) return 'md';
    return 'sm';
};

// =============================================================================
// EDITABLE GRID COMPONENT
// =============================================================================

export const EditableGrid: React.FC<EditableGridProps> = ({ children }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(1200);
    const { density } = useDensity();

    const {
        isEditing,
        layouts,
        updateLayout,
        currentBreakpoint,
        setCurrentBreakpoint,
        cancelEdit,
    } = useLayoutEditor();

    // Get density-aware grid settings
    const gridConfig = DENSITY_GRID_CONFIG[density];

    // Measure container width
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        };

        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    // Detect breakpoint on resize
    useEffect(() => {
        const handleResize = () => {
            const bp = getBreakpoint();
            if (bp !== currentBreakpoint) {
                setCurrentBreakpoint(bp);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [currentBreakpoint, setCurrentBreakpoint]);

    // ESC to cancel edit mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isEditing) {
                cancelEdit();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isEditing, cancelEdit]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleLayoutChange = useCallback((newLayout: any[]) => {
        if (!isEditing) return;

        const converted: LayoutItem[] = newLayout.map((item: any) => ({
            i: item.i,
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
            minW: item.minW,
            minH: item.minH,
            maxW: item.maxW,
            maxH: item.maxH,
            static: item.static,
        }));
        updateLayout(currentBreakpoint, converted);
    }, [isEditing, currentBreakpoint, updateLayout]);

    // Convert children to array
    const childArray = React.Children.toArray(children);
    const cardIds = Object.values(CARD_IDS);

    // Get current layout - add resizeHandles only when editing, make static when not
    const allResizeHandles = ['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne'] as const;
    const currentLayout = layouts[currentBreakpoint].map(item => ({
        ...item,
        // When not editing, make items static (not draggable/resizable)
        static: !isEditing,
        // Only add resize handles when editing
        ...(isEditing ? { resizeHandles: allResizeHandles } : {}),
    }));
    const cols = GRID_CONFIG.cols[currentBreakpoint] || 12;

    return (
        <div ref={containerRef} className={`editable-grid ${isEditing ? 'is-editing' : ''}`}>

            <GridLayout
                className="layout"
                layout={currentLayout}
                cols={cols}
                rowHeight={gridConfig.rowHeight}
                width={containerWidth}
                margin={gridConfig.margin}
                containerPadding={gridConfig.containerPadding}
                isDraggable={isEditing}
                isResizable={isEditing}
                draggableHandle=".drag-handle"
                onLayoutChange={handleLayoutChange as any}
                useCSSTransforms={true}
                compactType="vertical"
                preventCollision={false}
                resizeHandles={isEditing ? (allResizeHandles as unknown as string[]) : []}
            >
                {childArray.map((child, index) => {
                    const cardId = cardIds[index] || `card-${index}`;
                    return (
                        <div key={cardId} data-grid={isEditing ? { resizeHandles: allResizeHandles } : { static: true }}>
                            <GridItem id={cardId as CardId} isEditing={isEditing}>
                                {child}
                            </GridItem>
                        </div>
                    );
                })}
            </GridLayout>

            {/* Edit mode overlay styles - OPTIMIZED */}
            <style>{`
                /* View mode: no transitions for performance */
                .editable-grid:not(.is-editing) .react-grid-item {
                    transition: none !important;
                }
                /* Edit mode: allow react-grid-layout transitions for smooth reflow */
                .editable-grid.is-editing .react-grid-item {
                    transition: transform 200ms ease, width 200ms ease, height 200ms ease;
                }
                .editable-grid.is-editing .react-grid-item.cssTransforms {
                    transition: transform 200ms ease, width 200ms ease, height 200ms ease;
                }
                /* Active drag/resize: no transitions for instant tracking */
                .editable-grid.is-editing .react-grid-item.react-draggable-dragging,
                .editable-grid.is-editing .react-grid-item.resizing {
                    transition: none !important;
                    will-change: transform;
                }
                .editable-grid.is-editing .react-grid-item.react-draggable-dragging {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 100;
                    opacity: 0.9;
                }
                
                /* Hide handles when not editing */
                .editable-grid .react-resizable-handle {
                    display: none !important;
                }
                
                /* Show and style all handles when editing */
                .editable-grid.is-editing .react-resizable-handle {
                    display: block !important;
                    position: absolute !important;
                    background-color: #2F8481 !important;
                    border-radius: 4px !important;
                    z-index: 10 !important;
                }
                
                /* Corner handles - 12x12 squares */
                .editable-grid.is-editing .react-resizable-handle-se {
                    width: 12px !important;
                    height: 12px !important;
                    right: -6px !important;
                    bottom: -6px !important;
                    cursor: se-resize !important;
                }
                .editable-grid.is-editing .react-resizable-handle-sw {
                    width: 12px !important;
                    height: 12px !important;
                    left: -6px !important;
                    bottom: -6px !important;
                    cursor: sw-resize !important;
                }
                .editable-grid.is-editing .react-resizable-handle-ne {
                    width: 12px !important;
                    height: 12px !important;
                    right: -6px !important;
                    top: -6px !important;
                    cursor: ne-resize !important;
                }
                .editable-grid.is-editing .react-resizable-handle-nw {
                    width: 12px !important;
                    height: 12px !important;
                    left: -6px !important;
                    top: -6px !important;
                    cursor: nw-resize !important;
                }
                
                /* Edge handles - bars */
                .editable-grid.is-editing .react-resizable-handle-e {
                    width: 8px !important;
                    height: 40px !important;
                    right: -4px !important;
                    top: 50% !important;
                    transform: translateY(-50%) !important;
                    cursor: e-resize !important;
                }
                .editable-grid.is-editing .react-resizable-handle-w {
                    width: 8px !important;
                    height: 40px !important;
                    left: -4px !important;
                    top: 50% !important;
                    transform: translateY(-50%) !important;
                    cursor: w-resize !important;
                }
                .editable-grid.is-editing .react-resizable-handle-n {
                    width: 40px !important;
                    height: 8px !important;
                    top: -4px !important;
                    left: 50% !important;
                    transform: translateX(-50%) !important;
                    cursor: n-resize !important;
                }
                .editable-grid.is-editing .react-resizable-handle-s {
                    width: 40px !important;
                    height: 8px !important;
                    bottom: -4px !important;
                    left: 50% !important;
                    transform: translateX(-50%) !important;
                    cursor: s-resize !important;
                }
                
                /* Hover effect */
                .editable-grid.is-editing .react-resizable-handle:hover {
                    background-color: #267270 !important;
                    transform: scale(1.15) !important;
                }
                .editable-grid.is-editing .react-resizable-handle-e:hover,
                .editable-grid.is-editing .react-resizable-handle-w:hover {
                    transform: translateY(-50%) scale(1.15) !important;
                }
                .editable-grid.is-editing .react-resizable-handle-n:hover,
                .editable-grid.is-editing .react-resizable-handle-s:hover {
                    transform: translateX(-50%) scale(1.15) !important;
                }
            `}</style>
        </div>
    );
};

export default EditableGrid;
