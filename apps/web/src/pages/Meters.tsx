import React from "react";
import { MetersPlain } from "../components/meters/MetersPlain";
import { Meter } from "../types/meters";

// Sample meter data
const sampleMeters: Meter[] = [
  {
    id: "1",
    kind: "water_cold",
    type: "individual",
    distribution: "per_apartment",
    unit: "m3",
    pricePerUnit: 1.5,
    currency: "EUR",
    policy: {
      collectionMode: "landlord_only",
      scope: "apartment"
    },
    title: "Vanduo (šaltas)",
    mode: "individual",
    price: 1.5,
    allocation: "per_apartment",
    photoRequired: true,
    active: true
  },
  {
    id: "2",
    kind: "water_hot",
    type: "individual",
    distribution: "per_apartment",
    unit: "m3",
    pricePerUnit: 3.0,
    currency: "EUR",
    policy: {
      collectionMode: "landlord_only",
      scope: "apartment"
    },
    title: "Vanduo (karštas)",
    mode: "individual",
    price: 3.0,
    allocation: "per_apartment",
    photoRequired: true,
    active: true
  },
  {
    id: "3",
    kind: "electricity_individual",
    type: "individual",
    distribution: "per_apartment",
    unit: "kWh",
    pricePerUnit: 0.15,
    currency: "EUR",
    policy: {
      collectionMode: "landlord_only",
      scope: "apartment"
    },
    title: "Elektra (individuali)",
    mode: "individual",
    price: 0.15,
    allocation: "per_apartment",
    photoRequired: true,
    active: true
  },
  {
    id: "4",
    kind: "electricity_common",
    type: "shared",
    distribution: "per_apartment",
    unit: "kWh",
    pricePerUnit: 0.15,
    currency: "EUR",
    policy: {
      collectionMode: "landlord_only",
      scope: "apartment"
    },
    title: "Elektra (bendra)",
    mode: "communal",
    price: 0.15,
    allocation: "per_apartment",
    photoRequired: false,
    active: true
  },
  {
    id: "5",
    kind: "heating",
    type: "shared",
    distribution: "per_area",
    unit: "GJ",
    pricePerUnit: 25.0,
    currency: "EUR",
    policy: {
      collectionMode: "landlord_only",
      scope: "apartment"
    },
    title: "Šildymas",
    mode: "communal",
    price: 25.0,
    allocation: "per_area",
    photoRequired: false,
    active: true
  },
  {
    id: "6",
    kind: "gas",
    type: "individual",
    distribution: "per_apartment",
    unit: "m3",
    pricePerUnit: 0.8,
    currency: "EUR",
    policy: {
      collectionMode: "landlord_only",
      scope: "apartment"
    },
    title: "Dujos",
    mode: "individual",
    price: 0.8,
    allocation: "per_apartment",
    photoRequired: true,
    active: false
  }
];

export default function MetersPage() {
  const handleReadingSubmit = (meterId: string, reading: number) => {
    console.log(`Submitting reading for meter ${meterId}: ${reading}`);
    // Here you would typically save to database
  };

  const handlePhotoUpload = (meterId: string) => {
    console.log(`Uploading photo for meter ${meterId}`);
    // Here you would typically open photo upload modal
  };

  const handleHistoryView = (meterId: string) => {
    console.log(`Viewing history for meter ${meterId}`);
    // Here you would typically open history modal
  };

  const handleCollectAll = () => {
    console.log("Collecting all readings");
    // Here you would typically trigger bulk collection
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Skaitliukų valdymas</h1>
          <p className="text-gray-600 mt-2">
            Peržiūrėkite ir valdykite visus skaitliukus bei jų rodmenis
          </p>
        </div>
        
        <MetersPlain
          meters={sampleMeters}
          onSaveReading={handleReadingSubmit}
          onOpenPhoto={handlePhotoUpload}
          onRequestMissing={handleCollectAll}
        />
      </div>
    </div>
  );
}
