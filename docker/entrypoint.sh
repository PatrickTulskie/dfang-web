#!/bin/sh
set -e
dfang-api &
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
