import { NextRequest, NextResponse } from 'next/server';

const PROMETHEUS_URL = 'https://demo.promlabs.com';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path') || '/api/v1/query';

  // Build the target URL
  const targetUrl = new URL(path, PROMETHEUS_URL);

  // Forward all query parameters except 'path'
  searchParams.forEach((value, key) => {
    if (key !== 'path') {
      targetUrl.searchParams.append(key, value);
    }
  });

  try {
    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Prometheus proxy error:', error);
    return NextResponse.json(
      { status: 'error', error: 'Failed to connect to Prometheus' },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path') || '/api/v1/query';

  const targetUrl = new URL(path, PROMETHEUS_URL);

  searchParams.forEach((value, key) => {
    if (key !== 'path') {
      targetUrl.searchParams.append(key, value);
    }
  });

  try {
    const body = await request.text();
    const response = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body,
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error('Prometheus proxy error:', error);
    return NextResponse.json(
      { status: 'error', error: 'Failed to connect to Prometheus' },
      { status: 502 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

