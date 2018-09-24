const yaml = require("yaml");
const { CloudFormation, DynamoDB } = require("aws-sdk");
const Path = require("path");
const fs = require("fs");

module.exports = async cmd => {
  const region = cmd.region || "us-east-1";
  const stage = cmd.stage || "dev";
  const service =
    cmd.service ||
    (cmd.path &&
      yaml.parse(
        fs.readFileSync(
          cmd.path.endsWith(".yml")
            ? cmd.path
            : Path.join(cmd.path, "serverless.yml"),
          { encoding: "UTF8" }
        )
      ).service) ||
    yaml.parse(
      fs.readFileSync(Path.join(process.cwd(), "serverless.yml"), {
        encoding: "UTF8"
      })
    ).service;
  const { StackResourceSummaries } = await new CloudFormation({
    region: region
  })
    .listStackResources({ StackName: `${service}-${stage}` })
    .promise();
  let obj = StackResourceSummaries.reduce((out, o) => {
    out[o.LogicalResourceId] = o.PhysicalResourceId;
    return out;
  }, {});
  const promises = Object.keys(obj).map(async k => {
    try {
      const {
        Table: { LatestStreamArn }
      } = await new DynamoDB({
        region: region
      })
        .describeTable({ TableName: obj[k] })
        .promise();
      obj[k + "-stream"] = LatestStreamArn;
    } catch (e) {}
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
