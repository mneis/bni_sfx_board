import { spawn } from 'node:child_process';

const port = 8017;
const host = '127.0.0.1';
const baseURL = `http://${host}:${port}`;
const server = spawn(process.execPath, ['scripts/serve-static.mjs', String(port)], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    HOST: host,
    PORT: String(port)
  }
});

server.stdout.on('data', chunk => process.stdout.write(chunk));
server.stderr.on('data', chunk => process.stderr.write(chunk));

try {
  await waitForServer(baseURL);
  const exitCode = await runPlaywright(process.argv.slice(2));
  process.exitCode = exitCode;
} finally {
  server.kill();
}

async function runPlaywright(args) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['node_modules/playwright/cli.js', 'test', ...args], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || '.ms-playwright'
      }
    });

    child.on('exit', code => resolve(code || 0));
  });
}

async function waitForServer(url) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 10000) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await sleep(150);
    }
  }

  throw new Error(`Static server did not start at ${url}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
