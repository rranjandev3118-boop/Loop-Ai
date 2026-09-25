import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'role-admin' | 'role-analyst' | 'role-viewer';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    'role-admin': 'role-admin',
    'role-analyst': 'role-analyst',
    'role-viewer': 'role-viewer'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const roleLower = role.toLowerCase();
  const variant = roleLower === 'admin' ? 'role-admin' :
                   roleLower === 'analyst' ? 'role-analyst' : 'role-viewer';

  return (
    <Badge variant={variant as any}>
      {role}
    </Badge>
  );
}