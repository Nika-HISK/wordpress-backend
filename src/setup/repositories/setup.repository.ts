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

  async SaveUserWordpress(createSetupDto:CreateSetupDto,wordpressContainerName:string,instancePort:number,id:number,phpVersion:string, dbContainerName:string){
    const newSetup = new Setup();
    newSetup.wpAdminUser = createSetupDto.wpAdminUser
    newSetup.wpAdminEmail = createSetupDto.wpAdminEmail
    newSetup.wpAdminPassword = createSetupDto.wpAdminPassword
    newSetup.siteTitle = createSetupDto.siteTitle
    newSetup.instancePort = instancePort
    newSetup.wordpressContainerName = wordpressContainerName
    newSetup.userId = id
    newSetup.phpVersion = phpVersion
    newSetup.dbContainerName = dbContainerName
    this.setupRepository.save(newSetup);
    
  } 

  async findByPort(port: number): Promise<Setup | null> {
    return await this.setupRepository.findOneBy({ instancePort: port });
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


  async deleteSetup(id: number): Promise<void> {
    await this.setupRepository.softDelete(id);
  }


   async findOne(id:number) {
    return await this.setupRepository.findOneBy({id})
  }

  async findByport(){
    const port = await this.setupRepository.find({
      select:['instancePort']
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
