import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { RefreshEntity } from "../entities/refresh.entity";
import { Repository } from "typeorm";
import { refreshTokenConsts } from "../interfaces/refreshToken";


@Injectable()
export class RefreshRepository {

    constructor(
        @InjectRepository(RefreshEntity)
        private readonly refresRepository:Repository<RefreshEntity>
    ) {}

    async createAndSaveRefreshToken(userId: number, refreshToken: string) {
        const expirationDate = refreshTokenConsts.expiration;  
        
        const refreshEntity = new RefreshEntity();
        refreshEntity.refreshToken = refreshToken;
        refreshEntity.expiresAt = expirationDate;  
        refreshEntity.userId = userId;
      
        await this.refresRepository.save(refreshEntity);
      }

}