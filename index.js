const yaml = require("yaml");
const {
  CloudFormation,
  DynamoDB,
  SQS,
  AppSync,
  IAM,
  Lambda
} = require("aws-sdk");
const Path = require("path");
const { readFileSync, existsSync } = require("fs");
const { join, dirname, resolve } = require("path");
const fixYamlFile = path =>
  existsSync(path)
    ? fixYaml(
        yaml.parse(readFileSync(path, { encoding: "UTF8" })),
        dirname(path)
      )
    : {};
const fixYaml = (y, path) => {
  if (!path) path = process.cwd();
  if (y.custom) {
    y.custom = Object.entries(y.custom).reduce((o, [k, v]) => {
      const matches = typeof v == "string" && v.match(/\$\{file(.*)}/);
      if (matches) {
        const tailpath = matches[1].substring(1, matches[1].length - 1);
        const x = require(join(path, tailpath));
        v = x;
      }
      o[k] = v;
      return o;
    }, {});
  }
  //Traverse the tree looking for other self:custom winners
  const fix = o => {
    Object.entries(o).forEach(([k, v]) => {
      switch (typeof v) {
        case "string":
          o[k] = v.replace(/\$\{self.custom([^\$]*)}/g, (a, b) => {
            const pieces = b.split(".").filter(Boolean);
            return pieces.reduce(
              (a, k) => {
                a = a[k];
                return a;
              },
              { ...y.custom }
            );
          });
          break;
        case "object":
          fix(v);
      }
    });
  };
  fix(y);
  return y;
};
const getServiceName = path => {
  return path
    ? fixYamlFile(
        path.endsWith(".yml")
          ? resolve(path)
          : Path.join(resolve(path), "serverless.yml")
      ).service
    : fixYamlFile(Path.join(process.cwd(), "serverless.yml")).service;
};

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
    console.error("SQS Error>", error);
  }
}
async function getStreamArnForDatabaseTable(tableName, region) {
  try {
    const {
      Table: { LatestStreamArn }
    } = await new DynamoDB({
      region
    })
      .describeTable({ TableName: tableName })
      .promise();
    return LatestStreamArn;
  } catch (error) {
    console.error("Database Error>", error);
  }
}
async function getArnForDatabaseTable(tableName, region) {
  try {
    const {
      Table: { TableArn }
    } = await new DynamoDB({
      region
    })
      .describeTable({ TableName: tableName })
      .promise();
    return TableArn;
  } catch (error) {
    console.error("Database Error>", error);
  }
}

async function getArnForLambda(functionName, region) {
  try {
    const {
      Versions: [{ FunctionArn }]
    } = await new Lambda({ region })
      .listVersionsByFunction({ FunctionName: functionName })
      .promise();
    return FunctionArn;
  } catch (error) {
    console.error("Database Error>", error);
  }
}
function isDDBResource(resource) {
  return resource.ResourceType === "AWS::DynamoDB::Table";
}
async function getArnForRole(role, region) {
  try {
    const {
      Role: { Arn }
    } = await new IAM({ region }).getRole({ RoleName: role }).promise();
    return Arn;
  } catch (error) {
    console.error("IAM Error", error);
  }
}
module.exports.getResources = async cmd => {
  const region = cmd.region || "us-east-1";
  const stage = cmd.stage || "dev";
  const service = cmd.service || getServiceName(cmd.path);
  if (!service) return {};
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
      case "AWS::Lambda::Function":
        obj[k] = resource.PhysicalResourceId;
        obj[[k, "arn"].join("-")] = await getArnForLambda(
          resource.PhysicalResourceId,
          region
        );
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
