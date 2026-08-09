//! The same API the Cloudflare Worker serves, as a small native binary for
//! the Docker image. Caddy proxies /api/* here; behavior mirrors
//! worker/handler.js so the two deployments answer identically.

use std::io::Read;

use tiny_http::{Header, Method, Request, Response, Server};

const MAX_BYTES: u64 = 4_000_000;

fn main() {
    let addr = std::env::var("DFANG_API_ADDR").unwrap_or_else(|_| "127.0.0.1:8081".into());
    let server = Server::http(&addr).unwrap_or_else(|e| panic!("failed to bind {addr}: {e}"));
    println!("dfang-api listening on {addr}");

    for mut request in server.incoming_requests() {
        let response = route(&mut request);
        let _ = request.respond(response);
    }
}

fn route(request: &mut Request) -> Response<std::io::Cursor<Vec<u8>>> {
    let transform: fn(&str) -> String = match request.url() {
        "/api/defang" => |s| dfang::defang(s),
        "/api/refang" => |s| rfang::refang(s),
        _ => return text(404, "Not found. The API is POST /api/defang and POST /api/refang.\n"),
    };

    match request.method() {
        Method::Post => {}
        Method::Options => return text(204, ""),
        _ => {
            let mut response = text(405, "Send a POST with the text to transform as the raw body.\n");
            response.add_header(header("allow", "POST"));
            return response;
        }
    }

    let mut body = Vec::new();
    if request.as_reader().take(MAX_BYTES + 1).read_to_end(&mut body).is_err() {
        return text(400, "Could not read the request body.\n");
    }
    if body.len() as u64 > MAX_BYTES {
        return text(413, &format!("Body too large; the limit is {MAX_BYTES} bytes.\n"));
    }

    return text(200, &transform(&String::from_utf8_lossy(&body)));
}

fn text(status: u16, body: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    let mut response = Response::from_string(body).with_status_code(status);
    response.add_header(header("content-type", "text/plain; charset=utf-8"));
    response.add_header(header("access-control-allow-origin", "*"));
    response.add_header(header("access-control-allow-methods", "POST, OPTIONS"));
    response.add_header(header("access-control-allow-headers", "content-type"));
    return response;
}

fn header(name: &str, value: &str) -> Header {
    return Header::from_bytes(name.as_bytes(), value.as_bytes()).unwrap();
}
