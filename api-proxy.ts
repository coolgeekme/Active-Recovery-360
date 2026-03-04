import http from 'http';
import httpProxy from 'http-proxy';

const proxy = httpProxy.createProxyServer({});

const server = http.createServer((req, res) => {
  // Route /api and /health requests to backend (8002)
  // Route everything else to frontend (3000)
  const target = (req.url?.startsWith('/api') || req.url?.startsWith('/health'))
    ? 'http://localhost:8002' 
    : 'http://localhost:3000';
  
  proxy.web(req, res, { target }, (err) => {
    console.error('Proxy error:', err);
    res.writeHead(502);
    res.end('Bad Gateway');
  });
});

// Handle WebSocket connections for Vite HMR
server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head, { target: 'http://localhost:3000' });
});

const PORT = 8001;
server.listen(PORT, () => {
  console.log('API proxy running on port 8001');
  console.log('  /api/* -> localhost:8002 (backend)');
  console.log('  /*     -> localhost:3000 (frontend)');
});
