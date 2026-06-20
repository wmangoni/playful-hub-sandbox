try {
  require('puppeteer');
  console.log('puppeteer is available');
} catch (e) {
  console.log('puppeteer is NOT available');
}

try {
  require('playwright');
  console.log('playwright is available');
} catch (e) {
  console.log('playwright is NOT available');
}
