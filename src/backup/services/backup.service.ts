import { Injectable } from '@nestjs/common';
import { FilesService } from 'src/files/services/files.service';
import { KubernetesService } from 'src/setup/services/kubernetes.service';
import { BackupRepository } from '../repositories/backup.repository';
import { SetupService } from 'src/setup/services/setup.service';
import { CreateBackupDto } from '../dto/create-backup.dto';
import { exec, spawn } from 'child_process';
import * as crypto from 'crypto';
import { promisify } from 'util';
import { s3Service } from 'src/aws/services/s3.service';
import * as fs from 'fs';
import * as os from 'os';


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

  async createManualToS3(setupId: number) {
    const setup = await this.setupService.findOne(setupId);
    const instanceId = crypto.randomBytes(4).toString('hex');
    const backupType = 's3'
    
    const sanitizedSiteName = setup.siteName.replace(/\s+/g, '-'); 
    const backupName = `${sanitizedSiteName}-${instanceId}.sql`;
    const zipFileName = `${sanitizedSiteName}-${instanceId}.zip`;
    
    const tempZipPath = os.platform() === 'win32' ? `${process.env.TEMP}\\${zipFileName}` : `/tmp/${zipFileName}`;
    
    await execAsync(`
      kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -- sh -c "apt update && apt install -y mariadb-client zip && wp db export '${backupName}' --allow-root && zip '${zipFileName}' '${backupName}'"
    `);
    
    await execAsync(`
      kubectl cp "${setup.nameSpace}/${setup.podName}:/var/www/html/${zipFileName}" "${tempZipPath}"
    `);
    
    const fileContent = fs.readFileSync(tempZipPath);
    const uploadResult = await this.filesService.uploadFile({
      originalname: zipFileName,
      mimetype: 'application/zip',
      buffer: fileContent,
    } as Express.Multer.File);
    
    await execAsync(`rm -f ${tempZipPath}`);
    
    await this.backupRepository.createManualS3Backup(zipFileName, setupId, instanceId, uploadResult.url, backupType);
    
    return { message: 'Backup created, zipped, and uploaded to S3', s3Url: uploadResult.url };
  }
  
  

  async restoreBackupFromS3(backupId: number) {
    const backup = await this.backupRepository.findOne(backupId);
    const setup = await this.setupService.findOne(backup.setupId);
  
    const tempZipPath = os.platform() === 'win32' ? `${process.env.TEMP}\\${backup.name}` : `/tmp/${backup.name}`;
    const tempUnzipPath = os.platform() === 'win32' ? `${process.env.TEMP}\\${backup.name.replace('.zip', '.sql')}` : `/tmp/${backup.name.replace('.zip', '.sql')}`;
  
    console.log(`Downloading zip file from S3 to: ${tempZipPath}`);
    console.log(`Unzipping to: ${tempUnzipPath}`);
  
    const presignedUrl = await this.s3Service.getPresignedUrl(backup.name);
    await execAsync(`curl -o ${tempZipPath} "${presignedUrl}"`);
  
    if (!fs.existsSync(tempZipPath)) {
      throw new Error(`Backup file not found at ${tempZipPath}`);
    }
  
    await execAsync(`unzip -o ${tempZipPath} -d /tmp`);
  
    const unzippedContents = fs.readdirSync('/tmp');
    console.log('Unzipped contents of /tmp:', unzippedContents);
  
    if (!fs.existsSync(tempUnzipPath)) {
      throw new Error(`Unzipped file not found at ${tempUnzipPath}`);
    }
  
    await execAsync(`
      kubectl cp ${tempUnzipPath} ${setup.nameSpace}/${setup.podName}:/var/www/html/${backup.name.replace('.zip', '')} && \
      kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -- sh -c "wp db import /var/www/html/${backup.name.replace('.zip', '')} --allow-root"
    `);
  
    await execAsync(`rm -f ${tempZipPath} ${tempUnzipPath}`);
  
    return { message: 'Backup restored successfully from zipped file' };
  }
  

  async createManualBackupToPod(setupId: number) {
    const setup = await this.setupService.findOne(setupId);
    const instanceId = crypto.randomBytes(4).toString('hex');
    
    const sanitizedSiteName = setup.siteName.replace(/\s+/g, '-'); 
    const backupName = `${sanitizedSiteName}-${instanceId}.sql`;
    const zipFileName = `${sanitizedSiteName}-${instanceId}.zip`;

    const backupType = 'pod'
    
    const tempZipPath = os.platform() === 'win32' ? `${process.env.TEMP}\\${zipFileName}` : `/tmp/${zipFileName}`;
    
    await execAsync(`
      kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -- sh -c "apt update && apt install -y mariadb-client zip && wp db export '${backupName}' --allow-root && zip '${zipFileName}' '${backupName}'"
    `);

    
    await execAsync(`
      kubectl cp "${setup.nameSpace}/${setup.podName}:/var/www/html/${zipFileName}" "${tempZipPath}"
    `);

    await execAsync(`rm -f ${tempZipPath}`);


    await this.backupRepository.createManulToPod(zipFileName, setupId, instanceId, backupType)

    return { message: 'Backup created, zipped, and copyed into pod'};

  }

  async restoreManualFromPod(backupId: number) {
    const backup = await this.backupRepository.findOne(backupId);
    if (!backup || backup.type !== 'pod') {
      throw new Error('Invalid backup or backup type is not "pod"');
    }
  
    const setup = await this.setupService.findOne(backup.setupId);
    if (!setup) {
      throw new Error('Setup not found for the backup');
    }
  
    const tempUnzipPath =
      os.platform() === 'win32'
        ? `${process.env.TEMP}\\${backup.name.replace('.zip', '.sql')}`
        : `/tmp/${backup.name.replace('.zip', '.sql')}`;
  
    const tempZipPath =
      os.platform() === 'win32'
        ? `${process.env.TEMP}\\${backup.name}`
        : `/tmp/${backup.name}`;
  
    await execAsync(`
      kubectl cp "${setup.nameSpace}/${setup.podName}:/var/www/html/${backup.name}" "${tempZipPath}"
    `);
  
    await execAsync(`unzip -o ${tempZipPath} -d /tmp`);
  
    if (!fs.existsSync(tempUnzipPath)) {
      throw new Error(`Unzipped SQL file not found at ${tempUnzipPath}`);
    }
  
    await execAsync(`
      kubectl cp "${tempUnzipPath}" "${setup.nameSpace}/${setup.podName}:/var/www/html/${backup.name.replace('.zip', '.sql')}"
    `);
  
    await execAsync(`
      kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -- sh -c "wp db import /var/www/html/${backup.name.replace('.zip', '.sql')} --allow-root"
    `);
  
    await execAsync(`rm -f ${tempZipPath} ${tempUnzipPath}`);
  
    return { message: 'Backup restored successfully from pod' };
  }
  

  
  
}