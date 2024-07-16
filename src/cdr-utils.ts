import { Request } from 'express';
import { DsbEndpoint } from './models/dsb-endpoint-entity';
import energyEndpoints from './data/cdr-energy-endpoints.json';
import bankingEndpoints from './data/cdr-banking-endpoints.json';
import commonEndpoints from './data/cdr-common-endpoints.json';
import { CdrConfig } from './models/cdr-config';
import { CdrUser } from './models/user';

const defaultEndpoints = [...energyEndpoints, ...bankingEndpoints, ...commonEndpoints];

// If no config is specified than a config with the default endpoints is being used
export function getEndpoint(req: Request, options: CdrConfig | undefined): DsbEndpoint | null {
    var endpoints: DsbEndpoint[] = [];
    if (options?.endpoints == null) {
        endpoints = defaultEndpoints as DsbEndpoint[];
    }
    else {
        let dsbEndpoints: DsbEndpoint[] = [];
        options.endpoints.forEach(e => {
            let dsbEp = defaultEndpoints.find(x => x.requestPath == e.requestPath && x.requestType == e.requestType) as DsbEndpoint;
            if (dsbEp) dsbEndpoints.push(dsbEp)
        })
        endpoints = dsbEndpoints;
    }
    let requestUrlElements: string[] = req.url.split('?');
    // create an array with all the path elements
    let requestUrlArray = requestUrlElements[0].split('/').splice(1);
    requestUrlArray = removeEmptyEntries(requestUrlArray);
    // remove the base path if one has been specified in config
    requestUrlArray = removeBasePath(options?.basePath, requestUrlArray);

    // ensure that the cds-au/v1 exists
    if (requestUrlArray.length < 3) {
        // this cannot be a CDR endpoint
        //errorList.errors.push({ code: 'urn:au-cds:error:cds-all:Resource/NotFound', title: 'NotFound', detail: 'This endpoint is not a CDR endpoint' });
        return null;
    }
    if (requestUrlArray[0] != 'cds-au' || requestUrlArray[1] != 'v1') {
        // this cannot be a CDR endpoint
        //errorList.errors.push({ code: 'urn:au-cds:error:cds-all:Resource/NotFound', title: 'NotFound', detail: 'This endpoint is not a CDR endpoint' });
        return null;
    }
    requestUrlArray = requestUrlArray.slice(2);
    requestUrlArray = removeEmptyEntries(requestUrlArray);

    // this array should have at least 2 entries. There is no CDR endpoint with less than that
    if (requestUrlArray.length < 2) return null;
    // get a subset of endpoints this url could be, filter by the first two parts of url and request type
    let urlSubSet = endpoints.filter(x => x.requestPath.toLowerCase().startsWith(`/${requestUrlArray[0]}/${requestUrlArray[1]}`) && x.requestType == req.method);
    let returnEP = null;

    urlSubSet.forEach(u => {
        let elements: string[] = u.requestPath.split('/');
        elements = removeEmptyEntries(elements);
        // if the passed in url has the same number of elements as the CDR endpoint
        // this could be a match
        let isMatch: boolean = true;
        if (elements.length == requestUrlArray.length) {
            for (let i = 0; i < elements.length; i++) {
                if (elements[i].startsWith('{') && elements[i].endsWith('}')) {
                    continue;
                }
                if (elements[i].toLowerCase() != requestUrlArray[i].toLowerCase()) {
                    isMatch = false;
                    break;
                }
            }
            isMatch ? returnEP = u : null;
        }
    })
    // if (returnEP == null) {
    //     errorList.errors.push({ code: 'urn:au-cds:error:cds-all:Resource/NotFound', title: 'NotFound', detail: 'This endpoint is not a CDR endpoint' });
    // }
    return returnEP;
}

export function findXFapiRequired(req: Request): boolean {
    try {
        let idx = defaultEndpoints.findIndex(x => req.url.includes(x.requestPath));
        let ep = defaultEndpoints[idx];
        return ep.requiresXFAPI ??= true;
    } catch(e) {
        return true;
    }
}

function arraysAreEqual(a: string[], b: string[]): boolean {
    const equals = (a.length === b.length &&
        a.every((v, i) => v === b[i]));
    return equals;
}

function removeEmptyEntries(arr: string[]): string[] {
    let returnArray : string[] = [];
    arr.forEach(elem => {
        if (elem != null && elem.trim() != '') {
            returnArray.push(elem);
        }     
    });
    return returnArray;
}

