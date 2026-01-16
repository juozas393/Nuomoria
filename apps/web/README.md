# Nuomoria - Property Management System

## Apie projektą
Nuomoria yra moderni nuomos valdymo sistema, skirta nuomotojams ir nuomininkams. Sistema leidžia valdyti nekilnojamojo turto objektus, skaitliukus, mokesčius ir komunikaciją tarp nuomotojų ir nuomininkų.

## Technologijos
- **Frontend**: React 18 + TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel/Netlify ready

## Pagrindinės funkcijos

### Nuomotojams
- Adresų ir butų valdymas
- Skaitliukų konfigūravimas ir nustatymai
- Komunalinių mokesčių skaičiavimas
- Nuomininkų valdymas
- Sąskaitų generavimas
- Pranešimų sistema

### Nuomininkams
- Skaitliukų rodmenų įvedimas
- Mokesčių peržiūra
- Komunikacija su nuomotoju
- Dokumentų peržiūra

## Supabase konfigūracija

### Edge Functions
- `process-email-queue`: El. pašto siuntimo funkcija naudojant Resend API
  - Apdoroja el. laiškus iš `email_outbox` lentelės
  - Turi retry logiką ir klaidų valdymą
  - Reikalauja `RESEND_API_KEY` konfigūracijos

### Database Migrations
- `add-requires-photo-column.sql`: Prideda `requires_photo` stulpelį skaitliukų lentelėms
  - `address_meters` ir `apartment_meters` lentelės
  - Nustato ar skaitliukui reikia nuotraukos

## Saugumas
- Visi slaptažodžiai ir API raktai saugomi `.env.local` faile
- Console log'ai išjungti production režime
- Supabase RLS (Row Level Security) aktyvuotas
- Input validacija ir XSS apsauga
- Rate limiting kritinėms operacijoms

## Paleidimas
1. `npm install` - įdiegti dependencies
2. Sukurti `.env.local` su Supabase kredencialais
3. `npm start` - paleisti development serverį
4. `npm run build` - sukurti production build

## Deployment
Projektas paruoštas deployment'ui į Vercel ar Netlify. Reikia nustatyti environment variables production aplinkoje.

## Struktūra
```
property-manager/
├── src/
│   ├── components/     # React komponentai
│   ├── pages/         # Puslapiai
│   ├── context/       # React Context
│   ├── hooks/         # Custom hooks
│   ├── lib/           # API ir utility funkcijos
│   ├── types/         # TypeScript tipai
│   └── utils/         # Helper funkcijos
├── supabase/
│   ├── functions/     # Edge Functions
│   └── migrations/    # Database migracijos
└── public/            # Statiniai failai
```

## Pastabos
- Sistema naudoja Supabase Auth su Google OAuth palaikymu
- Real-time funkcionalumas naudojant Supabase subscriptions
- Responsive dizainas su Tailwind CSS
- TypeScript visam kode aukštam tipų saugumui
