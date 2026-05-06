import { Module } from '@nestjs/common'
import { AppelsOffresController } from './appels-offres.controller'
import { AppelsOffresService } from './appels-offres.service'

@Module({
  controllers: [AppelsOffresController],
  providers: [AppelsOffresService],
  exports: [AppelsOffresService],
})
export class AppelsOffresModule {}
