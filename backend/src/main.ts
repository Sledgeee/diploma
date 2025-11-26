import { API_PREFIX } from './common/constants';
import { HttpExceptionFilter, NestHttpExceptionFilter } from './common/filters';
import { LoggingInterceptor } from './common/interceptors';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { mw } from 'request-ip';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

BigInt.prototype['toJSON'] = function (): string {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.get<string>('FRONTEND_URL'),
    credentials: true,
  });
  app.use(helmet());
  app.use(helmet.noSniff());
  app.use(helmet.hidePoweredBy());
  app.use(helmet.contentSecurityPolicy());
  app.use(
    helmet.crossOriginResourcePolicy({
      policy: 'cross-origin',
    }),
  );
  app.use(cookieParser());
  app.use(mw());

  app.setGlobalPrefix(API_PREFIX);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new NestHttpExceptionFilter(),
  );
  app.useGlobalInterceptors(new LoggingInterceptor());

  const documentConfig = new DocumentBuilder()
    .setTitle('API Docs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, documentConfig);
  SwaggerModule.setup('/api/docs', app, document);

  await app.listen(config.get<number>('PORT'));
}

bootstrap();
