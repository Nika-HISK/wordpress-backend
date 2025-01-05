import { Injectable } from '@nestjs/common';
import { FilesService } from 'src/files/services/files.service';
import { KubernetesService } from 'src/setup/services/kubernetes.service';
import { BackupRepository } from '../repositories/backup.repository';
import { SetupService } from 'src/setup/services/setup.service';
import { exec } from 'child_process';
import * as crypto from 'crypto';
import { promisify } from 'util';
import { s3Service } from 'src/aws/services/s3.service';
import * as fs from 'fs';
import * as os from 'os';
import { CreateBackupDto } from '../dto/create-backup.dto';


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

  private backupInterval: NodeJS.Timeout;


  async createManualToS3(setupId: number, createBackupDto: CreateBackupDto) {
    const whereGo = 's3'
    const setup = await this.setupService.findOne(setupId);
    const instanceId = crypto.randomBytes(4).toString('hex');
    const backupType = 'manual'
    
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
    // nikoloz -c7c40fdf.zip
    const fileContent = fs.readFileSync(tempZipPath);
    const uploadResult = await this.filesService.uploadFile({
      originalname: zipFileName,
      mimetype: 'application/zip',
      buffer: fileContent,
    } as Express.Multer.File);
    
    await execAsync(`rm -f ${tempZipPath}`);

    const backup = await this.backupRepository.createManualS3Backup(zipFileName, setupId, instanceId, uploadResult.url, backupType, whereGo, createBackupDto);
    
    return backup;
  }
  
  

  async restoreBackupFromS3(backupId: number) {
    const backup = await this.backupRepository.findOne(backupId);
    const setup = await this.setupService.findOne(backup.setupId);
    if(backup.s3Url == null) {
      return `backup with id ${backupId} does not have s3Url`
    }
  
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
  

  async createManualBackupToPod(setupId: number, backupType: string) {
    const whereGo = 'pod';
    const setup = await this.setupService.findOne(setupId);
    const instanceId = crypto.randomBytes(4).toString('hex');
  
    const sanitizedSiteName = setup.siteName.replace(/\s+/g, '-'); 
    const backupName = `${sanitizedSiteName}-${instanceId}.sql`;
    const zipFileName = `${sanitizedSiteName}-${instanceId}.zip`;
    const backupDir = '/backups';
  
    // Create backup in the pod
    await execAsync(`
      kubectl exec -n ${setup.nameSpace} ${setup.podName} -- sh -c "
        apt update && apt install -y mariadb-client zip &&
        mkdir -p '${backupDir}' &&
        wp db export '${backupName}' --allow-root &&
        zip -r '${zipFileName}' '${backupName}' '${backupDir}/wp-content/plugins' '${backupDir}/wp-content/themes' '${backupDir}/wp-content/uploads' &&
        mv '${zipFileName}' '${backupDir}' &&
        rm '${backupName}'"
    `);
  
    // Save the backup record
    const backup = await this.backupRepository.createManulToPod(zipFileName, setupId, instanceId, backupType, whereGo);
  
    return backup;
  }
  
  
  



  async restoreManualFromPod(backupId: number) {
    // Retrieve the backup details from the repository
    const backup = await this.backupRepository.findOne(backupId);
    if (!backup) {
      throw new Error('Invalid backup or backup type is not "pod"');
    }
  
    // Retrieve the setup configuration for the backup
    const setup = await this.setupService.findOne(backup.setupId);
    if (!setup) {
      throw new Error('Setup not found for the backup');
    }
  
    // Define backup paths
    const backupFileName = backup.name;
    const backupDir = '/backups';
    const zipFilePath = `${backupDir}/${backupFileName}`;
    const sqlFileName = backupFileName.replace('.zip', '.sql');
    const sqlFilePath = `${backupDir}/${sqlFileName}`;
  
    // Step 1: Check if the backup file exists in the pod
    await execAsync(`
      kubectl exec -n ${setup.nameSpace} ${setup.podName} -- sh -c "
        if [ ! -f '${zipFilePath}' ]; then
          echo 'Backup file not found in pod'; exit 1;
        fi
      "
    `);
  
    // Step 2: Unzip the backup file
    await execAsync(`
      kubectl exec -n ${setup.nameSpace} ${setup.podName} -- sh -c "
        apt update && apt install -y unzip &&
        unzip -o '${zipFilePath}' -d '${backupDir}'"
    `);
  
    // Step 3: Create directories if they don't exist and move files
    await execAsync(`
      kubectl exec -n ${setup.nameSpace} ${setup.podName} -- sh -c "
        mkdir -p '/var/www/html/wp-content/plugins' &&
        mkdir -p '/var/www/html/wp-content/themes' &&
        mkdir -p '/var/www/html/wp-content/uploads' &&
        if [ -d '${backupDir}/wp-content/plugins' ]; then
          mv '${backupDir}/wp-content/plugins/*' '/var/www/html/wp-content/plugins/';
        fi &&
        if [ -d '${backupDir}/wp-content/themes' ]; then
          mv '${backupDir}/wp-content/themes/*' '/var/www/html/wp-content/themes/';
        fi &&
        if [ -d '${backupDir}/wp-content/uploads' ]; then
          mv '${backupDir}/wp-content/uploads/*' '/var/www/html/wp-content/uploads/';
        fi"
    `);
  
    // Step 4: Import the database
    await execAsync(`
      kubectl exec -n ${setup.nameSpace} ${setup.podName} -- sh -c "
        wp db import '${sqlFilePath}' --allow-root"
    `);
  
    // Step 5: Clean up temporary files
    await execAsync(`
      kubectl exec -n ${setup.nameSpace} ${setup.podName} -- sh -c "
        rm -f '${zipFilePath}' '${sqlFilePath}'"
    `);
  
    // Step 6: Delete the backup record from the repository
    await this.backupRepository.deleteBackup(backupId);
  
    return { message: 'Backup restored successfully from pod' };
  }
  
  
  


  
  private scheduleDailyBackups() {
    const backupType = 'daily'
    this.backupInterval = setInterval(async () => {
      console.log('Starting daily backup process...');
      const setups = await this.setupService.findAll(); 
      for (const setup of setups) {
        try {
          console.log(`Creating backup for setup: ${setup.id}`);
          await this.createManualBackupToPod(setup.id, backupType);
        } catch (error) {
          console.error(`Failed to create backup for setup: ${setup.id}`, error);
        }
      }
    }, 86400000); 
  }

  onModuleInit() {
    console.log('BackupService initialized, starting daily backup scheduler...');
    this.scheduleDailyBackups();
  }

  onModuleDestroy() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      console.log('Daily backup scheduler stopped.');
    }
  }
  
  async createHourBackup(setupId: number) {
    setInterval(async () => {
      const backup = await this.createManualBackupToPod(setupId, 'hourly');
  
      setTimeout(async () => {
        await this.deleteBackupFromPod(backup.id);
      }, 86400000); 
    }, 3600000);  
  }


  async createSixHourBackup(setupId: number) {
    setInterval(async () => {
      const backup = await this.createManualBackupToPod(setupId, 'six-hourly');
      
      setTimeout(async () => {
        await this.deleteBackupFromPod(backup.id);
      }, 86400000);
    }, 21600000); 
  }
  
  
  async deleteBackupFromPod(backupId:number) {

    const backup = await this.backupRepository.findOne(backupId)    
    const setup = await this.setupService.findOne(backup.setupId)
    const zippedName =  backup.name
    const sqlName = zippedName.replace('.zip', '.sql')

    console.log(zippedName, sqlName);
    

    await execAsync(`
    kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -- sh -c "rm /backups/${zippedName}"
  `);

    await this.backupRepository.deleteBackup(backupId)


    return `succesfully deleted backup from pod and db with backupId:${backupId}`
  }

  async downloadBackup(backupId: number) {
    const backup = await this.backupRepository.findOne(backupId)
    if(backup.whereGo == 's3' && backup.s3Url) {
      return backup.s3Url
    }
    return 'backup does not have s3Url or is not uploaded on s3'
  }

  async downloadableBackups() {
    const backups = await this.backupRepository.findAll();
    return backups.filter(backup => backup.whereGo === 's3');
  }


  async createManualWithLimit(setupId: number, backupType: string, createBackupDto: CreateBackupDto) {
    const whereGo = 'pod';
    
    const setup = await this.setupService.findOne(setupId);
    
    const instanceId = crypto.randomBytes(4).toString('hex');
    

    const sanitizedSiteName = setup.siteName.replace(/\s+/g, '-'); 
    const backupName = `${sanitizedSiteName}-${instanceId}.sql`;
    const zipFileName = `${sanitizedSiteName}-${instanceId}.zip`;
    const backupDir = '/backups';

    const existingBackups = await this.backupRepository.findBySetupId(setupId);
    console.log(existingBackups);
    
    if (existingBackups.length >= 5) {
        return {message: 'Cannot create more than 5 backups for this setup'}
    }

    await execAsync(`
      kubectl exec -n ${setup.nameSpace} ${setup.podName} -- sh -c "
        apt update && apt install -y mariadb-client zip &&
        mkdir -p '${backupDir}' &&
        wp db export '${backupName}' --allow-root &&
        zip '${zipFileName}' '${backupName}' &&
        mv '${zipFileName}' '${backupDir}' &&
        rm '${backupName}'"
    `);

    const backup = await this.backupRepository.createManulToPodWithLimit(zipFileName, setupId, instanceId, backupType, whereGo, createBackupDto);

    setTimeout(async () => {
        await this.deleteBackupFromPod(backup.id);
    }, 1209600000); 

    return backup;
}

  
  

findManualBackups() {
  return this.backupRepository.findManualBackups()
}

findDailyBackups() {
  return this.backupRepository.findDailyBackups()
}

findHourlyBackups() {
  return this.backupRepository.findHourlyBackups()
}

findSixHourlyBackups() {
  return this.backupRepository.findSixHourlyBackups()

}
  
}