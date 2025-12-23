// Vercel Serverless Function - Prometheus Proxy
// Handles CORS by proxying requests to the Prometheus demo server
// Route: /api/prometheus?path=/api/v1/query_range&...

import type { VercelRequest, VercelResponse } from '@vercel/node';

const PROMETHEUS_URL = 'https://demo.promlabs.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Get the Prometheus path from query params
  const promPath = req.query.path as string || '';
  
  // Build query string (excluding our 'path' param)
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key !== 'path' && value) {
      queryParams.set(key, Array.isArray(value) ? value[0] : value);
    }
  }
  
  const queryString = queryParams.toString();
  const targetUrl = `${PROMETHEUS_URL}${promPath}${queryString ? '?' + queryString : ''}`;
  
  console.log('Proxying to:', targetUrl);
  
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PromQL-Playground/1.0',
      },
    });
    
    const data = await response.json();
    
    res.setHeader('Cache-Control', 'public, max-age=30');
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(502).json({ 
      status: 'error', 
      error: 'Failed to connect to Prometheus server',
      errorType: 'proxy_error',
    });
  }
}

