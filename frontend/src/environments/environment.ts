/**
 * Environnement de développement.
 *
 * En dev, le proxy Angular (proxy.conf.json) redirige /api vers http://localhost:8080.
 * Les WebSockets passent par window.location.host (le proxy Angular supporte les WS).
 */
export const environment = {
  production: false,
  /** URL de base pour les WebSockets STOMP. Vide = utilise window.location.host en dev. */
  wsUrl: '',
  /** URL de base pour les appels HTTP API. Vide = relatif (passe par le proxy Angular en dev). */
  apiUrl: ''
};

