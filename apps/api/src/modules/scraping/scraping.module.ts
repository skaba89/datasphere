import { Module } from '@nestjs/common'
import { ScrapingController } from './scraping.controller'
import { ScrapingService } from './scraping.service'
import { ScrapingScheduler } from './scraping.scheduler'
import { ScoringModule } from '../scoring/scoring.module'

@Module({
  imports: [ScoringModule],
  controllers: [ScrapingController],
  providers: [ScrapingService, ScrapingScheduler],
  exports: [ScrapingService],
})
export class ScrapingModule {}
