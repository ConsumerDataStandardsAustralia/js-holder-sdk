
import { ResponseErrorListV2 } from 'consumer-data-standards/common';
import { Request, Response, NextFunction } from 'express';
import { validate as uuidValidate } from 'uuid';
import { v4 as uuidv4 } from 'uuid';
import { ErrorEntity } from './models/error-entity';
import { getEndpoint, findXFapiRequired, buildErrorMessage } from './cdr-utils';
import { DsbEndpoint } from './models/dsb-endpoint-entity';
import { DsbResponse } from './models/dsb-response';
import { CdrConfig } from './models/cdr-config';
import energyEndpoints from './data/cdr-energy-endpoints.json';
import bankingEndpoints from './data/cdr-banking-endpoints.json';
import commonEndpoints from './data/cdr-common-endpoints.json';
import { EndpointConfig } from './models/endpoint-config';
import { DsbStandardError } from './error-messsage-defintions';



const defaultEndpoints = [...energyEndpoints, ...bankingEndpoints, ...commonEndpoints] as any[];


export function cdrHeaderValidator(config: CdrConfig | undefined): any {
    
    return function headers(req: Request, res: Response, next: NextFunction) {
        console.log("cdrHeaderValidator.....");
        let errorList : ResponseErrorListV2 = {
            errors:  []
        }

        let ep = getEndpoint(req, config);

        if (ep != null) {
            let endpoints : EndpointConfig[] = [];
            if (config == null) {
                
                endpoints = defaultEndpoints as EndpointConfig[];
                config = {
                    endpoints: endpoints
                }
            }
            let minSupportedVersion = findMinSupported(req, config);
            let maxSupportedVersion = findMaxSupported(req, config);
            let xfapiIsRequired: boolean = findXFapiRequired(req);
    
            let requestVersionObject = {
                requestedVersion : 1,
                minrequestedVersion : 1        
            };
    
            errorList = evaluateVersionHeader(req, requestVersionObject, errorList);

            errorList = evaluateMinVersionHeader(req, requestVersionObject, errorList);

            res.setHeader('x-v', maxSupportedVersion);
    
            errorList = evaluateXFapiHeader(req, res, ep, errorList);
            // If the minimum requested version is larger than the requested version, effectively ignore x-min-v
            if (requestVersionObject.minrequestedVersion > requestVersionObject.requestedVersion) {
                requestVersionObject.minrequestedVersion = requestVersionObject.requestedVersion;
            }

            if (errorList != null && errorList.errors.length > 0) {
                console.log("cdrHeaderValidator: Errors found in headers");
                res.status(400).json(errorList);
                return;
            } else {
                // all provided headers are valid. Need to check versioning
                if ( requestVersionObject.requestedVersion < minSupportedVersion
                    ||  requestVersionObject.minrequestedVersion > maxSupportedVersion) {
                    let detail: string =  `minimum version: ${minSupportedVersion}, maximum version: ${maxSupportedVersion}`;
                    buildErrorMessage(DsbStandardError.UNSUPPORTED_VERSION, detail, errorList);
                    res.status(406).json(errorList);
                    return;
                }    
            } 
        }
        if (config?.specifiedEndpointsOnly) {
            console.log("cdrHeaderValidator: specifiedEndpointsOnly=True and endpoint not found");
            // this endpoint was not found
            res.status(404).json(errorList);
            return;
        }
        console.log("cdrHeaderValidator: OK.");
        next(); 
    } 
}

// Evaluate x-v header for presence and valid format. Create an error object for any issues founf
// Set the value versionObj.requestedVersion
function evaluateVersionHeader(req: Request, versionObj: any, errorList: ResponseErrorListV2): ResponseErrorListV2 {
    // return 400;
    // test for missing required header required header is x-v
    if (req.headers == undefined || req.headers['x-v'] == null) {
        errorList = buildErrorMessage(DsbStandardError.MISSING_REQUIRED_HEADER, 'x-v', errorList);
        return errorList;
    }
    // test for invalid header   
    // invalid version, eg negative number, no number: urn:au-cds:error:cds-all:Header/InvalidVersion
    var val = req.headers['x-v'].toString();
    var version = parseInt(val);
    if (isNaN(version) == true) {
        errorList = buildErrorMessage(DsbStandardError.INVALID_VERSION, 'x-v', errorList);
        return errorList;        
    }
       
    var isValid = /^([1-9]\d*)$/.test(val);
    if (isValid == false) {
        errorList = buildErrorMessage(DsbStandardError.INVALID_VERSION, 'x-v', errorList);    
    } else {
        versionObj.requestedVersion = version;
    }
    return errorList;
    
}

