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
import * as path from 'path';
import { wpcliService } from 'src/wpcli/services/wpcli.service';
import { PassThrough } from 'stream';
const dayjs = require('dayjs');



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

    const presignedUrl = await this.s3Service.getPresignedUrl(backup.name);
    await execAsync(`curl -o ${tempZipPath} "${presignedUrl}"`);

    if (!fs.existsSync(tempZipPath)) {
      throw new Error(`Backup file not found at ${tempZipPath}`);
    }

    await execAsync(`unzip -o ${tempZipPath} -d /tmp`);

    const unzippedContents = fs.readdirSync('/tmp');

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




  

  async createManualBackupToPod(setupId: number, backupType: string, s3ZippedUrl: string) {
    const whereGo = 'pod';
    const setup = await this.setupService.findOne(setupId);
    const instanceId = crypto.randomBytes(4).toString('hex');

    const zipFileName = `${setup.siteName}-${instanceId}.zip`;
    const sqlFileName = `${setup.siteName}-${instanceId}.sql`;
    const backupDir = '/backups';
    const wordpressDir = '/var/www/html'; 


    try {
        await this.setupService.runKubectlCommand(
        setup.nameSpace,
        setup.podName,
        '/usr/bin/apt-get update -qq', 
        'wordpress'
      );
    
        await this.setupService.runKubectlCommand(
        setup.nameSpace,
        setup.podName,
        '/usr/bin/apt-get install -y mariadb-client zip -qq'
      );
    
       await this.setupService.runKubectlCommand(
        setup.nameSpace,
        setup.podName,
        'mkdir -p /backups',
        'wordpress'
      );
    
       await this.setupService.runKubectlCommand(
        setup.nameSpace,
        setup.podName,
        `wp db export /backups/${sqlFileName} --allow-root`,
        'wordpress'
      );
    
       await this.setupService.runKubectlCommand(
        setup.nameSpace,
        setup.podName,
        `zip -r /backups/${zipFileName} .`,
        'wordpress'
      );
    } catch (error) {
      console.error('Command error:', error);
    }

    const backup = await this.backupRepository.createManulToPod(
        zipFileName,
        setupId,
        instanceId,
        backupType,
        whereGo,
        s3ZippedUrl
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



  await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, '/usr/bin/apt-get update -qq', 'wordpress');
  await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, '/usr/bin/apt-get install -y mariadb-client zip -qq', 'wordpress');
  await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, `sh -c "DEBIAN_FRONTEND=noninteractive unzip -o '${zipFilePath}' -d '${backupDir}'"`, 'wordpress');
  await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, `sh -c "DEBIAN_FRONTEND=noninteractive rm -rf /var/www/html/wp-content /var/www/html/wp-admin /var/www/html/wp-includes /var/www/html/wp-config.php /var/www/html/wp-config-sample.php"`, 'wordpress');
  await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, `sh -c "DEBIAN_FRONTEND=noninteractive mv '${backupDir}/wp-content' /var/www/html/"`, 'wordpress');
  await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, `sh -c "DEBIAN_FRONTEND=noninteractive mv '${backupDir}/wp-admin' /var/www/html/"`, 'wordpress');
  await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, `sh -c "DEBIAN_FRONTEND=noninteractive mv '${backupDir}/wp-includes' /var/www/html/"`, 'wordpress');
  await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, `sh -c "DEBIAN_FRONTEND=noninteractive mv '${backupDir}/wp-config.php' /var/www/html/"`, 'wordpress');
  await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, `sh -c "DEBIAN_FRONTEND=noninteractive mv '${backupDir}/wp-config-sample.php' /var/www/html/"`, 'wordpress');
  await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, `sh -c "DEBIAN_FRONTEND=noninteractive chown -R www-data:www-data /var/www/html/wp-content /var/www/html/wp-content/plugins /var/www/html/wp-content/themes /var/www/html/wp-includes /var/www/html/wp-admin /var/www/html/wp-config.php /var/www/html/wp-config-sample.php"`, 'wordpress');
  await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, `sh -c "DEBIAN_FRONTEND=noninteractive wp db import '${sqlFilePath}' --allow-root"`, 'wordpress');
  await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, `sh -c "DEBIAN_FRONTEND=noninteractive rm -f '${zipFilePath}' '${sqlFilePath}'"`, 'wordpress');


  await this.backupRepository.deleteBackup(backupId);

  return { message: 'Backup restored successfully from pod' };
}


private scheduleDailyBackups() {
  const backupType = 'daily';
  const backupRetentionPeriod = 1209600000; 

  this.backupInterval = setInterval(async () => {
    const setups = await this.setupService.findAll();

    for (const setup of setups) {
      try {
        const backup = await this.createManualBackupToPod(setup.id, backupType, '');

        this.scheduleBackupDeletion(backup.id, backupRetentionPeriod);
      } catch (error) {
      }
    }
  }, 86400000);  
}

