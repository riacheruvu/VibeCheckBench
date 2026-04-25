FROM node:24-bookworm-slim

RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ca-certificates curl git python3 python3-pip \
  && python3 -m pip install --no-cache-dir --break-system-packages torch transformers sentencepiece \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
