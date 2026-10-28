import { existsSync, writeFileSync } from 'node:fs';
import webpush from 'web-push';
if (existsSync('.dev.vars')) {
  process.stderr.write('O ficheiro .dev.vars já existe; não foi alterado.\n');
  process.exit(1);
}
const keys = webpush.generateVAPIDKeys();
writeFileSync(
  '.dev.vars',
  'VAPID_PUBLIC_KEY=' +
    keys.publicKey +
    '\nVAPID_PRIVATE_KEY=' +
    keys.privateKey +
    '\nVAPID_SUBJECT=mailto:local-test@example.invalid\n',
  { mode: 0o600 },
);
process.stdout.write(
  'Chaves criadas em .dev.vars (ignorado pelo Git). Nenhuma chave foi publicada.\n',
);
