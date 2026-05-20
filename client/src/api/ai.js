import api from './axios';

export const getAIReview = (submissionId) =>
    api.get(`/api/submissions/${submissionId}/ai-review`).then((r) => r.data);
