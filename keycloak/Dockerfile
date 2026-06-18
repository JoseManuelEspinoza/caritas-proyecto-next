# ─── Keycloak para Koyeb (plan free, 512 MB) ────────────────────────────────
# Build context (en Koyeb = "Work directory"): el directorio  keycloak/
#
# Por qué imagen optimizada:
#   El "build" pesado de Keycloak (indexar providers, fijar el vendor de BD)
#   ocurre AQUÍ, durante el build de Koyeb donde hay CPU/RAM de sobra. En runtime
#   usamos `start --optimized`, así arranca ligero y cabe en los 512 MB del free.

# 1) Etapa de build: precompila Keycloak para PostgreSQL
FROM quay.io/keycloak/keycloak:26.0 AS builder
ENV KC_DB=postgres
ENV KC_HEALTH_ENABLED=true
RUN /opt/keycloak/bin/kc.sh build

# 2) Imagen final
FROM quay.io/keycloak/keycloak:26.0
COPY --from=builder /opt/keycloak/ /opt/keycloak/

# Realm de Cáritas (cliente caritas-app, roles). Se importa en el PRIMER arranque.
COPY realm-caritas.json /opt/keycloak/data/import/realm-caritas.json
# Tema de login con la marca Cáritas (el usuario nunca ve la UI de Keycloak).
COPY themes/ /opt/keycloak/themes/

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
# --optimized: usa el build de la etapa anterior, no reconstruye en cada arranque.
# --import-realm: importa el realm si todavía no existe en la BD.
CMD ["start", "--optimized", "--import-realm"]
