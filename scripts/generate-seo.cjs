const fs = require('node:fs');
const path = require('node:path');

const SITE = 'https://www.africlaymarket.com';
const DIST = path.resolve(__dirname, '..', 'dist');
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const plainText = value => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const summary = (value, length = 165) => {
  const text = plainText(value);
  return text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text;
};
const safeSlug = value => typeof value === 'string' && SAFE_SLUG.test(value);
const publicPath = value => typeof value === 'string' && /^\/(?:products|services|policies|product\/[a-z0-9-]+|store\/[a-z0-9-]+|products\/[a-z0-9-]+|services\/[a-z0-9-]+)?$/.test(value);
const publicImageRecord = record => record?.images?.find(image => image?.is_primary && /^https:\/\//i.test(image.image))
  ?? record?.images?.find(image => /^https:\/\//i.test(image?.image));
const publicImage = record => {
  const value = publicImageRecord(record)?.image ?? record?.logo ?? record?.banner;
  return typeof value === 'string' && /^https:\/\//i.test(value) ? value : undefined;
};
const jsonLd = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

function renderHtml(shell, page) {
  const title = `${page.title} | AfriClay Market`;
  const url = `${SITE}${page.path}`;
  const description = summary(page.description || 'Discover products and services from sellers on AfriClay Market.');
  const image = page.image && /^https:\/\//i.test(page.image) ? page.image : undefined;
  const meta = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta property="og:site_name" content="AfriClay Market" />`,
    `<meta property="og:type" content="${page.type === 'product' ? 'product' : 'website'}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    ...(image ? [`<meta property="og:image" content="${escapeHtml(image)}" />`, `<meta name="twitter:image" content="${escapeHtml(image)}" />`] : []),
    ...(page.schema ? [`<script type="application/ld+json" data-africlay-seo="true">${jsonLd(page.schema)}</script>`] : []),
  ].join('\n    ');
  const linkGroups = (page.linkGroups ?? []).map(group => {
    const links = group.links.filter(link => publicPath(link.path) && link.path !== page.path).map(link =>
      `<li><a href="${escapeHtml(link.path)}" style="color:#185f18">${escapeHtml(link.label)}</a></li>`).join('');
    return links ? `<section><h2>${escapeHtml(group.title)}</h2><ul>${links}</ul></section>` : '';
  }).join('');
  const body = `<main style="box-sizing:border-box;overflow:auto;max-width:900px;width:100%;height:100%;padding:32px;margin:0 auto;font-family:system-ui,sans-serif;color:#0d0d0d;background:#f8f5ef"><a href="/" style="color:#185f18">AfriClay Market</a><h1>${escapeHtml(page.title)}</h1>${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(page.imageAlt || page.title)}" style="max-width:320px;max-height:280px;object-fit:contain" />` : ''}<p>${escapeHtml(description)}</p>${page.price ? `<p>${escapeHtml(page.price)}</p>` : ''}${linkGroups}</main>`;
  return shell.replace(/<title>[^<]*<\/title>/, meta).replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}

function collectPages({ products = [], stores = [], services = [], categories = [] }) {
  const activeStores = stores.filter(store => safeSlug(store.slug) && store.status === 'active');
  const publishedProducts = products.filter(product => safeSlug(product.slug) && product.status === 'published');
  const publishedServices = services.filter(service => safeSlug(service.slug) && service.status === 'published');
  const validCategories = categories.filter(category => safeSlug(category.slug));
  const categoryById = new Map(validCategories.map(category => [category.id, category]));
  const storeById = new Map(activeStores.map(store => [store.id, store]));
  const categoryContains = (categoryId, productCategoryId) => {
    const seen = new Set();
    let current = productCategoryId;
    while (current && !seen.has(current)) {
      if (current === categoryId) return true;
      seen.add(current);
      current = categoryById.get(current)?.parent;
    }
    return false;
  };
  const productLink = product => ({ path: `/product/${product.slug}`, label: product.name });
  const categoryLink = category => ({ path: `/products/${category.slug}`, label: category.name });
  const storeLink = store => ({ path: `/store/${store.slug}`, label: store.name });
  const serviceLink = service => ({ path: `/services/${service.slug}`, label: service.name });
  const homeLinks = [
    { title: 'Browse categories', links: validCategories.filter(category => !category.parent).slice(0, 12).map(categoryLink) },
    { title: 'Explore products', links: [{ path: '/products', label: 'All products' }, ...publishedProducts.slice(0, 12).map(productLink)] },
    { title: 'Explore services', links: [{ path: '/services', label: 'All services' }, ...publishedServices.slice(0, 4).map(serviceLink)] },
    { title: 'Seller stores', links: activeStores.slice(0, 8).map(storeLink) },
  ];
  const pages = [
    { path: '/', title: 'Shop products and services in Kenya', description: 'Browse products, services and seller stores on AfriClay Market.', linkGroups: homeLinks, schema: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'AfriClay Market', url: SITE } },
    { path: '/products', title: 'Browse products', description: 'Explore products offered by sellers on AfriClay Market.', linkGroups: [
      { title: 'Categories', links: validCategories.filter(category => !category.parent).map(categoryLink) },
      { title: 'Products', links: publishedProducts.map(productLink) },
    ] },
    { path: '/services', title: 'Browse services', description: 'Explore services offered by sellers on AfriClay Market.', linkGroups: [{ title: 'Services', links: publishedServices.map(serviceLink) }] },
    { path: '/policies', title: 'Terms and policies', description: 'Read AfriClay Market terms and marketplace policies.' },
  ];
  for (const category of validCategories) {
    const parent = categoryById.get(category.parent);
    pages.push({ path: `/products/${category.slug}`, title: `${category.name} products`, description: `Browse ${category.name} products on AfriClay Market.`, linkGroups: [
      { title: 'Browse', links: [{ path: '/products', label: 'All products' }, ...(parent ? [categoryLink(parent)] : [])] },
      { title: 'Subcategories', links: validCategories.filter(item => item.parent === category.id).map(categoryLink) },
      { title: `${category.name} products`, links: publishedProducts.filter(product => categoryContains(category.id, product.category)).map(productLink) },
    ] });
  }
  for (const product of publishedProducts) {
    const url = `${SITE}/product/${product.slug}`;
    const image = publicImage(product);
    const availableOptions = (product.price_options ?? []).filter(option => option.active && option.stock_quantity > 0);
    const price = availableOptions.length ? Math.min(...availableOptions.map(option => Number(option.price))) : Number(product.price);
    const category = categoryById.get(product.category);
    const store = storeById.get(product.store);
    pages.push({ path: `/product/${product.slug}`, title: product.name, description: product.description || `${product.name} on AfriClay Market.`, image,
      imageAlt: plainText(publicImageRecord(product)?.alt_text) || product.name, type: 'product', updated: product.updated_at,
      linkGroups: [
        { title: 'Browse', links: [{ path: '/products', label: 'All products' }, ...(category ? [categoryLink(category)] : []), ...(store ? [storeLink(store)] : [])] },
        { title: 'Related products', links: category ? publishedProducts.filter(item => item.slug !== product.slug && item.category === product.category).slice(0, 6).map(productLink) : [] },
      ],
      price: Number.isFinite(price) ? `KSh ${price.toLocaleString('en-KE')}` : undefined,
      schema: { '@context': 'https://schema.org', '@type': 'Product', name: product.name, description: summary(product.description || product.name, 500), url,
        ...(image ? { image } : {}), ...(product.sku ? { sku: product.sku } : {}),
        ...(Number(product.review_count) > 0 && Number(product.average_rating) >= 1 && Number(product.average_rating) <= 5
          ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: Number(product.average_rating), reviewCount: Number(product.review_count) } } : {}),
        ...(Number.isFinite(price) && price > 0 ? { offers: { '@type': 'Offer', url, priceCurrency: product.currency || 'KES', price,
          availability: availableOptions.length || product.stock_quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' } } : {}) },
    });
  }
  for (const store of activeStores) {
    pages.push({ path: `/store/${store.slug}`, title: store.name, description: store.description || `Browse ${store.name} on AfriClay Market.`, image: publicImage(store), imageAlt: `${store.name} store image`, updated: store.updated_at,
      linkGroups: [
        { title: 'Products from this store', links: publishedProducts.filter(product => product.store === store.id).map(productLink) },
        { title: 'Services from this store', links: publishedServices.filter(service => service.store === store.id).map(serviceLink) },
        { title: 'Browse', links: [{ path: '/products', label: 'All products' }] },
      ] });
  }
  for (const service of publishedServices) {
    const store = storeById.get(service.store);
    pages.push({ path: `/services/${service.slug}`, title: service.name, description: service.description || `${service.name} on AfriClay Market.`, image: publicImage(service), imageAlt: plainText(publicImageRecord(service)?.alt_text) || service.name, updated: service.updated_at,
      linkGroups: [{ title: 'Browse', links: [{ path: '/services', label: 'All services' }, ...(store ? [storeLink(store)] : [])] }],
      schema: { '@context': 'https://schema.org', '@type': 'Service', name: service.name, description: summary(service.description || service.name, 500), url: `${SITE}/services/${service.slug}` },
    });
  }
  return pages;
}

function writePages(shell, pages, directory = DIST) {
  for (const page of pages) {
    const target = page.path === '/' ? 'index.html' : `${page.path.slice(1)}.html`;
    const file = path.join(directory, target);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, renderHtml(shell, page));
  }
  fs.writeFileSync(path.join(directory, 'home.html'), renderHtml(shell, pages[0]));
  const urls = pages.map(page => `<url><loc>${escapeHtml(`${SITE}${page.path}`)}</loc>${page.updated && !Number.isNaN(Date.parse(page.updated)) ? `<lastmod>${new Date(page.updated).toISOString().slice(0, 10)}</lastmod>` : ''}</url>`).join('');
  fs.writeFileSync(path.join(directory, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  fs.writeFileSync(path.join(directory, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
}

async function fetchAll(api, endpoint) {
  const results = [];
  let next = new URL(`${api}/${endpoint}?limit=100`);
  const seen = new Set();
  while (next && results.length < 10000) {
    if (seen.has(next.href)) throw new Error(`Repeated pagination URL for ${endpoint}`);
    seen.add(next.href);
    const response = await fetch(next, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`${endpoint} returned HTTP ${response.status}`);
    const body = await response.json();
    if (Array.isArray(body)) return body;
    if (!Array.isArray(body.results)) throw new Error(`${endpoint} returned an unexpected response`);
    results.push(...body.results);
    next = body.next ? new URL(body.next, next) : null;
  }
  return results;
}

async function main() {
  const shell = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  if (!shell.includes('<div id="root"></div>')) throw new Error('Expo HTML shell changed; SEO pages were not generated.');
  const api = (process.env.SEO_API_URL || process.env.EXPO_PUBLIC_API_URL || 'https://africlay-server-main-v4.onrender.com/api').replace(/\/+$/, '');
  const endpoints = ['products/', 'stores/', 'services/', 'products/categories/'];
  const [products, stores, services, categories] = await Promise.all(endpoints.map(endpoint => fetchAll(api, endpoint)));
  const data = { products, stores, services, categories };
  const pages = collectPages(data);
  writePages(shell, pages);
  console.log(`SEO: generated ${pages.length} public pages, sitemap.xml and robots.txt.`);
}

if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { collectPages, renderHtml, writePages };
