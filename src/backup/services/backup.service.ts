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

  async createManualS3Backup(setupId: number) {
    const setup = await this.setupService.findOne(setupId);
    const instanceId = crypto.randomBytes(4).toString('hex');
    
    // Replace spaces with hyphens in the site name to avoid spaces in the backup filename
    const sanitizedSiteName = setup.siteName.replace(/\s+/g, '-');  // Replace spaces with hyphens
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
    
    // Remove the temporary file
    await execAsync(`rm -f ${tempZipPath}`);
    
    await this.backupRepository.createManualS3Backup(zipFileName, setupId, instanceId, uploadResult.url);
    
    return { message: 'Backup created, zipped, and uploaded to S3', s3Url: uploadResult.url };
  }
  
  

  async restoreBackup(backupId: number) {
    const backup = await this.backupRepository.findOne(backupId);
    const setup = await this.setupService.findOne(backup.setupId);
  
    // Set temp paths based on the OS
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
  
    // Log unzipped contents for debugging purposes
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
  
  
}