const yaml = require("yaml");
const { CloudFormation, DynamoDB, SQS } = require("aws-sdk");
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
module.exports = async cmd => {
  const region = cmd.region || "us-east-1";
  const stage = cmd.stage || "dev";
  const service = cmd.service || getServiceName(cmd.path);
  const { StackResourceSummaries } = await new CloudFormation({
    region: region
  })
    .listStackResources({ StackName: `${service}-${stage}` })
    .promise();

  let obj = StackResourceSummaries.reduce((out, o) => {
    out[o.LogicalResourceId] = o;
    if (isDDBResource(o)) {
      out[o.LogicalResourceId + "-stream"] = {
        PhysicalResourceId: o.PhysicalResourceId,
        ResourceType: "Custom::DDB::Stream"
      };
    }
    return out;
  }, {});
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
