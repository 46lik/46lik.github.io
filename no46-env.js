/**
 * NO.46 — Ortam yapılandırması (API base, token, fetch sarmalayıcı)
 * Bu dosya TÜM HTML sayfalarında (index.html, login.html, register.html, admin.html)
 * diğer scriptlerden ÖNCE yüklenmelidir. kurbağa.html HARİÇ.
 */
(function () {
    'use strict';

    /* ---------- Ortam tespiti ---------- */
    const hostname = location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    const isGithubPages = hostname.endsWith('.github.io');
    const isCpanel = hostname.includes('perihanmustafayeva.com') && !isGithubPages;

    let API_BASE = '';

    if (isLocalhost) {
        // Lokalde router.php /api/* ve /health'i karşılar
        API_BASE = '';
    } else if (isGithubPages) {
        // GitHub Pages → cPanel API (cross-origin, Bearer token)
        API_BASE = 'https://api.perihanmustafayeva.com';
    } else if (isCpanel) {
        // cPanel ana domain → kendi API'si (same-origin, çerez)
        API_BASE = '';
    } else {
        // Bilinmeyen — güvenlik: boş bırak, mutlak URL kullanma
        API_BASE = '';
    }

    /* ---------- Token yönetimi (Bearer, cross-origin için) ---------- */
    const TOKEN_KEY = 'no46_token';

    function getToken() {
        try {
            return localStorage.getItem(TOKEN_KEY) || '';
        } catch (_) {
            return '';
        }
    }

    function setToken(token) {
        try {
            if (token) {
                localStorage.setItem(TOKEN_KEY, token);
            } else {
                localStorage.removeItem(TOKEN_KEY);
            }
        } catch (_) {
            // private mode vb.
        }
    }

    function clearToken() {
        setToken('');
    }

    /* ---------- Fetch sarmalayıcı ---------- */
    // Sadece "/api/" ile başlayan YOL isteklerini yakalar.
    // Mutlak URL (http://..., https://...) verildiyse dokunmaz.
    const originalFetch = window.fetch.bind(window);

    window.fetch = function (input, init) {
        let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input?.url ?? '');
        const isApiPath = url.startsWith('/api/') || url === '/api' || url === '/health';

        if (!isApiPath) {
            return originalFetch(input, init);
        }

        // API base'i ekle
        const fullUrl = API_BASE + url;

        // Seçenekleri kopyala
        const options = init ? { ...init } : {};
        options.credentials = 'include'; // çerezler (same-origin)

        // Bearer token ekle (cross-origin için)
        const token = getToken();
        if (token) {
            options.headers = options.headers ? { ...options.headers } : {};
            if (!options.headers['Authorization']) {
                options.headers['Authorization'] = 'Bearer ' + token;
            }
        }

        // CSRF token (cookie tabanlı oturumlarda)
        try {
            const csrf = document.cookie.split('; ').find(r => r.startsWith('no46_csrf='));
            if (csrf) {
                options.headers = options.headers ? { ...options.headers } : {};
                options.headers['x-csrf-token'] = csrf.split('=')[1];
            }
        } catch (_) {}

        return originalFetch(fullUrl, options);
    };

    /* ---------- Global API nesnesi ---------- */
    window.NO46_API = {
        base: API_BASE,
        getToken,
        setToken,
        clearToken,
        isLocalhost,
        isGithubPages,
        isCpanel,
    };

    // Login/register cevabından token'ı alıp kaydet
    window.NO46_API.handleAuthResponse = function (data) {
        if (data && data.token) {
            setToken(data.token);
        }
        return data;
    };

    // Çıkışta token temizle
    window.NO46_API.logout = function () {
        clearToken();
    };

    // Geliştirme konsolunda görünsün
    console.log('[NO46] env:', { API_BASE, isLocalhost, isGithubPages, isCpanel });
})();