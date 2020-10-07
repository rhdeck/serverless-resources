import yaml from "yaml";
import AWS, {
  CloudFormation,
  DynamoDB,
  SQS,
  AppSync,
  IAM,
  Lambda,
} from "aws-sdk";
import { join, dirname, resolve } from "path";
import { readFileSync, existsSync } from "fs";
import { configAWS, findStage } from "@raydeck/serverless-stage";
/**
 * Fix a yaml file at path specified -
 * @internal
 * @param path path to yaml file
 */
function fixYamlFile(path: string) {
  return existsSync(path)
    ? fixYaml(
        yaml.parse(readFileSync(path, { encoding: "utf-8" })),
        dirname(path)
      )
    : {};
}
/**
 * Fill in an object with external file references
 * @internal
 * @param yamlObj object to be fixed
 * @param path path reference for finding other matches (really for config.json)
 */
function fixYaml(yamlObj: { [key: string]: any }, path: string) {
  if (!path) path = process.cwd();
  if (yamlObj.custom) {
    yamlObj.custom = Object.entries(yamlObj.custom).reduce((o, [k, v]) => {
      const matches = typeof v == "string" && v.match(/\$\{file(.*)}/);
      if (matches) {
        const tailpath = matches[1].substring(1, matches[1].length - 1);
        const x = require(join(path, tailpath));
        v = x;
      }
      o[k] = v;
      return o;
    }, <{ [key: string]: any }>{});
  }
  //Traverse the tree looking for other self:custom winners
  const fix = (o: { [key: string]: any }) => {
    if (!o) return;
    Object.entries(o).forEach(([k, v]) => {
      switch (typeof v) {
        case "string":
          o[k] = v.replace(
            /\$\{self.custom([^\$]*)}/g,
            (a: string, b: string) => {
              const pieces = b.split(".").filter(Boolean);
              //@TODO this is hacky because we are moving from an obj to a string
              return <string>(<unknown>pieces.reduce(
                (a, k) => {
                  if (a) a = a[k];
                  return a;
                },
                <{ [key: string]: any }>{ ...yamlObj.custom }
              ));
            }
          );
          break;
        case "object":
          fix(v);
      }
    });
  };
  fix(yamlObj);
  return yamlObj;
}
/**
 * Get name of stack we are building right here
 * @internal
 * @param path current path to serverless.yml file (will append /serverless.yml if missing)
 */
function getServiceName(path?: string) {
  return path
    ? fixYamlFile(
        path.endsWith(".yml")
          ? resolve(path)
          : join(resolve(path), "serverless.yml")
      ).service
    : fixYamlFile(join(process.cwd(), "serverless.yml")).service;
}
async function getArnForQueue(url: string, region: string) {
  try {
    const { Attributes: { QueueArn } = { QueueArn: "" } } = await new SQS({
      region,
    })
      .getQueueAttributes({
        QueueUrl: url,
        AttributeNames: ["QueueArn"],
      })
      .promise();
    return QueueArn;
  } catch (error) {
    console.error("SQS Error>", error);
  }
}
/**
 * Get Stream for database
 * @internal
 * @param TableName DDB table name
 * @param region region
 */
async function getStreamArnForDatabaseTable(
  TableName: string,
  region: string = "us-east-1"
) {
  try {
    const {
      Table: { LatestStreamArn } = { LatestStreamArn: undefined },
    } = await new DynamoDB({
      region,
    })
      .describeTable({ TableName })
      .promise();
    return LatestStreamArn;
  } catch (error) {
    console.error("Database Error>", error);
  }
}
/**
 * Get the arn by table name
 * @internal
 * @param TableName DDB table name
 * @param region AWS region
 */
async function getArnForDatabaseTable(
  TableName: string,
  region: string = "us-east-1"
) {
  try {
    const {
      Table: { TableArn } = { TableArn: undefined },
    } = await new DynamoDB({
      region,
    })
      .describeTable({ TableName })
      .promise();
    return TableArn;
  } catch (error) {
    console.error("Database Error>", error);
  }
}
/**
 * Get Global Secondary Inidices of a table
 * @internal
 * @param TableName DDB Table name
 * @param region AWS region
 */
