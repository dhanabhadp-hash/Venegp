/**
 * Single-User Token Store (No Firebase Auth)
 * Used optionally by Google Workspace APIs if user provides an explicit access token
 */

let cachedAccessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  cachedAccessToken = null;
};
