import { Injectable } from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class UserService {

  constructor(private readonly userRepository:UserRepository) {}

  async me(userId: number) {
    return await this.userRepository.me(userId)
  }

  async create(createUserDto: CreateUserDto) {
    return await this.userRepository.create(createUserDto);
  }

  async findAll() {
    return await this.userRepository.findAll();
  }

  async findOne(id: number) {
    return await this.userRepository.findOne(id);
  }

  async findOneByEmail(email: string) {
    return await this.userRepository.findOneByEmail(email);
  }


  async update(id: number, updateUserDto: UpdateUserDto) {
    return await this.userRepository.update(id, updateUserDto);
  }

  async remove(id: number) {
    return await this.userRepository.delete(id);
  }

  async updatePassword(id:number, newPassword, currentPassword) {
    return this.userRepository.updatePassword(id,currentPassword , newPassword)
  }
}
