const https = require('https');
const fs = require('fs');
const path = require('path');

const ICON_192 = 'https://res.cloudinary.com/doaxziqm7/image/upload/v1716912345/almoalem_pwa_icon.png';
const ICON_512 = 'https://res.cloudinary.com/doaxziqm7/image/upload/v1716912345/almoalem_pwa_icon_512.png';

const publicDir = path.join(__dirname, 'public');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { timeout: 10000 }, (res) => {
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`Failed to download icon: ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Successfully downloaded icon: ${path.basename(dest)}`);
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      try { fs.unlinkSync(dest); } catch(_) {}
      reject(err);
    });
  });
}

async function run() {
  try {
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    await download(ICON_192, path.join(publicDir, 'icon-192.png'));
    await download(ICON_512, path.join(publicDir, 'icon-512.png'));
    console.log('Local icons setup successfully completed!');
  } catch (err) {
    console.error('Fast download error details:', err.message);
  }
}

run();
