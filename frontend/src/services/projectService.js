import client from './client.js'

export const projectService = {
  list:   ()          => client.get('/api/projects'),
  get:    (id)        => client.get(`/api/projects/${id}`),
  create: (data)      => client.post('/api/projects', data),
  createWithTree: (data) => client.post('/api/projects/create_with_tree', data),
  update: (id, data)  => client.put(`/api/projects/${id}`, data),
  delete: (id)        => client.delete(`/api/projects/${id}`),
}

export default projectService
