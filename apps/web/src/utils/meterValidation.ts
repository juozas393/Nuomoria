/**
 * ultimate_performance_rules:
 * - Diagnose root cause, not patch symptom
 * - Meet Core Web Vitals thresholds
 * - Optimize images: WebP/AVIF, srcset, lazy, dimension attrs
 * - Keep bundles small, defer noncritical JS
 * - Minimize DOM size, use virtualization
 * - Cache aggressively: HTTP/2, CDN, ServiceWorkers
 * - Real-time performance monitoring setup
 * - Balance performance vs maintainability decisions
 * - Always ask before ambiguous fixes
 * - Continuous image and perf auditing process
 */

import { MeterForm, Unit, MeterTypeSection } from '../types/meters';
import { getMeterKind, ALLOWED, DISTRIBUTION_LABELS, type DistributionMethod } from '../constants/meterDistribution';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Validate a single meter form
export const validateMeter = (meter: MeterForm, existingNames: string[] = []): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Validate name
  const meterName = meter.label || meter.title || meter.custom_name || '';
  if (!meterName.trim()) {
    errors.push({
      field: 'name',
      message: 'Skaitiklio pavadinimas yra privalomas'
    });
  }

  // Check for duplicate names
  if (existingNames.includes(meterName)) {
    errors.push({
      field: 'name',
      message: 'Skaitiklis su tokiu pavadinimu jau egzistuoja'
    });
  }

  // Validate unit
  if (!meter.unit) {
    errors.push({
      field: 'unit',
      message: 'Matavimo vienetas yra privalomas'
    });
  }

  // Validate price
  const meterPrice = meter.price_per_unit || meter.price || 0;
  if (meter.unit !== 'Kitas' && meterPrice <= 0) {
    // Allow zero prices for certain communal meters with fixed pricing
    if (meter.mode !== 'communal') {
      errors.push({
        field: 'price',
        message: 'Kaina turi būti didesnė nei 0'
      });
    }
  }

  // Validate allocation method
  if (!meter.allocation) {
    errors.push({
      field: 'allocation',
      message: 'Paskirstymo būdas yra privalomas'
    });
  }

  // Validate fixed price meters
  if (meter.allocation === 'fixed_split') {
    const fixedPrice = meter.fixed_price || meter.price_per_unit || meter.price || 0;
    if (fixedPrice <= 0) {
      errors.push({
        field: 'price',
        message: 'Fiksuota kaina turi būti didesnė nei 0'
      });
    }
    if (meter.mode === 'individual') {
      errors.push({
        field: 'allocation',
        message: 'Fiksuoti mokesčiai turėtų naudoti tinkamą paskirstymo būdą'
      });
    }
  }

  // Validate allocation against centralized ALLOWED config
  if (meter.allocation && meter.allocation !== 'fixed_split' && meter.mode) {
    const kind = getMeterKind(meterName, meter.mode as 'individual' | 'communal');
    const cfg = ALLOWED[kind];
    if (cfg && !cfg.allowed.includes(meter.allocation as DistributionMethod)) {
      const allowedLabels = cfg.allowed.map(d => DISTRIBUTION_LABELS[d]).join(', ');
      errors.push({
        field: 'allocation',
        message: `Šis paskirstymo metodas netinka. Galimi: ${allowedLabels}`
      });
    }
  }

  // Water meters should always require photos
  if (meterName.toLowerCase().includes('vanduo') && !meter.require_photo) {
    errors.push({
      field: 'require_photo',
      message: 'Vandens skaitliukai paprastai reikalauja nuotraukos patvirtinimui'
    });
  }

  // Electricity meters should always require photos
  if (meterName.toLowerCase().includes('elektra') && !meter.require_photo) {
    errors.push({
      field: 'require_photo',
      message: 'Elektros skaitliukai paprastai reikalauja nuotraukos patvirtinimui'
    });
  }

  return errors;
};

// Validate multiple meters
export const validateMeters = (meters: MeterForm[], existingNames: string[] = []): ValidationResult => {
  const errors: ValidationError[] = [];
  const allNames: string[] = [...existingNames];

  meters.forEach((meter, index) => {
    const meterErrors = validateMeter(meter, allNames);

    // Prefix errors with meter index for better identification
    meterErrors.forEach(error => {
      errors.push({
        field: `meter_${index}_${error.field}`,
        message: `Skaitiklis "${meter.label || meter.title || meter.custom_name}": ${error.message}`
      });
    });

    // Add this meter's name to the list for subsequent validations
    const meterName = meter.label || meter.title || meter.custom_name || '';
    if (meterName) {
      allNames.push(meterName);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Get validation warnings (non-blocking issues)
export const getValidationWarnings = (meter: MeterForm): ValidationError[] => {
  const warnings: ValidationError[] = [];
  const meterName = meter.label || meter.title || meter.custom_name || '';

  // Common naming issues
  if (meterName.includes('test') || meterName.includes('Test')) {
    warnings.push({
      field: 'name',
      message: 'Pavadinime yra žodis "test" - įsitikinkite, kad tai ne testavimo duomenys'
    });
  }

  // Price warnings
  if (meter.price_per_unit === 0) {
    warnings.push({
      field: 'price_per_unit',
      message: 'Kaina yra 0 - įsitikinkite, kad tai teisinga'
    });
  }

  // Photo requirement warnings
  if (!meter.require_photo && (meterName.toLowerCase().includes('vanduo') || meterName.toLowerCase().includes('elektra'))) {
    warnings.push({
      field: 'require_photo',
      message: 'Šis skaitiklis paprastai reikalauja nuotraukos'
    });
  }

  return warnings;
};

// Validate meter name
export const validateMeterName = (name: string, existingNames: string[]): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!name.trim()) {
    errors.push({
      field: 'name',
      message: 'Pavadinimas yra privalomas'
    });
  }

  if (existingNames.includes(name)) {
    errors.push({
      field: 'name',
      message: 'Skaitiklis su tokiu pavadinimu jau egzistuoja'
    });
  }

  if (name.length > 100) {
    errors.push({
      field: 'name',
      message: 'Pavadinimas negali būti ilgesnis nei 100 simbolių'
    });
  }

  return errors;
};

// Validate meter pricing
export const validateMeterPricing = (price: number, unit: Unit): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (price < 0) {
    errors.push({
      field: 'price',
      message: 'Kaina negali būti neigiama'
    });
  }

  if (price > 10000) {
    errors.push({
      field: 'price',
      message: 'Kaina atrodo per didelė - patikrinkite'
    });
  }

  return errors;
};
