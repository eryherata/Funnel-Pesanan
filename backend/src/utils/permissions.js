const ACTIONS = ['read', 'write', 'import', 'export', 'restore', 'admin'];

export const DEFAULT_ROLE_MATRIX = {
  admin: {
    dashboards: { read: true, export: true },
    funnels: { read: true, write: true, import: true, export: true },
    orders: { read: true, write: true, import: true, export: true },
    masters: { read: true, write: true, import: true, export: true },
    backups: { read: true, export: true, restore: true, admin: true },
    settings: { read: true, write: true, admin: true },
    auth: { read: true, write: true, admin: true },
  },
  editor: {
    dashboards: { read: true, export: true },
    funnels: { read: true, write: true, import: true, export: true },
    orders: { read: true, write: true, import: true, export: true },
    masters: { read: true, write: true, import: true, export: true },
    backups: { read: true, export: true },
    settings: { read: true },
    auth: { read: true },
  },
  viewer: {
    dashboards: { read: true, export: true },
    funnels: { read: true, export: true },
    orders: { read: true, export: true },
    masters: { read: true, export: true },
    backups: { read: true },
    settings: { read: true },
    auth: { read: true },
  },
};

export function normalizeRoleName(role) {
  const value = String(role || '').trim().toLowerCase();
  if (value === 'admin' || value === 'administrator') return 'admin';
  if (value === 'editor' || value === 'ops' || value === 'operator') return 'editor';
  return 'viewer';
}

export function getRoleMatrix() {
  return JSON.parse(JSON.stringify(DEFAULT_ROLE_MATRIX));
}

export function getPermissionsForRole(role) {
  const normalized = normalizeRoleName(role);
  const matrix = getRoleMatrix();
  const modules = matrix[normalized] || matrix.viewer;
  const effective = {};
  Object.entries(modules).forEach(([moduleKey, actions]) => {
    effective[moduleKey] = {};
    ACTIONS.forEach((action) => {
      effective[moduleKey][action] = Boolean(actions?.[action]);
    });
  });
  return effective;
}

export function canRole(role, moduleKey, action = 'read') {
  const permissions = getPermissionsForRole(role);
  return Boolean(permissions?.[String(moduleKey || '').trim()]?.[String(action || 'read').trim()]);
}

export function getPermissionsContext(role) {
  const normalized = normalizeRoleName(role);
  return {
    role: normalized,
    modules: getPermissionsForRole(normalized),
    matrix: getRoleMatrix(),
    actions: [...ACTIONS],
    version: 'sprint5-step3',
  };
}
