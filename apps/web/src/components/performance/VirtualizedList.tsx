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

  const Item = ({ index, style, data }: { index: number; style: React.CSSProperties; data: T[] }): React.ReactElement => {
    const item = data[index];
    return renderItem({ index, style, item }) as React.ReactElement;
  };

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
