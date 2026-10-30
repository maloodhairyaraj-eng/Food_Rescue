
const PERMISSIONS = Object.freeze({
  PROFILE_READ: "profile:read",
  FOOD_READ: "food:read",
  FOOD_CREATE: "food:create",
  PICKUP_REQUEST_CREATE: "pickup:request:create",
  PICKUP_ASSIGN: "pickup:assign",
  DELIVERY_MANAGE: "delivery:manage",
  ORGANIZATION_CREATE: "organization:create",
  ORGANIZATION_READ: "organization:read",
  ORGANIZATION_UPDATE: "organization:update",
  ORGANIZATION_VERIFY: "organization:verify",
  ADMIN_DASHBOARD_READ: "admin:dashboard:read",
});

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

const ROLE_PERMISSIONS = Object.freeze({
  ngo: [
    PERMISSIONS.PROFILE_READ,
    PERMISSIONS.FOOD_READ,
    PERMISSIONS.PICKUP_REQUEST_CREATE,
    PERMISSIONS.PICKUP_ASSIGN,
    PERMISSIONS.ORGANIZATION_CREATE,
    PERMISSIONS.ORGANIZATION_READ,
    PERMISSIONS.ORGANIZATION_UPDATE,
  ],

  donor: [
    PERMISSIONS.PROFILE_READ,
    PERMISSIONS.FOOD_READ,
    PERMISSIONS.FOOD_CREATE,
    PERMISSIONS.ORGANIZATION_CREATE,
    PERMISSIONS.ORGANIZATION_READ,
    PERMISSIONS.ORGANIZATION_UPDATE,
  ],

  volunteer: [
    PERMISSIONS.PROFILE_READ,
    PERMISSIONS.FOOD_READ,
    PERMISSIONS.DELIVERY_MANAGE,
    PERMISSIONS.ORGANIZATION_READ,
  ],

  admin: [...ALL_PERMISSIONS],
});

function hasPermission(role, permission) {
  return (ROLE_PERMISSIONS[role] || []).includes(permission);
}

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
};
