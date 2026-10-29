const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc3N2UzYWExLTBmMjAtNDgwMi1hOTk4LWJjZjdhNWI1ZGIyYiIsImVtYWlsIjoidmVyaWZ5XzE3OTMyNTY0NTYxMzlAZ21haWwuY29tIiwiaWF0IjoxNzkzMjU2NDU3LCJleHAiOjE3OTM4NjEyNTd9.k9wusxt0PVyvdjuWJzqs_r0cYYB5nNtR-R0EHqcpW3I';

async function testCirclesPage() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const consoleLogs = [];
  const pageErrors = [];

  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', err => {
    pageErrors.push(err.message);
  });

  // Navigate to login/home first to set localStorage
  await page.goto('https://focusflow-ai-livid.vercel.app/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    localStorage.setItem('focusflow_token', tok);
    localStorage.setItem('focusflow_user', JSON.stringify({
      id: '777e3aa1-0f20-4802-a998-bcf7a5b5db2b',
      name: 'Verify User',
      email: 'verify_1793256456139@gmail.com'
    }));
  }, TOKEN);

  // Navigate to focus-circles
  console.log('Navigating to focus-circles...');
  await page.goto('https://focusflow-ai-livid.vercel.app/dashboard/focus-circles', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const content = await page.evaluate(() => document.body.innerText);
  console.log('--- PAGE TEXT PREVIEW ---');
  console.log(content.slice(0, 500));
  console.log('--- ERRORS ---');
  console.log('Page errors:', pageErrors);
  console.log('Console errors:', consoleLogs.filter(l => l.type === 'error'));

  const screenshotPath = path.join(__dirname, 'circles_live_check.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot saved to:', screenshotPath);

  // Also check focus-rooms
  console.log('Navigating to focus-rooms...');
  await page.goto('https://focusflow-ai-livid.vercel.app/dashboard/focus-rooms', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const roomsContent = await page.evaluate(() => document.body.innerText);
  console.log('--- ROOMS PAGE TEXT PREVIEW ---');
  console.log(roomsContent.slice(0, 500));

  const roomsScreenshotPath = path.join(__dirname, 'rooms_live_check.png');
  await page.screenshot({ path: roomsScreenshotPath });
  console.log('Rooms screenshot saved to:', roomsScreenshotPath);

  await browser.close();
}

testCirclesPage().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

