import { Request } from 'express';

export interface ExtendedRequest extends Request {
  user: {
    id: number;
    username: string;
    role: string;
  };
}