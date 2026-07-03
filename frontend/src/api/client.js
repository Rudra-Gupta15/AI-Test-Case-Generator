/**
 * Thin fetch wrapper that automatically:
 *  - Injects Authorization: Bearer <token> from localStorage
 *  - Parses JSON response
 *  - On 401 → clears token and reloads to /login
 */

const TOKEN_KEY = 'qa_auth_token'

function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    ...(options.headers || {}),
  }

  // Only set Content-Type for JSON bodies; FormData sets its own boundary
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(path, { ...options, headers })

  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('qa_auth_user')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    let errDetail = `HTTP ${res.status}`
    try {
      const errBody = await res.json()
      errDetail = errBody.detail || JSON.stringify(errBody)
    } catch {}
    throw new Error(errDetail)
  }

  // Handle 204 No Content
  if (res.status === 204) return null

  return res.json()
}

export const api = {
  get:    (path, opts)   => request(path, { method: 'GET', ...opts }),
  post:   (path, body, opts) => request(path, { method: 'POST',   body: body instanceof FormData ? body : JSON.stringify(body), ...opts }),
  put:    (path, body, opts) => request(path, { method: 'PUT',    body: JSON.stringify(body), ...opts }),
  patch:  (path, body, opts) => request(path, { method: 'PATCH',  body: JSON.stringify(body), ...opts }),
  delete: (path, opts)   => request(path, { method: 'DELETE', ...opts }),
}

export default api
