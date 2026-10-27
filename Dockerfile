# Kan's official web image plus its migration bundle in one container. The web
# image is distroless (no shell), so railway-start.cjs is a Node script: it
# applies the migrations (upstream's separate kan-migrate container), creates
# the admin on first boot, then hands over to Kan's own bootstrap.
FROM ghcr.io/kanbn/kan-migrate:0.6.0 AS migrate

FROM ghcr.io/kanbn/kan:0.6.0
COPY --from=migrate --chown=1000:1000 /db /db
COPY --chown=1000:1000 railway-start.cjs /db/railway-start.cjs
CMD ["/db/railway-start.cjs"]
