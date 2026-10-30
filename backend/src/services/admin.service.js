
const { pool } = require("../config/db");

const {
  ORGANIZATION_SELECT_FIELDS,
  formatOrganization,
} = require("../utils/organization.mapper");

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function listOrganizations(filters = {}) {
  const { status } = filters;

  const limit = Number(filters.limit) || 20;
  const offset = Number(filters.offset) || 0;

  const values = [];
  let where = "";

  if (status) {
    values.push(status);
    where = "WHERE verification_status = $1";
  }

  const countResult = await pool.query(
    `
    SELECT COUNT(*)::integer AS total
    FROM organizations
    ${where}
    `,
    values
  );

  values.push(limit, offset);

  const limitIndex = values.length - 1;
  const offsetIndex = values.length;

  const result = await pool.query(
    `
    SELECT ${ORGANIZATION_SELECT_FIELDS}
    FROM organizations
    ${where}
    ORDER BY created_at DESC, id DESC
    LIMIT $${limitIndex}
    OFFSET $${offsetIndex}
    `,
    values
  );

  return {
    organizations: result.rows.map((row) =>
      formatOrganization(row, {
        includeVerificationDetails: true,
      })
    ),
    pagination: {
      total: countResult.rows[0].total,
      limit,
      offset,
    },
  };
}

async function updateVerification(
  organizationId,
  adminUserId,
  status,
  reason
) {
  const approved = status === "approved";

  const result = await pool.query(
    `
    UPDATE organizations
    SET
      verification_status = $1,
      is_verified = $2,
      verified_by = $3,
      verified_at = NOW(),
      rejection_reason = $4
    WHERE id = $5
    RETURNING ${ORGANIZATION_SELECT_FIELDS}
    `,
    [
      status,
      approved,
      adminUserId,
      approved ? null : reason.trim(),
      organizationId,
    ]
  );

  if (!result.rowCount) {
    throw httpError(404, "Organization not found");
  }

  return formatOrganization(result.rows[0], {
    includeVerificationDetails: true,
  });
}

module.exports = {
  listOrganizations,
  updateVerification,
};
