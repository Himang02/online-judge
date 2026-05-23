import { useState, useEffect } from 'react';
import { getProblems } from '../api/problems';

export function useProblems(params = {}) {
    const [data, setData] = useState({ problems: [], total: 0, page: 1, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const key = JSON.stringify(params);

    useEffect(() => {
        setLoading(true);
        getProblems(params)
            .then(setData)
            .catch(setError)
            .finally(() => setLoading(false));
    }, [key]);

    return { ...data, loading, error };
}
