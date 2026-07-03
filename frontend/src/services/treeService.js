import client from './client.js'

export const treeService = {
  getNodes:        (projectId)       => client.get(`/api/tree/nodes/${projectId}`),
  createNode:      (data)            => client.post('/api/tree/nodes', data),
  createNodesBatch:(nodes)           => client.post('/api/tree/nodes/batch', { nodes }),
  updateNode:      (nodeId, data)    => client.put(`/api/tree/nodes/${nodeId}`, data),
  deleteNode:      (nodeId)          => client.delete(`/api/tree/nodes/${nodeId}`),
  patchNodeData:   (nodeId, data)    => client.patch(`/api/tree/nodes/${nodeId}/data`, { data }),
  suggestStructure:(nodeId)          => client.post(`/api/tree/nodes/${nodeId}/suggest-structure`),
  generateFromPrompt:(prompt)        => client.post('/api/tree/generate-from-prompt', { prompt }),
}

export default treeService
