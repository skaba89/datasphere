import { Module } from '@nestjs/common'
import { ScrapingService } from './scraping.service'
import { ScrapingScheduler } from './scraping.scheduler'
import { AiModule } from '../ai/ai.module'
import { ScoringModule } from '../scoring/scoring.module'

@Module({
  imports: [AiModule, ScoringModule],
  providers: [ScrapingService, ScrapingScheduler],
  exports: [ScrapingService],
})
export class ScrapingModule {}
