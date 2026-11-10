import { type APIRequestContext, expect, type Page, test as base } from '@playwright/test';

export interface TestUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface Session {
  sessionId: string;
  user: TestUser;
}

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** Fresh, collision-free user data (tests never depend on seeded data). */
export function newUserData(overrides: Partial<Omit<TestUser, 'id'>> = {}) {
  const id = unique();
  return {
    firstName: `Test${id}`,
    lastName: 'User',
    email: `e2e-${id}@example.com`,
    password: 'e2e-password',
    ...overrides,
  };
}

/** Thin client for preparing state through the public REST API. */
export class ApiClient {
  constructor(private readonly request: APIRequestContext) {}

  async signUp(overrides: Partial<Omit<TestUser, 'id'>> = {}): Promise<Session> {
    const data = newUserData(overrides);
    const response = await this.request.post('/api/auth/sign-up', { data });
    expect(response.status(), await response.text()).toBe(201);
    const body = await response.json();
    return { sessionId: body.id, user: { ...data, id: body.userId } };
  }

  async createUser(
    sessionId: string,
    overrides: Partial<Omit<TestUser, 'id'>> & { status?: 'active' | 'inactive' } = {},
  ): Promise<TestUser> {
    const data = newUserData(overrides);
    const response = await this.request.post('/api/users', {
      data: { ...data, status: overrides.status ?? 'active' },
      headers: { authorization: `Bearer ${sessionId}` },
    });
    expect(response.status(), await response.text()).toBe(201);
    return { ...data, id: (await response.json()).id };
  }

  getUser(sessionId: string, id: string) {
    return this.request.get(`/api/users/${id}`, {
      headers: { authorization: `Bearer ${sessionId}` },
    });
  }

  currentSession(sessionId: string) {
    return this.request.get('/api/sessions/current', {
      headers: { authorization: `Bearer ${sessionId}` },
    });
  }
}

/** Opens the app with an existing session, exactly like a returning user. */
export async function useSession(page: Page, sessionId: string, path = '/dashboard') {
  await page.goto('/sign-in');
  await page.evaluate((id) => window.localStorage.setItem('ums.sessionId', id), sessionId);
  await page.goto(path);
}

export const test = base.extend<{ api: ApiClient; admin: Session }>({
  api: async ({ request }, use) => {
    await use(new ApiClient(request));
  },
  /** A signed-in administrator whose session is already active in the page. */
  admin: async ({ api, page }, use) => {
    const session = await api.signUp({ firstName: `Admin${unique()}` });
    await useSession(page, session.sessionId);
    await expect(page.getByTestId('greeting')).toHaveText(`Hello ${session.user.firstName}`);
    await use(session);
  },
});

export { expect };