async function getGSIsForDatabaseTable(
  TableName: string,
  region: string = "us-east-1"
) {
  try {
    const {
      Table: { GlobalSecondaryIndexes } = { GlobalSecondaryIndexes: undefined },
    } = await new DynamoDB({
      region,
    })
      .describeTable({ TableName })
      .promise();
    return GlobalSecondaryIndexes
      ? GlobalSecondaryIndexes.map(({ IndexName, IndexArn }) => ({
          name: IndexName,
          arn: IndexArn,
        }))
      : [];
    // return TableArn;
  } catch (error) {
    console.error("Database Error>", error);
    return [];
  }
}
/**
 * Get Local Secondary Indicies for a table
 * @internal
 * @param TableName DDB Table name
 * @param region AWS region
 */
async function getLSIsForDatabaseTable(
  TableName: string,
  region: string = "us-east-1"
) {
  try {
    const {
      Table: { LocalSecondaryIndexes } = { LocalSecondaryIndexes: undefined },
    } = await new DynamoDB({
      region,
    })
      .describeTable({ TableName })
      .promise();
    return LocalSecondaryIndexes
      ? LocalSecondaryIndexes.map(({ IndexName, IndexArn }) => ({
          name: IndexName,
          arn: IndexArn,
        }))
      : [];
    // return TableArn;
  } catch (error) {
    console.error("Database Error>", error);
    return [];
  }
}
/**
 * get the arn of a lambda from the function name
 * @internal
 * @param FunctionName name of the lambda function
 * @param region AWS region
 */
async function getArnForLambda(
  FunctionName: string,
  region: string = "us-east-1"
) {
  try {
    const {
      Versions: [{ FunctionArn } = { FunctionArn: undefined }] = [],
    } = await new Lambda({ region })
      .listVersionsByFunction({ FunctionName })
      .promise();
    return FunctionArn;
  } catch (error) {
    console.error("Lambda Error>", error);
  }
}
/**
 * Get the unqualified arn of a lambda
 * @internal
 * @param FunctionName Name of Function
 * @param region AWS Region
 */
async function getUnqualifiedArnForLambda(
  FunctionName: string,
  region: string = "us-east-1"
) {
  try {
    const {
      Configuration: { FunctionArn } = { FunctionArn: undefined },
    } = await new Lambda({ region })
      .getFunction({
        FunctionName,
      })
      .promise();
    return FunctionArn;
  } catch (error) {
    console.error("Lambda error", error);
  }
}
/**
 * Detect whether a given resource is for DDB
 * @internal
 * @param resource Resource object
 */
function isDDBResource(resource: { ResourceType: string }) {
  return resource.ResourceType === "AWS::DynamoDB::Table";
}
/**
 * Get the ARN of a role by name
 * @internal
 * @param role Name of the role
 * @param region AWS Region
 */
async function getArnForRole(role: string, region: string = "us-east-1") {
  try {
    const {
      Role: { Arn },
    } = await new IAM({ region }).getRole({ RoleName: role }).promise();
    return Arn;
  } catch (error) {
    console.error("IAM Error", error);
  }
}
/**
 * Get outputs of a single stack at the path in question
 * @param cmd Command line options from the tool
 */
export async function getOutputs(cmd: {
  json?: boolean;
  yaml?: boolean;
  service?: string;
  path?: string;
  region?: string;
  stage?: string;
  awsProfile?: string;
}) {
  configAWS(AWS, cmd.awsProfile);
  const region = cmd.region || "us-east-1";
  const stage = cmd.stage || findStage() || "dev";
  const service = cmd.service || getServiceName(cmd.path);
  if (!service) return {};
  let thisToken = null;
  let obj = {};
  const out: { [key: string]: any } = {};
  let NextToken: string | undefined;
  let Outputs: CloudFormation.Outputs | undefined;
  do {
    const o = <{ NextToken?: string; Stacks: { Outputs: any }[] }>(
      await new CloudFormation({
        region: region,
      })
        .describeStacks({
          StackName: `${service}-${stage}`,
          NextToken: thisToken || undefined,
        })
        .promise()
    );
    NextToken = o.NextToken;
    Outputs = o.Stacks.shift()!.Outputs;
    Outputs!.forEach(({ OutputKey, OutputValue }) => {
      if (OutputKey) {
        out[OutputKey] = OutputValue;
      }
    });
    thisToken = NextToken;
  } while (thisToken);
  return out;
}
/**
 * Get resources of the stack at this path
 * @param cmd Inputs from command line tool
 */
