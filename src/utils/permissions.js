/**
 * EPIC RBAC Permission Utility
 * ============================
 * Centralized helper to check if a user has a specific permission.
 * Used by all page components to dynamically show/hide action buttons.
 */

/**
 * Check if the user has a specific permission.
 * @param {Object} user - The user object from login (stored in state/localStorage)
 * @param {string|string[]} permission - Single permission string or array of permissions (OR logic)
 * @returns {boolean}
 */
export function hasPerm(user, permission) {
  if (!user) return false;
  if (user.is_super_admin || user.username === 'admin' || user.role === 'admin') return true;

  const perms = user.permissions || [];
  if (perms.includes('*')) return true;

  if (Array.isArray(permission)) {
    return permission.some(p => perms.includes(p));
  }
  return perms.includes(permission);
}

/**
 * Check if the user has ANY write permission for a given module.
 * Useful for hiding entire ACTIONS columns.
 * @param {Object} user
 * @param {string} module - e.g. 'staff', 'branch', 'department'
 * @returns {boolean}
 */
export function hasAnyWritePerm(user, module) {
  return hasPerm(user, [
    `add_${module}`,
    `update_${module}`,
    `remove_${module}`,
    `status_${module}`,
    `create_${module}`,
    `delete_${module}`,
  ]);
}
