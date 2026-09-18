// Dependency-free extraction of brand identity from a product page.
//
// Deliberately reads the HTML HEAD rather than scraping <img> tags. Most modern product
// sites render their imagery in JavaScript or as CSS backgrounds, so a raw-HTML <img>
// sweep comes back empty on exactly the polished sites you most want to advertise.
// og:image is the one asset that is reliably present, correctly sized (1200x630), and
// chosen by the site owner as the representative image.

const pick = (html, re) => { const m = html.match(re); return m ? m[1].trim() : null; };

const meta = (html, prop) => {
  // property= and name=, attributes in either order, single or double quotes
  const esc = prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (
    pick(html, new RegExp(`<meta[^>]+(?:property|name)=["']${esc}["'][^>]*content=["']([^"']*)["']`, 'i')) ||
    pick(html, new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${esc}["']`, 'i'))
  );
};

const abs = (u, base) => { try { return new URL(u, base).href; } catch { return null; } };

const decode = (s) =>
  s == null ? null : s
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/\s+/g, ' ').trim();

export function extractBrand(html, url) {
  const strip = (s) => decode(s?.replace(/<[^>]*>/g, ' '));

  const name =
    decode(meta(html, 'og:site_name')) ||
    decode(meta(html, 'application-name')) ||
    new URL(url).hostname.replace(/^www\./, '').split('.')[0];

  const title = decode(meta(html, 'og:title')) || strip(pick(html, /<title[^>]*>([\s\S]*?)<\/title>/i));
  const description = decode(meta(html, 'og:description')) || decode(meta(html, 'description'));

  // hero image, in the order a site is most likely to have curated it
  const hero = [meta(html, 'og:image'), meta(html, 'og:image:secure_url'), meta(html, 'twitter:image')]
    .filter(Boolean).map((u) => abs(decode(u), url))[0] || null;

  // logo: explicit rel=icon variants, largest declared size first
  const icons = [...html.matchAll(/<link[^>]+rel=["']([^"']*icon[^"']*)["'][^>]*>/gi)]
    .map((m) => {
      const tag = m[0];
      const href = pick(tag, /href=["']([^"']+)["']/i);
      const sizes = pick(tag, /sizes=["'](\d+)/i);
      return href ? { href: abs(decode(href), url), size: sizes ? +sizes : 0, rel: m[1] } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.size - a.size);
  const logo = icons[0]?.href || abs('/favicon.ico', url);

  // any in-page imagery we CAN see (src, srcset, and CSS background-image)
  const seen = new Set();
  const images = [];
  const add = (u) => {
    const a = abs(decode(u), url);
    if (a && !seen.has(a) && /\.(png|jpe?g|webp|avif|svg)(\?|$)/i.test(a)) { seen.add(a); images.push(a); }
  };
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) add(m[1]);
  for (const m of html.matchAll(/srcset=["']([^"']+)["']/gi))
    m[1].split(',').forEach((part) => add(part.trim().split(/\s+/)[0]));
  for (const m of html.matchAll(/background-image:\s*url\((['"]?)([^'")]+)\1\)/gi)) add(m[2]);

  const themeColor = decode(meta(html, 'theme-color'));

  // headings carry the positioning the site itself chose to lead with
  const headings = [...html.matchAll(/<h([12])[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((m) => strip(m[2]))
    .filter((t) => t && t.length > 2 && t.length < 120);

  return {
    url, name, title, description, hero, logo, themeColor,
    images: images.slice(0, 40),
    headings: [...new Set(headings)].slice(0, 12),
    keywords: decode(meta(html, 'keywords'))?.split(',').map((k) => k.trim()).filter(Boolean).slice(0, 15) || [],
  };
}
