import { spawnSync } from 'node:child_process';
import webpush from 'web-push';
const cli = new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url);
const { fileURLToPath } = await import('node:url');
const run = (args, input) =>
  spawnSync(process.execPath, [fileURLToPath(cli), ...args, '--env', 'production'], {
    input,
    encoding: 'utf8',
    windowsHide: true,
  });
const listed = run(['secret', 'list', '--format', 'json']);
if (listed.status !== 0)
  throw new Error('Could not read production secret names. Authenticate with Wrangler first.');
const names = JSON.parse(listed.stdout).map((secret) => secret.name);
const expected = ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'];
if (expected.every((name) => names.includes(name))) {
  console.log('Production push keys already exist; nothing was changed.');
} else {
  if (expected.some((name) => names.includes(name)))
    throw new Error(
      'Only one production key exists. Resolve this incomplete setup before replacing keys; existing subscriptions may depend on them.',
    );
  const keys = webpush.generateVAPIDKeys();
  const result = run(
    ['secret', 'bulk'],
    JSON.stringify({ VAPID_PUBLIC_KEY: keys.publicKey, VAPID_PRIVATE_KEY: keys.privateKey }),
  );
  if (result.status !== 0)
    throw new Error(
      'Production push-key configuration failed. Inspect secret names before retrying. No key values were printed or saved locally.',
    );
  console.log(
    'Configured production push keys in Cloudflare. No key values were printed or saved locally.',
  );
}
