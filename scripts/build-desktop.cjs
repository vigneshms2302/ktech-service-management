const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Building K-Connect Standalone Desktop Application (Windows Portable)...');
const env = { ...process.env, BUILD_DESKTOP: 'true' };
delete env.ELECTRON_RUN_AS_NODE;

try {
  console.log('[1/3] Compiling TypeScript & building Vite desktop bundles (dist & dist-electron)...');
  execSync('npx vite build', { stdio: 'inherit', env, shell: true });

  console.log('[2/3] Packaging Windows Portable executable with electron-builder...');
  execSync('npx electron-builder --win portable', { stdio: 'inherit', env, shell: true });

  console.log('[3/3] Synchronizing desktop binary to public/downloads for web app distribution...');
  const releaseExe = path.join(__dirname, '..', 'release', 'K-Connect-Portable.exe');
  const publicDownloads = path.join(__dirname, '..', 'public', 'downloads');
  if (!fs.existsSync(publicDownloads)) {
    fs.mkdirSync(publicDownloads, { recursive: true });
  }
  if (fs.existsSync(releaseExe)) {
    fs.copyFileSync(releaseExe, path.join(publicDownloads, 'K-Connect-Portable.exe'));
    console.log('✅ Successfully copied K-Connect-Portable.exe to public/downloads/!');
  }
  console.log('\n🎉 Desktop build completed successfully!');
} catch (error) {
  console.error('❌ Desktop build encountered error:', error);
  process.exit(1);
}

