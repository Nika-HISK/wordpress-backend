import { Controller, Post, Body, Param } from '@nestjs/common';
import { BackupService } from '../services/backup.service';
import { CreateBackupDto } from '../dto/create-backup.dto';
import { Roles } from 'src/auth/guard/jwt-roles.guard';
import { Role } from 'src/auth/guard/enum/role.enum';

@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Roles(Role.USER)
  @Post('Manual/:setupId')
  async createBackup(@Param('setupId') setupId:string) {
    return await this.backupService.createManualS3Backup(Number(setupId))
  }

  @Roles(Role.USER)
  @Post('restore/:backupId')
  async restoreBackup(@Param('backupId') backupId:string) {
    return await this.backupService.restoreBackup(Number(backupId))
  }

}