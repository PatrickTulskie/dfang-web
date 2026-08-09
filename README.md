# dfang-web

The web frontend for [dfang](https://github.com/PatrickTulskie/dfang): defang and
refang IOCs (URLs, emails, IPs) entirely in the browser. The Rust `dfang` and
`rfang` crates are compiled to WebAssembly, so nothing you paste leaves your
machine.

## Layout

- `wasm/` — a thin `cdylib` crate exporting `defang`/`refang` over a C ABI,
  depending on the dfang repo as a git dependency. No wasm-bindgen; the JS glue
  in `site/main.js` handles strings by hand.
- `site/` — the static site (two pages, no framework, no dependencies).
- `worker/` — the Worker script behind the API routes, running the same wasm.
- `build.sh` — builds the wasm and assembles everything into `dist/`.

## API

POST plain text, get it back transformed as `text/plain`. Multi-line bodies
work, CORS is open, bodies are capped at 1,000,000 characters, nothing is
stored.

```sh
$ curl --data-binary 'http://evil.example.com' https://dfang.sh/api/defang
hxxp[://]evil[.]example[.]com

$ curl --data-binary 'hxxp[://]evil[.]example[.]com' https://dfang.sh/api/refang
http://evil.example.com

$ curl --data-binary @iocs.txt https://dfang.sh/api/defang
```

## Building locally

Requires a Rust toolchain (`rustup`).

```sh
./build.sh
python3 -m http.server -d dist 8000
```

Then open http://localhost:8000.

## Testing

`test/abi.test.mjs` drives the built wasm through the same glue logic the
browser uses. Build first, then:

```sh
node --test test/abi.test.mjs
```

CI runs the same build and test on every push and pull request.

## Deploying (Cloudflare Workers)

The site deploys as a Cloudflare Worker serving static assets; `wrangler.jsonc`
points it at `dist/`. Connect the repo in the Cloudflare dashboard with:

- **Build command:** `./build.sh`
- **Deploy command:** `npx wrangler deploy`

The build image ships with `rustup`, so no other configuration is needed.
Pushes to `main` build and deploy automatically.
