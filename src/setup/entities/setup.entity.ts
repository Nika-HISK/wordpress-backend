import { baseEntity } from 'src/base/entities/base.entity';
import { User } from 'src/user/entities/user.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity()
export class Setup extends baseEntity {
  @Column()
  wpAdminUser: string;

  @Column()
  wpAdminPassword: string;

  @Column()
  wpAdminEmail: string;

  @Column()
  siteTitle: string;

  @Column({unique:true})
  instanceDir: string;

  @Column()
  instancePort:number

  @ManyToOne(() => User, (user) => user.setup)
  @JoinColumn({ name: 'userId' }) 
  user: User;

}
