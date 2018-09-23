#!/usr/bin/env node
const yaml = require("yaml");
const AWS = require("aws-sdk");
const commander = require("commander");
const { CloudFormation } = AWS;
const Path = require("path");
const fs = require("fs");
const sr = require("./");
console.log("Starting in ", process.cwd());
commander
  .command("info")
  .description("Get information in JSON format for this command")
  .option("-j --json", "Format as JSON")
  .option("-y --yaml", "Format as YAML")
  .option("-s --service <service>")
  .option("-p --path <path>")
  .option("-r --region <region>")
  .option("-t --stage <stage>")
  .action(async args => console.log(await sr(args)));
commander.parse(process.argv);
