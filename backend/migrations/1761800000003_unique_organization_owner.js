
exports.up = (pgm) => {
  pgm.sql(`
    CREATE UNIQUE INDEX organizations_owner_unique_idx
    ON organizations(owner_user_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS organizations_owner_unique_idx;
  `);
};
