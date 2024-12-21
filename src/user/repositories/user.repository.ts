import { InjectRepository } from "@nestjs/typeorm";
import { User } from "../entities/user.entity";
import { Repository } from "typeorm";
import { CreateUserDto } from "../dto/create-user.dto";
import * as bcrypt from 'bcrypt';
import { error } from "console";
import { UpdateUserDto } from "../dto/update-user.dto";
import { NotFoundException } from "@nestjs/common";



export class UserRepository {

    constructor(
        @InjectRepository(User)
        private readonly userRepository:Repository<User>
    ) {}

    async me(userId: number) {
      return await this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.setup', 'setup')
      .where('user.id = :userId', { userId })
      .select([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'setup.id',
        'setup.podName',
        'setup.phpVersion',
        'setup.port',
        'setup.siteTitle',
        'setup.nameSpace',
        'setup.wpVersion',
        'setup.nodeIp',
        'setup.fullIp'
      ])
      .getOne();
    }
  

    async create(createUserDto: CreateUserDto) {
        let hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        const confitmHashedPassword = await bcrypt.hash(createUserDto.confirmPassword, 10);

        if(hashedPassword = confitmHashedPassword) {

        const newUser = new User();
        newUser.firstName = createUserDto.firstName
        newUser.lastName = createUserDto.lastName
        newUser.email = createUserDto.email;
        newUser.password = hashedPassword;
         this.userRepository.save(newUser);

         return 'user succesfully registered'

    } else throw new error('password does not match confirmPassword')
    
      }

      async findAll() {
        return this.userRepository.find()
      }

      async findOne(id: number) {
        return await this.userRepository
          .createQueryBuilder('user')
          .leftJoinAndSelect('user.setup', 'setup') 
          .where('user.id = :id', { id })
          .getOne();
      }
      

      async findOneByEmail(email:string) {
        return await this.userRepository.findOneBy({email})


      }
      
      async update(id: number, updateUserDto: Partial<User>) {
        const user = await this.findOne(id); 
        if (!user) {
          throw new Error(`User with ID ${id} not found`); 
        }
        await this.userRepository.update(id, updateUserDto);
        return this.findOne(id); 
      }

      async delete(id:number) {
        return this.userRepository.delete(id)
      }

      async updatePassword(id: number, currentPassword:string, newPassword: string) {
        const user = await this.userRepository.findOneBy({ id });

        if (!user) {
            throw new NotFoundException('User not found');
          }

          let currentHashed = await bcrypt.hash(currentPassword, 10);
          const newHashedPassword = await bcrypt.hash(newPassword, 10);


          
        if(currentHashed == user.password && newHashedPassword != user.password) {
            user.password = newHashedPassword;
    
            return this.userRepository.save(user);
        }
      }

      
}