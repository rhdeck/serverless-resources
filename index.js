const yaml = require("yaml");
const { CloudFormation } = require("aws-sdk");
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
  const obj = StackResourceSummaries.reduce((out, o) => {
    if (!out) out = {};
    out[o.LogicalResourceId] = o.PhysicalResourceId;
    return out;
  });
  if (cmd.json) {
    const json = JSON.stringify(obj);
    console.log(json);
  } else if (cmd.yaml) {
    const yml = yaml.stringify(obj);
    console.log(yml);
  } else {
    console.log(obj);
  }
};
