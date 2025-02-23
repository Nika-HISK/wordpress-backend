import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { error } from 'console';
import { UpdateUserDto } from '../dto/update-user.dto';
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';

export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async me(userId: number) {
    const user = await this.userRepository
      .createQueryBuilder('user')
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
        'setup.wpfullIp',
        'setup.dbName',
        'setup.siteName',
        'setup.phpAdminFullIp'
      ])
      .getOne();

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user;
  }

  async create(createUserDto: CreateUserDto) {
    const { firstName, lastName, email, password, confirmPassword } = createUserDto;

    if (password !== confirmPassword) {
      throw new HttpException('Passwords do not match', HttpStatus.BAD_REQUEST);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User();
    newUser.firstName = firstName;
    newUser.lastName = lastName;
    newUser.email = email;
    newUser.password = hashedPassword;

    await this.userRepository.save(newUser);
    return 'User successfully registered';
  }

  async findAll() {
    const users = await this.userRepository.find();
    if (!users || users.length === 0) {
      throw new HttpException('No users found', 404);
    }
    return users;
  }

  async findOne(id: number) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.setup', 'setup')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findOneByEmail(email: string) {
    return this.userRepository.findOneBy({ email }); 
  }

  async update(id: number, updateUserDto: Partial<User>) {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.userRepository.update(id, updateUserDto);
    return this.findOne(id);
  }

  async delete(id: number) {
    const result = await this.userRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return { message: `User with ID ${id} successfully deleted` };
  }

  async updatePassword(
    id: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.findOne(id);

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new HttpException('Current password is incorrect', 400);
    }

    const isNewPasswordSame = await bcrypt.compare(newPassword, user.password);
    if (isNewPasswordSame) {
      throw new HttpException(
        'New password cannot be the same as the current password',
        400,
      );
    }

    user.password = await bcrypt.hash(newPassword, 10);
    return this.userRepository.save(user);
  }
}
