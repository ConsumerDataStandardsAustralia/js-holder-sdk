
import { Request, Response, NextFunction } from 'express';
import { userHasAuthorisedForAccount, getEndpoint, scopeForRequestIsValid, buildErrorMessage } from './cdr-utils';
import { IUserService } from './models/user-service.interface';
import { ResponseErrorListV2 } from 'consumer-data-standards/common';
import { DsbStandardError } from './error-messsage-defintions';


export function cdrResourceValidator(userService: IUserService): any {

    return async function auth(req: Request, res: Response, next: NextFunction) {
            console.log("cdrResourceValidator.....");
            let errorList: ResponseErrorListV2 = {
                errors: []
            }
            let user = userService.getUser(req);
            let ep = getEndpoint(req, undefined);
            if (ep == null) {
                console.log("cdrResourceValidator: No endpoint found. Nothing to evaluate");  
                next(); 
                return;              
            };
            // evaluate the request body
            if (req.method == 'POST') {
                let reqBody: any = req?.body;
                if (reqBody?.data == null) {
                    console.log("cdrResourceValidator: Invalid request body. Missing property: data");
                    errorList = buildErrorMessage(DsbStandardError.MISSING_REQUIRED_FIELD, 'data' ,errorList);
                    res.status(400).json(errorList);
                    return;  
                }
                if (reqBody?.data?.accountIds == null && reqBody?.data.servicePointIds == null) {
                    console.log("cdrResourceValidator: Invalid request body. Missing resource identifiers.");
                    errorList = buildErrorMessage(DsbStandardError.MISSING_REQUIRED_FIELD, 'data' ,errorList);
                    res.status(400).json(errorList);
                    return;  
                }
                if (Array.isArray(reqBody?.data?.accountIds) == false && Array.isArray(reqBody?.data?.servicePointIds) == false) {
                    console.log("cdrResourceValidator: Invalid request body. resource identifiers must be an array");
                    errorList = buildErrorMessage(DsbStandardError.INVALID_FIELD, 'data.accountIds' ,errorList);
                    res.status(400).json(errorList);
                    return;  
                }    
            }
            // check the requested accountId or other url parameters specific to a logged in user
            if (userHasAuthorisedForAccount(req, user) == false) {
                console.log("cdrResourceValidator: user not authorised, or required user not found");
                // TODO get the account id for the error message
                if (ep.requestPath.indexOf('/energy') >= 0) {
                    errorList = buildErrorMessage(DsbStandardError.INVALID_ENERGY_ACCOUNT, '' ,errorList);
                }
                if (ep.requestPath.indexOf('/banking') >= 0) {
                    errorList = buildErrorMessage(DsbStandardError.INVALID_BANK_ACCOUNT, '' ,errorList);
                }
                res.status(404).json(errorList);
                return;                    
            } 
            console.log("cdrResourceValidator: OK.");  
            next();    
    } 
}
