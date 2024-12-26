import { Injectable } from '@nestjs/common';
import { FilesService } from 'src/files/services/files.service';
import { KubernetesService } from 'src/setup/services/kubernetes.service';
import { BackupRepository } from '../repositories/backup.repository';
import { SetupService } from 'src/setup/services/setup.service';
import { CreateBackupDto } from '../dto/create-backup.dto';
import { exec } from 'child_process';
import * as crypto from 'crypto';
import { promisify } from 'util';
import { s3Service } from 'src/aws/services/s3.service';
import * as fs from 'fs';


const execAsync = promisify(exec);


@Injectable()
export class BackupService {
  constructor(
    private readonly backupRepository: BackupRepository,
    private readonly filesService: FilesService,
    private readonly k8sService: KubernetesService,
    private readonly setupService: SetupService,
    private readonly s3Service:s3Service
  ) {}

  async createManualBackup(setupId: number) {
    const setup = await this.setupService.findOne(setupId);
    const instanceId = crypto.randomBytes(4).toString('hex');
    const backupName = `${setup.siteName}-${instanceId}.sql`;
    const zipFileName = `${backupName}.zip`;
    const tempZipPath = `/tmp/${zipFileName}`;
  
    await execAsync(`
      kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -- sh -c "apt update && apt install -y mariadb-client zip && wp db export ${backupName} --allow-root && zip ${zipFileName} ${backupName}"
    `);
  
    await execAsync(`
      kubectl cp ${setup.nameSpace}/${setup.podName}:/var/www/html/${zipFileName} ${tempZipPath}
    `);
  
    const fileContent = fs.readFileSync(tempZipPath);
    const uploadResult = await this.filesService.uploadFile({
      originalname: zipFileName,
      mimetype: 'application/zip',
      buffer: fileContent, 
    } as Express.Multer.File);
  
    await execAsync(`rm -f ${tempZipPath}`);
  
    await this.backupRepository.createManualBackup(uploadResult.key, setupId, instanceId);
  
    return { message: 'Backup created, zipped, and uploaded to S3', s3Url: uploadResult.url };
  }

  async restoreBackup(backupId: number) {
    const backup = await this.backupRepository.findOne(backupId);
    const setup = await this.setupService.findOne(backup.setupId);

    const tempZipPath = `/tmp/${backup.name}`;
    const tempUnzipPath = `/tmp/${backup.name.replace('.zip', '')}`; 
    const presignedUrl = await this.s3Service.getPresignedUrl(backup.name);
    await execAsync(`curl -o ${tempZipPath} "${presignedUrl}"`);

    await execAsync(`unzip -o ${tempZipPath} -d /tmp`);

    await execAsync(`
      kubectl cp ${tempUnzipPath} ${setup.nameSpace}/${setup.podName}:/var/www/html/${backup.name.replace('.zip', '')} && \
      kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -- sh -c "wp db import /var/www/html/${backup.name.replace('.zip', '')} --allow-root"
    `);

    await execAsync(`rm -f ${tempZipPath} ${tempUnzipPath}`);

    return { message: 'Backup restored successfully from zipped file' };
  }
}