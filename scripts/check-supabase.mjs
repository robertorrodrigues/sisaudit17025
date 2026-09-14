import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const projectRoot = resolve(import.meta.dirname, '..');

function loadEnvFile(fileName) {
  const filePath = resolve(projectRoot, fileName);
  if (!existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => /^\s*[^#=\s]+\s*=/.test(line))
      .map((line) => {
        const [, key, rawValue] = line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/);
        return [key, rawValue.replace(/^['"]|['"]$/g, '')];
      })
  );
}

const fileEnv = {
  ...loadEnvFile('.env'),
  ...loadEnvFile('.env.local'),
};
const supabaseUrl = process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  fileEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  fileEnv.VITE_SUPABASE_ANON_KEY;

function logError(message, error) {
  console.error(`[Supabase] ERRO: ${message}`);
  if (error) {
    console.error(`[Supabase] Detalhes: ${error}`);
  }
}

if (!supabaseUrl || !supabaseKey) {
  logError(
    'VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY precisam estar configuradas no .env.local.'
  );
  process.exit(1);
}

const headers = {
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
};
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);

try {
  console.log('[Supabase] Verificando conexão...');

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/settings`, {
    headers,
    signal: controller.signal,
  });

  if (!authResponse.ok) {
    const details = await authResponse.text();
    throw new Error(
      `Auth respondeu HTTP ${authResponse.status}${details ? `: ${details}` : ''}`
    );
  }

  const databaseResponse = await fetch(
    `${supabaseUrl}/rest/v1/profiles?select=id&limit=1`,
    {
      headers,
      signal: controller.signal,
    }
  );

  if (!databaseResponse.ok) {
    const details = await databaseResponse.text();
    throw new Error(
      `Banco respondeu HTTP ${databaseResponse.status}${details ? `: ${details}` : ''}`
    );
  }

  console.log('[Supabase] OK: autenticação e banco estão acessíveis.');
} catch (error) {
  const message =
    error.name === 'AbortError'
      ? 'tempo limite de 10 segundos excedido.'
      : error.cause?.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY'
        ? 'certificado TLS não confiável. O script usa os certificados do sistema; verifique o certificado instalado na máquina.'
        : error.message;
  logError('não foi possível conectar ao projeto configurado.', message);
  process.exit(1);
} finally {
  clearTimeout(timeout);
}
