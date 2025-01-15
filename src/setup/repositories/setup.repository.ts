import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Setup } from '../entities/setup.entity';
import { Repository } from 'typeorm';
import { CreateSetupDto } from '../dto/create-setup.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class SetupRepository {
  private readonly encryptionKey = process.env.DB_PASSWORD_KEY;
  private readonly algorithm = 'aes-256-cbc';
  private readonly ivLength = 16;
  constructor(
    @InjectRepository(Setup)
    private readonly setupRepository: Repository<Setup>,
  ) {}
  private getKeyBuffer(): Buffer {
    return crypto.createHash('sha256').update(this.encryptionKey).digest();
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.getKeyBuffer(),
      iv,
    );
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(text: string): string {
    const [ivHex, encryptedText] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedText, 'hex');

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.getKeyBuffer(),
      iv,
    );

    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  async SaveUserWordpress(
    nameSpace: string,
    createSetupDto: CreateSetupDto,
    podName: string,
    Port: number,
    id: number,
    sqlPodName: string,
    wpDeployment: string,
    sqlDeployment: string,
    wpReplicaSet: string,
    sqlReplicaSet: string,
    nodeIp: string,
    wpfullIp: string,
    mysqlPassword: string,
    siteName: string,
    phpAdminFullIp: string,
    instanceId: string,
    phpDeployment: string
  ): Promise<Setup> {
    const encryptedMysqlPassword = this.encrypt(mysqlPassword);
    const hashedPassword = await bcrypt.hash(
      createSetupDto.wpAdminPassword,
      10,
    );

    const newSetup = new Setup();
    newSetup.nameSpace = nameSpace;
    newSetup.wpAdminUser = createSetupDto.wpAdminUser;
    newSetup.wpAdminEmail = createSetupDto.wpAdminEmail;
    newSetup.wpAdminPassword = hashedPassword;
    newSetup.siteTitle = createSetupDto.siteTitle;
    newSetup.port = Port;
    newSetup.podName = podName;
    newSetup.userId = id;
    newSetup.sqlPodName = sqlPodName;
    newSetup.wpDeployment = wpDeployment;
    newSetup.sqlDeployment = sqlDeployment;
    newSetup.wpReplicaSet = wpReplicaSet;
    newSetup.sqlReplicaSet = sqlReplicaSet;
    newSetup.nodeIp = nodeIp;
    newSetup.wpfullIp = wpfullIp;
    newSetup.siteName = siteName;
    newSetup.mysqlPassword = encryptedMysqlPassword;
    newSetup.phpAdminFullIp = phpAdminFullIp
    newSetup.instanceId = instanceId
    newSetup.phpDeployment = phpDeployment

    return await this.setupRepository.save(newSetup);
  }

  async getDecryptedMysqlPassword(id: number): Promise<string> {
    const setup = await this.setupRepository.findOneBy({ id });
    if (!setup) {
      throw new HttpException('Setup not found', 404);
    }
    if (setup) {
      return this.decrypt(setup.mysqlPassword);
    }
  }

  async findByPort(port: number): Promise<Setup> {
    const setup = await this.setupRepository.findOneBy({ port });
    if (!setup) {
      throw new HttpException(`Setup with port ${port} not found`, 404);
    }
    return setup;
  }
  async deleteUser(id: number): Promise<void> {
    const result = await this.setupRepository.softDelete(id);
    if (!result.affected) {
      throw new HttpException(`User with ID ${id} not found`, 404);
    }
  }
  async findAll() {
    return await this.setupRepository.find();
  }

  async findByTitle() {
    const sites = await this.setupRepository.find({
      select: ['siteTitle'],
    });

    return sites;
  }

  async deleteSetup(id: number): Promise<void> {
    const result = await this.setupRepository.softDelete(id);
    if (!result.affected) {
      throw new HttpException(`Setup with ID ${id} not found`, 404);
    }
  }

  async findOne(id: number): Promise<Setup> {
    const setup = await this.setupRepository.findOneBy({ id });
    if (!setup) {
      throw new HttpException(`Setup with ID ${id} not found`, 404);
    }
    return setup;
  }

  async findByport(): Promise<{ port: number }[]> {
    const ports = await this.setupRepository.find({
      select: ['port'],
    });
    if (!ports || ports.length === 0) {
      throw new HttpException('No setups found with ports', 404);
    }
    return ports;
  }

  async findByusername(): Promise<{ wpAdminUser: string }[]> {
    const usernames = await this.setupRepository.find({
      select: ['wpAdminUser'],
    });
    if (!usernames || usernames.length === 0) {
      throw new HttpException('No setups found with usernames', 404);
    }
    return usernames;
  }
}
