import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserRepository } from '../repositories/user.repository';
import { Roles } from 'src/auth/guard/jwt-roles.guard';
import { Role } from 'src/auth/guard/enum/role.enum';


@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService, private readonly userRepository:UserRepository) {}

  @Roles(Role.USER, Role.ADMIN)
  @Get('me')
  async me(@Req() req: any) {
    return await this.userService.me(req.user.id)
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.userService.create(createUserDto);
  }

  @Roles(Role.USER)
  @Get()
  async findAll() {
    return await this.userService.findAll();
  }

  @Roles(Role.USER)
  @Patch(':id/change-password')
  changePassword(@Param('id') id: string, @Body('password') currentPassword: string,  @Body('password') newPassword: string) {
    return this.userService.updatePassword(Number(id),currentPassword ,newPassword);
  }

  @Roles(Role.USER)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.userService.findOne(+id);
  }

  @Roles(Role.USER)
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
