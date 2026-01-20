# 🚀 NUOMORIA SETUP - STEP BY STEP

## ✅ **ŽINGSNIS 1: Atidarykite Supabase Dashboard**

1. Eikite į: **https://supabase.com/dashboard/project/hlcvskkxrnwxtktscpyy/editor**
2. Prisijunkite su savo Supabase accountu

---

## ✅ **ŽINGSNIS 2: Atidarykite SQL Editor**

1. Kairėje pusėje spauskite **"SQL Editor"** (su `<>` ikona)
2. Spauskite **"New Query"** (viršutinėje dešinėje pusėje mėlynas mygtukas)

---

## ✅ **ŽINGSNIS 3: Nukopijuokite SQL kodą**

1. Atidarykite failą: `SUPABASE_SETUP.sql` (šiame projekte)
2. **COPY VISKĄ** (Ctrl+A, tada Ctrl+C)
3. **PASTE** į Supabase SQL Editor (Ctrl+V)

---

## ✅ **ŽINGSNIS 4: Run SQL**

1. Spauskite **"Run"** (arba Ctrl+Enter)
2. Palaukite 2-3 sekundes
3. Pamatysite žinutę: **"Success. No rows returned"** - TAI GERAI! ✅

---

## ✅ **ŽINGSNIS 5: Patikrinkite ar veikia**

1. **Refresh naršyklę** su jūsų Nuomoria app (F5)
2. Bandykite prisijungti su Google
3. **404 klaidos turėtų išnykti!** ✅

---

## 🔧 **JEI KAS NORS NEPAVYKO**

### Klaida: "relation already exists"
**Sprendimas**: Viskas gerai! Tai reiškia, kad lentelė jau egzistuoja. SQL failas yra safe - jis nepers**rašys** esančių duomenų.

### Vis dar matote 404 klaidą po refresh
**Sprendimas**:
1. Eikite į: https://supabase.com/dashboard/project/hlcvskkxrnwxtktscpyy/editor
2. Kairėje pusėje spauskite **"Table Editor"**
3. Patikrinkite ar matote lentelę: **`profiles`**
4. Jei NEMATOTE - pakartokite ŽINGSNIS 3-4

---

## 🎉 **BAIGTA!**

Dabar jūsų Nuomoria app turėtų:
- ✅ Veikti Google OAuth login
- ✅ Veikti Username/Password login (esamiems vartotojams)
- ✅ Veikti onboarding (naujiems vartotojams)

---

## 📞 **SUPPORT**

Jei vis dar neveikia:
1. Screenshot Supabase SQL Editor output (po Run)
2. Screenshot browser console (F12 -> Console tab)
3. Parašykite man!
