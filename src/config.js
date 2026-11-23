// Firebase web app configuration.
//
// The real values live in `.env` (see `.env.example`) and are supplied by Agus
// from his own Firebase project. Until then every value is the placeholder
// below, and the app runs in transparent demo mode (see src/ai.js).
// No Firebase project is created from this code.

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    'YOUR_PROJECT_ID.firebasestorage.app',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_SENDER_ID',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'YOUR_APP_ID',
};

export function isPlaceholderConfig() {
  const { apiKey, projectId, appId } = firebaseConfig;
  return (
    !apiKey ||
    apiKey === 'YOUR_API_KEY' ||
    !projectId ||
    projectId === 'YOUR_PROJECT_ID' ||
    !appId ||
    appId === 'YOUR_APP_ID'
  );
}

// App Check: reCAPTCHA v3 in production, debug provider on localhost.
// Debug tokens are accepted for hackathon submissions (see README).
export const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';
export const appCheckDebug = import.meta.env.VITE_APPCHECK_DEBUG === 'true';
