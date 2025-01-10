import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
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
    const whereGo = 's3'
    const setup = await this.setupService.findOne(setupId);
    const instanceId = crypto.randomBytes(4).toString('hex');
    const backupType = 'manual'

    const sanitizedSiteName = setup.siteName.replace(/\s+/g, '-'); 
    const backupName = `${sanitizedSiteName}-${instanceId}.sql`;
    const zipFileName = `${sanitizedSiteName}-${instanceId}.zip`;

    const tempZipPath = os.platform() === 'win32' ? `${process.env.TEMP}\\${zipFileName}` : `/tmp/${zipFileName}`;

    await execAsync(`
      kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -c wordpress -- sh -c "apt update && apt install -y mariadb-client zip && wp db export '${backupName}' --allow-root && zip '${zipFileName}' '${backupName}'"
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
    const backup = await this.backupRepository.createManualS3Backup(zipFileName, setupId, instanceId, uploadResult.url, backupType, whereGo, createBackupDto, '');

    return backup;
  }



  async restoreBackupFromS3(backupId: number) {
    const backup = await this.backupRepository.findOne(backupId);
    const setup = await this.setupService.findOne(backup.setupId);
    if(backup.s3ZippedUrl == null) {
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
    kubectl exec -it -n ${setup.nameSpace} ${setup.podName} -c wordpress -- sh -c "rm /backups/${zippedName} && rm /backups/${sqlName}"
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
    const existingBackups = await this.backupRepository.findBySetupId(setupId);
    
    if (existingBackups.length >= 5) {
        throw new HttpException('You cannot create more than 5 backups', HttpStatus.BAD_REQUEST);
    }

    const backup = await this.createManualBackupToPodForLimit(setupId, backupType, createBackupDto);

    setTimeout(async () => {
        try {
            await this.deleteBackupFromPod(backup.id);
        } catch (error) {
            console.error('Error deleting backup:', error);
        }
    }, 1209600000 );

    return backup;
}


  async createManualBackupToPodForLimit(setupId: number, backupType: string, createBackupDto: CreateBackupDto) {
    const whereGo = 'pod';
    const setup = await this.setupService.findOne(setupId);
    const instanceId = crypto.randomBytes(4).toString('hex');

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

    const backup = await this.backupRepository.createManulToPodWithLimit(
        zipFileName,
        setupId,
        instanceId,
        backupType,
        whereGo,
        createBackupDto,
    );

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


findManualLimited() {
  return this.backupRepository.findManualLimited()
}

}