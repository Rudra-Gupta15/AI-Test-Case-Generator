import api from './client.js'

export const authApi = {
  login: (loginId, password) =>
    api.post('/api/auth/login', { login_id: loginId, password }),
}
