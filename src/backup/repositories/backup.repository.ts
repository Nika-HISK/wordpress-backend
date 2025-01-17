import { HttpException, HttpStatus, Injectable, Param } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Backup } from '../entities/backup.entity';
import { FilesService } from 'src/files/services/files.service';
import { KubernetesService } from 'src/setup/services/kubernetes.service';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateBackupDto } from '../dto/create-backup.dto';
import { SetupService } from 'src/setup/services/setup.service';
import { Json } from 'aws-sdk/clients/robomaker';
import { String } from 'aws-sdk/clients/appstream';
import { CreateS3BackupDto } from '../dto/create-s3Backup.dto';
const dayjs = require('dayjs');

@Injectable()
export class BackupRepository {
  constructor(
    @InjectRepository(Backup)
    private readonly backupRepository: Repository<Backup>,
    private readonly filesService: FilesService,
    private readonly k8sService: KubernetesService,
    private readonly setupService: SetupService
  ) {}

  async createManualS3Backup(backupName: string, setupId: number, instanceId: string, s3ZippedUrl: string, backupType: string, whereGo: string, createS3BackupDto: CreateS3BackupDto, s3SqlUrl: string) {

  const newBackup = new Backup()
  newBackup.name = backupName
  newBackup.setupId = setupId
  newBackup.instanceId = instanceId
  newBackup.s3ZippedUrl = s3ZippedUrl
  newBackup.type = backupType
  newBackup.whereGo = whereGo
  newBackup.s3SqlUrl = s3SqlUrl
  newBackup.bucket = createS3BackupDto.bucket
  newBackup.accessKey = createS3BackupDto.accessKey
  newBackup.accessSecretKey = createS3BackupDto.accessSecretKey
  // newBackup.uploadFrequency = createS3BackupDto.uploadFrequency
  // newBackup.database = createS3BackupDto.database
  // newBackup.files = createS3BackupDto.files
  // newBackup.formatedCreatedAt = formatedCreatedAt
  // newBackup.willBeCreatedAt = willBeCreatedAt


  return await this.backupRepository.save(newBackup)

  }


  async createManulToPod(backupName: string, setupId: number, instanceId: string,  backupType: string, whereGo: string, s3ZippedUrl: string) {
    const newDate = new Date();
    const formattedDate = dayjs(newDate).format("MMM DD , YYYY , hh : mm A").toString();

    const newBackup = new Backup()
    newBackup.name = backupName
    newBackup.setupId = setupId
    newBackup.instanceId = instanceId
    newBackup.type = backupType
    newBackup.whereGo = whereGo
    newBackup.formatedCreatedAt = formattedDate
    newBackup.s3ZippedUrl = s3ZippedUrl
  
    return await this.backupRepository.save(newBackup)
  
    }

    async createDonwloadableBackup(backupName: string, setupId: number, instanceId: string,  backupType: string, whereGo: string, s3ZippedUrl: string, expiry: string, enableDownloadableDate: string) {
      const newDate = new Date();
      const formattedDate = dayjs(newDate).format("MMM DD , YYYY , hh : mm A").toString();
  
      const newBackup = new Backup()
      newBackup.name = backupName
      newBackup.setupId = setupId
      newBackup.instanceId = instanceId
      newBackup.type = backupType
      newBackup.whereGo = whereGo
      newBackup.formatedCreatedAt = formattedDate
      newBackup.s3ZippedUrl = s3ZippedUrl
      newBackup.expiry = expiry
      newBackup.enableDownloadableDate = enableDownloadableDate 
    
      return await this.backupRepository.save(newBackup)
    
      }

    async createManulToPodWithLimit(
      backupName: string, 
      setupId: number, 
      instanceId: string,  
      backupType: string, 
      whereGo: string, 
      createBackupDto: CreateBackupDto, 
      expiry: String,

    ) {
      const newDate = new Date();
      const formattedDate = dayjs(newDate).format("MMM DD , YYYY , hh : mm A").toString();
      
      const newBackup = new Backup();
      newBackup.name = backupName;
      newBackup.setupId = setupId;
      newBackup.instanceId = instanceId;
      newBackup.type = backupType;
      newBackup.whereGo = whereGo;
      newBackup.note = createBackupDto.note;
      newBackup.expiry = expiry;
      newBackup.formatedCreatedAt = formattedDate;
    
      return await this.backupRepository.save(newBackup);
    }

  async createDailyBackup(setupId:number) {
    
    
  }


  async findOne(backupId: number) {
    const backup = await this.backupRepository.findOneBy({ id: backupId });
  
    if (!backup) {
      throw new HttpException(
        `Backup with id ${backupId} not found`,
        HttpStatus.BAD_REQUEST,
      );
    }
  
    return backup;
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
  
    const backupType = 'manualLimited';
  
    return this.backupRepository.createQueryBuilder('backup')
      .where('backup.setupId = :setupId', { setupId })
      .andWhere('backup.type = :backupType', { backupType }) 
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


  findManualLimitedBysetypId(setupId: number) {
    return this.backupRepository.find({
      where: {
        setupId: setupId,
        type: 'manualLimited',
      },
    });
  }

  
  async findDonwloadablebackups(setupId: number) {
    return await this.backupRepository
      .createQueryBuilder("backup")
      .select([
        "backup.id AS id",
        "backup.formatedCreatedAt AS formatedCreatedAt",
        "backup.expiry AS expiry",
        "backup.s3ZippedUrl AS s3ZippedUrl",
      ])
      .where("backup.setupId = :setupId", { setupId })
      .andWhere("backup.type = :type", { type: 'downloadable' })
      .getRawMany();
  }
  
  async findByCreatedAt(setupId: number) {
    return await this.backupRepository.findOne({
      where: { setupId, type: 'downloadable' }, 
      order: { createdAt: 'DESC' }
    });  
  }

  
  
}
