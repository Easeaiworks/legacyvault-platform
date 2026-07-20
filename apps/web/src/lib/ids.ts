/**
 * ID-format helpers.
 *
 * All primary keys in the schema are Postgres `uuid` columns. Prisma throws
 * (P2023, surfacing as a 500) when a malformed UUID is used in a `where`
 * clause, so every route/page that receives an id from the URL or request
 * body must validate the shape first and 404 cleanly instead.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}
