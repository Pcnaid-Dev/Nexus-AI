import { User } from '../types';

/**
 * Authentication is now handled by @auth0/auth0-react SDK in App.tsx.
 * This service file remains as a placeholder for future API token management or
 * helper utilities that might need to be shared across non-React contexts.
 */

// Placeholder to prevent import errors during transition if other files reference it
export const loginWithGoogle = () => {
  console.warn("Use useAuth0() hook from @auth0/auth0-react instead.");
};

export const logout = async () => {
    console.warn("Use useAuth0() hook from @auth0/auth0-react instead.");
};

export const getCurrentUser = async (): Promise<User | null> => {
    console.warn("Use useAuth0() hook to get the current user.");
    return null;
};
