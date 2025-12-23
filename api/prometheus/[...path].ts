// Vercel Serverless Function - Prometheus Proxy
// This handles CORS by proxying requests to the Prometheus demo server
// Deploy to Vercel and requests to /api/prometheus/* will be proxied

const PROMETHEUS_URL = 'https://demo.promlabs.com';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const url = new URL(request.url);
  
  // Extract the path after /api/prometheus/
  const pathMatch = url.pathname.match(/\/api\/prometheus\/(.*)/);
  const prometheusPath = pathMatch ? pathMatch[1] : '';
  
  // Build the target URL
  const targetUrl = `${PROMETHEUS_URL}/${prometheusPath}${url.search}`;
  
  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    const data = await response.text();
    
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        // Cache for 1 minute to reduce load
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        error: 'Failed to connect to Prometheus server',
        errorType: 'proxy_error',
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

