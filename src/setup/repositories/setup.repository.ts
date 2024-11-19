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

  async SaveUserWordpress(createSetupDto:CreateSetupDto,instanceDir:string,instancePort:number,id:number ){
    const newSetup = new Setup();
    newSetup.wpAdminUser = createSetupDto.wpAdminUser
    newSetup.wpAdminEmail = createSetupDto.wpAdminEmail
    newSetup.wpAdminPassword = createSetupDto.wpAdminPassword
    newSetup.siteTitle = createSetupDto.siteTitle
    newSetup.instancePort = instancePort
    newSetup.instanceDir = instanceDir
    newSetup.userId = id
    this.setupRepository.save(newSetup);
    
  }
}
