import { Module } from '@nestjs/common'
import { DossiersController } from './dossiers.controller'
import { DossiersService } from './dossiers.service'
import { AiModule } from '../ai/ai.module'

@Module({
  imports: [AiModule],
  controllers: [DossiersController],
  providers: [DossiersService],
  exports: [DossiersService],
})
export class DossiersModule {}
