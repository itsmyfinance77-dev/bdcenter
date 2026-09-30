import { AdminHeading } from '@/components/admin/ui';
import { PasswordForm } from './password-form';

export const metadata = { title: 'تغییر رمز عبور' };

export default function AccountPage() {
  return (
    <>
      <AdminHeading title="تغییر رمز عبور" />
      <div className="max-w-md">
        <PasswordForm />
      </div>
    </>
  );
}
