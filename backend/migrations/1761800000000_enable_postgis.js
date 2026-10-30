exports.up = (pgm) => {
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS postgis;
  `);
};

exports.down = () => {
  // Intentionally empty.
  // Other database objects may depend on PostGIS.
};
