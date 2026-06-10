'use strict';

import { queryOne } from './db';

export async function makeUniqueTenantUsername(fullName) {
  const base = (fullName || 'tenant')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30) || 'tenant';

  let username = base;
  let n = 0;
  while (await queryOne('SELECT id FROM users WHERE username = $1', [username])) {
    n += 1;
    username = `${base}-${n}`;
  }
  return username;
}
