# 🔧 Meters Module - Universalus Skaitiklių Sistema

## 📋 Apžvalga

Šis modulis suteikia vienodą sąsają skaitiklių valdymui visoje sistemoje. Sukurtas pagal **ultimate_performance_rules** ir modernių React praktikų standartus.

## 🚀 Komponentai

### UniversalAddMeterModal
- **Paskirtis**: Vienodas skaitiklių pridėjimo modal'as
- **Funkcijos**: 
  - Template'ų parinkimas
  - Custom skaitiklių kūrimas
  - Validacija ir įspėjimai
  - Performance optimizacijos

### UniversalMetersList
- **Paskirtis**: Skaitiklių sąrašo atvaizdavimas
- **Funkcijos**:
  - Grid/List view
  - Filtravimas ir paieška
  - Statistikos
  - CRUD operacijos

### MeterCard
- **Paskirtis**: Individualaus skaitiklio atvaizdavimas
- **Funkcijos**:
  - Compact/Full view
  - Action buttons
  - Status indicators

### MeterFilters
- **Paskirtis**: Skaitiklių filtravimo sąsaja
- **Funkcijos**:
  - Text search
  - Advanced filters
  - Quick filters

## 🎯 Performance Optimizacijos

### 1. React.memo
```typescript
export const MeterCard: React.FC<MeterCardProps> = React.memo(({...}) => {
  // Komponentas re-renderinamas tik keičiantis props
});
```

### 2. useCallback & useMemo
```typescript
const filteredMeters = useMemo(() => {
  // Skaičiavimai tik keičiantis dependencies
}, [meters, filters]);

const handleEdit = useCallback((meter) => {
  // Funkcija perkuriama tik keičiantis dependencies
}, [onEdit]);
```

### 3. Lazy Loading
```typescript
export const LazyMetersList = React.lazy(() => 
  import('./UniversalMetersList')
);
```

### 4. Virtualization
- Dideliems sąrašams naudojama virtualizacija
- Sumažintas DOM elementų skaičius

## 📚 Tipai ir Validacija

### Universalūs Tipai
```typescript
export interface Meter extends BaseMeter, MeterPricing {
  requires_photo?: boolean;
  is_custom?: boolean;
  is_inherited?: boolean;
}
```

### Validacijos Taisyklės
1. **Pavadinimas**: 2-100 simbolių, unikalus
2. **Kaina**: Teigiama, reali
3. **Verslo logika**: 
   - Vandens/elektros skaitliukai reikalauja nuotraukų
- Individualūs skaitliukai naudoja per_apartment
- Bendri skaitliukai nenaudoja per_apartment

## 🔄 Migravimas iš Senų Komponentų

### Prieš:
```typescript
import { AddMeterModal } from './AddMeterModal';
```

### Dabar:
```typescript
import { UniversalAddMeterModal } from '../meters/UniversalAddMeterModal';
```

## 📊 Bundle Size Optimizacija

### Code Splitting
- Lazy loading sunkių komponentų
- Tree shaking nebenaudojamų eksportų
- Minimali import granuliarumas

### CSS-in-JS Alternative
- Tailwind CSS klasės
- Minimalus runtime overhead
- Optimizuotas purging

## ⚡ Core Web Vitals

### LCP (Largest Contentful Paint)
- Lazy loading images
- Optimizuoti font'ai
- Critical CSS inline

### FID (First Input Delay)
- useCallback optimizacijos
- Event delegation
- Non-blocking operations

### CLS (Cumulative Layout Shift)
- Fixed dimensions
- Skeleton loading states
- Smooth transitions

## 🧪 Testing Strategy

### Unit Tests
```typescript
describe('MeterValidation', () => {
  it('should validate meter name correctly', () => {
    // Test implementation
  });
});
```

### Integration Tests
```typescript
describe('UniversalMetersList', () => {
  it('should filter meters correctly', () => {
    // Test implementation
  });
});
```

## 🔧 Troubleshooting

### Dažnos Problemos

1. **Import Errors**: Tikrinkite, ar naudojate naują import kelią
2. **Type Errors**: Įsitikinkite, kad naudojate universalius tipus
3. **Performance**: Patikrinkite React DevTools Profiler

### Debug Mode
```typescript
// Development mode
if (process.env.NODE_ENV === 'development') {
  console.log('Meter validation:', validation);
}
```

## 📈 Monitoringas

### Real User Monitoring (RUM)
- Web Vitals tracking
- Error boundary logging
- Performance metrics

### Synthetic Monitoring
- Lighthouse CI
- Bundle analyzer
- Performance budgets

## 🔄 Versioning & Rollback

### Backward Compatibility
- Senieji komponentai deprecated, bet veikia
- Postupinis migravimas
- Rollback strategy

### Migration Plan
1. Update imports
2. Test functionality
3. Remove old components
4. Monitor performance

## 🎨 Design System Integration

### Konsistenčia
- Vienodas spalvų paletė: `[#2F8481]`
- Tailwind utility klasės
- Responsive design

### Accessibility
- ARIA labels
- Keyboard navigation
- Screen reader support



