
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE organizations
      ADD COLUMN verification_status VARCHAR(20)
        NOT NULL DEFAULT 'pending',
      ADD COLUMN verified_by UUID
        REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN verified_at TIMESTAMPTZ,
      ADD COLUMN rejection_reason TEXT;

    -- Preserve any organizations verified before
    -- this migration was introduced.
    UPDATE organizations
    SET
      verification_status = 'approved',
      verified_at = NOW()
    WHERE is_verified = TRUE;

    ALTER TABLE organizations
      ADD CONSTRAINT organization_verification_status_check
      CHECK (
        verification_status IN (
          'pending', 'approved', 'rejected'
        )
      );

    ALTER TABLE organizations
      ADD CONSTRAINT organization_verification_consistency
      CHECK (
        is_verified = (
          verification_status = 'approved'
        )
      );

    ALTER TABLE organizations
      ADD CONSTRAINT organization_rejection_reason_check
      CHECK (
        verification_status <> 'rejected'
        OR (
          rejection_reason IS NOT NULL
          AND LENGTH(TRIM(rejection_reason)) > 0
        )
      );

    CREATE INDEX organizations_verification_status_idx
      ON organizations(verification_status);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS
      organizations_verification_status_idx;

    ALTER TABLE organizations
      DROP CONSTRAINT IF EXISTS
        organization_rejection_reason_check,
      DROP CONSTRAINT IF EXISTS
        organization_verification_consistency,
      DROP CONSTRAINT IF EXISTS
        organization_verification_status_check;

    ALTER TABLE organizations
      DROP COLUMN IF EXISTS rejection_reason,
      DROP COLUMN IF EXISTS verified_at,
      DROP COLUMN IF EXISTS verified_by,
      DROP COLUMN IF EXISTS verification_status;
  `);
};