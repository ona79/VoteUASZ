package sn.uasz.vote.security;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Utilitaire centralisé pour résoudre l'IP réelle du client derrière un proxy.
 *
 * <p>Avec {@code server.forward-headers-strategy=native} (activé en prod dans application-prod.yml),
 * Tomcat réécrit automatiquement {@link HttpServletRequest#getRemoteAddr()} à partir de l'en-tête
 * {@code X-Forwarded-For} du proxy de confiance (Render). Le client ne peut plus forger son IP
 * en injectant un en-tête {@code X-Forwarded-For} arbitraire.</p>
 *
 * <p>Cette classe remplace l'ancien parsing manuel de {@code X-Forwarded-For} qui était
 * vulnérable au spoofing via {@code split(",")[0]}.</p>
 */
public final class ClientIpResolver {

    private ClientIpResolver() {
        // Utilitaire statique — pas d'instantiation
    }

    /**
     * Retourne l'IP du client résolue par le conteneur Servlet.
     *
     * <p>En prod (native forward-headers-strategy active), {@code request.getRemoteAddr()}
     * contient directement l'IP réelle fournie par Render, non falsifiable par le client.
     * En dev/test (H2, sans proxy), retourne l'IP directe de la connexion.</p>
     *
     * @param request la requête HTTP courante
     * @return l'adresse IP du client, ou {@code "unknown"} si indisponible
     */
    public static String resolve(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        return (remoteAddr != null && !remoteAddr.isBlank()) ? remoteAddr : "unknown";
    }
}

