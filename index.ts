

import { cdrHeaderValidator } from './src/cdr-header-validator'
import { cdrTokenValidator } from './src/cdr-token-validator'
import { cdrJwtScopes} from './src/cdr-jwtscopes';
import defaultEnergyEndpoints  from './src/data/cdr-banking-endpoints.json';
import defaultBankingEndpoints from './src/data/cdr-energy-endpoints.json';
import defaultCommonEndpoints from './src/data/cdr-common-endpoints.json';
import { EndpointConfig } from './src/models/endpoint-config';
import { buildErrorMessage, getEndpoint, getLinksPaginated, getMetaPaginated, paginateData } from './src/cdr-utils';
import { cdrEndpointValidator } from './src/cdr-endpoint-validator';
import { cdrScopeValidator } from './src/cdr-scope-validator';
import { cdrResourceValidator } from './src/cdr-resource-validator';
import { IUserService } from './src/models/user-service.interface';
import { DsbStandardError } from './src/error-messsage-defintions';
import { DsbEndpoint } from './src/models/dsb-endpoint-entity';

const DefaultEnergyEndpoints = [...defaultEnergyEndpoints] as DsbEndpoint[];
const DefaultBankingEndpoints = [...defaultBankingEndpoints] as DsbEndpoint[];
const DefaultCommonEndpoints = [...defaultCommonEndpoints] as DsbEndpoint[];

export { DsbAuthConfig } from './src/models/dsb-auth-config';
export { CdrConfig } from './src/models/cdr-config';
export { EndpointConfig } from './src/models/endpoint-config';
export { DsbRequest } from './src/models/dsb-request';
export { DsbResponse } from './src/models/dsb-response';
export { CdrUser } from './src/models/user';
export { CdrError } from './src/models/cdr-error';
export { DsbStandardError } from './src/error-messsage-defintions';


export {
     cdrHeaderValidator, cdrTokenValidator, cdrJwtScopes,
     cdrEndpointValidator, cdrScopeValidator, cdrResourceValidator,
     DefaultEnergyEndpoints, DefaultBankingEndpoints, DefaultCommonEndpoints,
     getEndpoint, IUserService, buildErrorMessage, getLinksPaginated, getMetaPaginated, paginateData
}

