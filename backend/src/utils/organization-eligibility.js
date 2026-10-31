
"use strict";

// Hackathon policy:
// Registered organizations can participate
// without manual administrator verification.

function isApprovalRequired() {
  return false;
}

function canOrganizationParticipate(organization) {
  return Boolean(organization);
}

function sqlEligibilityCondition(
  alias,
  approvalRequiredParameter
) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(alias)) {
    throw new Error("Invalid SQL alias");
  }

  if (
    !Number.isInteger(approvalRequiredParameter) ||
    approvalRequiredParameter < 1
  ) {
    throw new Error("Invalid SQL parameter index");
  }

  return `(
    $${approvalRequiredParameter}::boolean IS NOT NULL
    AND ${alias}.id IS NOT NULL
  )`;
}

module.exports = {
  isApprovalRequired,
  canOrganizationParticipate,
  sqlEligibilityCondition,
};
