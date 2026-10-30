
const ORGANIZATION_SELECT_FIELDS = `
  id,
  owner_user_id,
  name,
  organization_type,
  description,
  contact_phone,
  address,
  is_verified,
  verification_status,
  verified_by,
  verified_at,
  rejection_reason,
  ST_Y(location::geometry) AS latitude,
  ST_X(location::geometry) AS longitude,
  created_at,
  updated_at
`;

function formatOrganization(row, options = {}) {
  if (!row) return null;

  const {
    includeVerificationDetails = false,
  } = options;

  const organization = {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    organizationType: row.organization_type,
    description: row.description,
    contactPhone: row.contact_phone,
    address: row.address,
    location:
      row.latitude == null || row.longitude == null
        ? null
        : {
            latitude: Number(row.latitude),
            longitude: Number(row.longitude),
          },
    isVerified: row.is_verified,
    verificationStatus: row.verification_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (includeVerificationDetails) {
    organization.verifiedBy = row.verified_by;
    organization.verifiedAt = row.verified_at;
    organization.rejectionReason = row.rejection_reason;
  }

  return organization;
}

module.exports = {
  ORGANIZATION_SELECT_FIELDS,
  formatOrganization,
};
