export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface OrgMember {
  userId: string;
  email: string;
  name: string;
  role: OrgRole;
  joinedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  members: OrgMember[];
  planTier: string;
  createdAt: string;
}

const ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export type Permission =
  | 'view_dashboard'
  | 'view_transactions'
  | 'create_transfer'
  | 'connect_bank'
  | 'unlink_bank'
  | 'manage_members'
  | 'view_audit_logs'
  | 'manage_settings'
  | 'manage_billing'
  | 'export_data'
  | 'delete_organization';

const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  viewer: ['view_dashboard', 'view_transactions'],
  member: ['view_dashboard', 'view_transactions', 'create_transfer', 'connect_bank', 'export_data'],
  admin: [
    'view_dashboard', 'view_transactions', 'create_transfer', 'connect_bank',
    'unlink_bank', 'manage_members', 'view_audit_logs', 'manage_settings', 'export_data',
  ],
  owner: [
    'view_dashboard', 'view_transactions', 'create_transfer', 'connect_bank',
    'unlink_bank', 'manage_members', 'view_audit_logs', 'manage_settings',
    'manage_billing', 'export_data', 'delete_organization',
  ],
};

export function hasPermission(role: OrgRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canManageRole(actorRole: OrgRole, targetRole: OrgRole): boolean {
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole];
}

export function getRoleLabel(role: OrgRole): string {
  const labels: Record<OrgRole, string> = {
    owner: 'Owner',
    admin: 'Administrator',
    member: 'Member',
    viewer: 'Viewer',
  };
  return labels[role];
}

export function getAvailableRoles(): { value: OrgRole; label: string; description: string }[] {
  return [
    { value: 'viewer', label: 'Viewer', description: 'Can view dashboard and transactions only' },
    { value: 'member', label: 'Member', description: 'Can create transfers and connect banks' },
    { value: 'admin', label: 'Administrator', description: 'Can manage members, settings, and view audit logs' },
    { value: 'owner', label: 'Owner', description: 'Full access including billing and organization deletion' },
  ];
}
