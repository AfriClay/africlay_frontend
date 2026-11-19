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

test('out-of-stock product data is not represented as in stock', () => {
  const [,,,, product] = collectPages({ products: [{ slug: 'empty-item', name: 'Empty Item', status: 'published', price: '25.00', currency: 'KES', stock_quantity: 0, images: [] }] });
  assert.equal(product.schema.offers.availability, 'https://schema.org/OutOfStock');
});
