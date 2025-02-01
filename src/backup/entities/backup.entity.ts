import { Json } from 'aws-sdk/clients/robomaker';
import { baseEntity } from 'src/base/entities/base.entity';
import { Setup } from 'src/setup/entities/setup.entity';
import { Entity, Column, ManyToOne } from 'typeorm';

@Entity()
export class Backup extends baseEntity {

  @Column({nullable: true})
  name: string;

  @Column()
  setupId: number;
 
  @Column({nullable: true})
  instanceId: string;

  @ManyToOne(() => Setup, (setup) => setup.backups,  { cascade: true })
  setup:Setup

  @Column({length:'1000', default:'', nullable:true})
  s3ZippedUrl:string

  @Column({length:'1000', default:'', nullable:true})
  s3SqlUrl:string


  @Column({type: 'enum', enum:[ 'daily', 'hourly', 'six-hourly', 'manual', 'manualLimited', 'downloadable', 'external', 'externalWillbeCreatedAt']})
  type: string

  @Column({type: 'enum', enum:['s3', 'pod']})
  whereGo: string

  @Column({nullable:true})
  note: string


  @Column({nullable: true})
  expiry: string

  @Column({nullable: true})
  formatedCreatedAt: string

  @Column({nullable: true})
  enableDownloadableDate: string

  @Column({nullable: true})
  bucket: string

  @Column({nullable: true})
  accessKey: string

  @Column({nullable: true})
  accessSecretKey: string

  @Column({nullable: true})
  files: boolean

  @Column({nullable: true})
  database: boolean

  @Column({type:'enum', enum:['weekly', 'monthly'], nullable: true})
  uploadFrequency: string;

  @Column({nullable: true})
  willBeCreatedAt: string

  @Column({nullable: true, type: 'enum', enum:['willBeCreated', 'done']})
  status: string


  @Column({nullable: true})
  size: string
}
