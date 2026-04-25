FROM ghcr.io/openclaw/openclaw:2026.4.19-beta.2-slim

USER root

RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends docker.io \
  && rm -rf /var/lib/apt/lists/*

COPY docker/start-openclaw.sh /usr/local/bin/start-openclaw.sh

RUN chmod 755 /usr/local/bin/start-openclaw.sh

ENTRYPOINT ["/usr/local/bin/start-openclaw.sh"]
