import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem('aa_token'));
    const [user, setUser] = useState(() => {
        const t = localStorage.getItem('aa_token');
        if (!t) return null;
        try { return jwtDecode(t); } catch { return null; }
    });

    const login = (newToken) => {
        localStorage.setItem('aa_token', newToken);
        setToken(newToken);
        try { setUser(jwtDecode(newToken)); } catch { setUser(null); }
    };

    const logout = () => {
        localStorage.removeItem('aa_token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            token,
            user,
            isAuthenticated: !!token,
            role: user?.role ?? null,
            login,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
