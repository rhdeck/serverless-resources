const yaml = require("yaml");
const { CloudFormation, DynamoDB, SQS, AppSync } = require("aws-sdk");
const Path = require("path");
const fs = require("fs");
function getServiceName(path) {
  let name =
    path &&
    yaml.parse(
      fs.readFileSync(
        path.endsWith(".yml") ? path : Path.join(path, "serverless.yml"),
        { encoding: "UTF8" }
      )
    ).service;
  if (!name) {
    name = yaml.parse(
      fs.readFileSync(Path.join(process.cwd(), "serverless.yml"), {
        encoding: "UTF8"
      })
    ).service;
  }
  return name;
}
async function getArnForQueue(url, region) {
  try {
    const {
      Attributes: { QueueArn }
    } = await new SQS({
      region
    })
      .getQueueAttributes({
        QueueUrl: url,
        AttributeNames: ["QueueArn"]
      })
      .promise();
    return QueueArn;
  } catch (error) {
    console.log("SQS Error>", error);
  }
}
async function getStreamArnForDatabaseTable(tableName, region) {
  try {
    const {
      Table: { LatestStreamArn }
    } = await new DynamoDB({
      region: region
    })
      .describeTable({ TableName: tableName })
      .promise();
    return LatestStreamArn;
  } catch (error) {
    console.log("Database Error>", error);
  }
}
function isDDBResource(resource) {
  return resource.ResourceType === "AWS::DynamoDB::Table";
}
module.exports.getResources = async cmd => {
  const region = cmd.region || "us-east-1";
  const stage = cmd.stage || "dev";
  const service = cmd.service || getServiceName(cmd.path);
  let thisToken = null;
  let obj = {};
  do {
    const { StackResourceSummaries, NextToken } = await new CloudFormation({
      region: region
    })
      .listStackResources({
        StackName: `${service}-${stage}`,
        NextToken: thisToken
      })
      .promise();
    StackResourceSummaries.forEach(o => {
      obj[o.LogicalResourceId] = o;
      if (isDDBResource(o)) {
        obj[o.LogicalResourceId + "-stream"] = {
          PhysicalResourceId: o.PhysicalResourceId,
          ResourceType: "Custom::DDB::Stream"
        };
      }
    });
    thisToken = NextToken;
  } while (thisToken);
  const promises = Object.keys(obj).map(async k => {
    let resource = obj[k];
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
      default:
        obj[k] = resource.PhysicalResourceId;
    }
  });
  await Promise.all(promises);
  // const {
  //   Stacks: [{ Outputs }]
  // } = await new CloudFormation({
  //   region: region
  // })
  //   .describeStacks({ StackName: `${service}-${stage}` })
  //   .promise();
  // Outputs.forEach(({ OutputKey, OutputValue }) => {
  //   obj[OutputKey] = OutputValue;
  // });

  if (cmd.json) {
    const json = JSON.stringify(obj, null, 2);
    return json;
  } else if (cmd.yaml) {
    const yml = yaml.stringify(obj);
    return yml;
  } else {
    return obj;
  }
};

module.exports.getAppSync = async (appResources, cmd) => {
  const region = cmd.region || "us-east-1";
  return (await Promise.all(
    Object.entries(appResources)
      .filter(([key, _]) => {
        return key.indexOf("GraphQlApi") > -1;
      })
      .map(([_, value]) => {
        const apiIdPrefix = "apis/";
        let index = value.indexOf(apiIdPrefix);
        return value.substr(index + apiIdPrefix.length);
      })
      .map(async apiId => {
        try {
          let { graphqlApi } = await new AppSync({ region })
            .getGraphqlApi({ apiId })
            .promise();
          return graphqlApi;
        } catch (error) {}
      })
  ))[0];
};
module.exports.getAPIKey = async (apiId, cmd, doMake = true) => {
  const region = cmd.region || "us-east-1";
  let { apiKeys } = await new AppSync({ region })
    .listApiKeys({
      apiId
    })
    .promise();
  return await (apiKeys.length &&
  apiKeys[0].expires > Math.floor(Date.now() / 1000)
    ? apiKeys[0]
    : doMake &&
      new AppSync({ region }).createApiKey({ apiId: appsyncAPI.apiId }));
};
