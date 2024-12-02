import { Module } from '@nestjs/common';
import { HelperService } from './services/helper.service';

@Module({
  controllers: [],
  providers: [HelperService],
})
export class HelperModule {}
