import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const imageUrl = request.nextUrl.searchParams.get('url');

    if (!imageUrl) {
      return new NextResponse('Missing URL parameter', { status: 400 });
    }

    // Only allow RecoverShop images for security
    if (!imageUrl.includes('recovershop.co.kr') && !imageUrl.includes('coupangcdn.com')) {
      return new NextResponse('Invalid image source', { status: 403 });
    }

    // Fetch the image from the external URL
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Referer': 'http://recovershop.co.kr/'
      }
    });

    if (!imageResponse.ok) {
      console.error(`Failed to fetch image: ${imageResponse.status}`);
      // Return a placeholder image on error
      return new NextResponse(null, {
        status: 404,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache'
        }
      });
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await imageResponse.arrayBuffer();

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Image proxy error:', error);

    // Return a placeholder SVG on error
    const placeholderSVG = `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="400" fill="#f0f0f0"/>
        <text x="200" y="200" text-anchor="middle" font-family="Arial" font-size="20" fill="#999">
          이미지 로드 실패
        </text>
      </svg>
    `;

    return new NextResponse(placeholderSVG, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache'
      }
    });
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}