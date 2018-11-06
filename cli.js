#!/usr/bin/env node
const commander = require("commander");
const { getResources } = require("./");
commander
  .command("info")
  .description("Get information in JSON format for this command")
  .option("-j --json", "Format as JSON")
  .option("-y --yaml", "Format as YAML")
  .option("-s --service <service>")
  .option("-p --path <path>")
  .option("-r --region <region>")
  .option("-t --stage <stage>")
  .action(async args => console.log(await getResources(args)));
commander.parse(process.argv);
