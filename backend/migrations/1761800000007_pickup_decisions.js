
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE pickup_requests
      ADD COLUMN decided_by UUID
        REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN decided_at TIMESTAMPTZ,
      ADD COLUMN decision_reason TEXT;

    ALTER TABLE pickup_requests
      ADD CONSTRAINT pickup_decision_metadata_check
      CHECK (
        (
          status IN ('pending', 'cancelled')
          AND decided_at IS NULL
          AND decided_by IS NULL
        )
        OR (
          status IN ('approved', 'rejected', 'completed')
          AND decided_at IS NOT NULL
        )
      );

    ALTER TABLE pickup_requests
      ADD CONSTRAINT pickup_rejection_reason_check
      CHECK (
        status <> 'rejected'
        OR (
          decision_reason IS NOT NULL
          AND LENGTH(TRIM(decision_reason)) > 0
        )
      );

    CREATE INDEX pickup_requests_ngo_history_idx
      ON pickup_requests(
        ngo_organization_id,
        created_at DESC
      );

    CREATE INDEX pickup_requests_listing_history_idx
      ON pickup_requests(
        food_listing_id,
        created_at DESC
      );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS pickup_requests_listing_history_idx;
    DROP INDEX IF EXISTS pickup_requests_ngo_history_idx;

    ALTER TABLE pickup_requests
      DROP CONSTRAINT IF EXISTS pickup_rejection_reason_check,
      DROP CONSTRAINT IF EXISTS pickup_decision_metadata_check;

    ALTER TABLE pickup_requests
      DROP COLUMN IF EXISTS decision_reason,
      DROP COLUMN IF EXISTS decided_at,
      DROP COLUMN IF EXISTS decided_by;
  `);
};
