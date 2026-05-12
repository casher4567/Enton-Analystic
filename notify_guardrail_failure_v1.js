#!/usr/bin/env node
"use strict";

const https = require("https");
const { URL } = require("url");

function parseArgs(argv) {
  const out = { dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--dry-run") out.dryRun = true;
  }
  return out;
}

function postJson(urlValue, payload) {
  return new Promise((resolve, reject) => {
    const target = new URL(urlValue);
    const body = JSON.stringify(payload);

    const req = https.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || 443,
        path: `${target.pathname}${target.search}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let responseBody = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        res.on("end", () => {
          resolve({ statusCode: res.statusCode || 0, body: responseBody });
        });
      }
    );

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const webhookUrl = process.env.GUARDRAIL_ALERT_WEBHOOK_URL || "";
  const repo = process.env.GITHUB_REPOSITORY || "unknown-repo";
  const ref = process.env.GITHUB_REF_NAME || process.env.GITHUB_REF || "unknown-ref";
  const runId = process.env.GITHUB_RUN_ID || "unknown-run";
  const runUrl = `https://github.com/${repo}/actions/runs/${runId}`;

  const payload = {
    text: `[P1] A3 QA Gate Hard Fail in ${repo} (${ref}) - ${runUrl}`
  };

  if (args.dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (!webhookUrl) {
    console.error("GUARDRAIL_ALERT_WEBHOOK_URL not set; cannot deliver external alert.");
    process.exit(2);
  }

  const response = await postJson(webhookUrl, payload);

  if (response.statusCode < 200 || response.statusCode >= 300) {
    console.error(`Alert delivery failed with status ${response.statusCode}`);
    if (response.body) console.error(response.body.slice(0, 500));
    process.exit(1);
  }

  console.log(`Alert delivered to webhook (status ${response.statusCode}).`);
}

main().catch((error) => {
  console.error(`Alert delivery error: ${error.message}`);
  process.exit(1);
});
