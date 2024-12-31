import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as archiver from 'archiver';
import { promisify } from 'util';
import { Repository } from 'typeorm';
import { Backup } from '../entities/backup.entity';
import { FilesService } from 'src/files/services/files.service';
import { KubernetesService } from 'src/setup/services/kubernetes.service';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateBackupDto } from '../dto/create-backup.dto';
import { SetupService } from 'src/setup/services/setup.service';
import { Express } from 'express';
import { exec } from 'child_process';
import * as crypto from 'crypto';
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

  /*
    @Column({type: 'enum', enum:[ 'daily', 'hourly', 'six-hourly', 'manual']})
  type: string

  @Column({type: 'enum', enum:['s3', 'pod']})
  whereGo: string
   */

  async createManualS3Backup(backupName: string, setupId: number, instanceId: string, s3Url: string, backupType: string, whereGo: string) {
  

  const newBackup = new Backup()
  newBackup.name = backupName
  newBackup.setupId = setupId
  newBackup.instanceId = instanceId
  newBackup.s3Url = s3Url
  newBackup.type = backupType
  newBackup.whereGo = whereGo

  return await this.backupRepository.save(newBackup)

  }


  async createManulToPod(backupName: string, setupId: number, instanceId: string,  backupType: string, whereGo: string) {
  

    const newBackup = new Backup()
    newBackup.name = backupName
    newBackup.setupId = setupId
    newBackup.instanceId = instanceId
    newBackup.type = backupType
    newBackup.whereGo = whereGo
  
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

}
