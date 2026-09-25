import { RoleLoginForm } from '@/components/auth/role-login-form';

export default function ViewerLoginPage() {
  return (
    <RoleLoginForm
      targetRole="VIEWER"
      roleName="Viewer"
      roleIcon="👁️"
      roleDescription="Read-only access to insights, reports, and dashboard analytics"
    />
  );
}