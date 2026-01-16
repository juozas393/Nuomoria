/**
 * Helper script to update Supabase API key in .env.development
 * Usage: node scripts/update-supabase-key.js <anon_key>
 */

const fs = require('fs');
const path = require('path');

function updateEnvFile(anonKey) {
  const envPath = path.join(__dirname, '..', '.env.development');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.development file not found!');
    console.error(`   Expected at: ${envPath}`);
    console.error('   Creating from template...');
    
    // Try to create from template
    const templatePath = path.join(__dirname, '..', 'env.development.template');
    if (fs.existsSync(templatePath)) {
      fs.copyFileSync(templatePath, envPath);
      console.log('✅ Created .env.development from template');
    } else {
      console.error('❌ Template file not found either!');
      return false;
    }
  }

  let envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  let updated = false;
  const newLines = lines.map(line => {
    if (line.startsWith('REACT_APP_SUPABASE_ANON_KEY=')) {
      updated = true;
      return `REACT_APP_SUPABASE_ANON_KEY=${anonKey}`;
    }
    return line;
  });
  
  if (!updated) {
    // Add the key if it doesn't exist
    newLines.push(`REACT_APP_SUPABASE_ANON_KEY=${anonKey}`);
    console.log('⚠️  REACT_APP_SUPABASE_ANON_KEY not found, adding it...');
  }
  
  // Also ensure URL is correct
  let urlUpdated = false;
  const finalLines = newLines.map(line => {
    if (line.startsWith('REACT_APP_SUPABASE_URL=')) {
      const currentUrl = line.split('=')[1]?.trim();
      if (currentUrl !== 'https://hlcvskkxrnwxtktscpyy.supabase.co') {
        urlUpdated = true;
        return 'REACT_APP_SUPABASE_URL=https://hlcvskkxrnwxtktscpyy.supabase.co';
      }
    }
    return line;
  });
  
  if (!urlUpdated && !newLines.some(line => line.startsWith('REACT_APP_SUPABASE_URL='))) {
    finalLines.unshift('REACT_APP_SUPABASE_URL=https://hlcvskkxrnwxtktscpyy.supabase.co');
  }
  
  fs.writeFileSync(envPath, finalLines.join('\n'), 'utf8');
  
  console.log('✅ Updated .env.development');
  console.log('   REACT_APP_SUPABASE_URL=https://hlcvskkxrnwxtktscpyy.supabase.co');
  console.log(`   REACT_APP_SUPABASE_ANON_KEY=${anonKey.substring(0, 30)}...${anonKey.substring(anonKey.length - 10)}`);
  console.log('');
  console.log('⚠️  IMPORTANT: Restart your dev server after updating!');
  console.log('   Stop the server (Ctrl+C) and run: npm start');
  
  return true;
}

// Get key from command line argument
const anonKey = process.argv[2];

if (!anonKey) {
  console.error('❌ Usage: node scripts/update-supabase-key.js <anon_key>');
  console.error('');
  console.error('Example:');
  console.error('  node scripts/update-supabase-key.js "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."');
  process.exit(1);
}

// Verify key format
if (!anonKey.startsWith('eyJ')) {
  console.error('❌ Invalid API key format!');
  console.error('   Key should start with "eyJ"');
  process.exit(1);
}

if (anonKey.length < 200) {
  console.error('⚠️  Warning: API key seems too short (expected ~200+ characters)');
}

const success = updateEnvFile(anonKey);
process.exit(success ? 0 : 1);
