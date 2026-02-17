import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { MeterTableRow, MeterData } from './MeterTableRow';

// =============================================================================
// TYPES
// =============================================================================

interface VirtualizedMetersTableProps {
    meters: MeterData[];
    rowHeight?: number;
    overscan?: number;
    expandedRows: Set<string>;
    onToggleExpand: (meterId: string) => void;
    getDraft: (meterId: string) => { value: string; hasError: boolean; errorMessage?: string } | null;
    setDraft: (meterId: string, value: string, previousReading: number | null) => void;
    onPhotoUpload?: (meterId: string) => void;
    onViewHistory?: (meterId: string) => void;
}

interface RowPosition {
    top: number;
    height: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_ROW_HEIGHT = 56; // collapsed row height
const EXPANDED_ROW_HEIGHT = 200; // expanded row includes details section
const OVERSCAN = 5; // extra rows to render outside viewport

// =============================================================================
// COMPONENT
// =============================================================================

export const VirtualizedMetersTable: React.FC<VirtualizedMetersTableProps> = ({
    meters,
    rowHeight = DEFAULT_ROW_HEIGHT,
    overscan = OVERSCAN,
    expandedRows,
    onToggleExpand,
    getDraft,
    setDraft,
    onPhotoUpload,
    onViewHistory,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);

    // Calculate row positions accounting for expanded rows
    const rowPositions = useMemo((): RowPosition[] => {
        let currentTop = 0;
        return meters.map(meter => {
            const isExpanded = expandedRows.has(meter.id);
            const height = isExpanded ? EXPANDED_ROW_HEIGHT : rowHeight;
            const position = { top: currentTop, height };
            currentTop += height;
            return position;
        });
    }, [meters, expandedRows, rowHeight]);

    const totalHeight = useMemo(() => {
        if (rowPositions.length === 0) return 0;
        const last = rowPositions[rowPositions.length - 1];
        return last.top + last.height;
    }, [rowPositions]);

    // Find visible range
    const { startIndex, endIndex } = useMemo(() => {
        if (meters.length === 0 || containerHeight === 0) {
            return { startIndex: 0, endIndex: 0 };
        }

        const viewportTop = scrollTop;
        const viewportBottom = scrollTop + containerHeight;

        // Binary search for start
        let start = 0;
        let end = rowPositions.length - 1;
        while (start < end) {
            const mid = Math.floor((start + end) / 2);
            if (rowPositions[mid].top + rowPositions[mid].height < viewportTop) {
                start = mid + 1;
            } else {
                end = mid;
            }
        }
        const startIdx = Math.max(0, start - overscan);

        // Find end index
        let endIdx = startIdx;
        while (endIdx < meters.length && rowPositions[endIdx].top < viewportBottom) {
            endIdx++;
        }
        endIdx = Math.min(meters.length, endIdx + overscan);

        return { startIndex: startIdx, endIndex: endIdx };
    }, [meters.length, containerHeight, scrollTop, rowPositions, overscan]);

    // Handle scroll
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    // Handle resize
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                setContainerHeight(entry.contentRect.height);
            }
        });

        observer.observe(container);
        setContainerHeight(container.clientHeight);

        return () => observer.disconnect();
    }, []);

    // Visible rows
    const visibleRows = useMemo(() => {
        return meters.slice(startIndex, endIndex);
    }, [meters, startIndex, endIndex]);

    // Don't virtualize if less than 50 rows
    if (meters.length < 50) {
        return (
            <div className="overflow-auto flex-1">
                <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                            <th className="px-3 py-3 font-medium">Skaitiklis</th>
                            <th className="px-3 py-3 font-medium">Tipas</th>
                            <th className="px-3 py-3 font-medium">Būsena</th>
                            <th className="px-3 py-3 font-medium">Ankstesnis</th>
                            <th className="px-3 py-3 font-medium">Dabartinis</th>
                            <th className="px-3 py-3 font-medium">Suvartojimas</th>
                            <th className="px-3 py-3 font-medium">Kaina</th>
                            <th className="px-3 py-3 font-medium text-right">Veiksmai</th>
                        </tr>
                    </thead>
                    <tbody>
                        {meters.map((meter) => {
                            const draft = getDraft(meter.id);
                            return (
                                <MeterTableRow
                                    key={meter.id}
                                    meter={meter}
                                    isExpanded={expandedRows.has(meter.id)}
                                    onToggleExpand={() => onToggleExpand(meter.id)}
                                    draftValue={draft?.value ?? null}
                                    onDraftChange={(value) => setDraft(meter.id, value, meter.previousReading)}
                                    hasError={draft?.hasError ?? false}
                                    errorMessage={draft?.errorMessage}
                                    onPhotoUpload={() => onPhotoUpload?.(meter.id)}
                                    onViewHistory={() => onViewHistory?.(meter.id)}
                                />
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="overflow-auto flex-1"
            onScroll={handleScroll}
        >
            {/* Sticky header */}
            <div className="sticky top-0 z-10 bg-gray-50">
                <div className="grid grid-cols-8 gap-4 px-3 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">
                    <div>Skaitiklis</div>
                    <div>Tipas</div>
                    <div>Būsena</div>
                    <div>Ankstesnis</div>
                    <div>Dabartinis</div>
                    <div>Suvartojimas</div>
                    <div>Kaina</div>
                    <div className="text-right">Veiksmai</div>
                </div>
            </div>

            {/* Virtual scroll container */}
            <div style={{ height: totalHeight, position: 'relative' }}>
                {visibleRows.map((meter, idx) => {
                    const actualIndex = startIndex + idx;
                    const position = rowPositions[actualIndex];
                    const draft = getDraft(meter.id);

                    return (
                        <div
                            key={meter.id}
                            style={{
                                position: 'absolute',
                                top: position.top,
                                left: 0,
                                right: 0,
                                height: position.height,
                            }}
                        >
                            <table className="w-full">
                                <tbody>
                                    <MeterTableRow
                                        meter={meter}
                                        isExpanded={expandedRows.has(meter.id)}
                                        onToggleExpand={() => onToggleExpand(meter.id)}
                                        draftValue={draft?.value ?? null}
                                        onDraftChange={(value) => setDraft(meter.id, value, meter.previousReading)}
                                        hasError={draft?.hasError ?? false}
                                        errorMessage={draft?.errorMessage}
                                        onPhotoUpload={() => onPhotoUpload?.(meter.id)}
                                        onViewHistory={() => onViewHistory?.(meter.id)}
                                    />
                                </tbody>
                            </table>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default VirtualizedMetersTable;
