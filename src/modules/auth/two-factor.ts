import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/modules/audit/service';
import { verifyPassword } from './password';
import {
  decryptSecret,
  encryptionConfigured,
  encryptSecret,
  generateRecoveryCodes,
  generateSecret,
  hashRecoveryCode,
  normalizeRecoveryCode,
  otpauthUri,
  verifyTotp,
} from './totp';

/**
 * Two-step login for admins: an authenticator-app code (TOTP) after the
 * password, with one-time recovery codes for a lost phone. Optional per
 * admin; an ADMIN can reset another admin's setup. Free of request APIs so
 * tests and scripts can use it.
 */

const ISSUER = 'BDC Yazd';

export async function twoFactorStatus(adminId: string) {
  const user = await prisma.adminUser.findUniqueOrThrow({
    where: { id: adminId },
    select: { totpEnabledAt: true, totpPendingSecret: true, recoveryCodeHashes: true },
  });
  return {
    available: encryptionConfigured(),
    enabled: user.totpEnabledAt !== null,
    enabledAt: user.totpEnabledAt,
    setupPending: user.totpEnabledAt === null && user.totpPendingSecret !== null,
    recoveryCodesLeft: user.recoveryCodeHashes.length,
  };
}

/** Starts (or restarts) setup: a new secret waits until a code confirms it. */
export async function startTotpSetup(adminId: string) {
  const user = await prisma.adminUser.findUniqueOrThrow({
    where: { id: adminId },
    select: { email: true, totpEnabledAt: true },
  });
  if (user.totpEnabledAt) return null;
  const secret = generateSecret();
  await prisma.adminUser.update({
    where: { id: adminId },
    data: { totpPendingSecret: encryptSecret(secret) },
  });
  return { secret, uri: otpauthUri(secret, user.email, ISSUER) };
}

/** The pending secret again (to redraw the QR code), or null. */
export async function pendingTotpSetup(adminId: string) {
  const user = await prisma.adminUser.findUniqueOrThrow({
    where: { id: adminId },
    select: { email: true, totpPendingSecret: true, totpEnabledAt: true },
  });
  if (user.totpEnabledAt || !user.totpPendingSecret) return null;
  const secret = decryptSecret(user.totpPendingSecret);
  return { secret, uri: otpauthUri(secret, user.email, ISSUER) };
}

function newRecoveryCodes() {
  const codes = generateRecoveryCodes();
  return { codes, hashes: codes.map(hashRecoveryCode) };
}

/** Confirms setup with a code from the app; returns the recovery codes to show once. */
export async function confirmTotpSetup(
  adminId: string,
  code: string,
  now = Date.now(),
): Promise<{ ok: true; recoveryCodes: string[] } | { ok: false }> {
  const user = await prisma.adminUser.findUniqueOrThrow({
    where: { id: adminId },
    select: { totpPendingSecret: true, totpEnabledAt: true },
  });
  if (user.totpEnabledAt || !user.totpPendingSecret) return { ok: false };
  const secret = decryptSecret(user.totpPendingSecret);
  const step = verifyTotp(secret, code, now, null);
  if (step === null) return { ok: false };
  const { codes, hashes } = newRecoveryCodes();
  await prisma.adminUser.update({
    where: { id: adminId },
    data: {
      totpSecret: user.totpPendingSecret,
      totpPendingSecret: null,
      totpEnabledAt: new Date(now),
      totpLastStep: step,
      recoveryCodeHashes: hashes,
    },
  });
  await recordAudit({
    actorId: adminId,
    action: 'auth.2fa.enable',
    entity: 'AdminUser',
    entityId: adminId,
  });
  return { ok: true, recoveryCodes: codes };
}

/**
 * Checks a second-step code: a current authenticator code (each works once)
 * or an unused recovery code (removed when used). Updates are conditional,
 * so two requests racing with the same code cannot both succeed.
 */
export async function verifySecondFactor(
  adminId: string,
  input: string,
  now = Date.now(),
): Promise<'totp' | 'recovery' | null> {
  const user = await prisma.adminUser.findUnique({
    where: { id: adminId },
    select: { totpSecret: true, totpLastStep: true, recoveryCodeHashes: true },
  });
  if (!user?.totpSecret) return null;

  const digits = input.replace(/\s/g, '');
  if (/^\d{6}$/.test(digits)) {
    const step = verifyTotp(decryptSecret(user.totpSecret), digits, now, user.totpLastStep);
    if (step === null) return null;
    const { count } = await prisma.adminUser.updateMany({
      where: {
        id: adminId,
        OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }],
      },
      data: { totpLastStep: step },
    });
    return count === 1 ? 'totp' : null;
  }

  if (normalizeRecoveryCode(input).length !== 12) return null;
  const hash = hashRecoveryCode(input);
  if (!user.recoveryCodeHashes.includes(hash)) return null;
  const { count } = await prisma.adminUser.updateMany({
    where: { id: adminId, recoveryCodeHashes: { has: hash } },
    data: { recoveryCodeHashes: user.recoveryCodeHashes.filter((h) => h !== hash) },
  });
  if (count !== 1) return null;
  await recordAudit({
    actorId: adminId,
    action: 'auth.2fa.recovery-code',
    entity: 'AdminUser',
    entityId: adminId,
  });
  return 'recovery';
}

/** New recovery codes (the old ones stop working); needs a current code. */
export async function regenerateRecoveryCodes(adminId: string, code: string, now = Date.now()) {
  if (!(await verifySecondFactor(adminId, code, now))) return null;
  const { codes, hashes } = newRecoveryCodes();
  await prisma.adminUser.update({ where: { id: adminId }, data: { recoveryCodeHashes: hashes } });
  await recordAudit({
    actorId: adminId,
    action: 'auth.2fa.recovery-regenerate',
    entity: 'AdminUser',
    entityId: adminId,
  });
  return codes;
}

const cleared = {
  totpSecret: null,
  totpPendingSecret: null,
  totpEnabledAt: null,
  totpLastStep: null,
  recoveryCodeHashes: [],
};

/** Turns two-step login off; needs the password and a current or recovery code. */
export async function disableTotp(adminId: string, password: string, code: string) {
  const user = await prisma.adminUser.findUniqueOrThrow({
    where: { id: adminId },
    select: { passwordHash: true },
  });
  if (!(await verifyPassword(user.passwordHash, password))) return false;
  if (!(await verifySecondFactor(adminId, code))) return false;
  await prisma.adminUser.update({ where: { id: adminId }, data: cleared });
  await recordAudit({
    actorId: adminId,
    action: 'auth.2fa.disable',
    entity: 'AdminUser',
    entityId: adminId,
  });
  return true;
}

/** An ADMIN resets someone else's setup (lost phone); their sessions end too. */
export async function resetTotpFor(targetId: string, actor: { id: string }) {
  if (targetId === actor.id) return false;
  await prisma.adminUser.update({
    where: { id: targetId },
    data: { ...cleared, sessionVersion: { increment: 1 } },
  });
  await recordAudit({
    actorId: actor.id,
    action: 'auth.2fa.reset',
    entity: 'AdminUser',
    entityId: targetId,
  });
  return true;
}
