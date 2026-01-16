import React, { useMemo, useCallback, useRef } from 'react';
import { useVirtualizedList, useOptimizedScroll } from '../../hooks/usePerformanceOptimized';

interface VirtualTableProps<T> {
  items: T[];
  rowHeight?: number;
  height?: number;
  width?: string | number;
  className?: string;
  renderRow: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  renderHeader?: () => React.ReactNode;
  overscan?: number;
  loading?: boolean;
  emptyMessage?: string;
}

export function VirtualTable<T>({
  items,
  rowHeight = 48,
  height = 1200, // Increased to show ~15 items
  width = '100%',
  className = '',
  renderRow,
  renderHeader,
  overscan = 5,
  loading = false,
  emptyMessage = 'Nėra duomenų',
}: VirtualTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { virtualItems, totalHeight, handleScroll } = useVirtualizedList(
    items,
    rowHeight,
    height,
    overscan
  );

  // Performance optimized scroll handler
  const optimizedScrollHandler = useCallback((event: React.UIEvent<HTMLElement>) => {
    handleScroll(event);
  }, [handleScroll]);

  const containerStyle: React.CSSProperties = {
    height,
    width,
    overflow: 'auto',
    position: 'relative',
  };

  const contentStyle: React.CSSProperties = {
    height: totalHeight,
    position: 'relative',
  };

  if (loading) {
    return (
      <div 
        className={`virtual-table-container ${className}`}
        style={containerStyle}
      >
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div 
        className={`virtual-table-container ${className}`}
        style={containerStyle}
      >
        {renderHeader && (
          <div className="sticky-table-header">
            {renderHeader()}
          </div>
        )}
        <div className="flex items-center justify-center h-32 text-gray-500">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`virtual-table-container ${className}`}
      style={containerStyle}
      onScroll={optimizedScrollHandler}
    >
      {renderHeader && (
        <div className="sticky-table-header">
          {renderHeader()}
        </div>
      )}
      
      <div style={contentStyle}>
        {virtualItems.map(({ item, index, top, height }) => {
          const itemStyle: React.CSSProperties = {
            position: 'absolute',
            top,
            left: 0,
            right: 0,
            height,
          };
          
          return (
            <div
              key={index}
              className="virtual-list-item"
              style={itemStyle}
            >
              {renderRow(item, index, itemStyle)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ====== SPECIALIZED VIRTUALIZED COMPONENTS ======

interface VirtualMeterTableProps {
  meters: any[];
  onEdit?: (meter: any) => void;
  onDelete?: (meter: any) => void;
}

export function VirtualMeterTable({ meters, onEdit, onDelete }: VirtualMeterTableProps) {
  const renderHeader = useCallback(() => (
    <div className="grid grid-cols-[1.6fr_0.9fr_0.6fr_0.9fr_1fr_auto] gap-4 h-12 items-center px-4 text-sm font-medium text-gray-700 bg-gray-50">
      <span>Tipas</span>
      <span>Serijos Nr.</span>
      <span>Vienetas</span>
      <span>Kaina</span>
      <span>Statusas</span>
      <span>Veiksmai</span>
    </div>
  ), []);

  const renderRow = useCallback((meter: any, index: number, style: React.CSSProperties) => (
    <div 
      className="grid grid-cols-[1.6fr_0.9fr_0.6fr_0.9fr_1fr_auto] gap-4 h-12 items-center px-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
      style={style}
    >
      <span className="text-sm font-medium text-gray-900">{meter.label}</span>
      <span className="text-sm text-gray-600">{meter.serial || '-'}</span>
      <span className="text-sm text-gray-600">{meter.unit}</span>
      <span className="text-sm text-gray-900">{meter.price_per_unit} €</span>
      <span className={`text-sm px-2 py-1 rounded-full text-xs ${
        meter.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
      }`}>
        {meter.status === 'active' ? 'Aktyvus' : 'Neaktyvus'}
      </span>
      <div className="flex items-center gap-2">
        {onEdit && (
          <button 
            onClick={() => onEdit(meter)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            ✏️
          </button>
        )}
        {onDelete && (
          <button 
            onClick={() => onDelete(meter)}
            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  ), [onEdit, onDelete]);

  return (
    <VirtualTable
      items={meters}
      rowHeight={48}
      height={1200} // Increased to show ~15 items
      renderHeader={renderHeader}
      renderRow={renderRow}
      className="border border-gray-200 rounded-lg"
      emptyMessage="Nėra sukonfigūruotų skaitliukų"
    />
  );
}

interface VirtualTenantListProps {
  tenants: any[];
  onSelect?: (tenant: any) => void;
}

export function VirtualTenantList({ tenants, onSelect }: VirtualTenantListProps) {
  const renderRow = useCallback((tenant: any, index: number, style: React.CSSProperties) => (
    <div 
      className="flex items-center gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
      style={style}
      onClick={() => onSelect?.(tenant)}
    >
      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
        <span className="text-blue-600 font-medium">
          {tenant.name?.charAt(0)?.toUpperCase() || 'N'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 truncate">
          {tenant.name}
        </h4>
        <p className="text-sm text-gray-600 truncate">
          {tenant.email}
        </p>
        {tenant.address && (
          <p className="text-xs text-gray-500 truncate">
            {tenant.address}
          </p>
        )}
      </div>
      <div className="text-right">
        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
          tenant.status === 'active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {tenant.status === 'active' ? 'Aktyvus' : 'Neaktyvus'}
        </span>
        {tenant.balance && (
          <p className="text-sm font-medium text-gray-900 mt-1">
            {tenant.balance} €
          </p>
        )}
      </div>
    </div>
  ), [onSelect]);

  return (
    <VirtualTable
      items={tenants}
      rowHeight={80}
      height={1200} // Increased to show ~15 items
      renderRow={renderRow}
      className="border border-gray-200 rounded-lg"
      emptyMessage="Nėra nuomininkų"
    />
  );
}

// ====== VIRTUAL GRID COMPONENT ======

interface VirtualGridProps<T> {
  items: T[];
  itemHeight: number;
  itemsPerRow?: number;
  gap?: number;
  height?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export function VirtualGrid<T>({
  items,
  itemHeight,
  itemsPerRow = 3,
  gap = 16,
  height = 1200, // Increased to show ~15 items
  renderItem,
  className = '',
}: VirtualGridProps<T>) {
  const rowHeight = itemHeight + gap;
  const totalRows = Math.ceil(items.length / itemsPerRow);
  
  const { virtualItems, totalHeight, handleScroll } = useVirtualizedList(
    Array.from({ length: totalRows }, (_, i) => i),
    rowHeight,
    height
  );

  const renderRow = useCallback((rowIndex: number, index: number, style: React.CSSProperties) => {
    const startIndex = rowIndex * itemsPerRow;
    const endIndex = Math.min(startIndex + itemsPerRow, items.length);
    const rowItems = items.slice(startIndex, endIndex);
    
    return (
      <div 
        className="flex gap-4"
        style={style}
      >
        {rowItems.map((item, itemIndex) => (
          <div 
            key={startIndex + itemIndex}
            className="flex-1"
          >
            {renderItem(item, startIndex + itemIndex)}
          </div>
        ))}
        {/* Fill remaining slots with empty divs for consistent spacing */}
        {Array.from({ length: itemsPerRow - rowItems.length }, (_, i) => (
          <div key={`empty-${i}`} className="flex-1" />
        ))}
      </div>
    );
  }, [items, itemsPerRow, renderItem]);

  return (
    <div 
      className={`virtual-grid-container ${className}`}
      style={{ height, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map(({ item: rowIndex, index, top, height }) => (
          <div
            key={rowIndex}
            style={{
              position: 'absolute',
              top,
              left: 0,
              right: 0,
              height,
            }}
          >
            {renderRow(rowIndex, index, { height })}
          </div>
        ))}
      </div>
    </div>
  );
}
