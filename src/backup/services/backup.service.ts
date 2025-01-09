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
import { wpcliService } from 'src/wpcli/services/wpcli.service';
import { Readable } from 'stream';


const execAsync = promisify(exec);


@Injectable()
export class BackupService {
  constructor(
    private readonly backupRepository: BackupRepository,
    private readonly filesService: FilesService,
    private readonly k8sService: KubernetesService,
    private readonly setupService: SetupService,
    private readonly s3Service:s3Service,
    private readonly wpCliService: wpcliService
  ) {}

  private backupInterval: NodeJS.Timeout;


  
async createManualToS3(setupId: number, createBackupDto: CreateBackupDto) {
  const whereGo = 's3';
  const backupType = 'manual'
  const setup = await this.setupService.findOne(setupId);
  const instanceId = crypto.randomBytes(4).toString('hex');

  const plugins = await this.wpCliService.wpPluginList(setupId);
  const themes = await this.wpCliService.wpThemeList(setupId);

  const sanitizedSiteName = setup.siteName.replace(/\s+/g, '-');
  const zipFileName = `${sanitizedSiteName}-${instanceId}.zip`;
  const sqlFileName = `${sanitizedSiteName}-${instanceId}.sql`;
  const backupDir = '/backups';
  const wordpressDir = '/var/www/html'; 

  await execAsync(`
    kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -c wordpress -- sh -c "
      apt update && apt install -y mariadb-client zip &&
      mkdir -p '${backupDir}' &&
      
      # Export the database directly to the backup directory
      wp db export '${backupDir}/${sqlFileName}' --allow-root &&
      
      # Zip the entire WordPress directory and move it to the backup directory
      cd ${wordpressDir} &&
      zip -r '${backupDir}/${zipFileName}' ."
  `);

  const zipFileMock: Express.Multer.File = {
      fieldname: 'backup',
      originalname: zipFileName,
      encoding: '7bit',
      mimetype: 'application/zip',
      size: 123456, 
      path: `${backupDir}/${zipFileName}`,
      destination: backupDir,
      filename: zipFileName,
      buffer: Buffer.from(''), 
      stream: Readable.from([])
  };

  const sqlFileMock: Express.Multer.File = {
      fieldname: 'backup',
      originalname: sqlFileName,
      encoding: '7bit',
      mimetype: 'application/sql',
      size: 789012, 
      path: `${backupDir}/${sqlFileName}`,
      destination: backupDir,
      filename: sqlFileName,
      buffer: Buffer.from(''), 
      stream: Readable.from([])
  };

  const zipFile = await this.filesService.uploadFile(zipFileMock);
  const sqlFile = await this.filesService.uploadFile(sqlFileMock);

  const zipFilePresignedUrl = await this.s3Service.getPresignedUrl(zipFile.key);
  const sqlFilePresignedUrl = await this.s3Service.getPresignedUrl(sqlFile.key);

  const backup = await this.backupRepository.createManualS3Backup(
      zipFileName,
      setupId,
      instanceId,
      zipFilePresignedUrl,
      backupType,
      whereGo,
      createBackupDto,
      plugins,
      themes,
      sqlFilePresignedUrl
  );


  await execAsync(`
  kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -c wordpress -- sh -c "
    rm /backups/${zipFileName} && 
    rm /backups/${sqlFileName}
  "
  `)

  return {
      backup,
      zipFilePresignedUrl,
      sqlFilePresignedUrl,
  };
}




  
  

async restoreBackupFromS3(backupId: number) {
  // Fetch backup and validate its type
  const backup = await this.backupRepository.findOne(backupId);
  if (!backup || !backup.s3ZippedUrl || !backup.s3SqlUrl) {
    throw new Error('Invalid backup or missing S3 URLs');
  }

  // Fetch setup associated with the backup
  const setup = await this.setupService.findOne(backup.setupId);
  if (!setup) {
    throw new Error('Setup not found for the backup');
  }

  const backupDir = '/backups';
  const zipFilePath = `${backupDir}/site.zip`;
  const sqlFilePath = `${backupDir}/site.sql`;

  // Download the zipped site and SQL file to the pod using kubectl exec -it for interactive commands
  await execAsync(`
    kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -c wordpress -- sh -c "
      apt update && apt install -y curl &&
      mkdir -p '${backupDir}' &&
      curl -o '${zipFilePath}' '${backup.s3ZippedUrl}' &&
      curl -o '${sqlFilePath}' '${backup.s3SqlUrl}'"
  `);

  // Validate the downloaded ZIP file
   await execAsync(`
    kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -c wordpress -- sh -c "
      if [ ! -f '${zipFilePath}' ]; then echo 'ZIP file not found'; exit 1; fi &&
      unzip -tq '${zipFilePath}'"
  `).catch((error) => {
    throw new Error('Downloaded ZIP file is invalid or corrupted');
  });

  // Extract and restore WordPress files
  await execAsync(`
    kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -c wordpress -- sh -c "
      apt install -y unzip &&
      unzip -o '${zipFilePath}' -d '${backupDir}' &&
      rm -rf /var/www/html/* &&
      mv '${backupDir}/wp-content' /var/www/html/ &&
      mv '${backupDir}/wp-admin' /var/www/html/ &&
      mv '${backupDir}/wp-includes' /var/www/html/ &&
      mv '${backupDir}/wp-config.php' /var/www/html/"
  `);

  // Adjust permissions for WordPress files
  await execAsync(`
    kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -c wordpress -- sh -c "
      chown -R www-data:www-data /var/www/html"
  `);

  // Restore the database
  await execAsync(`
    kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -c wordpress -- sh -c "
      wp db import '${sqlFilePath}' --allow-root"
  `);

  // Clean up backup files from the pod
  await execAsync(`
    kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -c wordpress -- sh -c "
      rm -f '${zipFilePath}' '${sqlFilePath}'"
  `);

  // Delete the backup record from the database
  await this.backupRepository.deleteBackup(backupId);

  return { message: 'Backup restored successfully from S3' };
}




  

