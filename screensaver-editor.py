#!/usr/bin/env python3
"""Tiny server for the screensaver art editor."""

import http.server
import os

PORT = 8099
FILE = os.path.expanduser('~/.config/omarchy/branding/screensaver.txt')
HTML = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'screensaver-editor.html')

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            with open(HTML, 'rb') as f:
                data = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(data)
        elif self.path == '/load':
            with open(FILE, 'rb') as f:
                data = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(data)
        else:
            self.send_error(404)

    def do_POST(self):
        if self.path == '/save':
            length = int(self.headers['Content-Length'])
            body = self.rfile.read(length).decode()
            with open(FILE, 'w') as f:
                f.write(body)
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'ok')
        else:
            self.send_error(404)

    def log_message(self, fmt, *args):
        pass  # quiet

if __name__ == '__main__':
    print(f'Screensaver editor: http://localhost:{PORT}')
    http.server.HTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
