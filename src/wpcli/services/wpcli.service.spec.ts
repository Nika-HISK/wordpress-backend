import { Test, TestingModule } from '@nestjs/testing';
import { wpcliService } from './wpcli.service';


describe('WpcliService', () => {
  let service: wpcliService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [wpcliService],
    }).compile();

    service = module.get<wpcliService>(wpcliService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
