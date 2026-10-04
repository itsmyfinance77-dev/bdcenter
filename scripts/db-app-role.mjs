// Creates or updates the database role the running site connects as
// (security review 2026-10-04, finding 7). The owner role that runs the
// migrations is a superuser in the official PostgreSQL image; the site itself
// only needs to read and write rows, so it gets a role that can do nothing
// else. Safe to run after every `prisma migrate deploy`.
//
//   DATABASE_URL       owner connection (the one migrations use)
//   APP_DB_USER        role name (default bdcenter_app)
//   APP_DB_PASSWORD    its password (at least 16 characters)
import { PrismaClient } from '@prisma/client';

const role = process.env.APP_DB_USER || 'bdcenter_app';
const password = process.env.APP_DB_PASSWORD ?? '';
if (!/^[a-z_][a-z0-9_]{0,62}$/.test(role)) {
  console.error('APP_DB_USER must be a plain lower-case name.');
  process.exit(1);
}
if (password.length < 16) {
  console.error('APP_DB_PASSWORD must be set (at least 16 characters).');
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  await prisma.$transaction(async (tx) => {
    // DDL takes no bind parameters: hand the values over as transaction
    // settings and let format() quote them.
    await tx.$executeRaw`SELECT set_config('bdc.app_role', ${role}, true)`;
    await tx.$executeRaw`SELECT set_config('bdc.app_password', ${password}, true)`;
    await tx.$executeRawUnsafe(`
      DO $$
      DECLARE
        r text := current_setting('bdc.app_role');
        p text := current_setting('bdc.app_password');
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
          EXECUTE format('ALTER ROLE %I WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L', r, p);
        ELSE
          EXECUTE format('CREATE ROLE %I WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L', r, p);
        END IF;
        EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), r);
        EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', r);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', r);
        EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', r);
        EXECUTE format('REVOKE ALL ON TABLE public._prisma_migrations FROM %I', r);
        -- Tables added by later migrations (created by this owner role).
        EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', r);
        EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I', r);
      END $$;
    `);
  });
  console.log(`Database role ${role} is ready.`);
} catch (error) {
  console.error('Could not prepare the database role:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
