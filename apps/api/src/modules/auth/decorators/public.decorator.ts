import { SetMetadata } from '@nestjs/common';

/** Marks a route as bypassing the global JWT auth guard. Use sparingly. */
export const IS_PUBLIC_KEY = 'auth:isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
