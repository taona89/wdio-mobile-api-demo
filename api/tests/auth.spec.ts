import { test, expect } from '../support/fixtures.js';
import { AuthFailureSchema, AuthSuccessSchema } from '../support/schemas.js';

test.describe('POST /auth – create token', () => {
    test('returns a token for valid credentials', async ({ api }) => {
        const response = await api.createToken();

        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('application/json');

        const body = AuthSuccessSchema.parse(await response.json());
        expect(body.token).toMatch(/\S+/);
    });

    test('does not return a token for invalid credentials', async ({ api }) => {
        test.info().annotations.push({
            type: 'observation',
            description: 'The API answers 200 OK (not 401) for bad credentials, with a "reason" body.',
        });

        const response = await api.createToken({ username: 'admin', password: 'wrong-password' });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).not.toHaveProperty('token');
        expect(AuthFailureSchema.parse(body)).toEqual({ reason: 'Bad credentials' });
    });
});
