import { Module } from '@nestjs/common';
import { YmlService } from './services/yml.service';

@Module({
  controllers: [],
  providers: [YmlService],
})
export class YmlModule {}
