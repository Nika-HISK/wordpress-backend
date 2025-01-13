import { Json } from 'aws-sdk/clients/robomaker';
import { baseEntity } from 'src/base/entities/base.entity';
import { Setup } from 'src/setup/entities/setup.entity';
import { Entity, Column, ManyToOne } from 'typeorm';

@Entity()
export class Backup extends baseEntity {

  @Column()
  name: string;

  @Column()
  setupId: number;
 
  @Column()
  instanceId: string;

  @ManyToOne(() => Setup, (setup) => setup.backups)
  setup:Setup

  @Column({length:'1000', default:'', nullable:true})
  s3ZippedUrl:string

  @Column({length:'1000', default:'', nullable:true})
  s3SqlUrl:string


  @Column({type: 'enum', enum:[ 'daily', 'hourly', 'six-hourly', 'manual', 'manualLimited', 'downloadable']})
  type: string

  @Column({type: 'enum', enum:['s3', 'pod']})
  whereGo: string

  @Column({nullable:true})
  note: string


  @Column({nullable: true})
  expiry: string

  @Column({nullable: true})
  formatedCreatedAt: string


}
