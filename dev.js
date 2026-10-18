const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

function isPortInUse(port) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(600);
    sock.on('connect', () => {
      sock.destroy();
      resolve(true);
    });
    sock.on('error', () => resolve(false));
    sock.on('timeout', () => {
      sock.destroy();
      resolve(false);
    });
    sock.connect(port, '127.0.0.1');
  });
}

async function start() {
  console.log('=================================================');
  console.log('🚀 Starting FocusFlow AI Development Environment');
  console.log('=================================================');

  const backendRunning = await isPortInUse(5001);
  const frontendRunning = await isPortInUse(3000);

  let backendProc = null;
  let frontendProc = null;

  if (backendRunning) {
    console.log('⚡ Backend server is already running on http://localhost:5001');
  } else {
    console.log('📦 Starting Backend on http://localhost:5001...');
    backendProc = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, 'backend'),
      shell: true,
      stdio: 'inherit'
    });
  }

  if (frontendRunning) {
    console.log('⚡ Frontend Next.js is already running on http://localhost:3000');
  } else {
    console.log('🌐 Starting Frontend Next.js on http://localhost:3000...');
    frontendProc = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, 'frontend'),
      shell: true,
      stdio: 'inherit'
    });
  }

  console.log('💡 Both services monitored. Press Ctrl+C to stop.');

  const cleanExit = () => {
    if (backendProc) {
      try { backendProc.kill(); } catch (_) {}
    }
    if (frontendProc) {
      try { frontendProc.kill(); } catch (_) {}
    }
    process.exit();
  };

  process.on('SIGINT', cleanExit);
  process.on('SIGTERM', cleanExit);
}

start();
