const { test } = require('node:test');
const assert = require('node:assert/strict');
const { collectPages, renderHtml } = require('./generate-seo.cjs');

test('only public, published catalog routes receive indexable pages', () => {
  const pages = collectPages({
    categories: [{ slug: 'food-and-pantry', name: 'Food & Pantry' }],
    products: [
      { slug: 'fresh-apples', name: 'Fresh Apples', status: 'published', price: '45.00', currency: 'KES', stock_quantity: 2, images: [] },
      { slug: 'seller-draft', name: 'Seller Draft', status: 'draft', price: '10.00', images: [] },
    ],
    stores: [{ slug: 'market-store', name: 'Market Store', status: 'active' }, { slug: 'closed-store', name: 'Closed Store', status: 'suspended' }],
    services: [{ slug: 'hair-styling', name: 'Hair Styling', status: 'published', images: [] }],
  });
  assert.deepEqual(pages.map(page => page.path), ['/', '/products', '/services', '/policies', '/products/food-and-pantry', '/product/fresh-apples', '/store/market-store', '/services/hair-styling']);
  assert.equal(pages.find(page => page.path === '/product/fresh-apples').schema.offers.availability, 'https://schema.org/InStock');
});

test('route HTML has canonical metadata and escapes untrusted catalog text', () => {
  const shell = '<html><head><title>AfriClay</title></head><body><div id="root"></div></body></html>';
  const html = renderHtml(shell, { path: '/product/safe-slug', title: '<img src=x onerror=alert(1)>', description: 'A <b>useful</b> item', image: 'https://example.com/photo.webp', schema: { '@context': 'https://schema.org', '@type': 'Product', name: '</script><script>alert(1)</script>' } });
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.africlaymarket\.com\/product\/safe-slug"/);
  assert.match(html, /<meta property="og:image" content="https:\/\/example\.com\/photo\.webp"/);
  assert.match(html, /A useful item/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.doesNotMatch(html, /<img src=x onerror=/);
});

test('homepage names AfriClay Market in its title and primary heading', () => {
  const shell = '<html><head><title>AfriClay</title></head><body><div id="root"></div></body></html>';
  const home = collectPages({})[0];
  const html = renderHtml(shell, home);
  assert.match(html, /<title>AfriClay Market \| Shop products and services in Kenya<\/title>/);
  assert.match(html, /<h1>AfriClay Market — Shop products and services in Kenya<\/h1>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.africlaymarket\.com\/"/);
});

test('out-of-stock product data is not represented as in stock', () => {
  const [,,,, product] = collectPages({ products: [{ slug: 'empty-item', name: 'Empty Item', status: 'published', price: '25.00', currency: 'KES', stock_quantity: 0, images: [] }] });
  assert.equal(product.schema.offers.availability, 'https://schema.org/OutOfStock');
});

test('public pages link to real categories, products, stores and services without exposing drafts', () => {
  const pages = collectPages({
    categories: [
      { id: 'food', slug: 'food', name: 'Food', parent: null },
      { id: 'fruit', slug: 'fruit', name: 'Fruit', parent: 'food' },
    ],
    products: [
      { slug: 'red-apples', name: 'Red Apples', status: 'published', category: 'fruit', store: 'seller-1', price: 45, images: [{ image: 'https://example.com/apple.webp', alt_text: 'Red apples in a basket', is_primary: true }] },
      { slug: 'hidden-apples', name: 'Hidden Apples', status: 'draft', category: 'fruit', store: 'seller-1', price: 50, images: [] },
    ],
    stores: [{ id: 'seller-1', slug: 'fruit-shop', name: 'Fruit Shop', status: 'active' }],
    services: [{ slug: 'fruit-delivery', name: 'Fruit Delivery', status: 'published', store: 'seller-1', images: [] }],
  });
  const shell = '<html><head><title>AfriClay</title></head><body><div id="root"></div></body></html>';
  const htmlFor = path => renderHtml(shell, pages.find(page => page.path === path));
  assert.match(htmlFor('/'), /href="\/products\/food"[^>]*>Food<\/a>/);
  assert.match(htmlFor('/'), /href="\/product\/red-apples"[^>]*>Red Apples<\/a>/);
  assert.match(htmlFor('/products/food'), /href="\/product\/red-apples"/);
  assert.match(htmlFor('/products/fruit'), /href="\/product\/red-apples"/);
  assert.match(htmlFor('/product/red-apples'), /href="\/store\/fruit-shop"[^>]*>Fruit Shop<\/a>/);
  assert.match(htmlFor('/store/fruit-shop'), /href="\/product\/red-apples"/);
  assert.match(htmlFor('/store/fruit-shop'), /href="\/services\/fruit-delivery"/);
  assert.match(htmlFor('/product/red-apples'), /alt="Red apples in a basket"/);
  assert.doesNotMatch(htmlFor('/'), /hidden-apples/);
  assert.doesNotMatch(htmlFor('/store/fruit-shop'), /hidden-apples/);
});

test('catalog link labels and image alt text are escaped; unsafe destinations are dropped', () => {
  const shell = '<html><head><title>AfriClay</title></head><body><div id="root"></div></body></html>';
  const html = renderHtml(shell, { path: '/', title: 'Home', description: 'Shop', image: 'https://example.com/photo.webp', imageAlt: 'Mug "large" <script>', linkGroups: [
    { title: 'Products', links: [{ path: '/product/safe-mug', label: 'Mug <large>' }, { path: 'javascript:alert(1)', label: 'Unsafe' }] },
  ] });
  assert.match(html, /alt="Mug &quot;large&quot; &lt;script&gt;"/);
  assert.match(html, /href="\/product\/safe-mug"[^>]*>Mug &lt;large&gt;<\/a>/);
  assert.doesNotMatch(html, /javascript:alert|>Unsafe</);
});
