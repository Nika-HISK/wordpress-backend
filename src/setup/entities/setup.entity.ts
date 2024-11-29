import { baseEntity } from 'src/base/entities/base.entity';
import { User } from 'src/user/entities/user.entity';
import { wpPlugin } from 'src/wpcli/entities/wpPlugin.entity';
import { wpTheme } from 'src/wpcli/entities/wpTheme.entity';
import { WpUser } from 'src/wpcli/entities/wpUser.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

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
  containerName: string;

  @Column()
  phpVersion:string

  @Column()
  instancePort:number

  @Column()
  userId:number

  @ManyToOne(() => User, (user) => user.setup)
  @JoinColumn({ name: 'userId' }) 
  user: User;

  @OneToMany(() => wpPlugin, (wpPlugin) => wpPlugin.setup)
  @JoinColumn({ name: 'setupId' }) 
  wpPlugins: wpPlugin[];

  @OneToMany(() => wpTheme, (wpTheme) => wpTheme.setup)
  @JoinColumn({ name: 'setupId' }) 
  wpThemes: wpTheme[];

  @OneToMany(() => WpUser, (wpUser) => wpUser.setup)
  @JoinColumn({ name: 'setupId' }) 
  wpUsers: WpUser[];
}
