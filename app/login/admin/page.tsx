import { RoleLoginForm } from '@/components/auth/role-login-form';

export default function AdminLoginPage() {
  return (
    <RoleLoginForm
      targetRole="ADMIN"
      roleName="Admin"
      roleIcon="🔒"
      roleDescription="Full workspace control with member management and administrative access"
    />
  );
}