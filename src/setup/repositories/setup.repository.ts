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

  async SaveUserWordpress(
    nameSpace:string,
    createSetupDto: CreateSetupDto,
    podName: string,
    Port: number,
    id: number,
    phpVersion: string,
  ): Promise<Setup> {
    const newSetup = new Setup();
    newSetup.nameSpace = nameSpace
    newSetup.wpAdminUser = createSetupDto.wpAdminUser;
    newSetup.wpAdminEmail = createSetupDto.wpAdminEmail;
    newSetup.wpAdminPassword = createSetupDto.wpAdminPassword;
    newSetup.siteTitle = createSetupDto.siteTitle;
    newSetup.port = Port;
    newSetup.podName = podName;
    newSetup.userId = id;
    newSetup.phpVersion = phpVersion;
    
    return await this.setupRepository.save(newSetup);
  }

  async findByPort(port: number): Promise<Setup | null> {
    return await this.setupRepository.findOneBy({ port: port });
  }
  

  async deleteUser(id:number) {
    return await this.setupRepository.softDelete(id)
  }

  async findAll() {
    return await this.setupRepository.find()
  }

  async findByTitle() {
    const sites = await this.setupRepository.find({
      select: ['siteTitle'], 
    });
  
    return sites;
  }


   async findOne(id:number) {
    return await this.setupRepository.findOneBy({id})
  }

  async findByport(){
    const port = await this.setupRepository.find({
      select:['port']
    })
    return port
  }
  
  async findByusername(){
    const username = await this.setupRepository.find({
      select:['wpAdminUser']
    })
    return username
  }
  

}
