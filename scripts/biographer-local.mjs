import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  openSync,
  closeSync,
  unlinkSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConnection } from 'node:net';
import { parse } from 'dotenv';

const webapp = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workflow = resolve(webapp, '../story-generation-workflow');
const state = resolve(webapp, '.biographer-local');
const mode = process.argv[2] || 'status';
const environments = new Map();
if (!['start', 'stop', 'status'].includes(mode) || process.argv.length > 3)
  throw new Error('Usage: npm run biographer:local -- start|stop|status');
const services = [
  {
    name: 'webapp',
    cwd: webapp,
    entry: resolve(webapp, 'node_modules/next/dist/bin/next'),
    args: ['dev', '--hostname', 'localhost', '--port', '3000'],
    port: 3000,
  },
  {
    name: 'workflow',
    cwd: workflow,
    entry: resolve(workflow, 'src/index.ts'),
    args: [],
    port: 8080,
  },
  {
    name: 'avatar',
    cwd: workflow,
    entry: resolve(workflow, 'src/biographer-live.ts'),
    args: [],
    port: 8082,
  },
];
const marker = (pid) => {
  try {
    return execFileSync('ps', ['-p', String(pid), '-o', 'lstart='], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};
const record = (service) => {
  try {
    const r = JSON.parse(readFileSync(resolve(state, `${service.name}.json`), 'utf8'));
    return r.pid > 1 && r.started && marker(r.pid) === r.started ? r : null;
  } catch {
    return null;
  }
};
const listening = (port) =>
  new Promise((done) => {
    const socket = createConnection({ host: 'localhost', port });
    const finish = (value) => {
      socket.destroy();
      done(value);
    };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(500, () => finish(false));
  });

if (mode === 'start') {
  // This launcher does not migrate, seed, call providers, publish workflows or run notifications.
  const webEnv = parse(readFileSync(resolve(webapp, '.env.local')));
  const workflowEnv = parse(readFileSync(resolve(workflow, '.env.local')));
  environments.set(webapp, webEnv);
  environments.set(workflow, workflowEnv);
  for (const key of ['BIOGRAPHER_INTERNAL_API_KEY', 'BIOGRAPHER_STORAGE_BUCKET']) {
    if (!webEnv[key] || webEnv[key] !== workflowEnv[key])
      throw new Error(`Missing or inconsistent local ${key}`);
  }
  if (
    !webEnv.STORY_GENERATION_WORKFLOW_API_KEY ||
    webEnv.STORY_GENERATION_WORKFLOW_API_KEY !== workflowEnv.STORY_GENERATION_WORKFLOW_API_KEY
  )
    throw new Error('Local SGW API keys do not match');
  if (
    webEnv.BIOGRAPHER_LIVE_URL !== 'ws://localhost:8082/live' ||
    workflowEnv.BIOGRAPHER_WEBAPP_URL !== 'http://localhost:3000'
  )
    throw new Error('Local Biographer callback URLs are not configured');
  for (const service of services) {
    if (!existsSync(service.entry))
      throw new Error(`Install dependencies for ${service.name} first`);
    if (!record(service) && (await listening(service.port)))
      throw new Error(`Port ${service.port} is already in use; no existing process was stopped`);
  }
  mkdirSync(state, { recursive: true, mode: 0o700 });
}

for (const service of services) {
  const path = resolve(state, `${service.name}.json`);
  const current = record(service);
  if (mode === 'start' && !current) {
    const log = resolve(state, `${service.name}.log`);
    const fd = openSync(log, 'a', 0o600);
    const child = spawn(
      process.execPath,
      [...(service.name === 'webapp' ? [] : ['--import', 'tsx']), service.entry, ...service.args],
      {
        cwd: service.cwd,
        env: {
          ...process.env,
          ...environments.get(service.cwd),
          NODE_ENV: 'development',
          PORT: String(service.port),
          NEXT_TELEMETRY_DISABLED: '1',
        },
        detached: true,
        stdio: ['ignore', fd, fd],
      },
    );
    await once(child, 'spawn');
    closeSync(fd);
    child.unref();
    const started = marker(child.pid);
    if (!started) throw new Error(`${service.name} exited during startup; check ${log}`);
    writeFileSync(path, JSON.stringify({ pid: child.pid, started, port: service.port, log }), {
      mode: 0o600,
    });
    console.log(`Started ${service.name} on ${service.port}; log: ${log}`);
  } else if (mode === 'stop' && current) {
    process.kill(-current.pid, 'SIGTERM');
    unlinkSync(path);
    console.log(`Stopped ${service.name}`);
  } else {
    console.log(
      `${service.name}: ${current ? 'running' : 'stopped'}; port ${service.port}${current ? `; listening=${await listening(service.port)}` : ''}`,
    );
  }
}
