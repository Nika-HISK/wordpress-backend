import { Controller, Post, Body, Param, Delete, Get } from '@nestjs/common';
import { BackupService } from '../services/backup.service';
import { CreateBackupDto } from '../dto/create-backup.dto';
import { Roles } from 'src/auth/guard/jwt-roles.guard';
import { Role } from 'src/auth/guard/enum/role.enum';

@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Roles(Role.USER)
  @Post('ManualToS3/:setupId')
  async createManualToS3(@Param('setupId') setupId:string) {
    return await this.backupService.createManualToS3(Number(setupId))
  }

  @Roles(Role.USER)
  @Post('restoreBackupFromS3/:backupId')
  async restoreBackupFromS3(@Param('backupId') backupId:string) {
    return await this.backupService.restoreBackupFromS3(Number(backupId))
  }

  @Roles(Role.USER)
  @Post('ManualToPod/:setupId')
  async createManualBackupToPod(@Param('setupId') setupId:string) {
    const backupType = 'manual'
    return await this.backupService.createManualBackupToPod(Number(setupId), backupType)
  }

  @Roles(Role.USER)
  @Post('restoreFromPod/:backupId')
  async restoreManualFromPod(@Param('backupId') backupId:string) {
    return await this.backupService.restoreManualFromPod(Number(backupId))
  }

  @Roles(Role.USER)
  @Post('hourBackup/:setupId')
  async createHourBackup(@Param('setupId') setupId:string) {
    return await this.backupService.createHourBackup(Number(setupId))
  }

  @Roles(Role.USER)
  @Post('sixHourBackup/:setupId')
  async createSixHourBackup(@Param('setupId') setupId:string) {
    return await this.backupService.createSixHourBackup(Number(setupId))
  }

  @Roles(Role.USER)
  @Delete('deleteBackupFromPod/:backupId')
  async deleteBackupFromPod(@Param('backupId') backupId:string) {
    return await this.backupService.deleteBackupFromPod(Number(backupId))
  }

  @Roles(Role.USER)    
  @Get('downloadableBackups')
  async downloadableBackups() {
    return await this.backupService.downloadableBackups()
  }

  @Roles(Role.USER)    
  @Get('downloadBackup/:backupId')
  async downloadBackup(@Param('backupId') backupId:string) {
    return await this.backupService.downloadBackup(Number(backupId))
  }
}