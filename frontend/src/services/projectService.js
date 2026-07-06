import client from './client.js'

export const projectService = {
  list:   ()          => client.get('/api/projects'),
  get:    (id)        => client.get(`/api/projects/${id}`),
  getStats: (id)      => client.get(`/api/projects/${id}/stats`),
  getFiles: (id)      => client.get(`/api/projects/${id}/files`),
  create: (data)      => client.post('/api/projects', data),
  createWithTree: (data) => client.post('/api/projects/create_with_tree', data),
  update: (id, data)  => client.put(`/api/projects/${id}`, data),
  duplicate: (id)     => client.post(`/api/projects/${id}/duplicate`),
  delete: (id)        => client.delete(`/api/projects/${id}`),
}

export default projectService
