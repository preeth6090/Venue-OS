-- Enable btree_gist extension required for the EXCLUDE constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Prevent overlapping bookings for the same space.
-- Prisma cannot express EXCLUDE constraints — this must be applied as raw SQL.
-- The WHERE clause exempts CANCELLED bookings so they don't block new bookings.
ALTER TABLE booking_spaces
  ADD CONSTRAINT no_space_overlap
  EXCLUDE USING gist (
    space_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  )
  WHERE (
    (SELECT status FROM bookings WHERE id = booking_id) NOT IN ('CANCELLED', 'NO_SHOW')
  );
