import { baseEntity } from "src/base/entities/base.entity";
import { User } from "src/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";



@Entity()
export class RefreshEntity extends baseEntity {

    @Column()
    refreshToken:string

    @Column({type:'timestamp'})
    expiresAt: Date;
      

    @Column()
    userId:number

    @ManyToOne(() => User, (user) => user.refreshTokens)
    @JoinColumn({ name: 'userId' }) 
    user: User;
}