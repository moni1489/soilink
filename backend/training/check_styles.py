import urllib.request, json, subprocess, time, sys

proc = subprocess.Popen([r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe', '--headless', '--window-size=1920,1080', '--remote-debugging-port=9222', 'https://backend-mellowed-moon-8604.fly.dev/'])
time.sleep(4)

try:
    tabs = json.loads(urllib.request.urlopen('http://localhost:9222/json').read())
    page_tab = [t for t in tabs if t.get('type') == 'page'][0]
    import socket

    # Connect to WebSocket
    ws_url = page_tab['webSocketDebuggerUrl']
    # Simple HTTP Upgrade to websocket
    import urllib.parse
    parsed = urllib.parse.urlparse(ws_url)
    s = socket.create_connection((parsed.hostname, parsed.port))
    
    # WebSocket handshake
    key = "dGhlIHNhbXBsZSBub25jZQ=="
    req = (
        f"GET {parsed.path} HTTP/1.1\r\n"
        f"Host: {parsed.netloc}\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {key}\r\n"
        "Sec-WebSocket-Version: 13\r\n\r\n"
    )
    s.sendall(req.encode())
    resp = s.recv(4096).decode()
    if "101" not in resp:
        print("Handshake failed:", resp)
        sys.exit(1)

    def send_cmd(cmd_id, method, params=None):
        msg = json.dumps({"id": cmd_id, "method": method, "params": params or {}})
        payload = msg.encode('utf-8')
        length = len(payload)
        frame = bytearray([0x81]) # FIN + text
        if length <= 125:
            frame.append(0x80 | length) # masked
        elif length <= 65535:
            frame.append(0x80 | 126)
            frame.extend(length.to_bytes(2, 'big'))
        else:
            frame.append(0x80 | 127)
            frame.extend(length.to_bytes(8, 'big'))
        mask = b'\x12\x34\x56\x78'
        frame.extend(mask)
        masked_payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
        frame.extend(masked_payload)
        s.sendall(frame)

    def read_resp():
        raw = s.recv(65536)
        # unmask / parse frame
        if not raw or len(raw) < 2: return None
        length = raw[1] & 0x7f
        offset = 2
        if length == 126:
            offset = 4
        elif length == 127:
            offset = 10
        data = raw[offset:]
        try:
            return json.loads(data.decode('utf-8', errors='ignore'))
        except:
            return None

    # Evaluate JS
    js_code = """
    (() => {
        const all = document.querySelectorAll('*');
        const matches = [];
        for (const el of all) {
            const r = el.getBoundingClientRect();
            if (r.width > 100 && r.height > 2 && r.height < 60 && r.left > 1200) {
                const comp = window.getComputedStyle(el);
                matches.push({
                    tag: el.tagName,
                    class: el.className,
                    rect: { top: r.top, left: r.left, width: r.width, height: r.height },
                    bg: comp.backgroundColor,
                    backgroundImage: comp.backgroundImage.slice(0, 50),
                    text: el.innerText ? el.innerText.slice(0, 50).replace(/\\n/g, ' ') : ''
                });
            }
        }
        return matches;
    })()
    """
    send_cmd(1, "Runtime.evaluate", {"expression": js_code, "returnByValue": True})
    for _ in range(5):
        r = read_resp()
        if r and r.get('id') == 1:
            print("EVAL RESULT:")
            print(json.dumps(r.get('result', {}).get('result', {}).get('value', {}), indent=2))
            break
        time.sleep(0.5)

finally:
    proc.kill()
