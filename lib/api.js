// API utility to handle basePath correctly
export const getApiUrl = (path) => {
  // If running in browser, use the basePath from the environment or default
  if (typeof window !== 'undefined') {
    // In the browser, Next.js automatically handles basePath routing
    return path;
  }
  // On server side, return the path as-is
  return path;
};

export const fetchApi = async (path, options = {}) => {
  const url = getApiUrl(path);
  return fetch(url, options);
};
