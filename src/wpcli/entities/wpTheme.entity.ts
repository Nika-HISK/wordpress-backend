import { baseEntity } from 'src/base/entities/base.entity';
import { Setup } from 'src/setup/entities/setup.entity';
import { Column, Entity, JoinColumn, ManyToOne, } from 'typeorm';

@Entity()
export class wpTheme extends baseEntity {

@Column()
name:string

@Column()
status:string

@Column()
update:string

@Column()
version:string

@Column()
update_version:string

@Column()
auto_update:string

@ManyToOne(() => Setup, (setup) => setup.wpThemes, { onDelete: 'CASCADE', nullable:true})
@JoinColumn({ name: 'setupId' })
setup: Setup;

@Column()
setupId:number

}
