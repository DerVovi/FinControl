import { spawn } from 'child_process';
import path from 'path';

console.log('🚀 Iniciando FinControl (Backend + Frontend)...\n');

const backend = spawn('npm', ['run', 'dev'], {
  cwd: path.resolve('backend'),
  stdio: 'inherit',
  shell: true
});

const frontend = spawn('npm', ['run', 'dev'], {
  cwd: path.resolve('frontend'),
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  console.log('\n🛑 Encerrando processos...');
  backend.kill();
  frontend.kill();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
