
const PICKUP_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "completed",
];

const ASSIGNMENT_STATUSES = [
  "assigned",
  "picked_up",
  "completed",
  "cancelled",
];

function statusCheck(column, values) {
  const allowed = values
    .map((value) => `'${value}'`)
    .join(", ");

  return `CHECK (${column} IN (${allowed}))`;
}

exports.up = (pgm) => {
  pgm.sql(`
    -- Preserve every unrelated database constraint.

    ALTER TABLE pickup_requests
      DROP CONSTRAINT pickup_requests_status_check;

    ALTER TABLE pickup_requests
      ADD CONSTRAINT pickup_requests_status_check
      ${statusCheck("status", [
        ...PICKUP_STATUSES,
        "expired",
      ])};

    ALTER TABLE pickup_requests
      DROP CONSTRAINT pickup_decision_metadata_check;

    -- An expired request may have been:
    -- 1. Pending, without a donor decision.
    -- 2. Approved, with a donor decision.
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
        OR (
          status = 'expired'
          AND (
            (decided_at IS NULL AND decided_by IS NULL)
            OR decided_at IS NOT NULL
          )
        )
      );

    ALTER TABLE volunteer_assignments
      DROP CONSTRAINT volunteer_assignment_status_check;

    ALTER TABLE volunteer_assignments
      ADD CONSTRAINT volunteer_assignment_status_check
      ${statusCheck("status", [
        ...ASSIGNMENT_STATUSES,
        "expired",
      ])};

    -- Enforce the frozen MVP rule:
    -- one assignment per pickup request, including history.
    CREATE UNIQUE INDEX
      volunteer_assignments_one_per_request_idx
    ON volunteer_assignments (pickup_request_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    -- Do not silently erase expired lifecycle records.
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pickup_requests
        WHERE status = 'expired'
      ) OR EXISTS (
        SELECT 1 FROM volunteer_assignments
        WHERE status = 'expired'
      ) THEN
        RAISE EXCEPTION
          'Cannot rollback: expired lifecycle records exist';
      END IF;
    END
    $$;

    DROP INDEX IF EXISTS
      volunteer_assignments_one_per_request_idx;

    ALTER TABLE volunteer_assignments
      DROP CONSTRAINT volunteer_assignment_status_check;

    ALTER TABLE volunteer_assignments
      ADD CONSTRAINT volunteer_assignment_status_check
      ${statusCheck("status", ASSIGNMENT_STATUSES)};

    ALTER TABLE pickup_requests
      DROP CONSTRAINT pickup_decision_metadata_check;

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
      DROP CONSTRAINT pickup_requests_status_check;

    ALTER TABLE pickup_requests
      ADD CONSTRAINT pickup_requests_status_check
      ${statusCheck("status", PICKUP_STATUSES)};
  `);
};
