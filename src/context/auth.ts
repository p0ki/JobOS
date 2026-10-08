import { createContext } from 'react';

export interface AuthUser {
    id: string;
    name: string;
    email?: string;
}

export interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    error: string | null;
    signIn: (password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
