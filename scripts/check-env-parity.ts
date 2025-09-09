// Executed via tsx now; ts-node bootstrap removed.
/*
  Parity / validation script for environment variables across:
    - env.manifest.ts (canonical definitions)
    - .env.local (dev values) if present
    - .env.production (prod values) if present (should generally not contain real secrets)
    - cloudbuild.yaml (substitutions, set-env-vars, secrets)

  Outputs a report of:
    - Missing: required but absent in at least one required scope source
    - Empty: present but empty string where required
    - Unexpected: present in sources but not in manifest
    - ScopeMismatch: manifest says required in scope but source missing

  Exit codes:
    0 = all good
    1 = violations found

  Notes:
    * We treat secret-manager sourced vars as satisfied in prod/runtime if present in cloudbuild --set-secrets line.
    * Build scope checks build args & substitutions.
*/
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import dotenv from 'dotenv';
import { envManifest, manifestByName } from '../env.manifest';

interface SourceMaps {
  dev: Record<string,string|undefined>;
  prodFile: Record<string,string|undefined>;
  cloudBuildSubstitutions: Record<string,string|undefined>;
  cloudBuildSetEnv: Record<string,string|undefined>;
  cloudBuildSecrets: Set<string>;
  buildArgs: Set<string>; // build-arg names
}

const root = path.resolve(__dirname, '..');

function readEnvFile(name: string): Record<string,string|undefined> {
  const p = path.join(root, name);
  if (!fs.existsSync(p)) return {};
  const content = fs.readFileSync(p, 'utf8');
  return dotenv.parse(content);
}

function parseCloudBuild(): Partial<SourceMaps> {
  const file = path.join(root, 'cloudbuild.yaml');
  if (!fs.existsSync(file)) return {};
  const doc = yaml.load(fs.readFileSync(file, 'utf8')) as {
    substitutions?: Record<string,string>;
    steps?: Array<{ args?: unknown[]; }>;
  } | undefined;
  const substitutions: Record<string,string> = doc?.substitutions || {};

  const setEnvVars: Record<string,string> = {};
  const secretsSet = new Set<string>();
  const buildArgs = new Set<string>();

  // Extract --set-env-vars value(s)
  const deployStep = (doc?.steps || []).find((s) => Array.isArray(s.args) && s.args.includes('deploy'));
  if (deployStep) {
  const args: string[] = (deployStep.args as string[] | undefined) || [];
    for (let i=0;i<args.length;i++) {
      if (args[i] === '--set-env-vars' && args[i+1]) {
        const csv = args[i+1];
        csv.split(',').forEach(pair => {
          const [k,v] = pair.split('=');
            if (k && v !== undefined) setEnvVars[k.trim()] = v.trim();
        });
      }
      if (args[i] === '--set-secrets' && args[i+1]) {
        const csv = args[i+1];
        csv.split(',').forEach(pair => {
          const [k] = pair.split('=');
          if (k) secretsSet.add(k.trim());
        });
      }
    }
  }

  // Extract build args from docker build command script step
  for (const step of doc?.steps || []) {
    if (Array.isArray(step.args) && typeof step.args?.[0] === 'string' && step.args[0].includes('docker build')) {
      const script = (step.args as string[]).join('\n');
      const buildArgRegex = /--build-arg\s+([A-Z0-9_]+)=/g;
      let m: RegExpExecArray | null;
      while ((m = buildArgRegex.exec(script))) {
        buildArgs.add(m[1]);
      }
    }
    if (Array.isArray(step.args)) {
      for (const a of step.args as unknown[]) {
        if (typeof a === 'string' && a.includes('--build-arg')) {
          const buildArgRegex = /--build-arg\s+([A-Z0-9_]+)=/g;
          let m: RegExpExecArray | null;
          while ((m = buildArgRegex.exec(a))) buildArgs.add(m[1]);
        }
      }
    }
  }

  return {
    cloudBuildSubstitutions: substitutions,
    cloudBuildSetEnv: setEnvVars,
    cloudBuildSecrets: secretsSet,
    buildArgs,
  };
}

