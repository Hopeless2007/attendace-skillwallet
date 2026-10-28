const fs = require('fs');
const path = require('path');

const libsDir = path.join(__dirname, 'libs');
if (!fs.existsSync(libsDir)) {
    fs.mkdirSync(libsDir, { recursive: true });
}

async function download(url, dest) {
    console.log(`Downloading ${url} to ${dest}...`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
    const text = await res.text();
    fs.writeFileSync(dest, text, 'utf8');
    console.log(`Saved ${dest} (${(text.length / 1024).toFixed(1)} KB)`);
}

async function main() {
    try {
        await download('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js', path.join(libsDir, 'supabase.min.js'));
        await download('https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js', path.join(libsDir, 'qrcode.min.js'));
        console.log('All libraries downloaded successfully!');
    } catch (err) {
        console.error('Download error:', err);
        process.exit(1);
    }
}

main();
