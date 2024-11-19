import { PartialType } from '@nestjs/mapped-types';
import { CreateSetupDto } from './create-setup.dto';

export class UpdateSetupDto extends PartialType(CreateSetupDto) {}
