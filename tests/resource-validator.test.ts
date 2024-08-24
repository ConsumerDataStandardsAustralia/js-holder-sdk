import { ResponseErrorListV2 } from 'consumer-data-standards/common';
import { cdrScopeValidator } from '../src/cdr-scope-validator';
import { CdrConfig } from '../src/models/cdr-config';
import { EndpointConfig } from '../src/models/endpoint-config';
import { cdrResourceValidator } from '../src/cdr-resource-validator';
import { CdrUser } from '../src/models/user';
import { IUserService } from '../src/models/user-service.interface';
import { Request, Response, NextFunction } from 'express';

describe('Resource validation middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction = jest.fn();
    let mockStatus: Partial<Response>;
    let standardsVersion = '/cds-au/v1';

    let mockEnergyUserService: IUserService = {
        getUser(): CdrUser | undefined {
            let usr : CdrUser = {
                accountsEnergy:['12345'],
                accountsBanking:['87582'],
                energyServicePoints: ['ABC1234', 'DEF5674'],
                scopes_supported: ['energy:billing:read', 'energy:accounts.basic:read']
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

    test('Without user object - resource in url', async () => {

        let endpoints: EndpointConfig[] = [{
            "requestType": "GET",
            "requestPath": "/energy/electricity/servicepoints/{servicePointId}",
            "minSupportedVersion": 1,
            "maxSupportedVersion": 4
        }]
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/electricity/servicepoints/123453`
        };
        let authConfig: CdrConfig = {

            endpoints: endpoints
        }
        let userSvc: IUserService = {
            getUser(): CdrUser | undefined {
                return undefined;
            }
        }

        let auth = cdrResourceValidator(userSvc);
        auth(mockRequest, mockResponse,  nextFunction);
        expect(mockResponse.status).toBeCalledWith(404);
    });

    test('Access account - valid case', async () => {

        let endpoints: EndpointConfig[] = [{
            "requestType": "GET",
            "requestPath": "/energy/accounts/{accountId}/balance",
            "minSupportedVersion": 1,
            "maxSupportedVersion": 4
        }]
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/accounts/12345/balance`,
            headers: {
                authorization: "Bearer ytweryuuyuyiuyyuwer"
            }
        };
        let authConfig: CdrConfig = {

            endpoints: endpoints
        }
        let auth = cdrResourceValidator(mockEnergyUserService);
        auth(mockRequest, mockResponse,  nextFunction);
        expect(nextFunction).toBeCalledTimes(1);
    });

    test('Access account - valid case 2', async () => {

        let endpoints: EndpointConfig[] = [{
            "requestType": "GET",
            "requestPath": "/energy/accounts/",
            "minSupportedVersion": 1,
            "maxSupportedVersion": 4
        }]
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/accounts/`,
            headers: {
                authorization: "Bearer ytweryuuyuyiuyyuwer"
            }
        };
        let authConfig: CdrConfig = {

            endpoints: endpoints
        }

        //let user = mockUserService.getUser();
        let auth = cdrResourceValidator(mockEnergyUserService);
        auth(mockRequest, mockResponse,  nextFunction);
        expect(nextFunction).toBeCalledTimes(1);
    });

    test('Access account - Invalid case', async () => {

        let endpoints: EndpointConfig[] = [{
            "requestType": "GET",
            "requestPath": "/energy/accounts/{accountId}/balance",
            "minSupportedVersion": 1,
            "maxSupportedVersion": 4
        }]
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/accounts/123456/balance`,
            headers: {
                authorization: "Bearer ytweryuuyuyiuyyuwer"
            }
        };

        let auth = cdrResourceValidator(mockEnergyUserService);
        auth(mockRequest, mockResponse,  nextFunction);
        expect(mockResponse.status).toBeCalledWith(404);
    }); 
    
    test('Access account - POST request with valid ids', async () => {
        let requestBody = {
            "data": {
              "accountIds": [
                "12345"
              ]
            },
            "meta": {}
          } 
        mockRequest = {
            method: 'POST',
            url: `${standardsVersion}/energy/accounts/invoices`,
            headers: {
                authorization: "Bearer ytweryuuyuyiuyyuwer"
            },
            body: requestBody
        };

        let auth = cdrResourceValidator(mockEnergyUserService);
        auth(mockRequest, mockResponse,  nextFunction);
        expect(nextFunction).toBeCalledTimes(1);
    }); 

    test('Access account - POST request with invalid ids', async () => {
        let requestBody = {
            "data": {
              "accountIds": [
                "12345AB"
              ]
            },
            "meta": {}
          } 
        mockRequest = {
            method: 'POST',
            url: `${standardsVersion}/banking/payments/scheduled`,
            headers: {
                authorization: "Bearer ytweryuuyuyiuyyuwer"
            },
            body: requestBody
        };

        let auth = cdrResourceValidator(mockEnergyUserService);
        auth(mockRequest, mockResponse,  nextFunction);
        expect(mockResponse.status).toBeCalledWith(404);
    });  
    
    test('Service Points - POST request with valid ids', async () => {
        let requestBody = {
            "data": {
              "servicePointIds": [
                "ABC1234"
              ]
            },
            "meta": {}
          } 
        mockRequest = {
            method: 'POST',
            url: `${standardsVersion}/energy/electricity/servicepoints/der`,
            headers: {
                authorization: "Bearer ytweryuuyuyiuyyuwer"
            },
            body: requestBody
        };

        let auth = cdrResourceValidator(mockEnergyUserService);
        auth(mockRequest, mockResponse,  nextFunction);
        expect(nextFunction).toBeCalledTimes(1);
    });     

    test('Service Points - POST request with invalid ids', async () => {
        let requestBody = {
            "data": {
              "servicePointIds": [
                "12345AB"
              ]
            },
            "meta": {}
          } 
        mockRequest = {
            method: 'POST',
            url: `${standardsVersion}/energy/electricity/servicepoints/der`,
            headers: {
                authorization: "Bearer ytweryuuyuyiuyyuwer"
            },
            body: requestBody
        };

        let auth = cdrResourceValidator(mockEnergyUserService);
        auth(mockRequest, mockResponse,  nextFunction);
        expect(mockResponse.status).toBeCalledWith(404);
    });  
    
    test('Service Points - POST request with empty id array', async () => {
        let requestBody = {
            "data": {
              "servicePointIds": []
            },
            "meta": {}
          } 
        mockRequest = {
            method: 'POST',
            url: `${standardsVersion}/energy/electricity/servicepoints/der`,
            headers: {
                authorization: "Bearer ytweryuuyuyiuyyuwer"
            },
            body: requestBody
        };

        let auth = cdrResourceValidator(mockEnergyUserService);
        auth(mockRequest, mockResponse,  nextFunction);
        expect(mockResponse.status).toBeCalledWith(404);
    });  
 
    test('Not a CDR endpoint calls next()', async () => {

        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/notaserviceendpoint`,
            headers: {
                authorization: "Bearer ytweryuuyuyiuyyuwer"
            },
        };

        let auth = cdrResourceValidator(mockEnergyUserService);
        auth(mockRequest, mockResponse,  nextFunction);
        expect(nextFunction).toBeCalledTimes(1);
    });  

    test('Missing data body returns Field/Missing error', async () => {
        let requestBody = {
            "meta": {}
          } 
        mockRequest = {
            method: 'POST',
            url: `${standardsVersion}/energy/electricity/servicepoints/der`,
            headers: {
                authorization: "Bearer ytweryuuyuyiuyyuwer"
            },
            body: requestBody
        };
        let returnedErrors: ResponseErrorListV2 = {
            errors: [ {
                code: 'urn:au-cds:error:cds-all:Field/Missing',
                title: 'Missing Required Field',
                detail: 'data'
            }]
        };
        let auth = cdrResourceValidator(mockEnergyUserService);
        auth(mockRequest as Request, mockResponse as Response, nextFunction as NextFunction);
        expect(mockStatus.json).toBeCalledWith(returnedErrors);
        expect(mockResponse.status).toBeCalledWith(400);
    });
    

    test('Missing data.accountsId body returns Field/Missing error', async () => {
        let requestBody = {
            data: {},
            "meta": {}
          } 
        mockRequest = {
            method: 'POST',
            url: `${standardsVersion}/energy/electricity/servicepoints/der`,
            headers: {
                authorization: "Bearer ytweryuuyuyiuyyuwer"
            },
            body: requestBody
        };
        let returnedErrors: ResponseErrorListV2 = {
            errors: [ {
                code: 'urn:au-cds:error:cds-all:Field/Missing',
                title: 'Missing Required Field',
                detail: 'data'
            }]
        };
        let auth = cdrResourceValidator(mockEnergyUserService);
        auth(mockRequest as Request, mockResponse as Response, nextFunction as NextFunction);
        expect(mockStatus.json).toBeCalledWith(returnedErrors);
        expect(mockResponse.status).toBeCalledWith(400);
    });
    
});
