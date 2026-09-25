import { RoleLoginForm } from '@/components/auth/role-login-form';

export default function AnalystLoginPage() {
  return (
    <RoleLoginForm
      targetRole="ANALYST"
      roleName="Analyst"
      roleIcon="📊"
      roleDescription="Feedback intelligence with ingestion, classification, and analytics"
    />
  );
}