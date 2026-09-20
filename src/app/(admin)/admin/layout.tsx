import { AdminShell } from "@/components/layout/admin-shell";
import { RoleGuard } from "@/components/layout/role-guard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allow="ADMIN">
      <AdminShell>{children}</AdminShell>
    </RoleGuard>
  );
}