function checkForEndpoint(ep: DsbEndpoint): string[] {
    let returnPathArray : string[] = [];
    let searchPath = ep.requestPath + '/{';
    // get all defaultEndpoints which have searchPath in them
    let returnEpArray  = defaultEndpoints.filter(x => x.requestPath.includes(searchPath)) as DsbEndpoint[];
    if (returnEpArray != null && returnEpArray.length > 0) {
        // create an array with all the path elements
        // sort the elements with accorfing the requestPath length
        returnEpArray.sort(compare);
        returnPathArray = returnEpArray[0].requestPath.split('/').splice(1);
        return returnPathArray;
    } else {
        return [];
    }
}

function compare(ep1: DsbEndpoint, ep2: DsbEndpoint) : number {
    let arr1 = ep1.requestPath.split('/').splice(1);
    let arr2 = ep2.requestPath.split('/').splice(1);
    if ( arr1.length < arr2.length ){
        return -1;
      }
      if (arr1.length > arr2.length ){
        return 1;
      }
      return 0;
}

function buildPath(pathArray: string[], count : number = -1): string | null {
    if (pathArray == null || pathArray.length == 0)
        return null;
    if (pathArray.length < count || count == -1) {
        return '/' + pathArray.join('/');
    }
    let retVal = '/';
    let tmpArray = pathArray.slice(0, count);
    return '/' + tmpArray.join('/');
}

function removeBasePath(basePath: string | undefined, pathArray: string[]): string[] {
    // If no base path then do nothing
    if (!basePath) return pathArray;

    const baseArray = basePath.split('/').splice(1);

    // If the base path is longer then the path then do nothing as there cannot be a match 
    if (baseArray.length > pathArray.length) return pathArray;

    // See if the base path matches the start of the path by comparing each component
    const varRegex = /^[{].*[}]$/;
    for (let i = 0; i < baseArray.length; i++) {
        if (baseArray[i].match(varRegex) || baseArray[i] === pathArray[i]) continue;

        // A mismatch is found so return
        return pathArray;
    }

    return pathArray.slice(baseArray.length);
}

export function scopeForRequestIsValid(req: Request, scopes: string[] | undefined): boolean {
    try {
        let ep = findEndpointConfig(req);
        // endpoint exists and no scopes are required
        if (ep?.authScopesRequired == null) {
            console.log('The endpoint exists and no scopes are required');
            return true;
        }
        else {
            // there is scopes required and none have been provided
            if (scopes == null) {
                console.log('Scopes are required and none have been provided');
                return false;
            }
            let idx = scopes?.indexOf(ep.authScopesRequired);
            console.log(`Scopes required: ${ep.authScopesRequired}`);
            return (idx > -1);
        }
    } catch (e: any) {
        console.log(`Exception in scopeForRequestIsValid: ${e?.message}`);
        return false;
    }
}

