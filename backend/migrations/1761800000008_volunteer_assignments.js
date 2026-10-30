
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE volunteer_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      pickup_request_id UUID NOT NULL
        REFERENCES pickup_requests(id)
        ON DELETE RESTRICT,

      volunteer_user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

      assigned_by_user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

      status VARCHAR(20) NOT NULL DEFAULT 'assigned',

      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      picked_up_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT volunteer_assignment_status_check
        CHECK (status IN (
          'assigned',
          'picked_up',
          'completed',
          'cancelled'
        )),

      CONSTRAINT volunteer_assignment_timeline_check
        CHECK (
          (status <> 'picked_up' OR picked_up_at IS NOT NULL)
          AND
          (status <> 'completed'
            OR (picked_up_at IS NOT NULL
                AND completed_at IS NOT NULL))
        )
    );

    CREATE UNIQUE INDEX unique_active_volunteer_assignment
      ON volunteer_assignments(pickup_request_id)
      WHERE status IN ('assigned', 'picked_up');

    CREATE INDEX volunteer_assignments_volunteer_idx
      ON volunteer_assignments(
        volunteer_user_id,
        assigned_at DESC
      );

    CREATE INDEX volunteer_assignments_request_idx
      ON volunteer_assignments(pickup_request_id);

    CREATE TRIGGER volunteer_assignments_updated_at
      BEFORE UPDATE ON volunteer_assignments
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS volunteer_assignments;
  `);
};
