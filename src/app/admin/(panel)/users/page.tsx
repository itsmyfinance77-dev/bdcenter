import { ConfirmButton } from '@/components/admin/confirm-button';
import { AdminHeading, Badge, secondaryButtonClass, Table, Td } from '@/components/admin/ui';
import { adminRoleLabel } from '@/content/admin';
import { formatDate } from '@/lib/format';
import { requireAdmin } from '@/modules/auth/service';
import { listAdmins } from '@/modules/auth/users';
import { setAdminActiveAction } from './actions';
import { NewUserForm } from './new-user-form';

export const metadata = { title: 'کاربران پنل' };

export default async function UsersPage() {
  const admin = await requireAdmin('ADMIN');
  const users = await listAdmins();

  return (
    <>
      <AdminHeading title="کاربران پنل" />
      <div className="space-y-6">
        <Table head={['نام', 'ایمیل', 'نقش', 'وضعیت', 'تاریخ ساخت', '']}>
          {users.map((user) => (
            <tr key={user.id}>
              <Td className="font-medium">{user.fullName}</Td>
              <Td>
                <span dir="ltr">{user.email}</span>
              </Td>
              <Td>{adminRoleLabel[user.role]}</Td>
              <Td>
                {user.isActive ? (
                  <Badge tone="ACCEPTED">فعال</Badge>
                ) : (
                  <Badge tone="REJECTED">غیرفعال</Badge>
                )}
              </Td>
              <Td>{formatDate(user.createdAt)}</Td>
              <Td>
                {user.id === admin.id ? (
                  <span className="text-xs text-ink-2">حساب شما</span>
                ) : user.isActive ? (
                  <ConfirmButton
                    action={setAdminActiveAction.bind(null, user.id, false)}
                    message={`حساب ${user.email} غیرفعال شود؟ دسترسی او بلافاصله قطع می‌شود.`}
                  >
                    غیرفعال کردن
                  </ConfirmButton>
                ) : (
                  <form action={setAdminActiveAction.bind(null, user.id, true)}>
                    <button type="submit" className={secondaryButtonClass}>
                      فعال کردن
                    </button>
                  </form>
                )}
              </Td>
            </tr>
          ))}
        </Table>
        <NewUserForm />
      </div>
    </>
  );
}
