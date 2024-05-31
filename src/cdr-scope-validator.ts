
import { Request, Response, NextFunction } from 'express';
import { scopeForRequestIsValid } from './cdr-utils';
import { ResponseErrorListV2 } from 'consumer-data-standards/common';
import { IUserService } from './models/user-service.interface';

export function cdrScopeValidator(userService: IUserService): any {

    return function token(req: Request, res: Response, next: NextFunction): any {
        console.log("cdrScopeValidator.....");
        let errorList: ResponseErrorListV2 = {
            errors: []
        }
        let user = userService.getUser(req);
        if (scopeForRequestIsValid(req, user?.scopes_supported) == false) {
            console.log("cdrScopeValidator: scopes for request are invalid.");
            errorList.errors.push({code: 'urn:au-cds:error:cds-all:Authorisation/InvalidConsent', title: 'InvalidConsent', detail: 'Invalid scope'})
            res.status(403).json(errorList);
            return;         
        } 
        console.log("cdrScopeValidator: OK.");
        next();
    }
}
