import api from './client.js'

export const treeApi = {
  getNodes:        (projectId)       => api.get(`/api/tree/nodes/${projectId}`),
  createNode:      (data)            => api.post('/api/tree/nodes', data),
  createNodesBatch:(nodes)           => api.post('/api/tree/nodes/batch', { nodes }),
  updateNode:      (nodeId, data)    => api.put(`/api/tree/nodes/${nodeId}`, data),
  deleteNode:      (nodeId)          => api.delete(`/api/tree/nodes/${nodeId}`),
  patchNodeData:   (nodeId, data)    => api.patch(`/api/tree/nodes/${nodeId}/data`, { data }),
  suggestStructure:(nodeId)          => api.post(`/api/tree/nodes/${nodeId}/suggest-structure`),
  generateFromPrompt:(prompt)        => api.post('/api/tree/generate-from-prompt', { prompt }),
}
