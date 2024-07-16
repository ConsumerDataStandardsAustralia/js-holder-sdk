import { CdrUser } from "./user"
import { Request } from 'express';

export interface IUserService {   
    getUser(req?: Request): CdrUser | undefined;
}