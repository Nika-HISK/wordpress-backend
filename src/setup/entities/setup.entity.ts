import { Backup } from 'src/backup/entities/backup.entity';
import { baseEntity } from 'src/base/entities/base.entity';
import { User } from 'src/user/entities/user.entity';
import { wpPlugin } from 'src/wpcli/entities/wpPlugin.entity';
import { wpTheme } from 'src/wpcli/entities/wpTheme.entity';
import { WpUser } from 'src/wpcli/entities/wpUser.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Redirect } from './redirect.entity';

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

  @Column({ unique: true })
  podName: string;

  @Column()
  nameSpace: string;

  @Column()
  port: number;

  @Column()
  sqlPodName: string;

  @Column()
  siteName: string;

  @Column()
  wpDeployment: string;

  @Column()
  sqlDeployment: string;

  @Column()
  wpReplicaSet: string;

  @Column()
  instanceId: string;

  @Column()
  sqlReplicaSet: string;

  @Column()
  userId: number;

  @Column()
  nodeIp: string;

  @Column()
  wpfullIp: string;

  @Column()
  phpAdminFullIp: string;

  @Column()
  mysqlPassword: string;

  @Column({ default: '8.2' })
  currentPhpVersion: string;

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

  @OneToMany(() => Backup, (backups) => backups.setup)
  backups: Backup[];

  @OneToMany(() => Redirect, (redirect) => redirect.setup)
  redirects: Redirect[];
}
