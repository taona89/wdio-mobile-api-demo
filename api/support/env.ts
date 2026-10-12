import 'dotenv/config';

/** Override with API_BASE_URL (e.g. a local Restful Booker on http://localhost:3001). */
export const API_BASE_URL = process.env.API_BASE_URL ?? 'https://restful-booker.herokuapp.com';
