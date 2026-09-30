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
