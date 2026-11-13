/**
 * Environnement de production.
 *
 * En prod (Vercel), les appels API passent par le rewrite /api de vercel.json.
 * Les WebSockets doivent pointer DIRECTEMENT vers le backend Render
 * car Vercel ne proxifie PAS les connexions WebSocket.
 *
 * ⚠️ REMPLACEZ l'URL ci-dessous par l'URL réelle de votre backend Render
 *    après le premier déploiement (ex : wss://voteuasz-backend-xxxx.onrender.com).
 */
export const environment = {
  production: true,
  /** URL de base pour les WebSockets STOMP — pointe directement vers Render (bypass Vercel). */
  wsUrl: 'wss://voteuasz-backend-r5cn.onrender.com',
  /** URL de base pour les appels HTTP API. Vide = relatif (passe par le rewrite de vercel.json). */
  apiUrl: ''
};

