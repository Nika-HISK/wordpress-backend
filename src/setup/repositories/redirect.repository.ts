import { Injectable, HttpException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Redirect } from '../entities/redirect.entity';
import { CreateRedirectDto } from '../dto/create-redirect.dto';

@Injectable()
export class RedirectRepository {
  constructor(
    @InjectRepository(Redirect)
    private readonly redirectRepository: Repository<Redirect>,
  ) {}

  async createRedirect(createRedirectDto: CreateRedirectDto): Promise<Redirect> {
    const newRedirect = this.redirectRepository.create(createRedirectDto);
    return await this.redirectRepository.save(newRedirect);
  }

  async findAll(): Promise<Redirect[]> {
    return await this.redirectRepository.find();
  }

  async findBySetupId(setupId: number): Promise<Redirect[]> {
    const redirects = await this.redirectRepository.find({
      where: { setupId },
    });
    if (!redirects || redirects.length === 0) {
      throw new HttpException(`No redirects found for setupId ${setupId}`, 404);
    }
    return redirects;
  }

  async findOne(id: number): Promise<Redirect> {
    const redirect = await this.redirectRepository.findOne({
      where: { id },
    });
    if (!redirect) {
      throw new HttpException(`Redirect with ID ${id} not found`, 404);
    }
    return redirect;
  }

  async deleteRedirect(id: number): Promise<void> {
    const result = await this.redirectRepository.delete(id);
    if (!result.affected) {
      throw new HttpException(`Redirect with ID ${id} not found`, 404);
    }
  }

  async updateRedirect(
    id: number,
    updateData: Partial<CreateRedirectDto>,
  ): Promise<Redirect> {
    const redirect = await this.findOne(id);
    Object.assign(redirect, updateData);
    return await this.redirectRepository.save(redirect);
  }
}
