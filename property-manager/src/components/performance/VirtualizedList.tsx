import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';

interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  width?: number;
  itemHeight: number;
  renderItem: (props: { index: number; style: React.CSSProperties; item: T }) => React.ReactNode;
  className?: string;
}

export function VirtualizedList<T>({ 
  items, 
  height, 
  width = 400,
  itemHeight, 
  renderItem, 
  className = '' 
}: VirtualizedListProps<T>) {
  const itemData = useMemo(() => items, [items]);

  const Item = React.memo(({ index, style, data }: { index: number; style: React.CSSProperties; data: T[] }): React.ReactElement | null => {
    const item = data[index];
    const rendered = renderItem({ index, style, item });
    
    // Ensure we always return a valid React element or null
    if (React.isValidElement(rendered)) {
      return rendered;
    }
    
    // If renderItem returns a primitive, wrap it in a div
    if (rendered != null) {
      return <div style={style}>{rendered}</div>;
    }
    
    return null;
  });

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center h-32 text-gray-500 ${className}`}>
        Nėra duomenų
      </div>
    );
  }

  return (
    <List
      height={height}
      width={width}
      itemCount={items.length}
      itemSize={itemHeight}
      itemData={itemData}
      className={className}
    >
      {Item}
    </List>
  );
}

export default VirtualizedList;
