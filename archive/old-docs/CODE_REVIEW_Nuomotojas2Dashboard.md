# Code Review: Nuomotojas2Dashboard.tsx

## Issues Found and Fixes Needed

### 🔴 **Critical Logic Issues**

#### 1. **Property.address doesn't exist** (Lines 80-81, 91-104)
**Problem**: Trying to access `property.address` but database only has `property.address_id`
```typescript
// ❌ WRONG
address: typeof property.address === 'string' ? property.address : property.address?.full_address || '',
address_id: property.address?.id,
addressInfo: property.address ? { ... } : null
```

**Solution**: Properties don't have an `address` object, only `address_id`. Need to look up address separately if needed.

#### 2. **Unused computed values** (Lines 121-126)
**Problem**: `tenants` variable is computed but never used in the component
```typescript
const tenants = useMemo(() => {
  if (!selectedAddress) return allTenants;
  return allTenants.filter((tenant: any) => 
    tenant.address_id === selectedAddress.id || tenant.address === selectedAddress.full_address
  );
}, [allTenants, selectedAddress]);
```

**Solution**: Either use it or remove it.

#### 3. **Unused handler** (Lines 177-180)
**Problem**: `handleAddressSelect` is defined but never called
```typescript
const handleAddressSelect = useCallback((address: any) => {
  setSelectedAddress(address);
}, []);
```

**Solution**: Remove if not needed.

---

### 🟡 **Import Cleanup Needed**

#### 4. **Unused imports**
- Line 6: `TenantListOptimized` - imported but never used
- Line 22: `OptimizedImage` - imported but not used (switched to plain img)
- Line 17: `addressApi, propertyApi, meterReadingApi` - imported but not used in frontend-only mode

---

### 🟢 **Performance & Logic Improvements**

#### 5. **addressList.total_apartments always 0** (Line 135)
**Problem**: Always hardcoded to 0 instead of calculating from properties
```typescript
total_apartments: 0,  // ❌ Always 0
```

**Solution**: Calculate actual count from properties per address

#### 6. **Inconsistent address ID usage**
**Problem**: Sometimes using `address.id`, sometimes `addressId` string
- Need to be consistent across all handlers

---

### 📋 **Recommended Fixes**

1. ✅ Remove `property.address` references
2. ✅ Remove unused `tenants` variable  
3. ✅ Remove unused `handleAddressSelect`
4. ✅ Remove unused imports
5. ✅ Fix `total_apartments` calculation
6. ✅ Simplify `allTenants` mapping (remove address object references)
7. ✅ Add proper TypeScript types instead of `any`

---

## Fixed Version Coming Next...


