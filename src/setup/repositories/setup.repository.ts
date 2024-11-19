import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Setup } from '../entities/setup.entity';
import { Repository } from 'typeorm';
import { CreateSetupDto } from '../dto/create-setup.dto';

@Injectable()
export class SetupRepository {
  constructor(
    @InjectRepository(Setup)
    private readonly setupRepository: Repository<Setup>,
  ) {}

  async SaveUserWordpress(createSetupDto:CreateSetupDto,instanceDir:string,instancePort:number ){
    const newUser = new Setup();
    
  }
}
