import { Module } from '@nestjs/common';
import { SetupController } from './controllers/setup.controller';
import { SetupService } from './services/setup.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setup } from './entities/setup.entity';
import { SetupRepository } from './repositories/setup.repository';


@Module({
  imports: [TypeOrmModule.forFeature([Setup])],
  controllers: [SetupController],
  providers: [SetupService, SetupRepository],
})
export class SetupModule {}
