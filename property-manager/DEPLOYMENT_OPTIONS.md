# 🚀 Deployment į nuomoria.lt - Visos galimybės

## 📋 Pasirink deployment metodą:

### 1. **Vercel** (REKOMENDUOJU - lengviausia)
**Kodėl Vercel:**
- ✅ Automatinis SSL sertifikatas
- ✅ CDN visame pasaulyje (greitas)
- ✅ Automatinis deployment iš GitHub
- ✅ Nemokama hosting (100GB/mėn)
- ✅ Puikus performance
- ✅ Automatinis domain setup

**Kaip deploy:**
```bash
# 1. Eik į vercel.com
# 2. Prisijunk su GitHub
# 3. Importuok repository
# 4. Pridėk environment variables
# 5. Pridėk domeną nuomoria.lt
```

### 2. **Netlify** (alternatyva)
**Privalumai:**
- ✅ Panašus į Vercel
- ✅ Form handling
- ✅ Serverless funkcijos

**Kaip deploy:**
```bash
# 1. Eik į netlify.com
# 2. Prisijunk su GitHub
# 3. Importuok repository
# 4. Pridėk environment variables
# 5. Pridėk domeną nuomoria.lt
```

### 3. **GitHub Pages** (nemokama)
**Privalumai:**
- ✅ Nemokama hosting
- ✅ Automatinis deployment
- ⚠️ Tik statiniai failai (be server-side)

**Kaip deploy:**
```bash
# 1. GitHub → Settings → Pages
# 2. Source: Deploy from branch
# 3. Branch: gh-pages
# 4. Pridėk custom domain
```

### 4. **Tavo serveris** (jei turi)
**Privalumai:**
- ✅ Pilna kontrolė
- ✅ Custom konfigūracija

**Kaip deploy:**
```bash
# 1. npm run build
# 2. Upload build/ folder į serverį
# 3. Setup nginx/apache
# 4. Setup SSL sertifikatą
```

## 🌐 IV.lt domeno setup:

### DNS nustatymai (IV.lt panelėje):

**Jei naudosi Vercel:**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com

Type: CNAME  
Name: www
Value: cname.vercel-dns.com
```

**Jei naudosi Netlify:**
```
Type: CNAME
Name: @
Value: <tavo-netlify-site>.netlify.app

Type: CNAME  
Name: www
Value: <tavo-netlify-site>.netlify.app
```

**Jei naudosi GitHub Pages:**
```
Type: A
Name: @
Value: 185.199.108.153
Value: 185.199.109.153
Value: 185.199.110.153
Value: 185.199.111.153

Type: CNAME
Name: www
Value: <tavo-username>.github.io
```

## 🔧 Ką reikia padaryti:

### 1. **Pasirink deployment metodą**
Kurį metodą nori naudoti?

### 2. **Supabase duomenys**
Ar turi Supabase projektą su:
- URL: `https://xxx.supabase.co`
- Anon Key: `eyJ...`

### 3. **GitHub repository**
Ar turi GitHub repository kur galėčiau padėti kodą?

## 📞 Kas toliau:

1. **Pasakyk, kurį deployment metodą nori**
2. **Pateik Supabase duomenis**
3. **Aš padėsiu su setup**

Vercel yra pats lengviausias - 5 min ir viskas veiks! 🎯





