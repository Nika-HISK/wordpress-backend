import { baseEntity } from "src/base/entities/base.entity";
import { Setup } from "src/setup/entities/setup.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";


@Entity()
export class WpUser extends baseEntity {

    @Column()
    first_name:string

    @Column()
    last_name:string

    @Column()
    user_email:string

    @Column()
    roles:string

    @ManyToOne(() => Setup, (setup) => setup.wpUsers, { onDelete: 'CASCADE', nullable:true})
    @JoinColumn({ name: 'setupId' })
    setup: Setup;

    @Column()
    setupId:number


}