// This will examine the request url, find any account identifiers and validate against the authorised user object
export function userHasAuthorisedForAccount(req: Request, user: CdrUser | undefined): boolean | undefined {

    console.log(`Checking auth status for user ${JSON.stringify(user)}`);
    let ep: DsbEndpoint = findEndpointConfig(req) as DsbEndpoint;
    // no endpoint found, ie this is not a CDR endpoint
    if (ep == null) {
        return true;
    }

    if (endpointRequiresAuthentication(ep) == false) {
        console.log(`No authentication required for: ${req.url}`);
        return true;
    }

    // The endpoint is a GET request without any reource ids in the url
    if (ep.requestType == 'GET'){
        if (urlHasResourceIdentifier(req) == false) {
            console.log(`No resource identifier in GET url: ${req.url}`);
            return true;
        }
    }

    if (user == null) {
        console.log(`No user object found.`);
        return false;
    }

    // The endpoint is a POST request without any reource ids in the url
    if (ep.requestType == 'POST'){          
        if (ep.requestPath.indexOf('/banking') >= 0) {
            // a POST request with no account ids passed in, not authorised 
            let reqBody: any = req.body;
            if (user?.accountsBanking == null || reqBody?.data?.accountIds == null || user?.accountsBanking.length < 1) return false;
            
            let retVal :boolean = true;
            reqBody.data?.accountIds.forEach((id: string) => {
                if (user.accountsBanking?.find(x => x == id) == null){
                    console.log(`Authorisation for account id: ${id} not found`);
                    retVal = false;
                    return;
                }
            })
            return retVal;
        }
        else if (ep.requestPath.indexOf('/energy') >= 0) {
            // a POST request with no account ids passed in, not authorised 
            let reqBody: any = req.body;
            // if neither service points or accounts have been specified exist here
            if ((user?.accountsEnergy == null || user?.accountsEnergy.length < 1)
                && (user?.energyServicePoints == null || user?.energyServicePoints?.length < 1))
                 return false;
            let retVal :boolean = true;
            if (ep.requestPath == '/energy/electricity/servicepoints/usage'
             || ep.requestPath == '/energy/electricity/servicepoints/der') {
                if (reqBody.data?.servicePointIds.length < 1)
                    retVal = false;
                else
                    reqBody.data?.servicePointIds.forEach((id: string) => {
                        console.log(`Looking for ${id}`);
                        if (user?.energyServicePoints?.indexOf(id) == -1){
                            console.log(`Authorisation for service point id: ${id} not found`);
                            retVal = false;
                            return;
                        }
                    });
             }
             if (ep.requestPath == '/energy/account/balances'
                || ep.requestPath == '/energy/account/billing'
                || ep.requestPath == '/energy/account/invoices') {
                if (reqBody.data?.servicePointIds.length < 1) retVal = false;
                reqBody.data?.accountIds.forEach((id: string) => {
                    if (user.accountsEnergy?.indexOf(id) == -1){
                        console.log(`Authorisation for account id: ${id} not found`);
                        retVal = false;
                        return;
                    }
                })
             }

            return retVal;
        }
    }
    else if (ep.requestType == 'GET') {
        let url = createSearchUrl(req)?.toLowerCase();
        if (url == undefined) {
            console.log(`The url is not a CDR enpoint url ${req.url}`);
            return false;
        }
      
        if (url.indexOf('/banking/products') > -1) {
            console.log(`No authorisation required for: ${req.url}`);
            return true;
        }
        
        if (url.indexOf('/energy/plans') > -1){
            console.log(`No authorisation required for: ${req.url}`);
            return true;
        }
    
        if (url.indexOf('/banking/accounts') > -1) {
            console.log(`Checking authorisation for: ${req.url}`);
            let ret = checkBankAccountRoute(url, user);
            console.log(`Authorisation status: ${ret}`);
            return ret;
        }
    
        if (url.indexOf('/banking/payments/scheduled') > -1) {
            console.log(`Checking authorisation for: ${req.url}`);
            let ret = checkBankingPaymentRoute(req, user);
            console.log(`Authorisation status: ${ret}`);
            return ret;
        }
        if (url.indexOf('/banking/payees') > -1) {
            console.log(`Checking authorisation for: ${req.url}`);
            let ret = checkBankingPayeeRoute(url, user);
            console.log(`Authorisation status: ${ret}`);
            return ret;
        }
    
        if (url.indexOf('/energy/accounts') > -1) {
            console.log(`Checking authorisation for: ${req.url}`);
            let ret = checkEnergyAccountRoute(url, user);
            console.log(`Authorisation status: ${ret}`);
            return ret;
        }
    
        if (url.indexOf('/energy/electricity/servicepoints') > -1) {
            console.log(`Checking authorisation for: ${req.url}`);
            let ret = checkEnergyElectricityRoute(url, user);
            console.log(`Authorisation status: ${ret}`);
            return ret;
        }
    }
}

// returns true or false indicating authentication requirement
export function endpointRequiresAuthentication(ep: DsbEndpoint): boolean | undefined {
    if (ep != null) {
        return (ep.authScopesRequired != null)
    }
    return true;
}

// returns true or false depending if a found DSB endpoint definition is one containing a resource it in the url
export function urlHasResourceIdentifier(req: Request): boolean | undefined {
    let ep = findEndpointConfig(req);
    if (ep != null) {
        return (ep.requestPath.indexOf('{') > -1)
    }
    return false;
}


// Return true if the resource id (from url) is in the list of consented resource ids (from user object)
// Validates the resource id found in any of the /banking/accounts/*** urls against the resource ids in the user object
function checkBankAccountRoute(url: string, user: CdrUser): boolean {
    let startPos = url.indexOf('/banking/accounts/');
    let l1 = '/banking/accounts/'.length;
    let subStr = url.substring(startPos + l1, url.length).replace(/\/+$/, '').toLowerCase();

    if (subStr.length == 0) {
        return true;
    }
    if (user.accountsBanking == null) {
        return false;
    }
    // if the subStr does not have any slashes it must be interpreted as accountid
    if (subStr.indexOf('/') == -1) { 
        return (user.accountsBanking?.indexOf(subStr) > -1);
    }

    let dd = subStr.indexOf('/direct-debits');
    // check for direct debit accounts
    if (dd > -1) {
        let accountId = subStr.substring(0, dd);
        return (user.accountsBanking?.indexOf(accountId) > -1);
    }
    let bal = subStr.indexOf('/balance');
    // check for balance account
    if (bal > -1) {
        let accountId = subStr.substring(0, bal);
        return (user.accountsBanking?.indexOf(accountId) > -1);
    }
    let trans = subStr.indexOf('/transactions');
    // check for balance account
    if (trans > -1) {
        let accountId = subStr.substring(0, trans);
        return (user.accountsBanking?.indexOf(accountId) > -1);
    }

    let payments = subStr.indexOf('/payments');
    // check for balance account
    if (payments > -1) {
        let accountId = subStr.substring(0, payments);
        return (user.accountsBanking?.indexOf(accountId) > -1);
    }
    return false;
}

