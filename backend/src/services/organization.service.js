
const { pool } = require("../config/db");

const {
  ORGANIZATION_SELECT_FIELDS,
  formatOrganization,
} = require("../utils/organization.mapper");

const DONOR_TYPES = [
  "restaurant",
  "hostel",
  "caterer",
  "other_donor",
];

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateRoleAndType(role, type) {
  if (role === "ngo" && type === "ngo") return;

  if (role === "donor" && DONOR_TYPES.includes(type)) {
    return;
  }

  throw httpError(
    403,
    "Organization type is not permitted for your role"
  );
}

function canSeeVerificationDetails(user, organization) {
  return (
    user.role === "admin" ||
    user.id === organization.owner_user_id
  );
}

async function createOrganization(user, data) {
  validateRoleAndType(user.role, data.organizationType);

  const existing = await pool.query(
    "SELECT id FROM organizations WHERE owner_user_id = $1",
    [user.id]
  );

  if (existing.rowCount) {
    throw httpError(409, "You already own an organization");
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO organizations (
        owner_user_id,
        name,
        organization_type,
        description,
        contact_phone,
        address,
        location
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        ST_SetSRID(
          ST_MakePoint($7, $8),
          4326
        )::geography
      )
      RETURNING ${ORGANIZATION_SELECT_FIELDS}
      `,
      [
        user.id,
        data.name,
        data.organizationType,
        data.description ?? null,
        data.contactPhone ?? null,
        data.address,
        Number(data.location.longitude),
        Number(data.location.latitude),
      ]
    );

    return formatOrganization(result.rows[0], {
      includeVerificationDetails: true,
    });
  } catch (error) {
    if (error.code === "23505") {
      throw httpError(
        409,
        "You already own an organization"
      );
    }

    throw error;
  }
}

async function getMyOrganization(user) {
  const result = await pool.query(
    `
    SELECT ${ORGANIZATION_SELECT_FIELDS}
    FROM organizations
    WHERE owner_user_id = $1
    LIMIT 1
    `,
    [user.id]
  );

  if (!result.rowCount) {
    throw httpError(404, "Organization not found");
  }

  return formatOrganization(result.rows[0], {
    includeVerificationDetails: true,
  });
}

async function getOrganizationById(id, user) {
  const result = await pool.query(
    `
    SELECT ${ORGANIZATION_SELECT_FIELDS}
    FROM organizations
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );

  if (!result.rowCount) {
    throw httpError(404, "Organization not found");
  }

  const organization = result.rows[0];

  return formatOrganization(organization, {
    includeVerificationDetails:
      canSeeVerificationDetails(user, organization),
  });
}

async function updateOrganization(id, user, data) {
  const allowedFields = {
    name: "name",
    description: "description",
    contactPhone: "contact_phone",
    address: "address",
  };

  const sets = [];
  const values = [];

  for (const [key, column] of Object.entries(allowedFields)) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      values.push(data[key]);
      sets.push(`${column} = $${values.length}`);
    }
  }

  if (Object.prototype.hasOwnProperty.call(data, "location")) {
    const { latitude, longitude } = data.location;

    values.push(Number(longitude), Number(latitude));

    const lngIndex = values.length - 1;
    const latIndex = values.length;

    sets.push(`
      location = ST_SetSRID(
        ST_MakePoint($${lngIndex}, $${latIndex}),
        4326
      )::geography
    `);
  }

  if (!sets.length) {
    throw httpError(400, "No valid update fields");
  }

  values.push(id, user.id, user.role === "admin");

  const idIndex = values.length - 2;
  const ownerIndex = values.length - 1;
  const adminIndex = values.length;

  const result = await pool.query(
    `
    UPDATE organizations
    SET ${sets.join(", ")}
    WHERE id = $${idIndex}
      AND (
        owner_user_id = $${ownerIndex}
        OR $${adminIndex}::boolean
      )
    RETURNING ${ORGANIZATION_SELECT_FIELDS}
    `,
    values
  );

  if (!result.rowCount) {
    throw httpError(404, "Organization not found");
  }

  return formatOrganization(result.rows[0], {
    includeVerificationDetails: true,
  });
}

module.exports = {
  createOrganization,
  getMyOrganization,
  getOrganizationById,
  updateOrganization,
};