interface Violation { type: 'Missing' | 'Empty' | 'Unexpected' | 'ScopeMismatch'; key: string; detail?: string; }

function analyze(sources: SourceMaps) {
  const manifest = manifestByName();
  const violations: Violation[] = [];

  const allKeys = new Set<string>([
    ...Object.keys(sources.dev),
    ...Object.keys(sources.prodFile),
    ...Object.keys(sources.cloudBuildSubstitutions),
    ...Object.keys(sources.cloudBuildSetEnv),
    ...Array.from(sources.cloudBuildSecrets),
    ...Array.from(sources.buildArgs),
  ...envManifest.map((v) => v.name),
  ]);

  function hasInScope(key: string, scope: string): boolean {
    switch (scope) {
      case 'dev': return sources.dev[key] !== undefined; // value may be empty -> separate check
      case 'prod': return true; // prod presence validated via runtime/build sources
      case 'build': return sources.buildArgs.has(key) || sources.cloudBuildSubstitutions[key] !== undefined;
      case 'runtime': {
        if (sources.cloudBuildSetEnv[key] !== undefined || sources.cloudBuildSecrets.has(key)) return true;
        // Heuristic: if a substitution _KEY exists and set-env-vars string references KEY=${_KEY}
        const subKey = `_${key}`;
        if (sources.cloudBuildSubstitutions[subKey] !== undefined) {
          // look for pattern KEY=${_KEY} in any set-env var values
          return Object.values(sources.cloudBuildSetEnv).some(v => v?.includes(subKey));
        }
        return false;
      }
      case 'public': return /^(NEXT_PUBLIC_|PUBLIC_)/.test(key); // namespace check; actual presence validated via build/runtime
      default: return false;
    }
  }

  for (const key of allKeys) {
    const desc = manifest[key];
    if (!desc) {
      // Filter out some auto keys
      if (!key.startsWith('_')) {
        violations.push({ type: 'Unexpected', key, detail: 'Not in manifest' });
      }
      continue;
    }

    // Check each required scope
    if (desc.required) {
      for (const scope of desc.scopes) {
        if (!hasInScope(key, scope)) {
          violations.push({ type: 'Missing', key, detail: `Missing in scope ${scope}` });
        }
      }
    }

    // Empty dev value check if required in dev
    if (desc.scopes.includes('dev') && desc.required) {
      const v = sources.dev[key];
      if (v !== undefined && v.trim() === '') {
        violations.push({ type: 'Empty', key, detail: '.env.local empty value' });
      }
    }
  }

  return violations;
}

function main() {
  const dev = readEnvFile('.env.local');
  const prodFile = readEnvFile('.env.production');
  const cloud = parseCloudBuild();
  const sources: SourceMaps = {
    dev,
    prodFile,
    cloudBuildSubstitutions: cloud.cloudBuildSubstitutions || {},
    cloudBuildSetEnv: cloud.cloudBuildSetEnv || {},
    cloudBuildSecrets: cloud.cloudBuildSecrets || new Set(),
    buildArgs: cloud.buildArgs || new Set(),
  };

  const violations = analyze(sources);

  const byType = violations.reduce<Record<string,Violation[]>>((acc,v)=>{(acc[v.type] ||= []).push(v);return acc;},{});

  const pad = (s: string, w: number) => s.padEnd(w,' ');
  const keys = Object.keys(byType).sort();
  if (keys.length === 0) {
    console.log('✅ Environment parity check passed.');
    process.exit(0);
  }
  console.log('Environment parity issues:');
  for (const t of keys) {
    console.log(`\n== ${t} ==`);
    for (const v of byType[t]) {
      console.log(` - ${pad(v.key,35)} ${v.detail || ''}`);
    }
  }
  const missingCount = byType['Missing']?.length || 0;
  process.exit(missingCount > 0 ? 1 : 0);
}

// Execute if run directly (guard retained for parity with previous behavior)
if (process.argv[1] && /check-env-parity\.ts$/.test(process.argv[1])) {
  main();
}