  async createManualBackupToPod(setupId: number, backupType: string) {
    const whereGo = 'pod';
    const setup = await this.setupService.findOne(setupId);
    const instanceId = crypto.randomBytes(4).toString('hex');

    const plugins = await this.wpCliService.wpPluginList(setupId);
    const themes = await this.wpCliService.wpThemeList(setupId);

    const sanitizedSiteName = setup.siteName.replace(/\s+/g, '-');
    const zipFileName = `${sanitizedSiteName}-${instanceId}.zip`;
    const sqlFileName = `${sanitizedSiteName}-${instanceId}.sql`;
    const backupDir = '/backups';
    const wordpressDir = '/var/www/html'; 

    await execAsync(`
      kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -c wordpress -- sh -c "
        apt update && apt install -y mariadb-client zip &&
        mkdir -p '${backupDir}' &&
        
        # Export the database directly to the backup directory
        wp db export '${backupDir}/${sqlFileName}' --allow-root &&
        
        # Zip the entire WordPress directory and move it to the backup directory
        cd ${wordpressDir} &&
        zip -r '${backupDir}/${zipFileName}' ."
    `);

    const backup = await this.backupRepository.createManulToPod(
        zipFileName,
        setupId,
        instanceId,
        backupType,
        whereGo,
        plugins,
        themes,
    );

    return backup;
}




async restoreManualFromPod(backupId: number) {
  const backup = await this.backupRepository.findOne(backupId);
  if (!backup) {
      throw new Error('Invalid backup or backup type is not "pod"');
  }

  const setup = await this.setupService.findOne(backup.setupId);
  if (!setup) {
      throw new Error('Setup not found for the backup');
  }

  const backupFileName = backup.name;
  const backupDir = '/backups';
  const zipFilePath = `${backupDir}/${backupFileName}`;
  const sqlFileName = backupFileName.replace('.zip', '.sql');
  const sqlFilePath = `${backupDir}/${sqlFileName}`;

  await execAsync(`
    kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -c wordpress -- sh -c "
      if [ ! -f '${zipFilePath}' ]; then
        echo 'Backup file not found in pod'; exit 1;
      fi
    "
  `);

  await execAsync(`
    kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -c wordpress -- sh -c "
      apt update && apt install -y unzip &&
      unzip -o '${zipFilePath}' -d '${backupDir}'"
  `);

  await execAsync(`
    kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -c wordpress -- sh -c "
      rm -rf /var/www/html/wp-content /var/www/html/wp-admin /var/www/html/wp-includes /var/www/html/wp-config.php /var/www/html/wp-config-sample.php &&
      mv '${backupDir}/wp-content' /var/www/html/ &&
      mv '${backupDir}/wp-admin' /var/www/html/ &&
      mv '${backupDir}/wp-includes' /var/www/html/ &&
      mv '${backupDir}/wp-config.php' /var/www/html/ &&
      mv '${backupDir}/wp-config-sample.php' /var/www/html/"
  `);

  await execAsync(`
    kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -c wordpress -- sh -c "
      chown -R www-data:www-data /var/www/html/wp-content /var/www/html/wp-content/plugins /var/www/html/wp-content/themes /var/www/html/wp-includes /var/www/html/wp-admin /var/www/html/wp-config.php /var/www/html/wp-config-sample.php"
  `);

  await execAsync(`
    kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -c wordpress -- sh -c "
      wp db import '${sqlFilePath}' --allow-root"
  `);

  await execAsync(`
    kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -c wordpress -- sh -c "
      rm -f '${zipFilePath}' '${sqlFilePath}'"
  `);

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
    if(backup.whereGo == 's3' && backup.s3ZippedUrl) {
      return backup.s3ZippedUrl
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
      kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -- sh -c "
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