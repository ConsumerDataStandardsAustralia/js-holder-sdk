# JS Holder SDK

## Overview

In accordance with the Australian Consumer Data Rights (CDR) legislation, the [Data Standards Body](https://consumerdatastandards.gov.au/about) (DSB) specifies the [Consumer Data Standards](https://consumerdatastandardsaustralia.github.io/standards/#introduction) (CDS), which detail technical requirements for API endpoints across various industry sectors. In particular, these standards mandate that error payloads conform to a specific format and include specific error codes, among other requirements. Because these error handling requirements across a large number of endpoints, coding these can be repetitive and therefore error prone.

The JS Holder SDK is a boilerplate implementation designed to streamline compliance with the CDS. Designed for use in NodeJS/ExpressJS applications, this SDK provides essential middleware functions that automate the generation of compliant error payloads and ensure robust error handling. By integrating this SDK, developers can significantly reduce the complexity and potential for error in their API implementations, ensuring that error payloads and other API responses adhere to mandated formats and error handling protocols. 

## Using the JS Holder SDK

This SDK is intended for developers implementing CDR-compliant APIs in NodeJS/ExpressJS applications. It reduces the complexity and repetition involved in coding compliant APIs by providing ready-to-use middleware that handles common requirements such as error checking, header validation, and endpoint verification.

The DSB offers the JS Holder SDK as an [npm package](https://www.npmjs.com/package/@cds-au/holder-sdk) available in the NPM registry. You can easily install this package in your project using npm. For more information, refer to the [Quick Start](#quick-start) section below.

You can also set up the JS Holder SDK repository locally to customise and enhance the SDK by adding new features or adapting existing functionality to better suit your specific project needs. For more information, refer to the [Local Setup and Customisation](#local-setup-and-customisation) section below.

Explore the key middleware functions provided by the JS Holder SDK in the [Middleware Functions](#middleware-functions) section below.

## Quick Start

To integrate the SDK into your NodeJS/ExpressJS application, ensure npm is installed on your system and run the following command:

```bash
npm install @cds-au/holder-sdk
```

Import the necessary middleware functions and configure them as needed:

```jsx
import { cdrHeaderValidator, cdrResourceValidator, cdrScopeValidator, cdrEndpointValidator } from '@cds-au/holder-sdk';

// Example configuration
const dsbOptions = {
    // configuration details here
};

app.use(cdrHeaderValidator(dsbOptions));
```

The middleware functions `cdrEndpointValidator`, `cdrHeaderValidator`, `cdrTokenValidator`, and `cdrJwtScopes` can optionally accept a **configuration object** (`CdrConfig`) that specifies each endpoint the application implements, defined by the request type (GET/POST/DELETE) and path as outlined in the [CDS](https://consumerdatastandardsaustralia.github.io/standards/#introduction). If the config parameter is not provided, the middleware defaults to using predefined endpoints (`DefaultEnergyEndpoints`, `DefaultBankingEndpoints`, and `DefaultCommonEndpoints`) specified in this repository.

```jsx
const implementedEndpoints = [
    {
        "requestType":
        "GET",
        "requestPath": "/banking/payments/scheduled",
        "minSupportedVersion": 1,
        "maxSupportedVersion": 1
    },
    {
        "requestType": "GET",
        "requestPath": "/banking/accounts/{accountId}/balance",
        "minSupportedVersion": 1,
        "maxSupportedVersion": 1
    }
]

const config: CdrConfig = {
    endpoints: implementedEndpoints
}

app.use(cdrHeaderValidator(config))
```

The middleware functions `cdrResourceValidator` and `cdrScopeValidator` mandate an implementation of `IUserInterface` as a parameter, requiring access to scopes from the access token generated by the Identity and Access Management System (IdAM), which requires passing an implementation of `IUserService` by the consumer application.

### Demo Project

The [js-holder-sdk-demo](https://github.com/ConsumerDataStandardsAustralia/js-holder-sdk-demo) project provides a basic implementation illustrating how the middleware can be used in a NodeJS/ ExpressJS application.

*Note: The demo project with this library was tested with NodeJS v18.12.1*

## Middleware Functions

Below is a detailed overview of the key middleware functions provided by the JS Holder SDK:

### cdrHeaderValidator

Validates request headers and constructs CDR-compliant error responses as necessary.

| Scenario | Description |
| --- | --- |
| No x-v header is provided in the request | - Http status code 400- An ErrorList is returned with Header/Missing. |
| Invalid x-v header is provided with the request, eg alpha character | - Http status code 400- An ErrorList is returned with Header/Invalid. |
| Invalid x-min-v header is provided with the request | Http status code 400- An ErrorList is returned with Header/Invalid. |
| A requested version is not supported | - Http status code 406- An ErrorList is returned with Header/UnsupportedVersion. |
| No x-fapi-interaction-id in the request | An x-fapi-interaction-id header is set in the response header |
| Request has x-fapi-interaction-id header | The x-fapi-interaction-id from the request is returned with the response header |
| Invalid x-fapi-interaction-id header is provided with the request | - Http status code 400- An ErrorList is returned with Header/Invalid. |

### cdrEndpointValidator

Checks if the request URL corresponds to a CDR endpoint and constructs CDR-compliant error responses as necessary.

| Scenario | Description |
| --- | --- |
| Endpoint not implemented | - Http status code 404- An ErrorList is returned with Resource/NotImplemented. |
| Endpoint not is not a CDR endpoint | - Http status code 404- An ErrorList is returned with Resource/NotFound. |

### cdrScopeValidator

Performs scope validation against the API endpoint requirements using the scopes available in the access token.

| Scenario | Description |
| --- | --- |
| Invalid scope in access token | - Http status code 403- An ErrorList is returned with Authorisation/InvalidScope |

**Alternative Scope Validation:** The combination of *cdrJwtScopes* and *cdrTokenValidator* functions can be used to validate scopes, and therefore performs a function similar to the *cdrScopeValidator*. It does however make assumptions on the Identity Provider implementation. Nevertheless, depending on the precise data holder implementation this may be more suitable than the *IUsserInterface*.

### cdrResourceValidator

Ensures that the resource-specific identifiers like account IDs have proper consent for access within API calls.

| Scenario | Description |
| --- | --- |
| Access to the resource url has not been consented to | Http status code 404 |

### cdrTokenValidator

Handles some basic authorisation checks and constructs CDR-compliant error responses as necessary.

*Note that the functionality here requires access to the scopes contained from access token generated by the IdAM (Identity and Access Management System). For a common scenario where the access token is being issued as a JWT, the cdrJwtScopes middleware can be utilised to extend the Request object accordingly.*

| Scenario | Description |
| --- | --- |
| No authorisation header present in Request | Http status code 401 |
| Authorisation header is present, invalid scope in access token | - Http status code 403- An ErrorList is returned with Authorisation/InvalidScope |

### cdrJwtScopes

Extends the Request object and make the scopes contained in the access token accessible from the Request object.

This can be used for any IdAM which returns the access token as an JWT and the scopes property is either an array of strings or a space separated string. The middleware will expect a configuration object.

| Scenario | Description |
| --- | --- |
| The access token from the IdAM is a JWT and scopes are an array of strings | The request object will be extended |
| The access token from the IdAM is a JWT and scopes are a space separated string | The request object will be extended |


## Utility Functions

### buildErrorMessage

This function will return a `ReponseErrorListV2`. It will use the standard DSB error code (eg urn:au-cds:error:cds-banking:
Authorisation/InvalidBankingAccount) depending on the errorMessageId being passed in

| Parameter | Description |
| --- | --- |
| errorMessageId | an identifier as per `DsbStandardError` defintions |
| errorDetail | which will be the `details` property on the returned error object |
| errorList (optional) | an existing error list. The error object wil be appendd to that list |
| metaData (optional) | options metadata object |

Example:
```
let msg = buildErrorMessage(DsbStandardError.INVALID_BANK_ACCOUNT, "123456");

// returns this as msg
    "errors": [
        {
            "code": "urn:au-cds:error:cds-banking:Authorisation/InvalidBankingAccount",
            "title": "Invalid Banking Account",
            "detail": "123456"
        }
    ]
```

### getLinksPaginated
| Parameter | Description |
| --- | --- |
| req | The request object |
| totalRecords | The total number of records in the dataset |


Example:
if the req object has a url `https://www.dsb.gov.au/cds-au/v1/energy/plans?category=ALL&page=4&page-size=2`
```
getLinksPaginated(req, 1000)
```
will return 
```
{
    self: "https://www.dsb.gov.au/cds-au/v1/energy/plans?category=ALL&page=4&page-size=2",
    next: "https://www.dsb.gov.au/cds-au/v1/energy/plans?category=ALL&page=5&page-size=2",
    prev: "https://www.dsb.gov.au/cds-au/v1/energy/plans?category=ALL&page=3&page-size=2",
    first: "https://www.dsb.gov.au/cds-au/v1/energy/plans?category=ALL&page=1&page-size=2",
    last: "https://www.dsb.gov.au/cds-au/v1/energy/plans?category=ALL&page=500&page-size=2"
}
```

### getMetaPaginated 

Will return a `MetaPaginated` object
| Parameter | Description |
| --- | --- |
| totalRecords | The total number of records in the dataset |
| query (optional) | The query property from the Request object |

Example:

getMetaPaginated(1000)

This use the default `page-size=25` since no query parameters are passes in.
Therefore, this will return
```
{
    totalRecords: 1000,
    totalPages: 40
}
```

### paginateData

This will return a subset of `data` depending on the `page-size` and `page` properties from the Request query object

| Parameter | Description |
| --- | --- |
| data | an array of data objects. |
| query | typycally this will be the query property from the Request object  |

Example:
```
let data: any = [
            {
                "amount": "4439.65",
                "description": "payment transaction at Durgan and Sons using card ending with ***(...6407) for XAU 365.41 in account ***06028839",
            },
            {

                "accountId": "d339f6db-cd8d-413f-95e4-ec9e8e9d806f",
                "amount": "318.99",
                "description": "payment transaction at Gleason - Fadel using card ending with ***(...6904) for SYP 219.10 in 
            },
            {
                "extendedData": {
                    "service": "X2P1.01",
                    "payer": "Angelica Beatty"
                },
            },
            {
                "amount": "4013.89",
                "description": "payment transaction at Watson, Braun and Bartell using card ending with ***(...6802) for GEL 281.13 in account ***74872985",
                "isDetailAvailable": true,
            },
            {
                "executionDateTime": "2024-01-20T12:49:36.782Z",
                "apcaNumber": "572618"
            },
]
```
and a query object 
```
let query: any = {
   "page-size": "2",
   "page" : "2"
}
```
then `paginateData(data, query)` returns

```
    [
            {
                "extendedData": {
                    "service": "X2P1.01",
                    "payer": "Angelica Beatty"
                },
            },
            {
                "amount": "4013.89",
                "description": "payment transaction at Watson, Braun and Bartell using card ending with ***(...6802) for GEL 281.13 in account ***74872985",
                "isDetailAvailable": true,
            }
    ]
```

## Local Setup and Customisation

### Prerequisites

Before you begin, ensure you have the following installed:

- Git, for cloning the repository.
- [Node.js](https://nodejs.org/en/).
- npm (Node Package Manager) - **included with Node.js installation**.

### Installation

1. Create a fork of this repository. To do this, click the "Fork" button on the top right corner of this page. 
2. After forking the repository, clone it to your local machine. You can do this by running the following command in your terminal or command prompt:
    
    ```bash
    git clone https://github.com/your-username/project-name.git
    ```
    
    Replace **`your-username`** with your GitHub username and **`project-name`** with the name of your repository.
    
3. Once the repository is cloned, navigate to the project directory by running:
    
    ```bash
    cd project-name
    ```
    
    Replace **`project-name`** with the name of the repository.
    

### Build

To build the repository and use the library without installing it globally:

1. Customise the project as needed for your specific use case.
2. Install libraries `npm install`
3. Build `npm run build`
4. Use npm link `npm link` 

### Testing

To test your changes:

1. Run `npm run test`

## Contributing Process

We welcome contributions from the community! If you'd like to contribute to this project, please follow these simple steps:

1. Create a new branch for your work from the `master` branch:
    
    ```bash
    git checkout -b feature/your-feature-name
    ```
    
2. Begin making your changes or contributions.
3. Follow the instructions in the project repository to run and test your changes locally.
4. Commit your changes with clear and concise commit messages.
5. Push your changes to your forked repository.
6. Open a pull request (PR) using the `master` branch in the [original repository](https://github.com/ConsumerDataStandardsAustralia/js-holder-sdk) as the destination branch. Include a detailed description of your changes and the problem you are addressing.
7. Engage in the discussion on your PR and make any necessary adjustments based on feedback from maintainers and other contributors.
8. Once your PR is approved and all tests pass, it will be merged into the project.

## Testing

To ensure your implementation works as expected, please test the integrated middleware within your application context. Example tests can be run using any JavaScript testing framework, such as Jest or Mocha.


## Reporting Issues

Encountered an issue? We're here to help. Please visit our [issue reporting guidelines](https://d61cds.notion.site/Issue-Reporting-Guidelines-71a329a0658c4b69a232eab95822509b?pvs=4) for submitting an issue.

## Stay Updated

Join our newsletter to receive the latest updates, release notes, and alerts. [Subscribe here](https://consumerdatastandards.us18.list-manage.com/subscribe?u=fb3bcb1ec5662d9767ab3c414&id=a4414b3906).

## License

The artefact is released under the [MIT License](https://github.com/ConsumerDataStandardsAustralia/java-artefacts/blob/master/LICENSE), which allows the community to use and modify it freely.

## Disclaimer

The artefacts in this repository are offered without warranty or liability, in accordance with the [MIT licence.](https://github.com/ConsumerDataStandardsAustralia/java-artefacts/blob/master/LICENSE)

[The Data Standards Body](https://consumerdatastandards.gov.au/about/) (DSB) develops these artefacts in the course of its work, in order to perform quality assurance on the Australian Consumer Data Right Standards (Data Standards).

The DSB makes this repository, and its artefacts, public [on a non-commercial basis](https://github.com/ConsumerDataStandardsAustralia/java-artefacts/blob/master/LICENSE) in the interest of supporting the participants in the CDR ecosystem.

The resources of the DSB are primarily directed towards assisting the [Data Standards Chair](https://consumerdatastandards.gov.au/about/) for [developing the Data Standards](https://github.com/ConsumerDataStandardsAustralia/standards).

Consequently, the development work provided on the artefacts in this repository is on a best-effort basis, and the DSB acknowledges the use of these tools alone is not sufficient for, nor should they be relied upon with respect to [accreditation](https://www.accc.gov.au/focus-areas/consumer-data-right-cdr-0/cdr-draft-accreditation-guidelines), conformance, or compliance purposes.

The artefacts in this repository are offered without warranty or liability, in accordance with the [MIT licence.](https://github.com/ConsumerDataStandardsAustralia/java-artefacts/blob/master/LICENSE)

[The Data Standards Body](https://consumerdatastandards.gov.au/about) (DSB) develops these artefacts in the course of its work, in order to perform quality assurance on the Australian Consumer Data Right Standards (Data Standards).

The DSB makes this repository, and its artefacts, public [on a non-commercial basis](https://github.com/ConsumerDataStandardsAustralia/java-artefacts/blob/master/LICENSE) in the interest of supporting the participants in the CDR ecosystem.

The resources of the DSB are primarily directed towards assisting the [Data Standards Chair](https://consumerdatastandards.gov.au/about/) for [developing the Data Standards](https://github.com/ConsumerDataStandardsAustralia/standards).

Consequently, the development work provided on the artefacts in this repository is on a best-effort basis, and the DSB acknowledges the use of these tools alone is not sufficient for, nor should they be relied upon with respect to [accreditation](https://www.accc.gov.au/focus-areas/consumer-data-right-cdr-0/cdr-draft-accreditation-guidelines), conformance, or compliance purposes.