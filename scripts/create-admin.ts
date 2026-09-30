/**
 * Creates an admin account from the command line (the first account has to
 * come from somewhere). Usage:
 *
 *   npm run admin:create -- --email you@example.com --name "Full Name" [--role EDITOR]
 *
 * The password is read from ADMIN_PASSWORD, or generated and printed once.
 */
import { randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';
import { prisma } from '../src/lib/prisma';
import { createAdmin, newAdminSchema } from '../src/modules/auth/users';

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      name: { type: 'string' },
      role: { type: 'string', default: 'ADMIN' },
    },
  });

  const generated = !process.env.ADMIN_PASSWORD;
  const password = process.env.ADMIN_PASSWORD ?? randomBytes(12).toString('base64url');

  const parsed = newAdminSchema.safeParse({
    email: values.email,
    fullName: values.name,
    role: values.role,
    password,
  });
  if (!parsed.success) {
    console.error(parsed.error.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'));
    process.exitCode = 1;
    return;
  }

  const result = await createAdmin(parsed.data, null);
  if (!result.ok) {
    console.error(result.error);
    process.exitCode = 1;
    return;
  }

  console.log(`Created ${parsed.data.role} ${parsed.data.email}`);
  if (generated) console.log(`Password (shown once, change it after first login): ${password}`);
}

main().finally(() => prisma.$disconnect());
