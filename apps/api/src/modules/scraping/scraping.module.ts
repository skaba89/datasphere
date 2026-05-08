import { Module } from '@nestjs/common'
import { ScrapingController } from './scraping.controller'
import { ScrapingService } from './scraping.service'
import { ScrapingScheduler } from './scraping.scheduler'
import { AiModule } from '../ai/ai.module'
import { ScoringModule } from '../scoring/scoring.module'
import { ContactsModule } from '../contacts/contacts.module'

@Module({
  imports: [AiModule, ScoringModule, ContactsModule],
  controllers: [ScrapingController],
  providers: [ScrapingService, ScrapingScheduler],
  exports: [ScrapingService],
})
export class ScrapingModule {}
