import api from './axios';

export const getProblems = (params = {}) =>
    api.get('/api/problems', { params }).then((r) => r.data);

export const getProblemById = (id) =>
    api.get(`/api/problems/${id}`).then((r) => r.data.problem);

export const createProblem = (data) =>
    api.post('/api/problems', data).then((r) => r.data.problem);

export const updateProblem = (id, data) =>
    api.put(`/api/problems/${id}`, data).then((r) => r.data.problem);

export const publishProblem = (id) =>
    api.patch(`/api/problems/${id}/publish`).then((r) => r.data.problem);

export const addTestCase = (problemId, data) =>
    api.post(`/api/problems/${problemId}/testcases`, data).then((r) => r.data);

export const getTags = () =>
    api.get('/api/tags').then((r) => r.data.tags);
