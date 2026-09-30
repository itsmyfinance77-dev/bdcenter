import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { email, phone, requiredText } from '@/lib/validation';

export const contactMessageSchema = z
  .object({
    fullName: requiredText('نام و نام خانوادگی', 120),
    phone: phone(false),
    email: email(false),
    message: requiredText('متن پیام', 4000),
  })
  .refine((value) => value.phone || value.email, {
    message: 'حداقل یکی از شماره تماس یا ایمیل را وارد کنید.',
    path: ['phone'],
  });

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;

export async function createContactMessage(input: ContactMessageInput) {
  return prisma.contactMessage.create({ data: input, select: { id: true } });
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

export async function listContactMessages(page: number) {
  const [items, total] = await Promise.all([
    prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.contactMessage.count(),
  ]);
  return { items, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function countRecentContactMessages(days = 7) {
  return prisma.contactMessage.count({
    where: { createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } },
  });
}
