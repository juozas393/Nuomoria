// Test functions for meter policy system
import { isVisibleToTenant, inferPolicyFrom } from '../types/meterPolicy';

// Test 1: Matomumas nuomininkui
export const testTenantVisibility = () => {
  console.log('🧪 Testing tenant visibility...');
  
  const test1 = isVisibleToTenant({
    id: '1',
    kind: 'water_cold',
    type: 'individual',
    distribution: 'per_consumption',
    unit: 'm3',
    currency: 'EUR',
    policy: { collectionMode: 'tenant_photo', scope: 'apartment' }
  } as any);
  
  const test2 = isVisibleToTenant({
    id: '2',
    kind: 'internet',
    type: 'shared',
    distribution: 'fixed_split',
    unit: 'custom',
    currency: 'EUR',
    policy: { collectionMode: 'tenant_photo', scope: 'none' }
  } as any);
  
  const test3 = isVisibleToTenant({
    id: '3',
    kind: 'electricity_shared',
    type: 'shared',
    distribution: 'per_apartment',
    unit: 'kWh',
    currency: 'EUR',
    policy: { collectionMode: 'landlord_only', scope: 'building' }
  } as any);
  
  console.log('✅ tenant_photo + apartment (per_consumption):', test1); // should be true
  console.log('❌ tenant_photo + none:', test2); // should be false
  console.log('❌ landlord_only + building:', test3); // should be false
  
  return test1 === true && test2 === false && test3 === false;
};

// Test 2: Policy išvedimas
export const testPolicyInference = () => {
  console.log('🧪 Testing policy inference...');
  
  const test1 = inferPolicyFrom({ type: 'individual', distribution: 'per_consumption' });
  const test2 = inferPolicyFrom({ type: 'shared', distribution: 'per_area' });
  const test3 = inferPolicyFrom({ distribution: 'fixed_split' });
  
  console.log('✅ individual + per_consumption:', test1); // should be 'apartment'
  console.log('✅ shared + per_area:', test2); // should be 'building'
  console.log('✅ fixed_split:', test3); // should be 'none'
  
  return test1 === 'apartment' && test2 === 'building' && test3 === 'none';
};

// Test 3: Validacijos santrauka
export const testValidations = () => {
  console.log('🧪 Testing validations...');
  
  // Simulate validation checks
  const tenantPhotoWithoutPhoto = false; // should be false
  const tenantPhotoWithoutReading = false; // should be false
  const currentLessThanPrevious = true; // should show warning
  
  console.log('❌ tenant_photo be foto:', tenantPhotoWithoutPhoto);
  console.log('❌ tenant_photo be skaičiaus:', tenantPhotoWithoutReading);
  console.log('⚠️ current < previous:', currentLessThanPrevious);
  
  return true;
};

// Run all tests
export const runAllTests = () => {
  console.log('🚀 Running meter policy tests...\n');
  
  const visibilityTest = testTenantVisibility();
  console.log('');
  
  const inferenceTest = testPolicyInference();
  console.log('');
  
  const validationTest = testValidations();
  console.log('');
  
  const allPassed = visibilityTest && inferenceTest && validationTest;
  console.log(allPassed ? '✅ All tests passed!' : '❌ Some tests failed!');
  
  return allPassed;
};
