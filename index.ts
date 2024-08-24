

import { cdrHeaderValidator } from './src/cdr-header-validator'
import { cdrTokenValidator } from './src/cdr-token-validator'
import { cdrJwtScopes} from './src/cdr-jwtscopes';
import defaultEnergyEndpoints  from './src/data/default-energy.json';
import defaultBankingEndpoints from './src/data/default-banking.json';
import defaultCommonEndpoints from './src/data/default-common.json';
import { EndpointConfig } from './src/models/endpoint-config';
import { buildErrorMessage, getEndpoint } from './src/cdr-utils';
import { cdrEndpointValidator } from './src/cdr-endpoint-validator';
import { cdrScopeValidator } from './src/cdr-scope-validator';
import { cdrResourceValidator } from './src/cdr-resource-validator';
import { IUserService } from './src/models/user-service.interface';

const DefaultEnergyEndpoints = [...defaultEnergyEndpoints] as EndpointConfig[];
const DefaultBankingEndpoints = [...defaultBankingEndpoints] as EndpointConfig[];
const DefaultCommonEndpoints = [...defaultCommonEndpoints] as EndpointConfig[];

export { DsbAuthConfig } from './src/models/dsb-auth-config';
export { CdrConfig } from './src/models/cdr-config';
export { EndpointConfig } from './src/models/endpoint-config';
export { DsbRequest } from './src/models/dsb-request';
export { DsbResponse } from './src/models/dsb-response';
export { CdrUser } from './src/models/user';
export { CdrError } from './src/models/cdr-error';


export {
     cdrHeaderValidator, cdrTokenValidator, cdrJwtScopes,
     cdrEndpointValidator, cdrScopeValidator, cdrResourceValidator,
     DefaultEnergyEndpoints, DefaultBankingEndpoints, DefaultCommonEndpoints,
     getEndpoint, IUserService, buildErrorMessage
}

