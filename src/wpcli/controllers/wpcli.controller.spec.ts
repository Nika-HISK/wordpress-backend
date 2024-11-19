import { Test, TestingModule } from '@nestjs/testing';
import { wpcliController } from './wpcli.controller';
import { wpcliService } from '../services/wpcli.service';



describe('WpcliController', () => {
  let controller: wpcliController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [wpcliController],
      providers: [wpcliService],
    }).compile();

    controller = module.get<wpcliController>(wpcliController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
