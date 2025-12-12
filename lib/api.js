// API utility to handle basePath correctly
export const getApiUrl = (path) => {
  // In production with basePath '/gate', we need to prepend it
  // Check if we're in production by checking the URL
  if (typeof window !== 'undefined') {
    // If the current URL contains '/gate', we're in production
    if (window.location.pathname.startsWith('/gate')) {
      return `/gate${path}`;
    }
  }
  return path;
};

export const fetchApi = async (path, options = {}) => {
  const url = getApiUrl(path);
  return fetch(url, options);
};
