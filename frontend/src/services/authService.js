import client from './client.js'

export const authService = {
  login: (loginId, password) =>
    client.post('/api/auth/login', { login_id: loginId, password }),
}

export default authService
