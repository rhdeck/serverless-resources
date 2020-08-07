#!/usr/bin/env node
import commander from "commander";
import { getResources } from "./";
import yamlManager from "yaml";
commander
  .command("info")
  .description("Get information in JSON format for this command")
  .option("-y --yaml", "Format as YAML")
  .option(
    "-s --service <service>",
    "Service name (default infers from the serverless.yml"
  )
  .option(
    "-p --path <path>",
    "Path to serverless base definition (default is cwd)"
  )
  .option("-r --region <region>", "AWS Region - defaults to environment value")
  .option("-t --stage <stage>", "Stage to target, usually dev or prod")
  .option("-a --aws-profile <profile>", "Name of AWS profile to use")
  .action(async ({ yaml, service, path, region, stage, awsProfile }) => {
    const o = await getResources({
      service,
      path,
      region,
      stage,
      awsProfile,
    });
    if (!yaml) {
      const txt = JSON.stringify(o, null, 2);
      process.stdout.write(txt);
    } else {
      const yml = yamlManager.stringify(o);
      process.stdout.write(yml);
    }
  });
commander.parse(process.argv);
export { commander };
