
"use strict";

function isApprovalRequired() {
  return process.env.ORGANIZATION_APPROVAL_REQUIRED !== "false";
}

function canOrganizationParticipate(organization) {
  if (!organization) return false;

  const status =
    organization.verification_status ??
    organization.verificationStatus;

  const verified =
    organization.is_verified ??
    organization.isVerified;

  if (status === "rejected") {
    return false;
  }

  if (!isApprovalRequired()) {
    return status === "pending" ||
      status === "approved";
  }

  return (
    verified === true &&
    status === "approved"
  );
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
    ${alias}.verification_status IN ('pending', 'approved')
    AND (
      $${approvalRequiredParameter}::boolean = FALSE
      OR (
        ${alias}.is_verified = TRUE
        AND ${alias}.verification_status = 'approved'
      )
    )
  )`;
}

module.exports = {
  isApprovalRequired,
  canOrganizationParticipate,
  sqlEligibilityCondition,
};
