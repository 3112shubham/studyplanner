// API utility to handle basePath correctly
export const getApiUrl = (path) => {
  // Only works in browser environment
  if (typeof window === 'undefined') {
    return path;
  }

  // Check if we're in a subdirectory deployment
  const pathname = window.location.pathname;
  
  // If the current URL contains /gate in the path, we're in production mode
  // Add /gate prefix to API calls if not already present
  if (pathname.includes('/gate') && !path.startsWith('/gate')) {
    return `/gate${path}`;
  }
  
  return path;
};

export const fetchApi = async (path, options = {}) => {
  const url = getApiUrl(path);
  return fetch(url, options);
};
