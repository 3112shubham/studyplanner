// API utility to handle basePath correctly
// Determines the correct API URL based on deployment environment

export const getApiUrl = (path) => {
  // Server-side: return path as-is
  if (typeof window === 'undefined') {
    return path;
  }

  // Client-side: check if we need to add basePath
  const currentPathname = window.location.pathname;
  
  // Check if we're in the /gate subdirectory
  const isInGateSubdirectory = currentPathname.includes('/gate');
  
  if (isInGateSubdirectory) {
    // Only add /gate if it's not already there
    if (!path.startsWith('/gate')) {
      const fullPath = `/gate${path}`;
      return fullPath;
    }
  }
  
  // For localhost or no basePath, use path as-is
  return path;
};

export const fetchApi = async (path, options = {}) => {
  const url = getApiUrl(path);
  return fetch(url, options);
};
