import axios from 'axios'

const TOKEN_KEY = 'qa_auth_token'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => {
  return Promise.reject(error)
})

client.interceptors.response.use((response) => {
  return response.data
}, (error) => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('qa_auth_user')
    window.location.href = '/login'
  }
  
  const errorMessage = error.response?.data?.detail || error.message || 'API Error'
  return Promise.reject(new Error(errorMessage))
})

export default client
