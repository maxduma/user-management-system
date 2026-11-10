import type { SessionWithUserDto, UserDto } from '@ums/shared';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { apiUrl } from './server';

interface StoredUser extends UserDto {
  password: string;
}

const error = (status: number, code: string, message = code) =>
  HttpResponse.json({ error: { code, message } }, { status });

/**
 * Minimal in-memory imitation of the REST API, enough to drive the UI
 * through realistic flows. Records every request for assertions.
 */
export class FakeApi {
  readonly users: StoredUser[] = [];
  readonly sessions = new Map<string, string>();
  readonly requests: Array<{ method: string; path: string; body?: unknown }> = [];
  private clock = Date.parse('2025-01-01T09:00:00Z');

  addUser(overrides: Partial<StoredUser> = {}): StoredUser {
    this.clock += 60_000;
    const index = this.users.length + 1;
    const now = new Date(this.clock).toISOString();
    const user: StoredUser = {
      id: crypto.randomUUID(),
      firstName: `First${index}`,
      lastName: `Last${index}`,
      email: `user${index}@example.com`,
      password: 'password123',
      status: 'active',
      loginsCount: 0,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
    this.users.push(user);
    return user;
  }

  /** Creates a session for the user and stores it like the app would. */
  signInAs(user: StoredUser): string {
    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, user.id);
    window.localStorage.setItem('ums.sessionId', sessionId);
    return sessionId;
  }

  find(predicate: (user: StoredUser) => boolean) {
    return this.users.find(predicate);
  }

  readonly handlers = [
    http.post(apiUrl('/auth/sign-up'), async ({ request }) => {
      const body = (await this.record(request)) as Record<string, string>;
      if (this.users.some((user) => user.email === body.email)) {
        return error(409, 'EMAIL_TAKEN', 'This e-mail is already registered');
      }
      const user = this.addUser({ ...body, loginsCount: 1 });
      return HttpResponse.json(this.openSession(user), { status: 201 });
    }),

    http.post(apiUrl('/sessions'), async ({ request }) => {
      const body = (await this.record(request)) as Record<string, string>;
      const user = this.users.find((candidate) => candidate.email === body.email);
      if (!user || user.password !== body.password) return error(401, 'INVALID_CREDENTIALS');
      if (user.status === 'inactive') return error(403, 'USER_INACTIVE');
      user.loginsCount += 1;
      return HttpResponse.json(this.openSession(user), { status: 201 });
    }),

    http.get(apiUrl('/sessions/current'), async ({ request }) => {
      await this.record(request);
      const auth = this.authenticate(request);
      if (!auth) return error(401, 'SESSION_INVALID');
      return HttpResponse.json(this.toSession(auth.sessionId, auth.user));
    }),

    http.delete(apiUrl('/sessions/:id'), async ({ request, params }) => {
      await this.record(request);
      if (!this.authenticate(request)) return error(401, 'SESSION_INVALID');
      this.sessions.delete(params.id as string);
      return new HttpResponse(null, { status: 204 });
    }),

    http.get(apiUrl('/users'), async ({ request }) => {
      await this.record(request);
      if (!this.authenticate(request)) return error(401, 'SESSION_INVALID');
      const url = new URL(request.url);
      const page = Number(url.searchParams.get('page') ?? 1);
      const pageSize = Number(url.searchParams.get('pageSize') ?? 6);
      const sorted = [...this.users].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return HttpResponse.json({
        items: sorted.slice((page - 1) * pageSize, page * pageSize).map(this.toDto),
        page,
        pageSize,
        total: sorted.length,
        totalPages: Math.ceil(sorted.length / pageSize),
      });
    }),

    http.post(apiUrl('/users'), async ({ request }) => {
      const body = (await this.record(request)) as Partial<StoredUser>;
      if (!this.authenticate(request)) return error(401, 'SESSION_INVALID');
      if (this.users.some((user) => user.email === body.email)) {
        return error(409, 'EMAIL_TAKEN', 'This e-mail is already registered');
      }
      return HttpResponse.json(this.toDto(this.addUser(body)), { status: 201 });
    }),

    http.patch(apiUrl('/users/:id'), async ({ request, params }) => {
      const changes = (await this.record(request)) as Partial<StoredUser>;
      if (!this.authenticate(request)) return error(401, 'SESSION_INVALID');
      const user = this.users.find((candidate) => candidate.id === params.id);
      if (!user) return error(404, 'USER_NOT_FOUND');
      if (user.status === 'inactive' && (changes.firstName || changes.lastName)) {
        return error(422, 'USER_INACTIVE_NAME_LOCKED', 'Name locked');
      }
      Object.assign(user, changes, { updatedAt: new Date().toISOString() });
      return HttpResponse.json(this.toDto(user));
    }),

    http.delete(apiUrl('/users/:id'), async ({ request, params }) => {
      await this.record(request);
      const auth = this.authenticate(request);
      if (!auth) return error(401, 'SESSION_INVALID');
      if (auth.user.id === params.id) return error(409, 'CANNOT_MODIFY_SELF');
      const index = this.users.findIndex((candidate) => candidate.id === params.id);
      if (index === -1) return error(404, 'USER_NOT_FOUND');
      this.users.splice(index, 1);
      return new HttpResponse(null, { status: 204 });
    }),
  ];

  requestsTo(method: string, path: string) {
    return this.requests.filter((entry) => entry.method === method && entry.path === path);
  }

  private async record(request: Request): Promise<JsonBodyType | undefined> {
    const body = request.headers.get('content-type')?.includes('json')
      ? await request.clone().json()
      : undefined;
    this.requests.push({ method: request.method, path: new URL(request.url).pathname, body });
    return body;
  }

  private authenticate(request: Request) {
    const sessionId = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
    const userId = this.sessions.get(sessionId);
    const user = userId && this.users.find((candidate) => candidate.id === userId);
    return user ? { sessionId, user } : null;
  }

  private openSession(user: StoredUser): SessionWithUserDto {
    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, user.id);
    return this.toSession(sessionId, user);
  }

  private toSession(sessionId: string, user: StoredUser): SessionWithUserDto {
    return {
      id: sessionId,
      userId: user.id,
      createdAt: new Date().toISOString(),
      terminatedAt: null,
      user: this.toDto(user),
    };
  }

  private toDto = ({ password: _password, ...user }: StoredUser): UserDto => ({ ...user });
}
