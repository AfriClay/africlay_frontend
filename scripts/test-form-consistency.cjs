const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = relativePath => readFileSync(path.join(root, relativePath), 'utf8');

test('shared fields expose one focus treatment and stable helper or error space', () => {
  const input = source('src/components/ui/Input.tsx');
  const field = source('src/components/ui/FormField.tsx');
  const choices = source('src/components/ui/ChoiceGroup.tsx');
  assert.match(input, /outlineStyle: 'none'/);
  assert.match(input, /<FormField/);
  assert.match(input, /multiline \? styles\.multilineWrapper/);
  assert.match(input, /accessibilityLabel=\{accessibilityLabel \?\? label\}/);
  assert.match(field, /accessibilityRole="alert"/);
  assert.match(field, /required \? <Text/);
  assert.match(field, /optional && !required/);
  assert.match(choices, /accessibilityRole="radiogroup"/);
  assert.match(choices, /accessibilityRole="radio"/);
});

test('major entry flows use the shared form controls', () => {
  const expected = {
    'src/screens/auth/Login.tsx': /<Input[\s\S]+required/,
    'src/screens/auth/Register.tsx': /<ChoiceGroup/,
    'src/screens/auth/KYCUpload.tsx': /<FormField label="Verification document" required/,
    'src/screens/seller/AddEditProduct.tsx': /<Input label="Description" required[\s\S]+multiline/,
    'src/screens/seller/ServiceManagement.tsx': /<ChoiceGroup label="Listing status"/,
    'src/screens/cart/Checkout.tsx': /label="Phone number"\s+required/,
    'src/components/domain/AddressForm.tsx': /label="Street address" required/,
    'src/components/domain/ReviewSection.tsx': /<Input label="Review"/,
    'src/screens/profile/DashboardAccessRequests.tsx': /<Input label="Reason for access" required/,
    'src/screens/admin/FinanceDashboard.tsx': /<Input label="Verification note" required/,
    'src/screens/admin/SalesDashboard.tsx': /<Input label="Rejection reason" required/,
    'src/screens/admin/SuperAdminDashboard.tsx': /<Input label="Reason" required/,
  };
  for (const [file, pattern] of Object.entries(expected)) {
    assert.match(source(file), pattern, `${file} does not use the expected shared form control`);
  }
});

test('raw text inputs remain limited to purpose-built controls', () => {
  const srcRoot = path.join(root, 'src');
  const files = [];
  const visit = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.name.endsWith('.tsx') && /\bTextInput\b/.test(readFileSync(absolute, 'utf8'))) files.push(path.relative(srcRoot, absolute).replaceAll('\\', '/'));
    }
  };
  visit(srcRoot);
  assert.deepEqual(files.sort(), [
    'components/ui/Input.tsx',
    'components/ui/OTPInput.tsx',
    'components/ui/SearchField.tsx',
    'screens/messages/ConversationThread.tsx',
    'screens/search/Search.tsx',
  ]);
  assert.match(source('src/components/ui/OTPInput.tsx'), /outlineStyle: 'none'/);
  assert.match(source('src/screens/messages/ConversationThread.tsx'), /inputFocused/);
});

test('upload controls keep their existing file constraints and API behavior', () => {
  const kyc = source('src/screens/auth/KYCUpload.tsx');
  const store = source('src/screens/auth/StorefrontSetup.tsx');
  const product = source('src/screens/seller/AddEditProduct.tsx');
  assert.match(kyc, /JPG or PNG, up to 10 MB/);
  assert.match(kyc, /storeService\.submitKyc/);
  assert.match(store, /ImagePicker\.launchImageLibraryAsync/);
  assert.match(product, /productService\.uploadProductImages/);
});