export async function getResources(cmd: {
  service?: string;
  path?: string;
  region?: string;
  stage?: string;
  awsProfile?: string;
}) {
  console.log("starting getresources with cmd", cmd);
  configAWS(AWS, cmd.awsProfile);
  const region = cmd.region || "us-east-1";
  const stage = cmd.stage || findStage() || "dev";
  const service = cmd.service || getServiceName(cmd.path);
  if (!service) return {};
  let thisToken: string | undefined;
  let obj: { [key: string]: any } = {};
  do {
    const { NextToken, StackResourceSummaries } = (await new CloudFormation({
      region: region,
    })
      .listStackResources({
        StackName: `${service}-${stage}`,
        NextToken: thisToken,
      })
      .promise()) || {
      NextToken: undefined,
      StackResourceSummaries: undefined,
    };
    console.log(StackResourceSummaries);
    if (!StackResourceSummaries) return {};
    StackResourceSummaries.forEach((o) => {
      obj[o.LogicalResourceId] = o;
      if (isDDBResource(o)) {
        obj[o.LogicalResourceId + "-stream"] = {
          PhysicalResourceId: o.PhysicalResourceId,
          ResourceType: "Custom::DDB::Stream",
        };
      }
    });
    thisToken = NextToken;
  } while (thisToken);
  const promises = Object.entries(obj).map(async ([k, resource]) => {
    switch (resource.ResourceType) {
      case "Custom::DDB::Stream":
        obj[k] = await getStreamArnForDatabaseTable(
          resource.PhysicalResourceId,
          region
        );
        break;
      case "AWS::SQS::Queue":
        obj[`${k}-url`] = resource.PhysicalResourceId;
        obj[k] = await getArnForQueue(resource.PhysicalResourceId, region);
        break;
      case "AWS::IAM::Role":
        obj[k] = resource.PhysicalResourceId;
        obj[k + "-arn"] = await getArnForRole(
          resource.PhysicalResourceId,
          region
        );
        break;
      case "AWS::DynamoDB::Table":
        obj[k] = resource.PhysicalResourceId;
        obj[k + "-arn"] = await getArnForDatabaseTable(
          resource.PhysicalResourceId,
          region
        );
        const GSIs = await getGSIsForDatabaseTable(
          resource.PhysicalResourceId,
          region
        );
        GSIs.forEach(({ name, arn }) => {
          const base = k + "-" + name;
          obj[base] = name;
          obj[base + "-arn"] = arn;
          //Legacy naming structure
          obj[k + "GSI"] = name;
          obj[k + "GSI-arn"] = arn;
        });
        const LSIs = await getLSIsForDatabaseTable(
          resource.PhysicalResourceId,
          region
        );
        LSIs.forEach(({ name, arn }) => {
          const base = k + "-" + name;
          obj[base] = name;
          obj[base + "-arn"] = arn;
        });
        break;
      case "AWS::Lambda::Function":
        obj[k] = resource.PhysicalResourceId;
        obj[[k, "arn"].join("-")] = await getArnForLambda(
          resource.PhysicalResourceId,
          region
        );
        obj[
          [k, "arn-unqualified"].join("-")
        ] = await getUnqualifiedArnForLambda(
          resource.PhysicalResourceId,
          region
        );

        break;
      default:
        obj[k] = resource.PhysicalResourceId;
    }
  });
  await Promise.all(promises);
  return obj;
}
/**
 * Get profile for Appsync resource in this stack
 * @param appResources Resources as returened by getResources above
 * @param cmd arguments from CLI tool
 */
export async function getAppSync(
  appResources: { [key: string]: any },
  cmd: {
    json?: boolean;
    yaml?: boolean;
    service?: string;
    path?: string;
    region?: string;
    stage?: string;
    awsProfile?: string;
  }
) {
  const region = cmd.region || "us-east-1";
  return (
    await Promise.all(
      Object.entries(appResources)
        .filter(([key, _]) => {
          return key.indexOf("GraphQlApi") > -1;
        })
        .map(([_, value]) => {
          const apiIdPrefix = "apis/";
          let index = value.indexOf(apiIdPrefix);
          return value.substr(index + apiIdPrefix.length);
        })
        .map(async (apiId) => {
          try {
            let { graphqlApi } = await new AppSync({ region })
              .getGraphqlApi({ apiId })
              .promise();
            return graphqlApi;
          } catch (error) {}
        })
    )
  )[0];
}
