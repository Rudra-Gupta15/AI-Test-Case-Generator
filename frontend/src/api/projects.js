import api from './client.js'

export const projectsApi = {
  list:   ()          => api.get('/api/projects'),
  get:    (id)        => api.get(`/api/projects/${id}`),
  create: (data)      => api.post('/api/projects', data),
  createWithTree: (data) => api.post('/api/projects/create_with_tree', data),
  update: (id, data)  => api.put(`/api/projects/${id}`, data),
  delete: (id)        => api.delete(`/api/projects/${id}`),
}
