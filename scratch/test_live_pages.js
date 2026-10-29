const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc3N2UzYWExLTBmMjAtNDgwMi1hOTk4LWJjZjdhNWI1ZGIyYiIsImVtYWlsIjoidmVyaWZ5XzE3OTMyNTY0NTYxMzlAZ21haWwuY29tIiwiaWF0IjoxNzkzMjU2NDU3LCJleHAiOjE3OTM4NjEyNTd9.k9wusxt0PVyvdjuWJzqs_r0cYYB5nNtR-R0EHqcpW3I';

async function testCirclesPage() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  await page.goto('https://focusflow-ai-livid.vercel.app/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    localStorage.setItem('focusflow_token', tok);
    localStorage.setItem('focusflow_user', JSON.stringify({
      id: '777e3aa1-0f20-4802-a998-bcf7a5b5db2b',
      name: 'Verify User',
      email: 'verify_1793256456139@gmail.com',
      onboardingCompleted: true
    }));
  }, TOKEN);

  // Navigate to focus-circles
  console.log('Navigating to focus-circles...');
  await page.goto('https://focusflow-ai-livid.vercel.app/dashboard/focus-circles', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const circlesText = await page.evaluate(() => document.body.innerText);
  console.log('--- CIRCLES TEXT ---');
  console.log(circlesText.slice(0, 1000));

  const circlesScreenshot = path.join(__dirname, 'circles_screen.png');
  await page.screenshot({ path: circlesScreenshot });
  console.log('Circles screenshot:', circlesScreenshot);

  // Navigate to focus-rooms
  console.log('Navigating to focus-rooms...');
  await page.goto('https://focusflow-ai-livid.vercel.app/dashboard/focus-rooms', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const roomsText = await page.evaluate(() => document.body.innerText);
  console.log('--- ROOMS TEXT ---');
  console.log(roomsText.slice(0, 1000));

  const roomsScreenshot = path.join(__dirname, 'rooms_screen.png');
  await page.screenshot({ path: roomsScreenshot });
  console.log('Rooms screenshot:', roomsScreenshot);

  console.log('Total page errors caught:', pageErrors.length);
  if (pageErrors.length > 0) console.log(pageErrors);

  await browser.close();
}

testCirclesPage().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
