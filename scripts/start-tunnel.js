const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');

const ROOT_DIR = path.join(__dirname, '..');
const CLOUDFLARED_PATH = path.join(ROOT_DIR, 'scripts', 'cloudflared.exe');
const URL_FILE = path.join(ROOT_DIR, 'scripts', 'current-tunnel-url.txt');

console.log('--------------------------------------------------');
console.log('💰 [FinControl] Iniciando Conexão Segura com Celular...');
console.log('--------------------------------------------------');

// Inicia o túnel Cloudflare para a porta 5173 (onde roda o Frontend + Proxy da API)
const tunnelProcess = spawn(CLOUDFLARED_PATH, ['tunnel', '--url', 'http://localhost:5173'], {
  cwd: ROOT_DIR,
});

let urlFound = false;

const handleOutput = (data) => {
  const text = data.toString();
  const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
  if (match && !urlFound) {
    urlFound = true;
    const tunnelUrl = match[0];

    console.log('\n=============================================================');
    console.log('🎉 FINCONTROL NO AR NO CELULAR COM SUCESSO (HTTPS SEGURO)!');
    console.log(`🔗 Link Direto: ${tunnelUrl}`);
    console.log('=============================================================');
    console.log('📱 Aponte a câmera do seu celular para o QR Code abaixo:\n');

    qrcode.generate(tunnelUrl, { small: true });

    console.log('\n💡 Funciona no Wi-Fi, 4G ou 5G sem precisar configurar rede!');
    console.log('=============================================================\n');

    try {
      fs.writeFileSync(URL_FILE, tunnelUrl, 'utf-8');
    } catch (e) {}
  }
};

tunnelProcess.stdout.on('data', handleOutput);
tunnelProcess.stderr.on('data', handleOutput);

tunnelProcess.on('error', (err) => {
  console.error('❌ Erro ao iniciar o túnel Cloudflare:', err.message);
});

tunnelProcess.on('close', (code) => {
  console.log(`⚠️ Túnel Cloudflare encerrado com código: ${code}`);
});

process.on('SIGINT', () => {
  console.log('\nEncerrando Túnel Cloudflare...');
  try { if (tunnelProcess && tunnelProcess.pid) tunnelProcess.kill(); } catch (e) {}
  process.exit();
});
