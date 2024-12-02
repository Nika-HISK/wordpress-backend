import { Test, TestingModule } from '@nestjs/testing';
import { DockerController } from './docker.controller';
import { DockerService } from '../services/docker.service';

describe('DockerController', () => {
  let controller: DockerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DockerController],
      providers: [DockerService],
    }).compile();

    controller = module.get<DockerController>(DockerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
