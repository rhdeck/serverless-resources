
<a name="__climd"></a>

# Usage
```bash
serverless-resources [options] [command]
```
# Commands
## info
Get information in JSON format for this command
### Usage
```bash
serverless-resources info [options]
```
### Options
* -y --yaml Format as YAML 
* -s --service \<`service`> Service name (default infers from the serverless.yml 
* -p --path \<`path`> Path to serverless base definition (default is cwd) 
* -r --region \<`region`> AWS Region - defaults to environment value 
* -t --stage \<`stage`> Stage to target, usually dev or prod 
* -a --aws-profile \<`profile`> Name of AWS profile to use 

<a name="librarymd"></a>


# @raydeck/serverless-resources - v3.0.1

## Index

### Functions

* [fixYaml](#fixyaml)
* [fixYamlFile](#fixyamlfile)
* [getAppSync](#getappsync)
* [getArnForDatabaseTable](#getarnfordatabasetable)
* [getArnForLambda](#getarnforlambda)
* [getArnForQueue](#getarnforqueue)
* [getArnForRole](#getarnforrole)
* [getGSIsForDatabaseTable](#getgsisfordatabasetable)
* [getLSIsForDatabaseTable](#getlsisfordatabasetable)
* [getOutputs](#getoutputs)
* [getResources](#getresources)
* [getServiceName](#getservicename)
* [getStreamArnForDatabaseTable](#getstreamarnfordatabasetable)
* [getUnqualifiedArnForLambda](#getunqualifiedarnforlambda)
* [isDDBResource](#isddbresource)

## Functions

###  fixYaml

▸ **fixYaml**(`yamlObj`: object, `path`: string): *object*

*Defined in [index.ts:32](https://github.com/rhdeck/serverless-resources/blob/166323e/src/index.ts#L32)*

Fill in an object with external file references

**`internal`** 

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`yamlObj` | object | object to be fixed |
`path` | string | path reference for finding other matches (really for config.json)  |

**Returns:** *object*

* \[ **key**: *string*\]: any

___

###  fixYamlFile

▸ **fixYamlFile**(`path`: string): *object*

*Defined in [index.ts:18](https://github.com/rhdeck/serverless-resources/blob/166323e/src/index.ts#L18)*

Fix a yaml file at path specified -

**`internal`** 

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`path` | string | path to yaml file  |

**Returns:** *object*

* \[ **key**: *string*\]: any

___

###  getAppSync

▸ **getAppSync**(`appResources`: object, `cmd`: object): *Promise‹undefined | GraphqlApi›*

*Defined in [index.ts:438](https://github.com/rhdeck/serverless-resources/blob/166323e/src/index.ts#L438)*

Get profile for Appsync resource in this stack

**Parameters:**

▪ **appResources**: *object*

Resources as returened by getResources above

▪ **cmd**: *object*

arguments from CLI tool

Name | Type |
------ | ------ |
`awsProfile?` | undefined &#124; string |
`json` | boolean |
`path?` | undefined &#124; string |
`region?` | undefined &#124; string |
`service?` | undefined &#124; string |
`stage?` | undefined &#124; string |
`yaml` | boolean |

**Returns:** *Promise‹undefined | GraphqlApi›*

___

###  getArnForDatabaseTable

▸ **getArnForDatabaseTable**(`TableName`: string, `region`: string): *Promise‹undefined | string›*

*Defined in [index.ts:133](https://github.com/rhdeck/serverless-resources/blob/166323e/src/index.ts#L133)*

Get the arn by table name

**`internal`** 

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`TableName` | string | - | DDB table name |
`region` | string | "us-east-1" | AWS region  |

**Returns:** *Promise‹undefined | string›*

___

###  getArnForLambda

▸ **getArnForLambda**(`FunctionName`: string, `region`: string): *Promise‹undefined | string›*

*Defined in [index.ts:216](https://github.com/rhdeck/serverless-resources/blob/166323e/src/index.ts#L216)*

get the arn of a lambda from the function name

**`internal`** 

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`FunctionName` | string | - | name of the lambda function |
`region` | string | "us-east-1" | AWS region  |

**Returns:** *Promise‹undefined | string›*

___

###  getArnForQueue

▸ **getArnForQueue**(`url`: string, `region`: string): *Promise‹undefined | string›*

*Defined in [index.ts:89](https://github.com/rhdeck/serverless-resources/blob/166323e/src/index.ts#L89)*

**Parameters:**

Name | Type |
------ | ------ |
`url` | string |
`region` | string |

**Returns:** *Promise‹undefined | string›*

___

###  getArnForRole

▸ **getArnForRole**(`role`: string, `region`: string): *Promise‹undefined | string›*

*Defined in [index.ts:268](https://github.com/rhdeck/serverless-resources/blob/166323e/src/index.ts#L268)*

Get the ARN of a role by name

**`internal`** 

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`role` | string | - | Name of the role |
`region` | string | "us-east-1" | AWS Region  |

**Returns:** *Promise‹undefined | string›*

___

###  getGSIsForDatabaseTable

▸ **getGSIsForDatabaseTable**(`TableName`: string, `region`: string): *Promise‹object[]›*

*Defined in [index.ts:156](https://github.com/rhdeck/serverless-resources/blob/166323e/src/index.ts#L156)*

Get Global Secondary Inidices of a table

**`internal`** 

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`TableName` | string | - | DDB Table name |
`region` | string | "us-east-1" | AWS region  |

**Returns:** *Promise‹object[]›*

___

###  getLSIsForDatabaseTable

▸ **getLSIsForDatabaseTable**(`TableName`: string, `region`: string): *Promise‹object[]›*

*Defined in [index.ts:186](https://github.com/rhdeck/serverless-resources/blob/166323e/src/index.ts#L186)*

Get Local Secondary Indicies for a table

**`internal`** 

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`TableName` | string | - | DDB Table name |
`region` | string | "us-east-1" | AWS region  |

**Returns:** *Promise‹object[]›*

___

###  getOutputs

▸ **getOutputs**(`cmd`: object): *Promise‹object›*

*Defined in [index.ts:282](https://github.com/rhdeck/serverless-resources/blob/166323e/src/index.ts#L282)*

Get outputs of a single stack at the path in question

**Parameters:**

▪ **cmd**: *object*

Command line options from the tool

Name | Type |
------ | ------ |
`awsProfile?` | undefined &#124; string |
`json?` | undefined &#124; false &#124; true |
`path?` | undefined &#124; string |
`region?` | undefined &#124; string |
`service?` | undefined &#124; string |
`stage?` | undefined &#124; string |
`yaml?` | undefined &#124; false &#124; true |

**Returns:** *Promise‹object›*

___

###  getResources

▸ **getResources**(`cmd`: object): *Promise‹object›*

*Defined in [index.ts:327](https://github.com/rhdeck/serverless-resources/blob/166323e/src/index.ts#L327)*

Get resources of the stack at this path

**Parameters:**

▪ **cmd**: *object*

Inputs from command line tool

Name | Type |
------ | ------ |
`awsProfile?` | undefined &#124; string |
`path?` | undefined &#124; string |
`region?` | undefined &#124; string |
`service?` | undefined &#124; string |
`stage?` | undefined &#124; string |

**Returns:** *Promise‹object›*

___

###  getServiceName

▸ **getServiceName**(`path?`: undefined | string): *any*

*Defined in [index.ts:80](https://github.com/rhdeck/serverless-resources/blob/166323e/src/index.ts#L80)*

Get name of stack we are building right here

**`internal`** 

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`path?` | undefined &#124; string | current path to serverless.yml file (will append /serverless.yml if missing)  |

**Returns:** *any*

___

###  getStreamArnForDatabaseTable

▸ **getStreamArnForDatabaseTable**(`TableName`: string, `region`: string): *Promise‹undefined | string›*

*Defined in [index.ts:110](https://github.com/rhdeck/serverless-resources/blob/166323e/src/index.ts#L110)*

Get Stream for database

**`internal`** 

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`TableName` | string | - | DDB table name |
`region` | string | "us-east-1" | region  |

**Returns:** *Promise‹undefined | string›*

___

###  getUnqualifiedArnForLambda

▸ **getUnqualifiedArnForLambda**(`FunctionName`: string, `region`: string): *Promise‹undefined | string›*

*Defined in [index.ts:237](https://github.com/rhdeck/serverless-resources/blob/166323e/src/index.ts#L237)*

Get the unqualified arn of a lambda

**`internal`** 

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`FunctionName` | string | - | Name of Function |
`region` | string | "us-east-1" | AWS Region  |

**Returns:** *Promise‹undefined | string›*

___

###  isDDBResource

▸ **isDDBResource**(`resource`: object): *boolean*

*Defined in [index.ts:259](https://github.com/rhdeck/serverless-resources/blob/166323e/src/index.ts#L259)*

Detect whether a given resource is for DDB

**`internal`** 

**Parameters:**

▪ **resource**: *object*

Resource object

Name | Type |
------ | ------ |
`ResourceType` | string |

**Returns:** *boolean*
