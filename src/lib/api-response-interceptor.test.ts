import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { useAuthStore } from './store';

vi.mock('axios', () => {
  const mockInstance = {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };

  return {
    default: {
      create: vi.fn(() => mockInstance),
    },
  };
});

describe('Axios 401 response interceptor', () => {
  let responseErrorHandler: ((err: { response?: { status: number } }) => Promise<never>) | undefined;

  beforeAll(async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api/v1';
    await import('./api');

    const instance = vi.mocked(axios.create).mock.results[0]?.value;
    responseErrorHandler = vi.mocked(instance.interceptors.response.use).mock.calls[0]?.[1];
  });

  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      token: 'some-token',
      merchant: { id: '1', email: 'a@b.com', businessName: 'Acme', status: 'active' },
    });

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: '',
        pathname: '/dashboard',
        search: '',
        assign: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  it('clears auth state on a 401 response', async () => {
    const err = { response: { status: 401 } };

    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().merchant).toBeNull();
  });

  it('removes the legacy access_token from localStorage on 401', async () => {
    localStorage.setItem('access_token', 'legacy-token');

    const err = { response: { status: 401 } };
    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);

    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('redirects to /auth/login with return path on a 401 response', async () => {
    const err = { response: { status: 401 } };

    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);

    expect(window.location.assign).toHaveBeenCalledWith('/auth/login?next=%2Fdashboard');
  });

  it('invokes registered auth redirect handler when present on 401', async () => {
    const { setAuthRedirectHandler } = await import('./auth-redirect');
    const mockHandler = vi.fn();
    setAuthRedirectHandler(mockHandler);

    const err = { response: { status: 401 } };
    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);

    expect(mockHandler).toHaveBeenCalledWith('/dashboard');
    setAuthRedirectHandler(null);
  });

  it('does not clear auth state on a non-401 error (e.g. 403)', async () => {
    const err = { response: { status: 403 } };

    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);

    expect(useAuthStore.getState().token).toBe('some-token');
  });

  it('does not redirect on a non-401 error (e.g. 500)', async () => {
    const err = { response: { status: 500 } };
    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);

    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('passes through the original error on rejection for 401', async () => {
    const err = { response: { status: 401 }, message: 'Unauthorized' };

    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);
  });

  it('passes through the original error on rejection for non-401', async () => {
    const err = { response: { status: 404 }, message: 'Not Found' };

    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);
  });

  it('handles errors with no response property gracefully', async () => {
    const err = {} as { response?: { status: number } };

    await expect(responseErrorHandler?.(err)).rejects.toEqual(err);

    // Should not clear auth since there is no 401 status
    expect(useAuthStore.getState().token).toBe('some-token');
  });
});
