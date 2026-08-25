const http = require('http');

function makeRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5005,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  try {
    const testEmail = `test_${Date.now()}@gmail.com`;
    
    console.log('📝 Step 1: Registering test user...');
    const reg = await makeRequest('POST', '/api/auth/register', {
      name: 'Test User',
      email: testEmail,
      password: 'TestPass123!@',
      confirmPassword: 'TestPass123!@'
    });
    console.log('Status:', reg.status);
    console.log('Response:', reg.body.message || JSON.stringify(reg.body));
    console.log('Token:', reg.body.token ? '✅ Generated' : '❌ None');

    console.log('\n📧 Step 2: Requesting password reset OTP...');
    const forgot = await makeRequest('POST', '/api/auth/forgot-password', {
      email: testEmail
    });
    console.log('Status:', forgot.status);
    console.log('Response:', forgot.body.message || JSON.stringify(forgot.body));
    
    console.log('\n✅ OTP email should have been sent!');
    console.log('📧 Check your Gmail for the OTP code (expires in 15 minutes)');
    console.log('Email tested with:', testEmail);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

test();
