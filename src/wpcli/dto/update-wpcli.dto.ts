import { PartialType } from '@nestjs/mapped-types';
import { CreateWpcliDto } from './create-wpcli.dto';

export class UpdateWpcliDto extends PartialType(CreateWpcliDto) {}
