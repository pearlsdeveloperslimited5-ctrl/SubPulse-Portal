const { exec } = require('child_process');
const path = require('path');

const ftpUrl = 'ftp://p140338.hostus5.fornex.host/';
const ftpUser = 'tracker@p140338.hostus5.fornex.host:Well2025%%%%%%';

const filesToUpload = [
  { local: path.join(__dirname, 'public', 'index.html'), remote: 'index.html' },
  { local: path.join(__dirname, 'public', 'app.js'), remote: 'app.js' },
  { local: path.join(__dirname, 'public', 'style.css'), remote: 'style.css' },
  { local: path.join(__dirname, 'public', 'favicon.png'), remote: 'favicon.png' },
  { local: path.join(__dirname, 'api.php'), remote: 'api.php' },
  { local: path.join(__dirname, 'backend.php'), remote: 'backend.php' },
  { local: path.join(__dirname, '.htaccess'), remote: '.htaccess' },
  { local: path.join(__dirname, 'cron.php'), remote: 'cron.php' },
  { local: path.join(__dirname, 'remote_database.json'), remote: 'database.json' } // Upload the merged database
];

function uploadFile(index) {
  if (index >= filesToUpload.length) {
    console.log("\n🎉 ALL FILES SUCCESSFULLY UPLOADED TO THE SUBPULSE HOSTING!");
    return;
  }
  
  const item = filesToUpload[index];
  console.log(`Uploading [${index + 1}/${filesToUpload.length}]: ${path.basename(item.local)} -> ${item.remote}...`);
  
  const cmd = `curl.exe -T "${item.local}" "${ftpUrl}${item.remote}" --user "${ftpUser}"`;
  
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Failed uploading ${item.remote}: ${error.message}`);
      process.exit(1);
    }
    uploadFile(index + 1);
  });
}

uploadFile(0);
