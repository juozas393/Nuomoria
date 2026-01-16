/**
 * Helper script to verify Supabase configuration
 * Run with: node scripts/verify-supabase-config.js
 */

const fs = require('fs');
const path = require('path');

function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload;
  } catch (e) {
    return null;
  }
}

function verifyConfig() {
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
    console.error('   REACT_APP_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
    console.error('   REACT_APP_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅' : '❌');
    return false;
  }

  console.log('✅ Found environment variables');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Anon Key: ${supabaseAnonKey.substring(0, 30)}...${supabaseAnonKey.substring(supabaseAnonKey.length - 10)}`);
  console.log(`   Key length: ${supabaseAnonKey.length} characters`);

  // Extract project ref from URL
  const urlMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
  const urlProjectRef = urlMatch ? urlMatch[1] : null;

  if (!urlProjectRef) {
    console.error('❌ Invalid Supabase URL format!');
    return false;
  }

  console.log(`   URL project ref: ${urlProjectRef}`);

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

  console.log(`   JWT project ref: ${jwtProjectRef}`);

  // Verify match
  if (jwtProjectRef === urlProjectRef) {
    console.log('');
    console.log('✅ SUCCESS: Project refs match!');
    console.log(`   Both point to project: ${urlProjectRef}`);
    return true;
  } else {
    console.error('');
    console.error('❌ ERROR: Project ref mismatch!');
    console.error(`   URL project: ${urlProjectRef}`);
    console.error(`   JWT project: ${jwtProjectRef}`);
    console.error('');
    console.error('🔧 To fix:');
    console.error(`   1. Get the anon key from project: ${urlProjectRef}`);
    console.error(`   2. Update REACT_APP_SUPABASE_ANON_KEY in .env.development`);
    console.error(`   3. Get key from: https://app.supabase.com/project/${urlProjectRef}/settings/api`);
    return false;
  }
}

if (require.main === module) {
  const isValid = verifyConfig();
  process.exit(isValid ? 0 : 1);
}

module.exports = { verifyConfig };
