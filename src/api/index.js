const API_BASE = '/api/v1';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Request failed');
  }

  return res.status === 204 ? null : res.json();
}

export const api = {
  // auth
  requestMagicLink: (email, inviteToken) =>
    request('/auth/request-link', {
      method: 'POST',
      body: JSON.stringify({ email, inviteToken })
    }),

  verifyMagicLink: (token) =>
    request('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token })
    }),

  // onboarding
  completeOnboarding: (data) =>
    request('/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // voices
  createVoice: (data) =>
    request('/voices', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  acknowledgeVoice: (voiceId) =>
    request(`/voices/${voiceId}/acknowledge`, {
      method: 'POST'
    }),

  // users
  getProfile: (id) => request(`/users/${id}`),

  // inbox
  getInbox: () => request('/responses/inbox')
};
