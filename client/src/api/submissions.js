import api from './axios';

export const submitCode = (problemId, language, code) =>
    api.post('/api/submissions', { problemId, language, code }).then((r) => r.data.submission);

export const getMySubmissions = (params = {}) =>
    api.get('/api/submissions', { params }).then((r) => r.data);

export const getSubmissionsByProblem = (problemId) =>
    api.get(`/api/submissions/problem/${problemId}`).then((r) => r.data.submissions);

export const getSubmissionById = (id) =>
    api.get(`/api/submissions/${id}`).then((r) => r.data.submission);

export function streamVerdict(submissionId, onVerdict, onError) {
    const token = localStorage.getItem('aa_token');
    const url = `${import.meta.env.VITE_API_BASE_URL}/api/submissions/${submissionId}/events`;

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            function pump() {
                return reader.read().then(({ done, value }) => {
                    if (done) return;
                    const text = decoder.decode(value, { stream: true });
                    for (const line of text.split('\n')) {
                        if (line.startsWith('data: ')) {
                            try {
                                const { verdict } = JSON.parse(line.slice(6));
                                onVerdict(verdict);
                            } catch (_) {}
                        }
                    }
                    return pump();
                });
            }
            return pump();
        })
        .catch(onError);
}
