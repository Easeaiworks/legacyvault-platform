// Transport types — plain, serializable shapes for API <-> web.
// These intentionally do NOT re-export Prisma types; keep the API surface decoupled.

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roles: string[];
  mfaEnforced: boolean;
}

export interface PaginationInput {
  cursor?: string;
  limit?: number;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  requestId?: string;
}
