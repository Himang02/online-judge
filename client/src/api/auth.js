import api from './axios';

export const login = (email, password) =>
    api.post('/api/auth/login', { email, password }).then((r) => r.data);

export const register = (name, username, email, password) =>
    api.post('/api/auth/register', { name, username, email, password }).then((r) => r.data);
