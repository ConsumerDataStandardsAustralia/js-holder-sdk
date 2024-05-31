
import { Request, Response, NextFunction } from 'express';
import { userHasAuthorisedForAccount, getEndpoint, scopeForRequestIsValid } from './cdr-utils';
import { IUserService } from './models/user-service.interface';
import { ResponseErrorListV2 } from 'consumer-data-standards/common';


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
            var accountIds;
            // evaluate the request body
            if (req.method == 'POST') {
                let reqBody: any = req?.body;
                if (reqBody?.data == null) {
                    console.log("cdrResourceValidator: Invalid request body. Missing property: data");
                    errorList.errors.push({ code: 'urn:au-cds:error:cds-all:Field/Missing', title: 'Missing required field', detail: 'data' });
                    res.status(400).json(errorList);
                    return;  
                }
                if (reqBody?.data?.accountIds == null && reqBody?.data.servicePointIds == null) {
                    console.log("cdrResourceValidator: Invalid request body. Missing property: data.accountIds");
                    errorList.errors.push({ code: 'urn:au-cds:error:cds-all:Field/Missing', title: 'Missing required field', detail: 'data.accountIds' });
                    res.status(400).json(errorList);
                    return;  
                }
                if (Array.isArray(reqBody?.data?.accountIds) == false && Array.isArray(reqBody?.data?.servicePointIds) == false) {
                    console.log("cdrResourceValidator: Invalid request body. Account Ids must be an array");
                    errorList.errors.push({ code: 'urn:au-cds:error:cds-all:Field/Invalid', title: 'Invalid field', detail: 'data.accountIds' });
                    res.status(400).json(errorList);
                    return;  
                }    
            }
            // check the requested accountId or other url parameters specific to a logged in user
            if (userHasAuthorisedForAccount(req, user) == false) {
                console.log("cdrResourceValidator: user not authorised, or required user not found");
                errorList.errors.push({ code: 'urn:au-cds:error:cds-all:Resource/Invalid', title: 'Invalid Resource', detail: `${req.url}` });
                res.status(404).json(errorList);
                return;                    
            } 
            console.log("cdrResourceValidator: OK.");  
            next();    
    } 
}