// Evaluate x-min-v header for presence and valid format. Create an error object for any issues founf
// Set the value versionObj.minrequestedVersion
function evaluateMinVersionHeader(req: Request,  versionObj: any, errorList: ResponseErrorListV2): ResponseErrorListV2 {
    // return 400;
    // test for missing required header required header is x-v
    if (req.headers == undefined || req.headers['x-min-v'] == null) {
        try {
            var val = req.headers['x-v']?.toString();
            if (val != undefined) {
                var version = parseInt(val);
                versionObj.minSupportedVersion = version;
                versionObj.minrequestedVersion = version;
            }
            else {
                versionObj.minSupportedVersion = 1;
            }          
        } catch (error) {
            versionObj.minSupportedVersion = 1
        }

        return errorList;
    }

    // test for invalid header   
    // invalid version, eg negative number, no number: urn:au-cds:error:cds-all:Header/InvalidVersion
    var xvmin = req.headers['x-min-v'].toString();
    var minimumVersion = parseInt(xvmin);

    if (isNaN(minimumVersion) == true) {
        errorList = buildErrorMessage(DsbStandardError.INVALID_VERSION, 'x-min-v', errorList);
        return errorList;        
    }
       
    var isValid = /^([1-9]\d*)$/.test(xvmin);
    if (isValid == false) {
        errorList = buildErrorMessage(DsbStandardError.INVALID_VERSION, 'x-min-v', errorList);
        
    } else {
        versionObj.minrequestedVersion = minimumVersion;
    }
    return errorList;
    
}

// Set the value for x-fapi-interaction-id
// If an invalid value is passed with the request, return error object
function evaluateXFapiHeader(req: Request, res: Response, ep: DsbEndpoint, errorList: ResponseErrorListV2): ResponseErrorListV2 {
    // test is header is in request
    if (ep != null) {
        if (req.headers == null || req.headers['x-fapi-interaction-id'] == null) {
            const newUuid = uuidv4();
            res.setHeader('x-fapi-interaction-id', newUuid);
        } else {
            const v4Uuid = req.headers['x-fapi-interaction-id'].toString();
            if (uuidValidate(v4Uuid) === true) {
                res.setHeader('x-fapi-interaction-id', v4Uuid);
            } else {
                errorList = buildErrorMessage(DsbStandardError.INVALID_HEADER, 'x-fapi-interaction-id', errorList);
            }      
        }
    }
    return errorList;
}

function findMinSupported(req: Request, options: CdrConfig): number {
    try {
        let errorList : ResponseErrorListV2 = {
            errors:  []
        }
        let dsbEndpoint = getEndpoint(req, options) as DsbEndpoint;
        const endpoints = options.endpoints;
        var idx = endpoints.findIndex(x => x.requestPath == dsbEndpoint.requestPath);
        var ep = endpoints[idx];
        return ep?.minSupportedVersion as number;
    }
    catch (e) {
        return 1;
    }
}

function findMaxSupported(req: Request, options: CdrConfig): number {
    try {
        let errorList : ResponseErrorListV2 = {
            errors:  []
        }
        let dsbEndpoint = getEndpoint(req, options) as DsbEndpoint;
        const endpoints = options.endpoints;
        var idx = endpoints.findIndex(x => x.requestPath == dsbEndpoint.requestPath);
        let ep = endpoints[idx];
        return ep?.maxSupportedVersion as number;
    } catch(e) {
        return 1;
    }
}

function isJsonString(str: string): boolean {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}