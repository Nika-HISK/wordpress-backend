import { baseEntity } from 'src/base/entities/base.entity';
import { Setup } from 'src/setup/entities/setup.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

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

  @Column({length:'1000'})
  s3Url:string
}
