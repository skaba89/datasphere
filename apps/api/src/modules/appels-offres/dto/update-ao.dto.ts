import { PartialType } from '@nestjs/swagger'
import { CreateAODto } from './create-ao.dto'

export class UpdateAODto extends PartialType(CreateAODto) {}
