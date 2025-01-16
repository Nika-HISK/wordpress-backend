import { baseEntity } from 'src/base/entities/base.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { Setup } from './setup.entity';

@Entity()
export class Redirect extends baseEntity {
  @Column()
  setupId: number;

  @Column()
  oldUrl: string;

  @Column()
  newUrl: string;

  @Column()
  statusCode: 301 | 302;

  @ManyToOne(() => Setup, (setup) => setup.redirects, { cascade: true })
  setup: Setup;
}
