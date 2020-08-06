#!/usr/bin/env node
import commander from "commander";
import { getResources } from "./";
commander
  .command("info")
  .description("Get information in JSON format for this command")
  .option("-j --json", "Format as JSON")
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
  .action(async ({ json, yaml, service, path, region, stage, awsProfile }) =>
    console.log(
      await getResources({
        json,
        yaml,
        service,
        path,
        region,
        stage,
        awsProfile,
      })
    )
  );
commander.parse(process.argv);
export { commander };
