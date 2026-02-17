// Server-side validacija skaitliukų pasiskirstymo metodams
import {
  assertAllowed,
  checkPrecondition,
  type DistributionMethod,
  type MeterKind,
  type PreconditionContext
} from '../constants/meterDistribution';

// API validacijos helper
export function validateMeterDistribution(
  meterName: string,
  type: 'individual' | 'communal',
  distribution: DistributionMethod
): void {
  const kind = getMeterKindFromName(meterName, type);
  assertAllowed(kind, distribution);
}

// Precondition checking su kontekstu
export function validateMeterPreconditions(
  meterName: string,
  type: 'individual' | 'communal',
  distribution: DistributionMethod,
  context: PreconditionContext
): { valid: boolean; reason?: string } {
  const kind = getMeterKindFromName(meterName, type);
  const result = checkPrecondition(kind, distribution, context);

  return {
    valid: result.allowed,
    reason: result.reason
  };
}

// Skaičiavimo formulės validacija
export function validateCalculationInputs(
  distribution: DistributionMethod,
  context: {
    totalAmount: number;
    units: number;
    sumArea: number;
    readings?: Array<{ current: number; previous: number; price: number }>;
    fixedAmount?: number;
    persons?: number[];
  }
): { valid: boolean; reason?: string } {
  switch (distribution) {
    case 'per_apartment':
      if (context.units <= 0) {
        return { valid: false, reason: 'Nėra butų' };
      }
      break;

    case 'per_person':
      if (!context.persons || context.persons.length === 0) {
        return { valid: false, reason: 'Nėra gyventojų duomenų' };
      }
      if (context.persons.reduce((s, p) => s + p, 0) <= 0) {
        return { valid: false, reason: 'Gyventojų skaičius turi būti didesnis už 0' };
      }
      break;

    case 'per_area':
      if (context.sumArea <= 0) {
        return { valid: false, reason: 'Nėra butų plotų' };
      }
      break;

    case 'per_consumption':
      if (!context.readings || context.readings.length === 0) {
        return { valid: false, reason: 'Nėra skaitiklio rodmenų' };
      }
      break;

    case 'fixed_split':
      if (!context.fixedAmount || context.fixedAmount <= 0) {
        return { valid: false, reason: 'Nenurodyta fiksuota suma' };
      }
      break;
  }

  if (context.totalAmount < 0) {
    return { valid: false, reason: 'Bendra suma negali būti neigiama' };
  }

  return { valid: true };
}

// Skaičiavimo formulės
export function calculateDistribution(
  distribution: DistributionMethod,
  context: {
    totalAmount: number;
    units: number;
    sumArea: number;
    readings?: Array<{ current: number; previous: number; price: number }>;
    fixedAmount?: number;
    areas?: number[];
    persons?: number[];
  }
): { amounts: number[]; total: number } {
  const { totalAmount, units, sumArea, readings, fixedAmount, areas, persons } = context;

  switch (distribution) {
    case 'per_apartment': {
      // Pagal butus: bendra suma / butų skaičius (lygiomis dalimis)
      if (units <= 0) {
        throw new Error('Butų skaičius turi būti didesnis už 0');
      }
      const perApartment = totalAmount / units;
      return {
        amounts: Array(units).fill(perApartment),
        total: totalAmount
      };
    }

    case 'per_person': {
      // Pagal asmenis: proporcingai gyventojų skaičiui kiekviename bute
      if (!persons || persons.length === 0) {
        throw new Error('Gyventojų skaičius privalomas per_person metodui');
      }
      const totalPersons = persons.reduce((sum, p) => sum + p, 0);
      if (totalPersons <= 0) {
        throw new Error('Bendras gyventojų skaičius turi būti didesnis už 0');
      }
      const personAmounts = persons.map(p => (totalAmount * p) / totalPersons);
      return {
        amounts: personAmounts,
        total: totalAmount
      };
    }

    case 'per_area': {
      // Pagal plotą: proporcingai buto plotui
      if (!areas || sumArea <= 0) {
        throw new Error('Butų plotai privalomi per_area metodui');
      }
      const areaAmounts = areas.map(area => {
        if (area <= 0) return 0;
        return (totalAmount * area) / sumArea;
      });
      return {
        amounts: areaAmounts,
        total: totalAmount
      };
    }

    case 'per_consumption': {
      // Pagal suvartojimą: kiekvienas butas moka pagal savo skaitiklio rodmenis
      if (!readings) {
        throw new Error('Skaitliuko rodmenys privalomi per_consumption metodui');
      }
      const consumptionAmounts = readings.map(reading => {
        const consumption = reading.current - reading.previous;
        return Math.max(0, consumption * reading.price);
      });
      return {
        amounts: consumptionAmounts,
        total: consumptionAmounts.reduce((sum, amount) => sum + amount, 0)
      };
    }

    case 'fixed_split': {
      // Fiksuota suma kiekvienam butui
      if (!fixedAmount || fixedAmount <= 0) {
        throw new Error('Fiksuota suma turi būti didesnė už 0');
      }
      return {
        amounts: Array(units).fill(fixedAmount),
        total: fixedAmount * units
      };
    }

    default:
      throw new Error(`Nežinomas pasiskirstymo metodas: ${distribution}`);
  }
}

// Pagalbinė funkcija skaitliuko tipo nustatymui
function getMeterKindFromName(name: string, type: 'individual' | 'communal'): MeterKind {
  const lowerName = name.toLowerCase();

  if (type === 'individual') {
    if (lowerName.includes('vanduo') && lowerName.includes('šaltas')) return 'water_cold';
    if (lowerName.includes('vanduo') && lowerName.includes('karštas')) return 'water_hot';
    if (lowerName.includes('elektra') && lowerName.includes('individuali')) return 'electricity_ind';
    if (lowerName.includes('dujos')) return 'gas_ind';
    if (lowerName.includes('šildymas')) return 'heating';
  } else {
    if (lowerName.includes('elektra') && lowerName.includes('bendra')) return 'electricity_shared';
    if (lowerName.includes('vėdinimas')) return 'ventilation';
    if (lowerName.includes('liftas')) return 'elevator';
    if (lowerName.includes('internetas')) return 'internet';
    if (lowerName.includes('šiukšlės') || lowerName.includes('šiukšlių')) return 'trash';
  }

  // Fallback
  return type === 'individual' ? 'electricity_ind' : 'electricity_shared';
}

// Edge cases handling
export function handleCalculationEdgeCases(
  amounts: number[],
  total: number,
  targetTotal: number
): number[] {
  // Apvalinimo ir sum reconciliation
  const roundedAmounts = amounts.map(amount => Math.round(amount * 100) / 100);
  const roundedTotal = roundedAmounts.reduce((sum, amount) => sum + amount, 0);

  // Jei yra skirtumas dėl apvalinimo, pataisyti paskutinį elementą
  if (Math.abs(roundedTotal - targetTotal) > 0.01) {
    const difference = targetTotal - roundedTotal;
    if (roundedAmounts.length > 0) {
      roundedAmounts[roundedAmounts.length - 1] += difference;
      roundedAmounts[roundedAmounts.length - 1] = Math.round(roundedAmounts[roundedAmounts.length - 1] * 100) / 100;
    }
  }

  return roundedAmounts;
}
