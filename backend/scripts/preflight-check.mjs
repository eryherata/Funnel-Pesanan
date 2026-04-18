import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const schemaPath = path.join(rootDir, 'sql', 'schema.sql');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const checks = [
  {
    name: '.env tersedia',
    pass: fs.existsSync(envPath),
    hint: 'Salin backend/.env.example menjadi backend/.env',
  },
  {
    name: 'schema.sql tersedia',
    pass: fs.existsSync(schemaPath),
    hint: 'Pastikan file backend/sql/schema.sql ada',
  },
  {
    name: 'DB_HOST terisi',
    pass: Boolean(process.env.DB_HOST || '127.0.0.1'),
    hint: 'Isi DB_HOST di backend/.env',
  },
  {
    name: 'DB_NAME terisi',
    pass: Boolean(process.env.DB_NAME || 'pantauan_pesanan'),
    hint: 'Isi DB_NAME di backend/.env',
  },
  {
    name: 'DB_USER terisi',
    pass: Boolean(process.env.DB_USER || 'root'),
    hint: 'Isi DB_USER di backend/.env',
  },
  {
    name: 'AUTH_REQUIRED terdefinisi',
    pass: typeof (process.env.AUTH_REQUIRED || 'false') === 'string',
    hint: 'Set AUTH_REQUIRED=true/false di backend/.env',
  },
  {
    name: 'APP_ORIGIN terdefinisi',
    pass: typeof (process.env.APP_ORIGIN || '*') === 'string',
    hint: 'Set APP_ORIGIN sesuai domain frontend',
  },
];

let failed = 0;
console.log('Preflight check backend pantauan pesanan\n');
checks.forEach((check) => {
  const marker = check.pass ? '✔' : '✖';
  console.log(`${marker} ${check.name}`);
  if (!check.pass) {
    failed += 1;
    console.log(`   → ${check.hint}`);
  }
});

console.log('\nRingkasan konfigurasi:');
console.log(`- DB_HOST: ${process.env.DB_HOST || '127.0.0.1'}`);
console.log(`- DB_PORT: ${process.env.DB_PORT || '3306'}`);
console.log(`- DB_NAME: ${process.env.DB_NAME || 'pantauan_pesanan'}`);
console.log(`- DB_USER: ${process.env.DB_USER || 'root'}`);
console.log(`- AUTH_REQUIRED: ${process.env.AUTH_REQUIRED || 'false'}`);
console.log(`- APP_ORIGIN: ${process.env.APP_ORIGIN || '*'}`);

if (failed > 0) {
  console.error(`\nPreflight selesai dengan ${failed} masalah.`);
  process.exit(1);
}

console.log('\nPreflight selesai tanpa masalah.');
