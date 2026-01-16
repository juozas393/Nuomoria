/**
 * Script to fix Supabase connection issues
 * - Verifies .env.development has correct API key
 * - Clears browser localStorage cache instructions
 * - Provides restart instructions
 */

const fs = require('fs');
const path = require('path');

function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload;
  } catch (e) {
    return null;
  }
}

function fixConnection() {
  console.log('🔧 Fixing Supabase Connection...\n');
  
  const envPath = path.join(__dirname, '..', '.env.development');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.development file not found!');
    console.error(`   Expected at: ${envPath}`);
    return false;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  let supabaseUrl = null;
  let supabaseAnonKey = null;
  
  for (const line of lines) {
    if (line.startsWith('REACT_APP_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('REACT_APP_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.split('=')[1].trim();
    }
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing required environment variables!');
    return false;
  }

  console.log('✅ Found environment variables');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Key length: ${supabaseAnonKey.length} characters\n`);

  // Extract project ref from URL
  const urlMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
  const urlProjectRef = urlMatch ? urlMatch[1] : null;

  if (!urlProjectRef) {
    console.error('❌ Invalid Supabase URL format!');
    return false;
  }

  // Decode JWT to get project ref
  const jwtPayload = decodeJWT(supabaseAnonKey);
  if (!jwtPayload) {
    console.error('❌ Invalid JWT format!');
    return false;
  }

  const jwtProjectRef = jwtPayload.ref;
  if (!jwtProjectRef) {
    console.error('❌ JWT does not contain project ref!');
    return false;
  }

  console.log(`   URL project ref: ${urlProjectRef}`);
  console.log(`   JWT project ref: ${jwtProjectRef}`);

  if (jwtProjectRef !== urlProjectRef) {
    console.error('\n❌ PROJECT REF MISMATCH!');
    console.error(`   URL project: ${urlProjectRef}`);
    console.error(`   Key project: ${jwtProjectRef}`);
    console.error('\n🔧 To fix:');
    console.error(`   1. Go to: https://app.supabase.com/project/${urlProjectRef}/settings/api`);
    console.error('   2. Copy the "anon" "public" key (NOT service_role!)');
    console.error('   3. Update .env.development with the correct key');
    console.error('   4. Restart dev server: npm start');
    return false;
  }

  console.log('\n✅ Configuration is correct!');
  console.log('\n📋 Next steps:');
  console.log('   1. Stop dev server (Ctrl+C)');
  console.log('   2. Clear browser localStorage:');
  console.log('      - Open browser DevTools (F12)');
  console.log('      - Go to Application/Storage tab');
  console.log('      - Clear all "sb-*" and "supabase*" keys from localStorage');
  console.log('   3. Restart dev server: npm start');
  console.log('   4. Hard refresh browser: Ctrl+Shift+R (or Cmd+Shift+R on Mac)');
  console.log('\n✅ Connection should work after these steps!');
  
  return true;
}

fixConnection();
