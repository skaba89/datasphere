import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import * as cors from 'cors'
import * as cookieParser from 'cookie-parser'
import { AppModule } from './app.module'

// BigInt n'est pas sérialisable en JSON nativement — on le convertit en string
;(BigInt.prototype as any).toJSON = function () {
  return this.toString()
}

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
    cors: false, // On gère CORS manuellement via le middleware cors
  })

  const config = app.get(ConfigService)
  const port = config.get<number>('PORT', 4000)
  const corsOrigins = config.get<string>('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001')

  // CORS — middleware Express AVANT tout le reste
  app.use(cors({
    origin: corsOrigins.split(',').map(s => s.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }))

  app.use(cookieParser())

  // Global prefix
  app.setGlobalPrefix('api/v1')

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  // Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('GuineaTender AI API')
    .setDescription(
      'API complète de la plateforme GuineaTender AI — Veille, scoring et génération de dossiers pour les appels d\'offres publics en Guinée',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentification et gestion des sessions')
    .addTag('Appels d\'Offres', 'Gestion des appels d\'offres')
    .addTag('Contacts', 'CRM et gestion des contacts')
    .addTag('Dossiers', 'Création et gestion des dossiers de réponse')
    .addTag('Solutions', 'Bibliothèque de templates de solutions')
    .addTag('AI', 'Services d\'intelligence artificielle')
    .addTag('Scoring', 'Scoring intelligent des opportunités')
    .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  })

  await app.listen(port)
  logger.log(`🚀 GuineaTender AI API démarrée sur http://localhost:${port}/api/v1`)
  logger.log(`📚 Documentation Swagger: http://localhost:${port}/api/docs`)
}

bootstrap()
