import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { ScheduleModule } from '@nestjs/schedule'
import { BullModule } from '@nestjs/bull'
import { AuthModule } from './modules/auth/auth.module'
import { AppelsOffresModule } from './modules/appels-offres/appels-offres.module'
import { ContactsModule } from './modules/contacts/contacts.module'
import { DossiersModule } from './modules/dossiers/dossiers.module'
import { ScoringModule } from './modules/scoring/scoring.module'
import { AiModule } from './modules/ai/ai.module'
import { SolutionsModule } from './modules/solutions/solutions.module'
import { UsersModule } from './modules/users/users.module'
import { OrganisationsModule } from './modules/organisations/organisations.module'
import { ScrapingModule } from './modules/scraping/scraping.module'
import { PaymentsModule } from './modules/payments/payments.module'
import { DocumentsModule } from './modules/documents/documents.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { HealthModule } from './modules/health/health.module'
import { PrismaModule } from './common/prisma/prisma.module'

@Module({
  imports: [
    // Configuration globale
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 10000, limit: 50 },
      { name: 'long', ttl: 60000, limit: 100 },
    ]),

    // Tâches planifiées (cron jobs)
    ScheduleModule.forRoot(),

    // Queue Bull pour tâches async
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL', 'redis://localhost:6379')
        return {
          redis: {
            host: new URL(redisUrl).hostname || 'localhost',
            port: Number(new URL(redisUrl).port) || 6379,
            password: new URL(redisUrl).password || undefined,
            enableReadyCheck: true,
            maxRetriesPerRequest: null,
          },
        }
      },
    }),

    // Modules applicatifs
    PrismaModule,
    AuthModule,
    UsersModule,
    OrganisationsModule,
    AppelsOffresModule,
    ContactsModule,
    DossiersModule,
    ScoringModule,
    AiModule,
    SolutionsModule,
    ScrapingModule,
    PaymentsModule,
    DocumentsModule,
    NotificationsModule,
    HealthModule,
  ],
})
export class AppModule {}
