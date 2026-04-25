# MyBench OpenClaw Workspace

This repo is laid out as an OpenClaw workspace, with the actual skill living at [skills/mybench/SKILL.md](./skills/mybench/SKILL.md). The setup is now Docker-first all the way through: the OpenClaw gateway runs in Docker, and agent tool execution runs in separate Docker sandbox containers.

## What changed

- Converted the prototype into a real OpenClaw workspace skill.
- Added a Docker Compose setup that builds a gateway image with Docker CLI support and a separate Node-based sandbox image.
- Hardened the benchmark runner so it handles parsing, CLI args, missing env, API calls, and judge bias more cleanly.
- Removed the external Node SDK dependency so the benchmark can run inside the sandbox image without an install step.

## Repo layout

```text
.
|- docker-compose.yml
|- .env.example
|- docker/
|  |- gateway.Dockerfile
|  |- sandbox.Dockerfile
|  \- start-openclaw.sh
|- skills/
|  \- mybench/
|     |- SKILL.md
|     \- scripts/
|        \- run-mybench.mjs
|- anthropic-ai-sdk-0.39.0.tgz
```

## Quick start

1. Create `.env` from `.env.example`.
   The default local setup uses `MYBENCH_PROVIDER=local` with `HuggingFaceTB/SmolLM2-135M-Instruct` and `MYBENCH_LOCAL_FAST=1`, so API keys are optional unless you want a hosted provider fallback.
2. Build the gateway image and the sandbox image:

   ```powershell
   docker compose build
   ```

3. Start OpenClaw:

   ```powershell
   docker compose up -d openclaw-gateway
   ```

4. Open `http://127.0.0.1:18789/`.
5. Finish onboarding if needed:

   ```powershell
   docker compose run --rm --no-deps --entrypoint node openclaw-gateway dist/index.js onboard --mode local --no-install-daemon
   ```

Because this repo is mounted as the OpenClaw workspace, the skill will be available from `workspace/skills/mybench`.

## Sandboxing model

- `openclaw-gateway` is containerized.
- Agent tools run in sibling Docker sandbox containers, not on the host.
- Sandbox mode is set to `all`, so every session is sandboxed.
- `workspaceAccess` is set to `none`, which avoids Docker-out-of-Docker host-path mapping problems and keeps tool execution away from the host workspace.
- The sandbox image is a small Node image so the MyBench skill can run there directly.

This is the practical "everything in Docker" version OpenClaw supports: the gateway is in one container, and each agent session runs tools in separate sandbox containers.

## Useful commands

Check gateway health:

```powershell
docker compose run --rm -T openclaw-cli gateway probe
```

Print the dashboard URL again:

```powershell
docker compose run --rm -T openclaw-cli dashboard --no-open
```

Inspect sandbox containers:

```powershell
docker ps --filter "ancestor=mybench-openclaw-sandbox:local"
```

## Notes

- The gateway image is built from `ghcr.io/openclaw/openclaw:2026.4.19-beta.2-slim`, which was the latest published GHCR image on April 24, 2026.
- The Docker setup defaults `OPENCLAW_DISABLE_BONJOUR=1` to avoid the recent headless Docker CPU issue reported against OpenClaw v2026.4.8 and later.
- The gateway container mounts `/var/run/docker.sock` so it can create sibling sandbox containers. That is required for Docker-backed OpenClaw sandboxing.
- The skill runner supports a local Hugging Face model path as well as optional `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` hosted-provider fallbacks.
- This setup assumes Docker Desktop is running Linux containers.
