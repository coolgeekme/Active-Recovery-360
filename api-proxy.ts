import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

// Proxy all requests to port 3000
app.use('/', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
}));

const port = 8001;
app.listen(port, '0.0.0.0', () => {
  console.log(`API proxy running on port ${port}, forwarding to 3000`);
});
