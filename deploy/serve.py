#!/usr/bin/env python3
"""Serves the built web app on the Hetzner box, behind HAProxy.

    python3 serve.py --port 3003 --dir /srv/sticker-board/site

Any path that isn't a file gets index.html, so app routes such as /g/<gift claim token> load the app. A missing
file under /assets/ stays a 404. index.html is never cached, because LINE's in-app browser keeps what it fetched
and its cache can't be cleared: a cached page would outlive every deploy. Vite gives the files under /assets/
content hashes, so they're cached for a year.
"""

import argparse
import os
import re
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"  # HAProxy won't gzip an HTTP/1.0 response
    code_sent = 0
    hashed = False

    def translate_path(self, path):
        full = super().translate_path(path)
        if urlsplit(path).path.startswith("/assets/"):
            self.hashed = os.path.isfile(full)
            return full  # anything else under /assets/ is a 404
        if os.path.isfile(full) or os.path.isfile(os.path.join(full, "index.html")):
            return full
        return os.path.join(self.directory, "index.html")

    def list_directory(self, path):
        self.send_error(404)  # never list a folder

    def send_response(self, code, message=None):
        self.code_sent = code
        super().send_response(code, message)

    def end_headers(self):
        cache = self.hashed and self.code_sent in (200, 304)
        self.send_header("Cache-Control", "public, max-age=31536000, immutable" if cache else "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Gift claim tokens travel in the path, so they never reach the log.
        line = re.sub(r"/g/[^\s\"?]+", "/g/<gift-claim-token>", fmt % args)
        sys.stderr.write(f"{self.address_string()} {line}\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=3003)
    parser.add_argument("--dir", default="site")
    args = parser.parse_args()
    handler = partial(Handler, directory=os.path.abspath(args.dir))
    ThreadingHTTPServer(("127.0.0.1", args.port), handler).serve_forever()


if __name__ == "__main__":
    main()
