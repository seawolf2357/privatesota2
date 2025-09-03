#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  const envLocalPath = path.join(process.cwd(), '.env.local');
  
  let envContent = '';
  
  if (fs.existsSync(envLocalPath)) {
    envContent = fs.readFileSync(envLocalPath, 'utf8');
  } else if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

function runCommand(command, description) {
  console.log(`\n${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✓ ${description} completed`);
  } catch (error) {
    console.error(`✗ ${description} failed`);
    process.exit(1);
  }
}

function main() {
  loadEnv();
  
  const usePostgres = process.env.USE_POSTGRES === 'true';
  
  console.log('=================================');
  console.log('Database Setup Script');
  console.log('=================================');
  console.log(`Database Type: ${usePostgres ? 'PostgreSQL' : 'SQLite'}`);
  
  if (usePostgres) {
    console.log('\nSetting up PostgreSQL database...');
    
    if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
      console.error('Error: POSTGRES_URL or DATABASE_URL environment variable is required for PostgreSQL');
      console.log('\nPlease set one of these in your .env or .env.local file:');
      console.log('POSTGRES_URL=postgresql://user:password@localhost:5432/database');
      process.exit(1);
    }
    
    runCommand('npm run db:generate:postgres', 'Generating PostgreSQL migrations');
    runCommand('npm run db:migrate:postgres', 'Running PostgreSQL migrations');
    
    console.log('\n✓ PostgreSQL setup complete!');
    console.log('You can now run: npm run db:studio:postgres');
  } else {
    console.log('\nSetting up SQLite database...');
    
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      console.log('Creating data directory...');
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    runCommand('npm run db:generate:sqlite', 'Generating SQLite migrations');
    runCommand('npm run db:migrate:sqlite', 'Running SQLite migrations');
    
    console.log('\n✓ SQLite setup complete!');
    console.log('You can now run: npm run db:studio:sqlite');
  }
  
  console.log('\n=================================');
  console.log('Database setup completed successfully!');
  console.log('=================================');
}

main();