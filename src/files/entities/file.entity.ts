import { NumberType } from "aws-sdk/clients/pinpointsmsvoicev2";
import { baseEntity } from "src/base/entities/base.entity";
import { User } from "src/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class FileEntity extends baseEntity {

    @Column()
    url: string;
  
    @Column()
    key: string;
  
    @Column()
    bucket: string;
  
    @Column()
    fileName: string;

    @ManyToOne(() => User, (user) => user.files)
    @JoinColumn({name:'userId'})
    user:User

    @Column({nullable:true})
    userId:number


}
