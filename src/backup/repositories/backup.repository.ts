import { Injectable } from '@nestjs/common';
import { promisify } from 'util';
import { Repository } from 'typeorm';
import { Backup } from '../entities/backup.entity';
import { FilesService } from 'src/files/services/files.service';
import { KubernetesService } from 'src/setup/services/kubernetes.service';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateBackupDto } from '../dto/create-backup.dto';
import { SetupService } from 'src/setup/services/setup.service';
import { exec } from 'child_process';
import { Json } from 'aws-sdk/clients/robomaker';
const execAsync = promisify(exec);


@Injectable()
export class BackupRepository {
  constructor(
    @InjectRepository(Backup)
    private readonly backupRepository: Repository<Backup>,
    private readonly filesService: FilesService,
    private readonly k8sService: KubernetesService,
    private readonly setupService: SetupService
  ) {}

  async createManualS3Backup(backupName: string, setupId: number, instanceId: string, s3Url: string, backupType: string, whereGo: string, createBackupDto: CreateBackupDto) {
  

  const newBackup = new Backup()
  newBackup.name = backupName
  newBackup.setupId = setupId
  newBackup.instanceId = instanceId
  newBackup.s3Url = s3Url
  newBackup.type = backupType
  newBackup.whereGo = whereGo
  newBackup.note = createBackupDto.note

  return await this.backupRepository.save(newBackup)

  }


  async createManulToPod(backupName: string, setupId: number, instanceId: string,  backupType: string, whereGo: string, plugins: Json, themes: Json) {
  

    const newBackup = new Backup()
    newBackup.name = backupName
    newBackup.setupId = setupId
    newBackup.instanceId = instanceId
    newBackup.type = backupType
    newBackup.whereGo = whereGo
    newBackup.plugins = [plugins]
    newBackup.themes = [themes]
  
    return await this.backupRepository.save(newBackup)
  
    }

    async createManulToPodWithLimit(backupName: string, setupId: number, instanceId: string,  backupType: string, whereGo: string, createBackupDto: CreateBackupDto) {
  

      const newBackup = new Backup()
      newBackup.name = backupName
      newBackup.setupId = setupId
      newBackup.instanceId = instanceId
      newBackup.type = backupType
      newBackup.whereGo = whereGo
      newBackup.note = createBackupDto.note
    
      return await this.backupRepository.save(newBackup)
    
      }

  async createDailyBackup(setupId:number) {
    
    
  }


  async findOne(backupId: number) {
    return await this.backupRepository.findOneBy({id: backupId})
  }

  async deleteBackup(backupId: number) {
    return await this.backupRepository.softDelete(backupId) 
  }

  async findAll() {
    return await this.backupRepository.find()
  }

  async findBySetupId(setupId: number): Promise<Backup[]> {
    if (!setupId || isNaN(setupId)) {
        throw new Error('Invalid setupId');
    }

    return this.backupRepository.createQueryBuilder('backup')
        .where('backup.setupId = :setupId', { setupId })
        .orderBy('backup.createdAt', 'DESC')
        .getMany();
}


  findManualBackups() {
    return this.backupRepository.find({where: {type: 'manual'}})
  }

  findDailyBackups() {
    return this.backupRepository.find({where: {type: 'daily'}})
  }

  findHourlyBackups() {
    return this.backupRepository.find({where: {type: 'hourly'}})
  }

  findSixHourlyBackups() {
    return this.backupRepository.find({where: {type: 'six-hourly'}})

  }
}
