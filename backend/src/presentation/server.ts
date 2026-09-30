import { buildApp } from './app.js';
import { env } from '../config/env.js';

async function bootstrap() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`\n🚀 FinControl API rodando em http://localhost:${env.PORT}`);
    console.log(`📖 Documentação Swagger disponível em http://localhost:${env.PORT}/docs\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
