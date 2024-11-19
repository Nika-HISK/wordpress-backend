import { RefreshEntity } from 'src/auth/entities/refresh.entity';
import { Role } from 'src/auth/enum/role.enum';
import { baseEntity } from 'src/base/entities/base.entity';
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

  @OneToMany(() => Setup, (setup) => setup.user)
  setup: Setup[];

  @OneToMany(() => RefreshEntity, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshEntity[];
}
