import { ResponseErrorListV2 } from 'consumer-data-standards/common';
import { NextFunction } from 'express';
import { cdrTokenValidator } from '../src/cdr-token-validator';
import { CdrConfig } from '../src/models/cdr-config';
import { DsbRequest } from '../src/models/dsb-request';
import { DsbResponse } from '../src/models/dsb-response';
import { EndpointConfig } from '../src/models/endpoint-config';

describe('Authorization middleware', () => {
    let mockRequest: Partial<DsbRequest>;
    let mockResponse: Partial<DsbResponse>;
    let nextFunction: NextFunction = jest.fn();
    let mockStatus: Partial<DsbResponse>;
    let standardsVersion = '/cds-au/v1';

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

    test('Without headers', async () => {

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
        let auth = cdrTokenValidator(authConfig);
        auth(mockRequest as DsbRequest, mockResponse as DsbResponse, nextFunction as NextFunction);
        expect(mockResponse.status).toBeCalledWith(401);
    });

    test('No authorization required', async () => {
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/plans`
        };

        let endpoints: EndpointConfig[] = [{
            "requestType": "GET",
            "requestPath": "/energy/plans",
            "minSupportedVersion": 1,
            "maxSupportedVersion": 4
        }]
        let authConfig: CdrConfig = {

            endpoints: endpoints
        }
        let auth = cdrTokenValidator(authConfig);
        auth(mockRequest as DsbRequest, mockResponse as DsbResponse, nextFunction as NextFunction);
        expect(nextFunction).toBeCalledTimes(1);
    });

    test('Without "authorization" header', async () => {

        let endpoints: EndpointConfig[] = [{
            "requestType": "GET",
            "requestPath": "/energy/accounts",
            "minSupportedVersion": 1,
            "maxSupportedVersion": 4
        }]
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/accounts`,
            headers: {
            }
        }
        let authConfig: CdrConfig = {
            endpoints: endpoints
        }
        let auth = cdrTokenValidator(authConfig);
        auth(mockRequest as DsbRequest, mockResponse as DsbResponse, nextFunction as NextFunction);
        expect(mockResponse.status).toBeCalledWith(401);
    });

    test('With "authorization" header - authorized', async () => {
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/accounts`,
            headers: {
                'authorization': 'Bearer eyJhbGciOiJQUzI1NiIsImtpZCI6IjdDNTcxNjU1M0U5QjEzMkVGMzI1QzQ5Q0EyMDc5NzM3MTk2QzAzREIiLCJ4NXQiOiJmRmNXVlQ2YkV5N3pKY1Njb2dlWE54bHNBOXMiLCJ0eXAiOiJhdCtqd3QifQ.eyJuYmYiOjE2NTgzNjQzOTcsImV4cCI6MTY1ODQ1MDc5NywiaXNzIjoiaHR0cHM6Ly9tb2NrLWRhdGEtaG9sZGVyLWVuZXJneTo4MTAxIiwiYXVkIjoiY2RzLWF1IiwiY2xpZW50X2lkIjoiNDJkNTdhYTYtYmY2Yi00OWQ0LWJiNGUtYTRmZjFkZDUxYzlhIiwiYXV0aF90aW1lIjoxNjU4MzY0Mzk3LCJpZHAiOiJsb2NhbCIsImNkcl9hcnJhbmdlbWVudF9pZCI6ImE5MGE4M2QyLWYyMDItNDY0Ni1iZWY0LTM3OTlhM2U4ZTk0MCIsImp0aSI6ImMtMk1hS25zY2laV2lEX21paGV5Z0EiLCJzb2Z0d2FyZV9pZCI6ImM2MzI3Zjg3LTY4N2EtNDM2OS05OWE0LWVhYWNkM2JiODIxMCIsInNlY3Rvcl9pZGVudGlmaWVyX3VyaSI6Im1vY2stZGF0YS1yZWNpcGllbnQiLCJhY2NvdW50X2lkIjoianVoSTVmYjNXRlVQJTJGZEJmaXgyWEZEVjFrOGpsZER6cE5aYVVkaFcyNlBvNk12RVhxRmZYazVzbnVCN0RpMEhxIiwic3ViIjoicEF2YklpNC8vcGY5ZXIwMkxReG14eWx0UTRlcGduY0FPSFM2UmlmYXo5MVVXakVJOS9QQlJwdlk5SlNGaGhMZSIsImNuZiI6eyJ4NXQjUzI1NiI6IjcxNUNERDA0RkY3MzMyQ0NEQTc0Q0RGOUZCRUQxNkJFQkE1REQ3NDQifSwic2NvcGUiOlsib3BlbmlkIiwicHJvZmlsZSIsImNkcjpyZWdpc3RyYXRpb24iLCJlbmVyZ3k6YWNjb3VudHMuYmFzaWM6cmVhZCIsImVuZXJneTphY2NvdW50cy5jb25jZXNzaW9uczpyZWFkIiwiY29tbW9uOmN1c3RvbWVyLmJhc2ljOnJlYWQiXSwiYW1yIjpbInB3ZCJdfQ.hYelgGH6LgjxSyMmWS9YMPdX1CAloTXWhL9I9jLHmGY39PoM15HaIZaw1anb1uvwxv9hTf8ZucFDPbe9dObKmu6_7p9C8T7ujE9zAC9acHJ936pC2oHTTLRlUJQRuW4K_Jo7xIJn6bw4GOdsg8eH_yzdd37i7PTp78Kk3oOm5Ln4fpgnwQzFiZMict-Y99kHRP7ZKkq8fzVe1zgq66fXcjMMTgT8agRjr0zokJR3cb9fJnOd0FROk5nPGSf8413gmmwZ1h1WrEoWKPnUCYo2SD2JphN1Co5BhLHUTRmFTxGh8MqBSWOyVUBQfxM3E-c8wEARnmOQAA6DW4YaJ1fC0CzVmBrZH2X4OMYa0SQ-zpXgRAolRZ4nAkMdHe1AqB2rVmTATe-qxrhDLiIWgJl0wX6Uf39WLFTWZpogfajInWJUsUfbKTdpufEozGpdY36xb6hrFN9HFlob1KmtUcm5SiZSA-dGvyKQxyD4sXXX3rTuB-tqF8foZZzzOvxL5vMy'
            },
            scopes: [
                "openid",
                "profile",
                "cdr:registration",
                "energy:accounts.basic:read",
                "energy:accounts.concessions:read",
                "common:customer.basic:read"
            ]
        }

        mockResponse = {
        }

        let endpoints: EndpointConfig[] = [{
            "requestType": "GET",
            "requestPath": "/energy/accounts",
            "minSupportedVersion": 1,
            "maxSupportedVersion": 4
        }]
        let authConfig: CdrConfig = {

            endpoints: endpoints
        }
        let auth = cdrTokenValidator(authConfig);
        auth(mockRequest as DsbRequest, mockResponse as DsbResponse, nextFunction as NextFunction);
        expect(nextFunction).toBeCalledTimes(1);
    });

    test('With "authorization" header - NOT authorized', async () => {
        let returnedErrors: ResponseErrorListV2 = {
            errors: [{
                code: 'urn:au-cds:error:cds-all:Authorisation/InvalidConsent',
                title: 'Consent Is Invalid',
                detail: 'Invalid scope'
            }]
        };
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/electricity/servicepoints`,
            headers: {
                'authorization': 'Bearer eyJhbGciOiJQUzI1NiIsImtpZCI6IjdDNTcxNjU1M0U5QjEzMkVGMzI1QzQ5Q0EyMDc5NzM3MTk2QzAzREIiLCJ4NXQiOiJmRmNXVlQ2YkV5N3pKY1Njb2dlWE54bHNBOXMiLCJ0eXAiOiJhdCtqd3QifQ.eyJuYmYiOjE2NTgzNjQzOTcsImV4cCI6MTY1ODQ1MDc5NywiaXNzIjoiaHR0cHM6Ly9tb2NrLWRhdGEtaG9sZGVyLWVuZXJneTo4MTAxIiwiYXVkIjoiY2RzLWF1IiwiY2xpZW50X2lkIjoiNDJkNTdhYTYtYmY2Yi00OWQ0LWJiNGUtYTRmZjFkZDUxYzlhIiwiYXV0aF90aW1lIjoxNjU4MzY0Mzk3LCJpZHAiOiJsb2NhbCIsImNkcl9hcnJhbmdlbWVudF9pZCI6ImE5MGE4M2QyLWYyMDItNDY0Ni1iZWY0LTM3OTlhM2U4ZTk0MCIsImp0aSI6ImMtMk1hS25zY2laV2lEX21paGV5Z0EiLCJzb2Z0d2FyZV9pZCI6ImM2MzI3Zjg3LTY4N2EtNDM2OS05OWE0LWVhYWNkM2JiODIxMCIsInNlY3Rvcl9pZGVudGlmaWVyX3VyaSI6Im1vY2stZGF0YS1yZWNpcGllbnQiLCJhY2NvdW50X2lkIjoianVoSTVmYjNXRlVQJTJGZEJmaXgyWEZEVjFrOGpsZER6cE5aYVVkaFcyNlBvNk12RVhxRmZYazVzbnVCN0RpMEhxIiwic3ViIjoicEF2YklpNC8vcGY5ZXIwMkxReG14eWx0UTRlcGduY0FPSFM2UmlmYXo5MVVXakVJOS9QQlJwdlk5SlNGaGhMZSIsImNuZiI6eyJ4NXQjUzI1NiI6IjcxNUNERDA0RkY3MzMyQ0NEQTc0Q0RGOUZCRUQxNkJFQkE1REQ3NDQifSwic2NvcGUiOlsib3BlbmlkIiwicHJvZmlsZSIsImNkcjpyZWdpc3RyYXRpb24iLCJlbmVyZ3k6YWNjb3VudHMuYmFzaWM6cmVhZCIsImVuZXJneTphY2NvdW50cy5jb25jZXNzaW9uczpyZWFkIiwiY29tbW9uOmN1c3RvbWVyLmJhc2ljOnJlYWQiXSwiYW1yIjpbInB3ZCJdfQ.hYelgGH6LgjxSyMmWS9YMPdX1CAloTXWhL9I9jLHmGY39PoM15HaIZaw1anb1uvwxv9hTf8ZucFDPbe9dObKmu6_7p9C8T7ujE9zAC9acHJ936pC2oHTTLRlUJQRuW4K_Jo7xIJn6bw4GOdsg8eH_yzdd37i7PTp78Kk3oOm5Ln4fpgnwQzFiZMict-Y99kHRP7ZKkq8fzVe1zgq66fXcjMMTgT8agRjr0zokJR3cb9fJnOd0FROk5nPGSf8413gmmwZ1h1WrEoWKPnUCYo2SD2JphN1Co5BhLHUTRmFTxGh8MqBSWOyVUBQfxM3E-c8wEARnmOQAA6DW4YaJ1fC0CzVmBrZH2X4OMYa0SQ-zpXgRAolRZ4nAkMdHe1AqB2rVmTATe-qxrhDLiIWgJl0wX6Uf39WLFTWZpogfajInWJUsUfbKTdpufEozGpdY36xb6hrFN9HFlob1KmtUcm5SiZSA-dGvyKQxyD4sXXX3rTuB-tqF8foZZzzOvxL5vMy',

            },
            scopes: [
                "openid",
                "profile",
                "cdr:registration",
                "energy:accounts.basic:read",
                "energy:accounts.concessions:read",
                "common:customer.basic:read"
            ]
        }

        let endpoints: EndpointConfig[] = [{
            "requestType": "GET",
            "requestPath": "/energy/electricity/servicepoints",
            "minSupportedVersion": 1,
            "maxSupportedVersion": 4
        }];

        let authConfig: CdrConfig = {

            endpoints: endpoints
        }
        let auth = cdrTokenValidator(authConfig);
        auth(mockRequest as DsbRequest, mockResponse as DsbResponse, nextFunction as NextFunction);
        expect(mockStatus.json).toBeCalledWith(returnedErrors);
        expect(mockResponse.status).toBeCalledWith(403);
    });
});
