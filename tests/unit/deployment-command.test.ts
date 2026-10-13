import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";

const bash =
  process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "bash";
const script = resolve("scripts/production/ci-command.sh");
const sha = "298dcb2451b43a59b0a154f1b8fedcd086dcac2a";

describe("restricted production SSH command", () => {
  it("passes exactly the validated release to the sudo wrapper", () => {
    const directory = mkdtempSync(join(tmpdir(), "wardrobe-deploy-test-"));
    try {
      writeFileSync(
        join(directory, "sudo"),
        '#!/bin/sh\nprintf "%s\\n" "$@"\n',
        { mode: 0o700 },
      );
      const output = execFileSync(bash, [script], {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${directory}${delimiter}${process.env.PATH}`,
          SSH_ORIGINAL_COMMAND: `deploy ${sha}`,
        },
      });
      expect(output.trim().split(/\r?\n/)).toEqual([
        "-n",
        "/usr/local/sbin/wardrobe-deploy",
        sha,
      ]);
    } finally {
      const parent = realpathSync(tmpdir());
      const target = realpathSync(directory);
      if (
        !target.startsWith(
          `${parent}${process.platform === "win32" ? "\\" : "/"}`,
        )
      )
        throw new Error("Unexpected temporary path");
      rmSync(target, { recursive: true });
    }
  });

  it.each([
    "",
    "bash",
    `deploy ${sha}; id`,
    `deploy ${sha} extra`,
    "deploy ../../etc/passwd",
    `deploy $(echo ${sha})`,
    `deploy ${sha}\ndeploy ${sha}`,
  ])("rejects shell commands and malformed releases: %s", (command) => {
    const result = spawnSync(bash, [script], {
      encoding: "utf8",
      env: { ...process.env, SSH_ORIGINAL_COMMAND: command },
    });
    expect(result.status).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Only deploy");
  });
});