// Return true if the resource id (from url) is in the list of consented resource ids (from user object)
// Validates the resource id found in any of the /energy/accounts/*** urls against the resource ids in the user object
function checkEnergyAccountRoute(url: string, user: CdrUser): boolean {
    let startPos = url.indexOf('/energy/accounts/');
    let l1 = '/energy/accounts/'.length;
    let subStr = url.substring(startPos + l1, url.length).replace(/\/+$/, '').toLowerCase();

    if (subStr.length == 0) {
        return true;
    }

    if (user.accountsEnergy == null) {
        return false;
    }
    // if the subStr does not have any slashes it must be interpreted as accountid
    if (subStr.indexOf('/') == -1) {
        return (user.accountsEnergy?.indexOf(subStr) > -1);
    }

    let inv = subStr.indexOf('/invoices');
    // check for direct debit accounts
    if (inv > -1) {
        let accountId = subStr.substring(0, inv);
        return (user.accountsEnergy?.indexOf(accountId) > -1);
    }
    let bal = subStr.indexOf('/balance');
    // check for balance account
    if (bal > -1) {
        let accountId = subStr.substring(0, bal);
        return (user.accountsEnergy?.indexOf(accountId) > -1);
    }
    let conc = subStr.indexOf('/concessions');
    // check for balance account
    if (conc > -1) {
        let accountId = subStr.substring(0, conc);
        return (user.accountsEnergy?.indexOf(accountId) > -1);
    }
    let billing = subStr.indexOf('/billing');
    // check for balance account
    if (billing > -1) {
        let accountId = subStr.substring(0, billing);
        return (user.accountsEnergy?.indexOf(accountId) > -1);
    }
    let payments = subStr.indexOf('/payment-schedule');
    // check for balance account
    if (payments > -1) {
        let accountId = subStr.substring(0, payments);
        return (user.accountsEnergy?.indexOf(accountId) > -1);
    }
    return false;
}

// Return true if the resource id (from url) is in the list of consented resource ids (from user object)
// Validates the resource id found in any of the /energy/electricity/servicepoints/*** urls against the resource ids in the user object
function checkEnergyElectricityRoute(url: string, user: CdrUser): boolean {
    let startPos = url.indexOf('/energy/electricity/servicepoints');
    let l1 = '/energy/electricity/servicepoints'.length;
    let subStr = url.substring(startPos + l1 + 1, url.length).replace(/\/+$/, '').toLowerCase();
    if (subStr.length == 0) {
        return true;
    }
    if (user.energyServicePoints == null) {
        return false;
    }
    // if the subStr does not have any slashes (ie end of uri) it has to be servicepoints
    if (subStr.indexOf('/') == -1) {
        return (user.energyServicePoints?.indexOf(subStr) > -1);
    }

    let usageSP = subStr.indexOf('/usage');
    if (usageSP > -1) {
        let sp = subStr.substring(0, usageSP);
        return (user.energyServicePoints?.indexOf(sp) > -1);
    }
    let derSP = subStr.indexOf('/der');
    if (derSP > -1) {
        let sp = subStr.substring(0, derSP);
        return (user.energyServicePoints?.indexOf(sp) > -1);
    }
    return false;
}

// Return true if the resource id (from url) is in the list of consented resource ids (from user object)
// Validates the resource id found in any of the /banking/payments/scheduled/*** urls against the resource ids in the user object
function checkBankingPaymentRoute(req: Request, user: CdrUser): boolean {
    let startPos = req.url.indexOf('/banking/payments/scheduled');
    let l1 = '/banking/payments/scheduled'.length;
    let subStr = req.url.substring(startPos + l1, req.url.length).replace(/\/+$/, '').toLowerCase();

    if (subStr.length == 0) {
        if (req.method == 'POST') {
            if (user.accountsBanking == null) {
                return false;
            }
            // read the account ids from body
            try {
                let body = req?.body;
                //let data = body?.data;
                let obj = JSON.parse(body);
                let accountIds = obj?.data?.accountIds;
                // read to data as array
                let invalidCount = 0;
                accountIds?.forEach((x: string) => {
                    let idx = user.accountsBanking?.indexOf(x);
                    if (idx == null || idx < 0) {
                        return invalidCount++;
                    }
                })
                return (invalidCount == 0);
            } catch (e: any) {
                console.log(e?.message)
                return false;
            }

        } else {
            return true
        }
    } else {
        return false;
    }
}

