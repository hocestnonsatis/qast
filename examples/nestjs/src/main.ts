import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  console.log('🚀 NestJS server running on http://localhost:3000');
  console.log('📝 Try: GET http://localhost:3000/users?filter=age gt 25');
}
bootstrap();

