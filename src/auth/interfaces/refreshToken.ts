import * as dayjs from 'dayjs';
import { RefreshTokenConstsInterface } from './RefreshTokenConstsInterface.interface';

export const refreshTokenConsts: RefreshTokenConstsInterface = {
  expiration: dayjs().add(14, 'day').toDate(),
};
