FROM rust:1-alpine AS build
RUN apk add --no-cache musl-dev && rustup target add wasm32-unknown-unknown
WORKDIR /src
COPY wasm ./wasm
COPY api ./api
RUN cargo build --release --target wasm32-unknown-unknown --manifest-path wasm/Cargo.toml
RUN cargo build --release --manifest-path api/Cargo.toml

FROM caddy:2-alpine
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY docker/entrypoint.sh /entrypoint.sh
COPY site /srv
COPY --from=build /src/wasm/target/wasm32-unknown-unknown/release/dfang_wasm.wasm /srv/dfang_wasm.wasm
COPY --from=build /src/api/target/release/dfang-api /usr/local/bin/dfang-api
EXPOSE 8080
ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
