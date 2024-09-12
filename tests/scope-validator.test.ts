
import { cdrScopeValidator } from '../src/cdr-scope-validator';
import { CdrConfig } from '../src/models/cdr-config';
import { EndpointConfig } from '../src/models/endpoint-config';
import { IUserService } from '../src/models/user-service.interface';
import { CdrUser } from '../src/models/user';
import { Request, Response, NextFunction } from 'express';
import { ResponseErrorListV2 } from 'consumer-data-standards/common';

describe('Scope validation middleware', () => {
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


    test('No authorization required', async () => {
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/plans`
        };
        let auth = cdrScopeValidator(mockUserService);
        auth(mockRequest as Request, mockResponse as Response, nextFunction as NextFunction);
        expect(nextFunction).toBeCalledTimes(1);
    });


    test('Invalid scope return 403 with error', async () => {
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/banking/accounts`
        };
        let returnedErrors: ResponseErrorListV2 = {
            errors: [ {
                code: 'urn:au-cds:error:cds-all:Authorisation/InvalidConsent',
                title: 'Consent Is Invalid',
                detail: 'Invalid scope'
            }]
        };
        let auth = cdrScopeValidator(mockUserService);
        auth(mockRequest as Request, mockResponse as Response, nextFunction as NextFunction);
        expect(mockStatus.json).toBeCalledWith(returnedErrors);
        expect(mockResponse.status).toBeCalledWith(403);
    });


});
