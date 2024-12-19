import { Controller } from '@nestjs/common';
import { DockerService } from '../services/docker.service';

@Controller('docker')
export class DockerController {
  constructor(private readonly dockerService: DockerService) {}
}
