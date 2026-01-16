import { CommunalConfig, CommunalReading, CommunalCalculation } from '../types/communal';

// Komunalinių mokėjimo skaičiavimas
export class CommunalCalculator {
  private config: CommunalConfig;
  private apartmentArea: number;

  constructor(config: CommunalConfig, apartmentArea: number) {
    this.config = config;
    this.apartmentArea = apartmentArea;
  }

  // Skaičiuoja mėnesio komunalinius mokėjimus
  calculateMonthlyCommunal(
    readings: CommunalReading[],
    period: string, // YYYY-MM
    totalBuildingArea: number = 0
  ): CommunalCalculation {
    const calculation: CommunalCalculation = {
      apartmentId: readings[0]?.apartmentId || '',
      period,
      readings: [],
      totalAmount: 0,
      fixedCharges: 0,
      variableCharges: 0,
    };

    // Skaičiuojame individualius skaitliukus
    const individualMeters = this.config.meters.filter(m => m.hasIndividualMeter);
    
    for (const meter of individualMeters) {
      const reading = readings.find(r => r.meterId === meter.id);
      if (reading && reading.status === 'approved') {
        // Čia reikėtų gauti ankstesnį rodmenį iš duomenų bazės
        const previousReading = 0; // TODO: implement previous reading lookup
        const consumption = reading.reading - previousReading;
        const price = meter.defaultPrice || 0;
        const total = consumption * price;

        calculation.readings.push({
          meterId: meter.id,
          current: reading.reading,
          previous: previousReading,
          consumption,
          price,
          total,
        });

        calculation.variableCharges += total;
      }
    }

    // Skaičiuojame bendrus skaitliukus (pagal plotą)
    const sharedMeters = this.config.meters.filter(m => !m.hasIndividualMeter);
    
    for (const meter of sharedMeters) {
      if (totalBuildingArea > 0) {
        const price = meter.defaultPrice || 0;
        const total = (this.apartmentArea / totalBuildingArea) * price;

        calculation.readings.push({
          meterId: meter.id,
          current: 0, // Bendri skaitliukai neturi individualių rodmenų
          previous: 0,
          consumption: 0,
          price,
          total,
        });

        calculation.variableCharges += total;
      }
    }

    // Fiksuoti mokesčiai
    const fixedCharges = this.calculateFixedCharges();
    calculation.fixedCharges = fixedCharges;

    // Bendras mokestis
    calculation.totalAmount = calculation.variableCharges + calculation.fixedCharges;

    return calculation;
  }

  // Skaičiuoja fiksuotus mokesčius
  private calculateFixedCharges(): number {
    let total = 0;

    // Šiukšlės
    if (this.config.prices.garbage) {
      total += this.config.prices.garbage;
    }

    // Priežiūra
    if (this.config.prices.maintenance) {
      total += this.config.prices.maintenance;
    }

    return total;
  }

  // Patikrina, ar visi reikalingi skaitliukai pateikti
  checkRequiredMeters(readings: CommunalReading[]): {
    missing: string[];
    pending: string[];
    complete: boolean;
  } {
    const requiredMeters = this.config.meters.filter(m => m.isRequired);
    const missing: string[] = [];
    const pending: string[] = [];

    for (const meter of requiredMeters) {
      const reading = readings.find(r => r.meterId === meter.id);
      
      if (!reading) {
        missing.push(meter.name);
      } else if (reading.status === 'pending') {
        pending.push(meter.name);
      }
    }

    return {
      missing,
      pending,
      complete: missing.length === 0 && pending.length === 0,
    };
  }

  // Gauna skaitliuko informaciją
  getMeterInfo(meterId: string) {
    return this.config.meters.find(m => m.id === meterId);
  }

  // Gauna kainą už skaitliuką
  getMeterPrice(meterId: string): number {
    const meter = this.getMeterInfo(meterId);
    return meter?.defaultPrice || 0;
  }

  // Skaičiuoja suvartojimą ir kainą
  calculateConsumptionAndCost(
    currentReading: number,
    previousReading: number,
    meterId: string
  ): { consumption: number; cost: number } {
    const consumption = Math.max(0, currentReading - previousReading);
    const price = this.getMeterPrice(meterId);
    const cost = consumption * price;

    return { consumption, cost };
  }
}

// Pagalbinės funkcijos
export const formatCommunalPeriod = (period: string): string => {
  const [year, month] = period.split('-');
  const monthNames = [
    'Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis',
    'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis'
  ];
  
  return `${monthNames[parseInt(month) - 1]} ${year}`;
};

export const getCurrentPeriod = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const getPreviousPeriod = (currentPeriod: string): string => {
  const [year, month] = currentPeriod.split('-').map(Number);
  let prevMonth = month - 1;
  let prevYear = year;
  
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = year - 1;
  }
  
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
};



