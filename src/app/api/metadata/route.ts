import { NextResponse } from 'next/server';

function decodeHTMLEntities(text: string) {
  return text
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
  }

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    // Google's Favicon service is extremely reliable and fast for bypassing raw HTML scraping issues
    const icon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

    const res = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
      },
      signal: AbortSignal.timeout(5000)
    });
    
    const html = await res.text();

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    let title = titleMatch ? titleMatch[1].trim() : url;
    
    // Decode things like &apos;
    title = decodeHTMLEntities(title);

    return NextResponse.json({ 
      title, 
      icon, 
      domain 
    });
  } catch (error) {
    let fallbackDomain = url;
    try { fallbackDomain = new URL(url).hostname; } catch(e) {}
    
    return NextResponse.json({ 
      title: url, 
      icon: `https://www.google.com/s2/favicons?domain=${fallbackDomain}&sz=64`, 
      domain: fallbackDomain 
    });
  }
}
