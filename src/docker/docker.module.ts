import { Module } from '@nestjs/common';
import { DockerService } from './services/docker.service';
import { DockerController } from './controllers/docker.controller';

@Module({
  controllers: [DockerController],
  providers: [DockerService],
})
export class DockerModule {}