// Return true if the resource id (from url) is in the list of consented resource ids (from user object)
// Validates the resource id found in any of the /banking/payees/*** urls against the resource ids in the user object
function checkBankingPayeeRoute(url: string, user: CdrUser): boolean {
    let startPos = url.indexOf('/banking/payees');
    let l1 = '/banking/payees'.length;
    let subStr = url.substring(startPos + l1, url.length).replace(/\/+$/, '');

    if (subStr.length == 0) {
        return true;
    }
    if (user.bankingPayees == null) {
        return true;
    }
    // if the subStr does not have any slashes it must be interpreted as accountid
    if (subStr.indexOf('/') == -1) {
        return (user.bankingPayees?.indexOf(subStr) > -1);
    }
    return false;
}

// This will examine a request url and find the matching definition from the
// cdr-<SECTOR>-endpoints.json file.
// The returned DsbEndpoint object contains the parameters required to perform logic
function findEndpointConfig(req: Request): DsbEndpoint | undefined {
    // remove the host and assign to urlId  
    let tmp = req.url.substring(req.url.indexOf('//') + 2);
    let originalPath = tmp.substring(tmp.indexOf('/'));

    // create an array with all the path elements
    let requestUrlArray = req.url.split('/').splice(1);
    // ensure that the cds-au/v1 exists
    if (requestUrlArray.length < 3) {
        // this cannot be a CDR endpoint
        // errorList.errors.push({code: 'urn:au-cds:error:cds-all:Resource/NotFound', title: 'NotFound', detail: 'This endpoint is not a CDR endpoint'});
        return undefined;
    }
    if (requestUrlArray[0] != 'cds-au' || requestUrlArray[1] != 'v1') {
        // this cannot be a CDR endpoint
        //errorList.errors.push({code: 'urn:au-cds:error:cds-all:Resource/NotFound', title: 'NotFound', detail: 'This endpoint is not a CDR endpoint'});
        return undefined;
    }
    requestUrlArray = requestUrlArray.slice(2);
    requestUrlArray = removeEmptyEntries(requestUrlArray);
    // the search array which will change as the search progresses
    // remove query parameters from end
    let tmp1: string = requestUrlArray[requestUrlArray.length - 1];
    let newValArray: string[] = tmp1.split('?');
    requestUrlArray[requestUrlArray.length - 1] = newValArray[0];

    let searchArray: string[] = requestUrlArray.slice();

    let returnEP = null;
    let found: boolean = false;
    let idx = 0;
    do {
        idx++;
        let searchPath = buildPath(searchArray);
        returnEP = defaultEndpoints.find(x => x.requestPath == searchPath && x.requestType == req.method);

        if (returnEP == null) {
            searchArray.splice(searchArray.length - 1, 1);
        }
        else {
            if (searchArray.length == requestUrlArray.length) {
                found = true;
                searchArray = [];
            }
            else {
                let tmpArray = checkForEndpoint(returnEP as DsbEndpoint);
                if (requestUrlArray.length > searchArray.length) {
                    if (tmpArray.length > searchArray.length) {
                        searchArray.push(tmpArray[searchArray.length]);
                    }
                    else {
                        searchArray.push(requestUrlArray[searchArray.length]);
                    }

                } else {
                    searchArray = tmpArray;
                }
                found = searchArray.length == 0;
            }
        }
    } while ((!found) && idx < (defaultEndpoints.length));
    return returnEP as DsbEndpoint;
}

// This will read the part of the url from cds-au/v1, stripping out any query parameters
function createSearchUrl(req: Request): string | undefined {
    let url = req.url.substring(req.url.indexOf('//') + 2).toLowerCase();
    let baseIdx = url.indexOf('cds-au/v1')
    if (baseIdx == -1)
        return undefined;

    // get rid of the query parameters
    let idx = url.indexOf('?');
    if (idx > -1)
        url = url.substring(0, url.indexOf('?'));
    // read the url after the cds-au/au part
    return url.substring(baseIdx + 'cds-au/v1'.length, url.length);
}