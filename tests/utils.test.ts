import { NextFunction, Request, Response } from 'express';
import energyEndpoints from '../src/data/cdr-energy-endpoints.json';
import bankingEndpoints from '../src/data/cdr-banking-endpoints.json'
import { EndpointConfig } from '../src/models/endpoint-config';
import { userHasAuthorisedForAccount, getEndpoint, scopeForRequestIsValid, buildErrorMessage, paginateData } from '../src/cdr-utils';
import { MetaError, ResponseErrorListV2 } from 'consumer-data-standards/common';
import { CdrUser } from '../src/models/user';
import { DsbEndpoint } from '../src/models/dsb-endpoint-entity';
import commonEndpoints from '../src/data/cdr-common-endpoints.json';
import { CdrConfig } from '..';
import { DsbStandardError } from '../src/error-messsage-defintions';
import { EnergyBillingTransaction } from 'consumer-data-standards/energy';
import { BankingBalance } from 'consumer-data-standards/banking';

describe('Utility functions', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction = jest.fn();
    let mockStatus: Partial<Response>;

    let options: EndpointConfig[] = [];
    let errorList: ResponseErrorListV2;

    let standardsVersion = '/cds-au/v1';

    beforeEach(() => {
        nextFunction = jest.fn();
        mockStatus = {
            send: jest.fn(),
            setHeader: jest.fn(),
            json: jest.fn(),
        }
        mockResponse = {
            send: jest.fn(),
            setHeader: jest.fn(),
            json: jest.fn(),
            status: jest.fn().mockImplementation(() => mockStatus)
        };
        options = [{
            "requestType": "GET",
            "requestPath": "/energy/electricity/servicepoints",
            "minSupportedVersion": 1,
            "maxSupportedVersion": 4
        },
        {
            "requestType": "GET",
            "requestPath": "/energy/accounts/{accountId}/balance",
            "minSupportedVersion": 1,
            "maxSupportedVersion": 4
        },
        {
            "requestType": "GET",
            "requestPath": "/banking/accounts/{accountId}",
            "minSupportedVersion": 1,
            "maxSupportedVersion": 4
        },
        {
            "requestType": "GET",
            "requestPath": "/banking/accounts",
            "minSupportedVersion": 1,
            "maxSupportedVersion": 4
        }
        ];
        errorList = {
            errors: []
        }
    });


    test('Find endpoints - no parameters', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/electricity/servicepoints`,
        }

        //req: Request, options: EndpointConfig[], errorList : ResponseErrorListV2 
        let config: CdrConfig = {
            endpoints: endpoints as any[]
        }
        let ep = getEndpoint(mockRequest as Request, config);
        expect(ep).not.toBeNull()
        expect(ep?.requestPath).toEqual('/energy/electricity/servicepoints');
    });

    test('Find endpoints - parameters at end', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/banking/accounts/1234567`,
        }
        let config: CdrConfig = {
            endpoints: endpoints as any[]
        }
        let ep = getEndpoint(mockRequest as Request, config);
        expect(ep).not.toBeNull()
        expect(ep?.requestPath).toEqual('/banking/accounts/{accountId}');

    });

    test('Find endpoints - parameters embedded', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/accounts/123456/balance`,
        }
        let config: CdrConfig = {
            endpoints: endpoints as any[]
        }
        let ep = getEndpoint(mockRequest as Request, config);
        expect(ep).not.toBeNull();
        expect(ep?.requestPath).toEqual('/energy/accounts/{accountId}/balance');

    });

    test('Find endpoints - parameters embedded v2', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/banking/accounts/123456/payments/scheduled`,
        }
        let config: CdrConfig = {
            endpoints: endpoints as any[]
        }
        let ep = getEndpoint(mockRequest as Request, config);
        expect(ep).not.toBeNull();
        expect(ep?.requestPath).toEqual('/banking/accounts/{accountId}/payments/scheduled');

    });

    test('Find endpoints - trailing slash', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/accounts/123456/balance/`,
        }
        let config: CdrConfig = {
            endpoints: endpoints as any[]
        }
        let ep = getEndpoint(mockRequest as Request, config);
        expect(ep).not.toBeNull();
        expect(ep?.requestPath).toEqual('/energy/accounts/{accountId}/balance');

    });

    test('Find endpoints - invalid', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/all-customer`,
        }
        let config: CdrConfig = {
            endpoints: endpoints as any[]
        }
        let ep = getEndpoint(mockRequest as Request, config);
        expect(ep).toEqual(null);

    });

    test('Find endpoints - with query string', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/banking/accounts/1234567?page=2&page-size=5`,
        }
        let config: CdrConfig = {
            endpoints: endpoints as any[]
        }
        let ep = getEndpoint(mockRequest as Request, config);
        expect(ep).not.toBeNull()
        expect(ep?.requestPath).toEqual('/banking/accounts/{accountId}');

    });

    test('Get endpoint from defaults', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints, ...commonEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/electricity/servicepoints`
        };
        let config: CdrConfig = {
            endpoints: endpoints as any[]
        }
        let ep = getEndpoint(mockRequest as Request, config);
        expect(ep).not.toBeNull()
        expect(ep?.requestPath).toEqual('/energy/electricity/servicepoints');
    });

    // tests for userHasAuthorisedForAccount - banking
    test('Find account id in url and test - valid case', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/banking/accounts/1234567?page=2&page-size=5`,
        }
        let usr: CdrUser = {

            accountsBanking: ['1234567', '786545'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(true);

    });

    test('Find account id in payments url and test - valid case', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/banking/accounts/1234567/payments/scheduled?page=2&page-size=5`,
        }
        let usr: CdrUser = {

            accountsBanking: ['1234567', '786545'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(true);

    });

    test('Test for account id: No account ID with trailing  returns true', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/accounts/`,
        }
        let usr: CdrUser = {

            accountsEnergy: ['1234567', '786545'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(true);
    });

    test('Test for account id: No account ID / no trailing slash returns true ', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/accounts`,
        }
        let usr: CdrUser = {

            accountsEnergy: ['1234567', '786545'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(true);

    });

    test('Test for account id: Invalid url return false', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/banking/account-list/`,
        }
        let usr: CdrUser = {

            accountsBanking: ['1234567', '786545'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(true);
    });

    test('Find account id in transaction url and test - valid case', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/banking/accounts/1234567/transactions?page=2&page-size=5`,
        }
        let usr: CdrUser = {

            accountsBanking: ['1234567', '786545'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(true);

    });

    test('Find account id in balance url and test - valid case', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/banking/accounts/786545/balance`,
        }
        let usr: CdrUser = {

            accountsBanking: ['1234567', '786545'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(true);

    });

    test('Find account id in direct debits url and test - valid case', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/banking/accounts/786545/direct-debits`,
        }
        let usr: CdrUser = {

            accountsBanking: ['1234567', '786545'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(true);

    });

    // tests for userHasAuthorisedForAccount - energy
    test('Find account id in url and test - valid case', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/accounts/1234567?page=2&page-size=5`,
        }
        let usr: CdrUser = {

            accountsEnergy: ['1234567', '786545'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(true);

    });

    test('Find account id in payments url and test - valid case', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/accounts/1234567/payment-schedule`,
        }
        let usr: CdrUser = {

            accountsEnergy: ['1234567', '786545'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(true);

    });

    test('Test for account id: No account ID with trailing  returns true', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/accounts/`,
        }
        let usr: CdrUser = {

            accountsEnergy: ['1234567', '786545'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(true);
    });

    test('Test for account id: No account ID / no trailing slash returns true ', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/accounts`,
        }
        let usr: CdrUser = {

            accountsEnergy: ['1234567', '786545'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(true);

    });

    test('Test for account id: Not a CDR enndpoint return true', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/account-list/`,
        }
        let usr: CdrUser = {

            accountsEnergy: ['1234567', '786545'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(true);
    });

    test('Find account id in concession url and test - valid case', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/accounts/1234567/concessions?page=2&page-size=5`,
        }
        let usr: CdrUser = {

            accountsEnergy: ['1234567', '786545'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(true);

    });

    test('Find account id in billing url and test - valid case', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/accounts/786545/billing`,
        }
        let usr: CdrUser = {

            accountsEnergy: ['1234567', '786545'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(true);

    });

    test('Find account id in direct balance url and test - valid case', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/accounts/786545/balance`,
        }
        let usr: CdrUser = {

            accountsEnergy: ['1234567', '786545'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(true);

    });

    test('scopeForRequestIsValid: no scope required', async () => {
        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/plans`
        }
        let isValid = scopeForRequestIsValid(mockRequest as Request, undefined);
        expect(isValid).toEqual(true);
        isValid = scopeForRequestIsValid(mockRequest as Request, ['energy:billing:read']);
        expect(isValid).toEqual(true);
    });

    test('scopeForRequestIsValid: no scope required, url trailing slash', async () => {
        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/plans/`
        }
        let isValid = scopeForRequestIsValid(mockRequest as Request, undefined);
        expect(isValid).toEqual(true);
    });

    test('scopeForRequestIsValid: no scope required valid scope', async () => {
        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/accounts/`
        }
        let isValid = scopeForRequestIsValid(mockRequest as Request, ['energy:accounts.basic:read']);
        expect(isValid).toEqual(true);
    });

    test('scopeForRequestIsValid: no scope required invalid scope', async () => {
        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/accounts/`
        }
        let isValid = scopeForRequestIsValid(mockRequest as Request, ['energy:accounts.detail:read']);
        expect(isValid).toEqual(false);
    });

    test('Test banking POST request for payments', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        const requestBody = { data: { accountIds: ['1234567', '786545'] }, meta: {} };
        mockRequest = {
            method: 'POST',
            url: `${standardsVersion}/banking/payments/scheduled`,
            body: requestBody
        }
        let usr: CdrUser = {
            accountsBanking: ['1234567', '786545'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(true);

    });

    test('Test banking POST request for payments - invalid', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        let requestBody = {
            "data": {
              "accountIds": [
                "1234567A",
                "78654599A"
              ]
            },
            "meta": {}
          } 
        mockRequest = {
            method: 'POST',
            url: `${standardsVersion}/banking/payments/scheduled`,
            body: requestBody
        }
        let usr: CdrUser = {
            accountsBanking: ['1234567', '78654599'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(false);

    });

    test('Test payee request - no payee id', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/banking/payees`
        }
        let usr: CdrUser = {
            bankingPayees: ['1234567', '786545'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(true);

    });

    test('Test payee request - invalid payee id', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/banking/payees/12345`
        }
        let usr: CdrUser = {
            bankingPayees: ['786545'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(false);


    });

    test('Test payee request - valid payee id', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/banking/payees/12345`
        }
        let usr: CdrUser = {
            bankingPayees: ['12345'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(false);


    });

    test('Energy service points - valid service point id', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/electricity/servicepoints/12345`
        }
        let usr: CdrUser = {
            energyServicePoints: ['12345'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(true);
    });

    test('Energy service points der - valid service point id', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/electricity/servicepoints/12345/der`
        }
        let usr: CdrUser = {
            energyServicePoints: ['12345'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(true);
    });

    test('Energy service points usage - valid service point id', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/electricity/servicepoints/12345/usage`
        }
        let usr: CdrUser = {
            energyServicePoints: ['12345'],
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(true);
    });

    test('Energy service points usage - no service point id', async () => {

        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `${standardsVersion}/energy/electricity/servicepoints/12345/usage`
        }
        let usr: CdrUser = {
            scopes_supported: ['banking']
        }
        let isValid = userHasAuthorisedForAccount(mockRequest as Request, usr);
        expect(isValid).toEqual(false);
    });

    test('Base path - path specified', async () => {
        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `/my-special-path/${standardsVersion}/energy/accounts/123456/balance`
        }
        let config: CdrConfig = {
            endpoints: endpoints as any[],
            basePath: '/my-special-path'
        }
        let ep = getEndpoint(mockRequest as Request, config);
        expect(ep).not.toBeNull();
        expect(ep?.requestPath).toEqual('/energy/accounts/{accountId}/balance');
    });

    test('Base path - path NOT specified', async () => {
        const endpoints = [...energyEndpoints, ...bankingEndpoints];
        mockRequest = {
            method: 'GET',
            url: `/my-special-path/${standardsVersion}/energy/accounts/123456/balance`
        }
        let config: CdrConfig = {
            endpoints: endpoints as any[]
        }
        let ep = getEndpoint(mockRequest as Request, config);
        expect(ep).toBeNull();
    });

    test('Create standard error message - New list', async() => {
        const errorDetail: string = "TrxId 123456";
        const meta: MetaError = {
            urn: "Additional data For Error"
        }
        let errorList: ResponseErrorListV2 = buildErrorMessage(DsbStandardError.MISSING_REQUIRED_FIELD, errorDetail, undefined, meta);

        expect(errorList.errors.length).toBe(1); 
        expect(errorList.errors[0].detail).toBe(errorDetail);
        expect(errorList.errors[0].meta).toEqual(meta);
        expect(errorList.errors[0].code).toBe("urn:au-cds:error:cds-all:Field/Missing")       
    })

    test('Create standard error message - Existing list', async() => {
        const errorDetail: string = "TrxId 123456";
        const meta: MetaError = {
            urn: "Additional data For Error"
        }
        let errorList: ResponseErrorListV2 = {
            errors: [
                {
                    title: "Invalid Service Point",
                    code: "urn:au-cds:error:cds-energy:Authorisation/InvalidServicePoint",
                    detail: "5468999111",
                    meta: {
                        urn: "Some urn"
                    }
                }
            ]
        }
        errorList = buildErrorMessage(DsbStandardError.MISSING_REQUIRED_FIELD, errorDetail, errorList, meta);

        expect(errorList.errors.length).toBe(2);      
    }) 

    test('Pagination - Paginate multiple pages', async() => {
        let data: BankingBalance[] = [
            {
                accountId: "12345",
                currentBalance: "100.00",
                availableBalance: "500"
            },
            {
                accountId: "abcdfre",
                currentBalance: "100.00",
                availableBalance: "500"
            },
            {
                accountId: "23456",
                currentBalance: "100.00",
                availableBalance: "500"
            },
            {
                accountId: "67856",
                currentBalance: "100.00",
                availableBalance: "500"
            },
            {
                accountId: "95467",
                currentBalance: "100.00",
                availableBalance: "500"
            }

        ]
        let query:any = {
           "page-size": 3,
           "page": 2
        }
        let paginatedData = paginateData(data, query)
        expect(paginatedData.length).toBe(2);      
    }) 

    test('Pagination - No pagination query params uses default', async() => {
        let data: BankingBalance[] = [
            {
                accountId: "12345",
                currentBalance: "100.00",
                availableBalance: "500"
            },
            {
                accountId: "abcdfre",
                currentBalance: "100.00",
                availableBalance: "500"
            },
            {
                accountId: "23456",
                currentBalance: "100.00",
                availableBalance: "500"
            },
            {
                accountId: "67856",
                currentBalance: "100.00",
                availableBalance: "500"
            },
            {
                accountId: "95467",
                currentBalance: "100.00",
                availableBalance: "500"
            }

        ]
        let query:any = {
           "category": "CREDIT_CARD"
        }
        let paginatedData = paginateData(data, query)
        expect(paginatedData.length).toBe(5);      
    }) 

    test('Pagination - Error in query paramater', async() => {
        let data: BankingBalance[] = [
            {
                accountId: "12345",
                currentBalance: "100.00",
                availableBalance: "500"
            },
            {
                accountId: "abcdfre",
                currentBalance: "100.00",
                availableBalance: "500"
            },
            {
                accountId: "23456",
                currentBalance: "100.00",
                availableBalance: "500"
            },
            {
                accountId: "67856",
                currentBalance: "100.00",
                availableBalance: "500"
            },
            {
                accountId: "95467",
                currentBalance: "100.00",
                availableBalance: "500"
            }

        ]
        let query:any = {
           "page-size": "ert",
           "page": 2
        }
        let pagData = paginateData(data, query) as ResponseErrorListV2;
        expect(pagData.errors[0].code).toBe("urn:au-cds:error:cds-all:Field/Invalid")    
    }) 

    test('Pagination - Exeeds maximum page-size', async() => {
        let data: BankingBalance[] = [
            {
                accountId: "12345",
                currentBalance: "100.00",
                availableBalance: "500"
            },
            {
                accountId: "abcdfre",
                currentBalance: "100.00",
                availableBalance: "500"
            },
            {
                accountId: "23456",
                currentBalance: "100.00",
                availableBalance: "500"
            },
            {
                accountId: "67856",
                currentBalance: "100.00",
                availableBalance: "500"
            },
            {
                accountId: "95467",
                currentBalance: "100.00",
                availableBalance: "500"
            }

        ]
        let query:any = {
           "page": 2,
           "page-size": 1001
        }
        let pagData = paginateData(data, query) as ResponseErrorListV2;
        expect(pagData.errors[0].code).toBe("urn:au-cds:error:cds-all:Field/InvalidPageSize")    
    }) 

    test('Pagination - Invalid page requested', async() => {
        let data: BankingBalance[] = [
            {
                accountId: "12345",
                currentBalance: "100.00",
                availableBalance: "500"
            },
            {
                accountId: "abcdfre",
                currentBalance: "100.00",
                availableBalance: "500"
            },
            {
                accountId: "23456",
                currentBalance: "100.00",
                availableBalance: "500"
            },
            {
                accountId: "67856",
                currentBalance: "100.00",
                availableBalance: "500"
            },
            {
                accountId: "95467",
                currentBalance: "100.00",
                availableBalance: "500"
            }

        ]
        let query:any = {
           "page": 5,
           "page-size": 2
        }
        let pagData = paginateData(data, query) as ResponseErrorListV2;
        expect(pagData.errors[0].code).toBe("urn:au-cds:error:cds-all:Field/InvalidPage")    
    }) 

});
