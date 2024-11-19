import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { Roles } from 'src/auth/guards/roles.guard';
import { Role } from 'src/auth/enum/role.enum';
import { LocalAuthGuard } from 'src/auth/guards/local-auth.guard';
import { UserRepository } from '../repositories/user.repository';


@UseGuards(LocalAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService, private readonly userRepository:UserRepository) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.userService.create(createUserDto);
  }

  @Roles(Role.ADMIN)
  @Get()
  async findAll() {
    return await this.userService.findAll();
  }

  @Patch(':id/change-password')
  changePassword(@Param('id') id: string, @Body('password') currentPassword: string,  @Body('password') newPassword: string) {
    return this.userService.updatePassword(Number(id),currentPassword ,newPassword);
  }

  @Get(':id')
  async findOne(@Param('id') id: string,  @Body() newPassword: string) {
    return await this.userService.findOne(+id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return await this.userService.update(+id, updateUserDto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.userService.remove(+id);
  }
}
