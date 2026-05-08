import { Module } from '@nestjs/common'
import { ContactsController, EntitesController } from './contacts.controller'
import { ContactsService } from './contacts.service'
import { PrismaModule } from '../../common/prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [ContactsController, EntitesController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
