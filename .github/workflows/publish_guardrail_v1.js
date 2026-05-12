#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const out = {
    qaGateResultPath: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--qa-gate-result") {
      out.qaGateResultPath = argv[i + 1] || null;
      i += 1;
    }
  }

  return out;
}

function fail(msg) {
  console.error(`PUBLISH BLOCKED: ${msg}`);
  process.exit(1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const qaGatePath = args.qaGateResultPath || process.env.QA_GATE_RESULT_PATH || "artifacts/qa_gate_result_v1.json";
  const resolvedPath = path.resolve(process.cwd(), qaGatePath);

  if (!fs.existsSync(resolvedPath)) {
    fail(`QA gate result not found at ${resolvedPath}`);
  }

  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  } catch (error) {
    fail(`Invalid QA gate result JSON (${error.message})`);
  }

  if (payload.schema_version !== "qa_gate_result_v1") {
    fail(`Unexpected schema_version: ${String(payload.schema_version)}`);
  }

  if (payload.gate_name !== "ENTA-15-qa_gate_ruleset_v1") {
    fail(`Unexpected gate_name: ${String(payload.gate_name)}`);
  }

  const status = String(payload.status || "").toLowerCase();
  if (status !== "pass") {
    fail(`QA gate status=${status || "unknown"} (expected pass)`);
  }

  console.log("Publish guardrail check passed.");
  console.log(`- QA gate result: ${resolvedPath}`);
  console.log(`- Gate: ${payload.gate_name}`);
  console.log(`- Generated: ${payload.generated_at_utc}`);
  console.log(`- Status: ${payload.status}`);
}

main();