private scheduleBackupDeletion(backupId: number, delay: number) {
  setTimeout(async () => {
    try {
      await this.deleteBackupFromPod(backupId);
    } catch (error) {
      console.error(`Failed to delete backup with ID: ${backupId}`, error);
    }
  }, delay);
}


  onModuleInit() {
    this.scheduleDailyBackups();
  }

  onModuleDestroy() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }
  }
  
  async createHourBackup(setupId: number) {
    setInterval(async () => {
      const backup = await this.createManualBackupToPod(setupId, 'hourly', '');
  
      setTimeout(async () => {
        await this.deleteBackupFromPod(backup.id);
      }, 86400000); 
    }, 3600000);  
  }


  async createSixHourBackup(setupId: number) {
    setInterval(async () => {
      const backup = await this.createManualBackupToPod(setupId, 'six-hourly', '');
      
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
    const limitedLength = existingBackups.length
    if (existingBackups.length >= 5) {
        throw new HttpException('You cannot create more than 5 backups', HttpStatus.BAD_REQUEST);
    }

    const backup = await this.createManualBackupToPodForLimit(setupId, backupType, createBackupDto, limitedLength);

    setTimeout(async () => {
        try {
            await this.deleteBackupFromPod(backup.id);
        } catch (error) {
            console.error('Error deleting backup:', error);
        }
    }, 1209600000 );

    return backup;
}


  async createManualBackupToPodForLimit(setupId: number, backupType: string, createBackupDto: CreateBackupDto, limitedLength: number) {
    const whereGo = 'pod';
    const setup = await this.setupService.findOne(setupId);
    const instanceId = crypto.randomBytes(4).toString('hex');

    const zipFileName = `${setup.siteName}-${instanceId}.zip`;
    const sqlFileName = `${setup.siteName}-${instanceId}.sql`;
    try {
      await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, '/usr/bin/apt-get update -qq', 'wordpress');

    
      await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, '/usr/bin/apt-get install -y mariadb-client zip -qq', 'wordpress');

       this.setupService.runKubectlCommand(
        setup.nameSpace,
        setup.podName,
        'mkdir -p /backups', 
        'wordpress'
      );
    
       this.setupService.runKubectlCommand(
        setup.nameSpace,
        setup.podName,
        `wp db export /backups/${sqlFileName} --allow-root`, 
        'wordpress'
      );
    
        await this.setupService.runKubectlCommand(
        setup.nameSpace,
        setup.podName,
        `zip -r /backups/${zipFileName} .`, 
        'wordpress'
      );
    } catch (error) {
      console.error('Command error:', error);
    }


    const createdAt = new Date();  
    const expiry = new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    const formattedExpiry = dayjs(expiry).format("MMM DD , YYYY , hh : mm A");

        
    const backup = await this.backupRepository.createManulToPodWithLimit(
        zipFileName,
        setupId,
        instanceId,
        backupType,
        whereGo,
        createBackupDto,
        formattedExpiry,

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


findManualLimited(setupId:number) {
  return this.backupRepository.findManualLimitedBysetypId(setupId)
}

async findPercent(setupId: number) {
  const maximum = 5

  const existingBackups = await this.backupRepository.findBySetupId(setupId)

  const percent = existingBackups.length / maximum * 100
  const obj = {
    maximum: maximum,
    existingBackupsleangth: existingBackups.length,
    percent: percent
  }

  return obj;

}






async createDownloadableBackup(setupId: number) {
  const backup = await this.createManualBackupToPod(setupId, 'downloadable', ''); 
  const setup = await this.setupService.findOne(backup.setupId);
  const backupFilePath = `/backups/${backup.name}`;
  const sqlFilePath = `/backups/${backup.name.replace('.zip', '.sql')}`;
  const combinedZipPath = `/backups/${backup.name.replace('.zip', '_combined.zip')}`;

  const s3Bucket = process.env.AWS_S3_BUCKET;
  const s3DestinationPath = `s3://${s3Bucket}/${backup.name.replace('.zip', '_combined.zip')}`;

  await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, '/usr/bin/apt-get update -qq', 'wordpress');
  await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, '/usr/bin/apt-get install -y s3cmd zip -qq', 'wordpress');

  const zipCommand = `zip -j ${combinedZipPath} ${backupFilePath} ${sqlFilePath}`;
  await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, zipCommand, 'wordpress');

  const s3CmdCommand = `s3cmd put ${combinedZipPath} ${s3DestinationPath} --access_key=${process.env.AWS_ACCES_KEY} --secret_key=${process.env.AWS_SECRET_ACCESS_KEY} --region eu-north-1`;
  await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, s3CmdCommand, 'wordpress');

  const presignedUrl = await this.s3Service.getPresignedUrl(backup.name.replace('.zip', '_combined.zip'));


  const nowTime = new Date();
  const expiry = new Date(nowTime.getTime() + 24 * 60 * 60 * 1000); 
  const formattedExpiry = dayjs(expiry).format("MMM DD , YYYY , hh : mm A");


  backup.s3ZippedUrl = presignedUrl;
  backup.s3SqlUrl = presignedUrl;  
  await this.backupRepository.createDonwloadableBackup(backup.name, backup.setupId, backup.instanceId, backup.type, backup.whereGo, backup.s3ZippedUrl, formattedExpiry); 
  await this.backupRepository.deleteBackup(backup.id)
  return {
    createdAt: backup.formatedCreatedAt,
    expiry: formattedExpiry,
    s3ZippedUrl: backup.s3ZippedUrl
  };
}


  async findDonwloadablebackups(setupId: number) {
    return await this.backupRepository.findDonwloadablebackups(setupId)
  }


}