/**
 * API Proxy Helper
 * Automatically redirects relative /api/ calls to the backend on port 3000.
 * This allows the static dashboard (port 5100) to communicate with the backend.
 */
(function() {
    const BACKEND_URL = 'http://127.0.0.1:3000';
    const originalFetch = window.fetch;

    window.fetch = function(url, options) {
        let finalUrl = url;
        if (typeof url === 'string' && url.startsWith('/api/')) {
            finalUrl = BACKEND_URL + url;
            
            // Ensure CORS headers are handled if needed (though browser handles most)
            if (!options) options = {};
            // if (!options.mode) options.mode = 'cors';
        }
        return originalFetch(finalUrl, options);
    };

    console.log('--- API Proxy Active: Redirecting /api/* to ' + BACKEND_URL + ' ---');
})();
