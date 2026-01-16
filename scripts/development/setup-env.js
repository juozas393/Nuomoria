#!/usr/bin/env node

/**
 * Environment Setup Script
 * This script helps you create the appropriate .env files for your project
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupEnvironment() {
  console.log('🚀 Property Manager Environment Setup');
  console.log('=====================================\n');

  const environment = await question('Which environment do you want to set up? (development/production): ');
  
  if (!['development', 'production'].includes(environment.toLowerCase())) {
    console.log('❌ Invalid environment. Please choose "development" or "production".');
    rl.close();
    return;
  }

  const envType = environment.toLowerCase();
  const templateFile = `env.${envType}.template`;
  const targetFile = `.env.${envType}`;

  // Check if template exists
  if (!fs.existsSync(templateFile)) {
    console.log(`❌ Template file ${templateFile} not found.`);
    rl.close();
    return;
  }

  // Check if target already exists
  if (fs.existsSync(targetFile)) {
    const overwrite = await question(`⚠️  ${targetFile} already exists. Overwrite? (y/N): `);
    if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
      console.log('❌ Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log(`\n📝 Setting up ${envType} environment...`);
  console.log('Please provide the following information:\n');

  // Get Supabase credentials
  const supabaseUrl = await question('Supabase Project URL: ');
  const supabaseAnonKey = await question('Supabase Anon Key: ');

  // Read template
  let template = fs.readFileSync(templateFile, 'utf8');

  // Replace placeholders
  template = template.replace('https://your-dev-project.supabase.co', supabaseUrl);
  template = template.replace('https://your-production-project.supabase.co', supabaseUrl);
  template = template.replace('your_dev_anon_key_here', supabaseAnonKey);
  template = template.replace('your_production_anon_key_here', supabaseAnonKey);

  // Optional configurations
  if (envType === 'production') {
    const appUrl = await question('Production App URL (default: https://nuomoria.lt): ') || 'https://nuomoria.lt';
    const gaId = await question('Google Analytics ID (optional): ');
    const sentryDsn = await question('Sentry DSN (optional): ');

    template = template.replace('https://nuomoria.lt', appUrl);
    if (gaId) template = template.replace('your_production_ga_id', gaId);
    if (sentryDsn) template = template.replace('your_production_sentry_dsn', sentryDsn);
  }

  // Write the file
  fs.writeFileSync(targetFile, template);

  console.log(`\n✅ Successfully created ${targetFile}`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Review ${targetFile} and adjust any settings as needed`);
  console.log(`   2. Run: npm run start:${envType === 'development' ? 'dev' : 'prod'}`);
  console.log(`   3. Your app should now load without the "Invalid URL" error!`);

  rl.close();
}

setupEnvironment().catch(console.error);





