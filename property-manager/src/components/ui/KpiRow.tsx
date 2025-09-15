import React from 'react';
import { BadgeWithLabel } from './Badge';

type Props = {
  monthDue: number;
  deposit: number;
  debt: number;
  status: string;
};

export function KpiRow({ monthDue, deposit, debt, status }: Props) {
  const fx = (n: number) => {
    const EPS = 0.005;
    const v = Math.abs(n) < EPS ? 0 : Math.round(n * 100) / 100;
    return v.toLocaleString("lt-LT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="flex flex-wrap gap-2 px-5 py-3 bg-white border-b">
      <BadgeWithLabel label="Šio mėn." value={`${fx(monthDue)} €`} tone="brand" />
      <BadgeWithLabel label="Depozitas" value={`${fx(deposit)} €`} />
      {debt > 0 && <BadgeWithLabel label="Skola" value={`${fx(debt)} €`} tone="warn" />}
      <BadgeWithLabel label="Statusas" value={status} tone="neutral" />
    </div>
  );
}
