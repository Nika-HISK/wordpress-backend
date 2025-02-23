import { Role } from 'src/auth/guard/enum/role.enum';
import { baseEntity } from 'src/base/entities/base.entity';
import { FileEntity } from 'src/files/entities/file.entity';
import { Setup } from 'src/setup/entities/setup.entity';
import { Column, Entity, OneToMany } from 'typeorm';

@Entity()
export class User extends baseEntity {
  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
  })
  role: Role;

  @Column({default:false})
  banned:boolean 
  
  @OneToMany(() => Setup, (setup) => setup.user, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  setup: Setup[];

  @OneToMany(() => FileEntity, (file) => file.user, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  files: FileEntity[];

}
