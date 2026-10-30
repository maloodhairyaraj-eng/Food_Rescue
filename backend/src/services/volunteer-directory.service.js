
"use strict";

const { pool } = require("../config/db");

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function getDirectory(user) {
  if (user.role !== "ngo") {
    throw httpError(
      403,
      "Only NGOs can view the volunteer directory"
    );
  }

  const result = await pool.query(`
    SELECT
      u.id,
      u.full_name,
      v.vehicle_type,
      v.is_available,
      EXISTS (
        SELECT 1
        FROM volunteer_assignments a
        WHERE a.volunteer_user_id = u.id
          AND a.status IN ('assigned', 'picked_up')
      ) AS has_active_assignment
    FROM users u
    JOIN volunteers v ON v.user_id = u.id
    WHERE u.role = 'volunteer'
      AND u.is_active = TRUE
    ORDER BY u.full_name ASC, u.id ASC
  `);

  return result.rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    vehicleType: row.vehicle_type,
    isAvailable: row.is_available === true,
    isBusy: row.has_active_assignment === true,
    canAssign:
      row.is_available === true &&
      row.has_active_assignment === false,
  }));
}

async function getMyAvailability(user) {
  if (user.role !== "volunteer") {
    throw httpError(
      403,
      "Volunteer account required"
    );
  }

  const result = await pool.query(
    `
    SELECT is_available, vehicle_type
    FROM volunteers
    WHERE user_id = $1
    `,
    [user.id]
  );

  if (!result.rowCount) {
    throw httpError(
      404,
      "Volunteer profile not found"
    );
  }

  return {
    isAvailable: result.rows[0].is_available,
    vehicleType: result.rows[0].vehicle_type,
  };
}

async function updateAvailability(user, isAvailable) {
  if (user.role !== "volunteer") {
    throw httpError(
      403,
      "Volunteer account required"
    );
  }

  if (typeof isAvailable !== "boolean") {
    throw httpError(
      400,
      "isAvailable must be a boolean"
    );
  }

  const result = await pool.query(
    `
    UPDATE volunteers
    SET
      is_available = $1,
      updated_at = NOW()
    WHERE user_id = $2
    RETURNING is_available, vehicle_type
    `,
    [isAvailable, user.id]
  );

  if (!result.rowCount) {
    throw httpError(
      404,
      "Volunteer profile not found"
    );
  }

  return {
    isAvailable: result.rows[0].is_available,
    vehicleType: result.rows[0].vehicle_type,
  };
}

module.exports = {
  getDirectory,
  getMyAvailability,
  updateAvailability,
};
    