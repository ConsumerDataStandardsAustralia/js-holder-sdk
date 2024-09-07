import { ResponseErrorListV2 } from "consumer-data-standards/common";
import { buildErrorMessage, getEndpoint } from "./cdr-utils";
import { Request, Response, NextFunction } from 'express';
import { CdrConfig } from "./models/cdr-config";
import energyEndpoints from './data/cdr-energy-endpoints.json';
import bankingEndpoints from './data/cdr-banking-endpoints.json';
import commonEndpoints from './data/cdr-common-endpoints.json';
import { EndpointConfig } from "./models/endpoint-config";
import { DsbEndpoint } from "./models/dsb-endpoint-entity";
import { DsbStandardError } from "./error-messsage-defintions";

const defaultEndpoints = [...energyEndpoints, ...bankingEndpoints, ...commonEndpoints] as DsbEndpoint[];

export function cdrEndpointValidator(config: CdrConfig | undefined): any {

    return function endpoint(req: Request, res: Response, next: NextFunction): any {
        console.log("cdrEndpointValidator.....");

        let errorList: ResponseErrorListV2 = {
            errors: []
        }
        // Don't need to validate endpoints if the specifiedEndpointsOnly=false has been set
        // This will effectively bypass this function
        if (config?.specifiedEndpointsOnly == null || config.specifiedEndpointsOnly == true) {
            let returnEP = getEndpoint(req, config);
            // determine if this could be an endpoint, ie it is one defined by the DSB
            let defaultConfig :CdrConfig = {
                endpoints: defaultEndpoints,
                basePath: config?.basePath
            } 
            let isDsbEndpoint = getEndpoint(req, defaultConfig) != null;
            console.log(`isDsbEndpoint=${isDsbEndpoint}`);
            if (!isDsbEndpoint) {
                console.log(`cdrEndpointValidator: No CDR endpoint found for url ${req.url}`);
                buildErrorMessage(DsbStandardError.RESOURCE_NOT_FOUND, 'This endpoint is not a CDR endpoint', errorList)
                   res.status(404).json(errorList); 
                return;  
            }
            if (returnEP == null) {
                console.log(`cdrEndpointValidator: Valid endpoint but has not been implemented: ${req.url}`);
                buildErrorMessage(DsbStandardError.RESOURCE_NOT_IMPLEMENTED, 'This endpoint has not been implemented', errorList)
                res.status(404).json(errorList);
                return;
            }
        }
        console.log("cdrEndpointValidator: OK.");
        next();
    }

}