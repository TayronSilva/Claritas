import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const targets = [
  { name: 'api', dir: 'backend', script: 'start:dev' },
  { name: 'web', dir: 'frontend', script: 'dev' },
];

const children = targets.map((target) => {
  const child = spawn(`npm run ${target.script}`, {
    cwd: resolve(root, target.dir),
    stdio: 'inherit',
    shell: true,
  });
  child.on('exit', (code) => console.log(`[${target.name}] encerrou com codigo ${code}`));
  return child;
});

function shutdown() {
  for (const child of children) child.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
