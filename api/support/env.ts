import { join } from 'node:path';
import dotenv from 'dotenv';

// Load .env from the repo root, wherever the command is run from.
dotenv.config({ path: join(import.meta.dirname, '..', '..', '.env'), quiet: true });

/** Override with API_BASE_URL, e.g. a local Restful Booker on http://localhost:3001. */
export const API_BASE_URL = process.env.API_BASE_URL ?? 'https://restful-booker.herokuapp.com';

/** Restful Booker's documented default admin account. */
export const ADMIN = {
    username: process.env.BOOKER_USERNAME ?? 'admin',
    password: process.env.BOOKER_PASSWORD ?? 'password123',
} as const;
