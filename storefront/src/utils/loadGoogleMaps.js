let loadPromise = null;

export const loadGoogleMaps = () => {
  if (window.google?.maps?.places) {
    return Promise.resolve(window.google.maps);
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    window.__onGoogleMapsLoaded = () => resolve(window.google.maps);

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async&callback=__onGoogleMapsLoaded`;
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });

  return loadPromise;
};
