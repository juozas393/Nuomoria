import React, { useState } from 'react';
import { exampleMeters, getTenantVisibleMeters, getLandlordVisibleMeters } from '../data/meterExamples';
import { runAllTests } from '../utils/meterPolicyTests';
import MeterPolicyCard from '../components/meters/MeterPolicyCard';
import { Meter, MeterReading } from '../types/meterPolicy';

const MeterPolicyDemo: React.FC = () => {
  const [isLandlord, setIsLandlord] = useState(false);
  const [showTests, setShowTests] = useState(false);
  const [readings, setReadings] = useState<Record<string, MeterReading>>({});

  const visibleMeters = isLandlord ? getLandlordVisibleMeters(exampleMeters) : getTenantVisibleMeters(exampleMeters);

  const handleReadingApprove = (readingId: string) => {
    setReadings(prev => ({
      ...prev,
      [readingId]: {
        ...prev[readingId],
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: 'landlord'
      }
    }));
  };

  const handleReadingReject = (readingId: string) => {
    setReadings(prev => ({
      ...prev,
      [readingId]: {
        ...prev[readingId],
        status: 'rejected',
        approvedAt: new Date(),
        approvedBy: 'landlord'
      }
    }));
  };

  const runTests = () => {
    setShowTests(true);
    setTimeout(() => {
      runAllTests();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Skaitliukų Rodmenų Rinkimo Sistema
          </h1>
          <p className="text-gray-600 mb-6">
            Demonstracija naujos skaitliukų rodmenų rinkimo sistemos su policy režimais
          </p>

          {/* Controls */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setIsLandlord(!isLandlord)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isLandlord 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {isLandlord ? 'Nuomotojas' : 'Nuomininkas'}
            </button>
            
            <button
              onClick={runTests}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Paleisti Testus
            </button>
          </div>

          {/* Test Results */}
          {showTests && (
            <div className="bg-gray-100 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Testų Rezultatai</h3>
              <div id="test-output" className="text-sm font-mono bg-black text-green-400 p-3 rounded">
                Testai paleisti. Patikrinkite konsolę rezultatams.
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900">Iš viso skaitliukų</h3>
              <p className="text-2xl font-bold text-blue-600">{exampleMeters.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-900">Matoma nuomininkui</h3>
              <p className="text-2xl font-bold text-green-600">{getTenantVisibleMeters(exampleMeters).length}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-orange-900">Fiksuoti</h3>
              <p className="text-2xl font-bold text-orange-600">
                {exampleMeters.filter(m => m.policy.scope === 'none').length}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-900">Reikalauja skaitliukų</h3>
              <p className="text-2xl font-bold text-purple-600">
                {exampleMeters.filter(m => m.policy.scope !== 'none').length}
              </p>
            </div>
          </div>
        </div>

        {/* Meters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleMeters.map((meter) => (
            <MeterPolicyCard
              key={meter.id}
              meter={meter}
              reading={readings[meter.id]}
              isLandlord={isLandlord}
              onReadingApprove={handleReadingApprove}
              onReadingReject={handleReadingReject}
            />
          ))}
        </div>

        {/* Empty state */}
        {visibleMeters.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isLandlord ? 'Nėra skaitliukų' : 'Nėra skaitliukų matomų nuomininkui'}
            </h3>
            <p className="text-gray-600">
              {isLandlord 
                ? 'Skaitliukai dar nebuvo pridėti prie šio adreso.'
                : 'Visi skaitliukai yra nuomotojo valdymo arba fiksuoti.'
              }
            </p>
          </div>
        )}

        {/* Policy Explanation */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Sistemos Aprašymas</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Režimai</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><strong>landlord_only:</strong> Rodmenis suveda nuomotojas</li>
                <li><strong>tenant_photo:</strong> Nuomininkas pateikia nuotrauką + skaičių</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Apimtis</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><strong>apartment:</strong> Po rodmenį butui</li>
                <li><strong>building:</strong> Vienas bendras namui</li>
                <li><strong>none:</strong> Fiksuota - rodmenų nėra</li>
              </ul>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Matomumo Taisyklės</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Nuomininkui rodomi tik <strong>tenant_photo</strong> režimo skaitliukai</li>
              <li>• <strong>landlord_only</strong> ir <strong>fiksuoti</strong> skaitliukai matomi tik sąskaitoje</li>
              <li>• <strong>scope=&apos;none&apos;</strong> skaitliukai niekada neprašo rodmenų/nuotraukų</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeterPolicyDemo;
