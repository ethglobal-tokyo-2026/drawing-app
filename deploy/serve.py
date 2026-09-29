#!/usr/bin/env python3
"""Serves the built web app on the box, behind HAProxy; sticker-board.service runs it.

Any path that isn't a file gets index.html, so app routes such as /g/<gift claim token> load the app; a missing file
under /assets/ stays a 404. index.html is never cached: LINE's in-app browser keeps what it fetched and its cache can't
be cleared, so a cached page would outlive every deploy. Vite names the files under /assets/ by content hash, so
they're cached for a year. A request for one byte range gets a 206: Safari plays no video without one.
"""

import argparse
import os
import re
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

# "bytes=a-b", "bytes=a-" or "bytes=-n". Any other Range, a multi-range one included, gets the whole file.
BYTE_RANGE = re.compile(r"bytes=(\d*)-(\d*)")


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"  # HAProxy won't gzip an HTTP/1.0 response
    code_sent = 0
    hashed = False
    range_left = None  # bytes of a 206 still to send

    def parse_request(self):
        # One handler serves every request on a kept-alive connection, so each request starts clean.
        self.hashed = False
        self.range_left = None
        return super().parse_request()

    def send_head(self):
        path = self.translate_path(self.path)
        match = BYTE_RANGE.fullmatch(self.headers.get("Range", "").strip())
        if not match or match.groups() == ("", "") or not os.path.isfile(path):
            return super().send_head()
        first, last = match.groups()
        if first and last and int(last) < int(first):
            return super().send_head()  # an invalid range is ignored
        f = open(path, "rb")
        try:
            stat = os.fstat(f.fileno())
            size = stat.st_size
            if first:
                start, end = int(first), min(int(last), size - 1) if last else size - 1
            else:
                start, end = max(size - int(last), 0), size - 1
            if start >= size:  # also "bytes=-0", and any range of an empty file
                f.close()
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{size}")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return None
            self.send_response(206)
            self.send_header("Content-Type", self.guess_type(path))
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.send_header("Content-Length", str(end - start + 1))
            self.send_header("Last-Modified", self.date_time_string(stat.st_mtime))
            self.send_header("Accept-Ranges", "bytes")
            self.end_headers()
            f.seek(start)
            self.range_left = end - start + 1
            return f
        except Exception:
            f.close()
            raise

    def copyfile(self, source, outputfile):
        if self.range_left is None:
            return super().copyfile(source, outputfile)
        while self.range_left > 0:
            chunk = source.read(min(self.range_left, 64 * 1024))
            if not chunk:
                break
            outputfile.write(chunk)
            self.range_left -= len(chunk)

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
        cache = self.hashed and self.code_sent in (200, 206, 304)
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
