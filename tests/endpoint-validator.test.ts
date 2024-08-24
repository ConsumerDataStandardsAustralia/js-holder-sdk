
import { CdrConfig } from '../src/models/cdr-config';
import { EndpointConfig } from '../src/models/endpoint-config';
import { IUserService } from '../src/models/user-service.interface';
import { CdrUser } from '../src/models/user';
import { Request, Response, NextFunction } from 'express';
import { cdrEndpointValidator } from '../src/cdr-endpoint-validator';
import { ResponseErrorListV2 } from 'consumer-data-standards/energy';
import { buildErrorMessage } from '../src/cdr-utils';
import { DsbStandardError } from '../src/error-messsage-defintions';

describe('Endpoint validation middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction = jest.fn();
    let mockStatus: Partial<Response>;
    let standardsVersion = '/cds-au/v1';

    let mockUserService: IUserService = {
        getUser(): CdrUser {
            let usr : CdrUser = {
                accountsEnergy:['12345'],
                scopes_supported: ['enery:read']
            }
            return usr;
        }
    }

    beforeEach(() => {
        nextFunction = jest.fn();
        mockStatus = {
            send: jest.fn(),
            setHeader: jest.fn(),
            json: jest.fn(),
        }
        mockRequest = {
            url: '/energy/electricity/servicepoints'
        };
        mockResponse = {
            send: jest.fn(),
            setHeader: jest.fn(),
            json: jest.fn(),
            status: jest.fn().mockImplementation(() => mockStatus)
        };
    });

    test('Test valid endpoint', async () => {

        let endpoints: EndpointConfig[] = [{
            "requestType": "GET",
            "requestPath": "/energy/electricity/servicepoints",
            "minSupportedVersion": 1,
            "maxSupportedVersion": 4
        }]
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/electricity/servicepoints`
        };
        let authConfig: CdrConfig = {

            endpoints: endpoints
        }
        let auth = cdrEndpointValidator(authConfig);
        auth(mockRequest as Request, mockResponse as Response, nextFunction as NextFunction);
        expect(nextFunction).toBeCalledTimes(1);
    });

    test('Test invalid endpoint', async () => {

        let endpoints: EndpointConfig[] = [{
            "requestType": "GET",
            "requestPath": "/energy/electricity/servicepoints",
            "minSupportedVersion": 1,
            "maxSupportedVersion": 4
        }]
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/electricity/all-accounts`
        };
        let config: CdrConfig = {

            endpoints: endpoints
        }
        let returnedErrors: any = buildErrorMessage(DsbStandardError.RESOURCE_NOT_FOUND, 'This endpoint is not a CDR endpoint')

        // let returnedErrors: ResponseErrorListV2 = {
        //     errors: [ {
        //         code: 'urn:au-cds:error:cds-all:Resource/NotFound',
        //         title: 'NotFound',
        //         detail: 'This endpoint is not a CDR endpoint'
        //     }]
        // };
        let auth = cdrEndpointValidator(config);
        auth(mockRequest as Request, mockResponse as Response, nextFunction as NextFunction);
        expect(mockStatus.json).toBeCalledWith(returnedErrors);
        expect(mockResponse.status).toBeCalledWith(404);
    });

    test('Test valid endpoint - but not implemented', async () => {

        let endpoints: EndpointConfig[] = [{
            "requestType": "GET",
            "requestPath": "/energy/electricity/servicepoints",
            "minSupportedVersion": 1,
            "maxSupportedVersion": 4
        }]
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/electricity/servicepoints/3456777`
        };
        let config: CdrConfig = {

            endpoints: endpoints
        }
        let returnedErrors: any = buildErrorMessage(DsbStandardError.RESOURCE_NOT_IMPLEMENTED, 'This endpoint has not been implemented')
        let auth = cdrEndpointValidator(config);
        auth(mockRequest as Request, mockResponse as Response, nextFunction as NextFunction);
        expect(mockStatus.json).toBeCalledWith(returnedErrors);
        expect(mockResponse.status).toBeCalledWith(404);
    });

    test('Test invalid endpoint with specifiedEndpointsOnly=false', async () => {

        let endpoints: EndpointConfig[] = [{
            "requestType": "GET",
            "requestPath": "/energy/electricity/servicepoints",
            "minSupportedVersion": 1,
            "maxSupportedVersion": 4
        }]
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/electricity/all-accounts`
        };
        let config: CdrConfig = {
            endpoints: endpoints,
            specifiedEndpointsOnly: false
        }
        let auth = cdrEndpointValidator(config);
        auth(mockRequest as Request, mockResponse as Response, nextFunction as NextFunction);
        expect(nextFunction).toBeCalledTimes(1);
    });

    test('Not implemented endpoint with specifiedEndpointsOnly=true should return 404', async () => {

        let endpoints: EndpointConfig[] = [{
            "requestType": "GET",
            "requestPath": "/energy/electricity/servicepoints",
            "minSupportedVersion": 1,
            "maxSupportedVersion": 4
        }]
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/electricity/servicepoints/234555`
        };
        let config: CdrConfig = {
            endpoints: endpoints,
            specifiedEndpointsOnly: true
        }
        let returnedErrors: any = buildErrorMessage(DsbStandardError.RESOURCE_NOT_IMPLEMENTED, 'This endpoint has not been implemented')
        let auth = cdrEndpointValidator(config);
        auth(mockRequest as Request, mockResponse as Response, nextFunction as NextFunction);
        expect(mockStatus.json).toBeCalledWith(returnedErrors);
        expect(mockResponse.status).toBeCalledWith(404);
    });

    test('Not implemented endpoint with specifiedEndpointsOnly=false call next()', async () => {

        let endpoints: EndpointConfig[] = [{
            "requestType": "GET",
            "requestPath": "/energy/electricity/servicepoints",
            "minSupportedVersion": 1,
            "maxSupportedVersion": 4
        }]
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/electricity/servicepoints/234555`
        };
        let config: CdrConfig = {
            endpoints: endpoints,
            specifiedEndpointsOnly: true
        }
        let returnedErrors: any = buildErrorMessage(DsbStandardError.RESOURCE_NOT_IMPLEMENTED, 'This endpoint has not been implemented')

        let auth = cdrEndpointValidator(config);
        auth(mockRequest as Request, mockResponse as Response, nextFunction as NextFunction);
        expect(mockStatus.json).toBeCalledWith(returnedErrors);
        expect(mockResponse.status).toBeCalledWith(404);
    }); 
    
    test('Invalid endpoint with specifiedEndpointsOnly=true should return 404', async () => {

        let endpoints: EndpointConfig[] = [{
            "requestType": "GET",
            "requestPath": "/energy/electricity/servicepoints",
            "minSupportedVersion": 1,
            "maxSupportedVersion": 4
        }]
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/electricity/all-accounts`
        };
        let config: CdrConfig = {
            endpoints: endpoints,
            specifiedEndpointsOnly: true
        }
        let returnedErrors: any = buildErrorMessage(DsbStandardError.RESOURCE_NOT_FOUND, 'This endpoint is not a CDR endpoint')
        let auth = cdrEndpointValidator(config);
        auth(mockRequest as Request, mockResponse as Response, nextFunction as NextFunction);
        expect(mockStatus.json).toBeCalledWith(returnedErrors);
        expect(mockResponse.status).toBeCalledWith(404);
    });    

    test('Invalid endpoint with specifiedEndpointsOnly=false should call next()', async () => {

        let endpoints: EndpointConfig[] = [{
            "requestType": "GET",
            "requestPath": "/energy/electricity/servicepoints",
            "minSupportedVersion": 1,
            "maxSupportedVersion": 4
        }]
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/electricity/all-accounts`
        };
        let config: CdrConfig = {
            endpoints: endpoints,
            specifiedEndpointsOnly: false
        }
        let auth = cdrEndpointValidator(config);
        auth(mockRequest as Request, mockResponse as Response, nextFunction as NextFunction);
        expect(nextFunction).toBeCalledTimes(1);
    });  
   
    test('Call endpoint without basePath when basePath is specified', async () => {

        let endpoints: EndpointConfig[] = [{
            "requestType": "GET",
            "requestPath": "/energy/electricity/servicepoints",
            "minSupportedVersion": 1,
            "maxSupportedVersion": 4
        }]
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/electricity/all-accounts`
        };
        let config: CdrConfig = {
            endpoints: endpoints,
            basePath: "/prod-data"
        }
        let returnedErrors: any = buildErrorMessage(DsbStandardError.RESOURCE_NOT_FOUND, 'This endpoint is not a CDR endpoint')
        let auth = cdrEndpointValidator(config);
        auth(mockRequest as Request, mockResponse as Response, nextFunction as NextFunction);
        expect(mockStatus.json).toBeCalledWith(returnedErrors);
        expect(mockResponse.status).toBeCalledWith(404);
    });  
});
