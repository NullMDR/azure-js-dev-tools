import { getInMemoryLogger, InMemoryLogger } from "@azure/logger-js";
import { assert } from "chai";
import { joinPath } from "../lib";
import { assertEx } from "../lib/assertEx";
import { deleteFolder, findFileInPath, findFileInPathSync, folderExists } from "../lib/fileSystem2";
import { ExecutableGit, getGitRemoteBranch, getRemoteBranchFullName, GitRemoteBranch } from "../lib/git";
import { FakeRunner, RunResult } from "../lib/run";

let folderCount = 1;
function getFolderName(): string {
  return `fake-folder-${folderCount++}`;
}

function getFolderPath(): string {
  return joinPath(process.cwd(), getFolderName());
}

const runPushRemoteBranchTests: boolean = !!findFileInPathSync("github.auth");

describe("git.ts", function () {
  describe("getGitRemoteBranch(string|GitRemoteBranch)", function () {
    it("with undefined", function () {
      assert.strictEqual(getGitRemoteBranch(undefined as any), undefined);
    });

    it("with null", function () {
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(getGitRemoteBranch(null as any), null);
    });

    it("with empty string", function () {
      assert.deepEqual(getGitRemoteBranch(""), {
        repositoryTrackingName: "",
        branchName: ""
      });
    });

    it("with non-empty string with no colon", function () {
      assert.deepEqual(getGitRemoteBranch("hello"), {
        repositoryTrackingName: "",
        branchName: "hello"
      });
    });

    it("with non-empty string with colon", function () {
      assert.deepEqual(getGitRemoteBranch("hello:there"), {
        repositoryTrackingName: "hello",
        branchName: "there"
      });
    });

    it("with GitRemoteBranch", function () {
      const remoteBranch: GitRemoteBranch = {
        repositoryTrackingName: "a",
        branchName: "b",
      };
      assert.strictEqual(getGitRemoteBranch(remoteBranch), remoteBranch);
    });
  });

  describe("getRemoteBranchFullName(string|GitRemoteBranch)", function () {
    it("with undefined", function () {
      assert.strictEqual(getRemoteBranchFullName(undefined as any), undefined);
    });

    it("with null", function () {
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(getRemoteBranchFullName(null as any), null);
    });

    it("with empty string", function () {
      assert.deepEqual(getRemoteBranchFullName(""), "");
    });

    it("with non-empty string with no colon", function () {
      assert.deepEqual(getRemoteBranchFullName("hello"), "hello");
    });

    it("with non-empty string with colon", function () {
      assert.deepEqual(getRemoteBranchFullName("hello:there"), "hello:there");
    });

    it("with GitRemoteBranch", function () {
      const remoteBranch: GitRemoteBranch = {
        repositoryTrackingName: "a",
        branchName: "b",
      };
      assert.strictEqual(getRemoteBranchFullName(remoteBranch), "a:b");
    });
  });

  describe("ExecutableGit", function () {
    it("scope()", async function () {
      const git1 = new ExecutableGit({
        authentication: "berry",
      });
      const git2: ExecutableGit = git1.scope({});
      assert.notStrictEqual(git2, git1);
      assert.deepEqual(git2, git1);
    });

    describe("run()", function () {
      it("with unrecognized command", async function () {
        const git = new ExecutableGit();
        const result: RunResult = await git.run(["foo"]);
        assert(result);
        assert.strictEqual(result.exitCode, 1);
        assert.strictEqual(result.stdout, "");
        assertEx.containsAll(result.stderr, [
          "git: 'foo' is not a git command. See 'git --help'.",
          "The most similar command is",
        ]);
      });
    });

    describe("currentCommitSha()", function () {
      it("with no options", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.CurrentCommitShaResult = { exitCode: 2, stdout: "c", stderr: "d", currentCommitSha: "c" };
        runner.set({ executable: "git", args: ["rev-parse", "HEAD"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.currentCommitSha({ runner }), expectedResult);
      });

      it("with real runner", async function () {
        const git = new ExecutableGit();
        const result: ExecutableGit.CurrentCommitShaResult = await git.currentCommitSha();
        assertEx.defined(result, "result");
        assert.strictEqual(result.exitCode, 0);
        assertEx.defined(result.processId, "result.processId");
        assert.strictEqual(result.error, undefined);
        assert.strictEqual(result.stderr, "");
        assertEx.definedAndNotEmpty(result.stdout, "result.stdout");
        assert.strictEqual(result.currentCommitSha, result.stdout);
      });
    });

    describe("fetch()", function () {
      it("with no options", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["fetch"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.fetch({ runner }), expectedResult);
      });

      it("with prune: true", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 3, stdout: "e", stderr: "f" };
        runner.set({ executable: "git", args: ["fetch", "--prune"], result: () => expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.fetch({ runner, prune: true }), expectedResult);
      });

      it("with prune: false", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 3, stdout: "e", stderr: "f" };
        runner.set({ executable: "git", args: ["fetch"], result: () => expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.fetch({ runner, prune: false }), expectedResult);
      });

      it("with all: true", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 3, stdout: "e", stderr: "f" };
        runner.set({ executable: "git", args: ["fetch", "--all"], result: () => expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.fetch({ runner, all: true }), expectedResult);
      });

      it("with all: false", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 3, stdout: "e", stderr: "f" };
        runner.set({ executable: "git", args: ["fetch"], result: () => expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.fetch({ runner, all: false }), expectedResult);
      });
    });

    describe("merge()", function () {
      it("with all options truthy", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({
          executable: "git",
          args: [
            "merge",
            "--squash",
            "--edit",
            "--strategy-option=theirs",
            "--quiet",
            "-m", "a",
            "-m", "b",
            "-m", "c",
            "branch-to-merge"],
          result: expectedResult
        });
        const git = new ExecutableGit();
        assert.deepEqual(
          await git.merge({
            refsToMerge: "branch-to-merge",
            runner,
            quiet: true,
            edit: true,
            messages: ["a", "b", "c"],
            squash: true,
            strategyOptions: "theirs",
          }),
          expectedResult);
      });

      it("with all options falsy", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({
          executable: "git",
          args: [
            "merge",
            "--no-squash",
            "--no-edit",
            "branch-to-merge"],
          result: expectedResult
        });
        const git = new ExecutableGit();
        assert.deepEqual(
          await git.merge({
            refsToMerge: "branch-to-merge",
            runner,
            quiet: false,
            edit: false,
            messages: [],
            squash: false,
            strategyOptions: "",
          }),
          expectedResult);
      });

      it("with no options", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({
          executable: "git",
          args: ["merge"],
          result: expectedResult
        });
        const git = new ExecutableGit();
        assert.deepEqual(
          await git.merge({
            runner,
          }),
          expectedResult);
      });

      it("with multiple refs to merge", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({
          executable: "git",
          args: ["merge", "a", "b", "c"],
          result: expectedResult
        });
        const git = new ExecutableGit();
        assert.deepEqual(
          await git.merge({
            refsToMerge: ["a", "b", "c"],
            runner,
          }),
          expectedResult);
      });
    });

    describe("rebase()", function () {
      it("with all options truthy", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({
          executable: "git",
          args: [
            "rebase",
            "--strategy=hello",
            "--strategy-option=theirs",
            "--quiet",
            "--verbose",
            "--onto", "fake-newbase",
            "fake-upstream",
            "branch-to-rebase"],
          result: expectedResult
        });
        const git = new ExecutableGit();
        assert.deepEqual(
          await git.rebase({
            branch: "branch-to-rebase",
            runner,
            quiet: true,
            strategy: "hello",
            strategyOption: "theirs",
            newbase: "fake-newbase",
            upstream: "fake-upstream",
            verbose: true,
          }),
          expectedResult);
      });

      it("with all options falsy", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({
          executable: "git",
          args: ["rebase"],
          result: expectedResult
        });
        const git = new ExecutableGit();
        assert.deepEqual(
          await git.rebase({
            branch: "",
            runner,
            quiet: false,
            strategy: "",
            strategyOption: "",
            newbase: "",
            upstream: "",
            verbose: false,
          }),
          expectedResult);
      });

      it("with no options", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({
          executable: "git",
          args: ["rebase"],
          result: expectedResult
        });
        const git = new ExecutableGit();
        assert.deepEqual(
          await git.rebase({
            runner,
          }),
          expectedResult);
      });
    });

    describe("clone()", function () {
      it("with no options", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["clone", "https://my.fake.git/url"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.clone("https://my.fake.git/url", { runner }), expectedResult);
      });

      it("with all options", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["clone", "--quiet", "--verbose", "--origin", "foo", "--branch", "fake-branch", "--depth", "5", "https://my.fake.git/url", "fake-directory"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(
          await git.clone("https://my.fake.git/url", {
            runner,
            quiet: true,
            verbose: true,
            origin: "foo",
            branch: "fake-branch",
            depth: 5,
            directory: "fake-directory"
          }),
          expectedResult);
      });

      it("with executionFolderPath that doesn't exist", async function () {
        this.timeout(10000);

        const executionFolderPath: string = getFolderPath();
        const git = new ExecutableGit({
          executionFolderPath,
        });
        const cloneResult: ExecutableGit.Result = await git.clone("https://github.com/ts-common/azure-js-dev-tools.git");
        try {
          assert.strictEqual(cloneResult.exitCode, undefined);
          assert.strictEqual(cloneResult.processId, undefined);
          assert.strictEqual(cloneResult.stderr, undefined);
          assert.strictEqual(cloneResult.stdout, undefined);
          const error: Error = assertEx.defined(cloneResult.error);
          assert.strictEqual(error.message, "spawn git ENOENT");
          assert.strictEqual(error.name, "Error");
        } finally {
          await deleteFolder(executionFolderPath);
        }
      });

      it("with repository directory that doesn't exist", async function () {
        this.timeout(10000);

        const repositoryFolderPath: string = getFolderPath();
        const git = new ExecutableGit();
        const cloneResult: ExecutableGit.Result = await git.clone("https://github.com/ts-common/azure-js-dev-tools.git", {
          directory: repositoryFolderPath
        });
        try {
          assert.strictEqual(cloneResult.exitCode, 0);
          assertEx.defined(cloneResult.processId, "cloneResult.processId");
          assert.strictEqual(cloneResult.stderr, `Cloning into '${repositoryFolderPath}'...\n`);
          assert.strictEqual(cloneResult.stdout, "");
          assert.strictEqual(cloneResult.error, undefined);
          assert.strictEqual(await folderExists(repositoryFolderPath), true);
        } finally {
          await deleteFolder(repositoryFolderPath);
        }
      });

      it("with authentication string", async function () {
        this.timeout(10000);

        const repositoryFolderPath: string = getFolderPath();
        const git = new ExecutableGit({
          authentication: "berry",
        });
        const logger: InMemoryLogger = getInMemoryLogger();
        const cloneResult: ExecutableGit.Result = await git.clone("https://github.com/ts-common/azure-js-dev-tools.git", {
          directory: repositoryFolderPath,
          showCommand: true,
          showResult: true,
          captureError: true,
          captureOutput: true,
          log: (text: string) => logger.logInfo(text),
        });
        try {
          assert.strictEqual(cloneResult.exitCode, 0);
          assertEx.defined(cloneResult.processId, "cloneResult.processId");
          assert.strictEqual(cloneResult.stderr, `Cloning into '${repositoryFolderPath}'...\n`);
          assert.strictEqual(cloneResult.stdout, "");
          assert.strictEqual(cloneResult.error, undefined);
          assert.deepEqual(logger.allLogs, [
            `git clone https://<redacted>@github.com/ts-common/azure-js-dev-tools.git ${repositoryFolderPath}`,
            `Exit Code: 0`,
            `Error:`,
            `Cloning into '${repositoryFolderPath}'...\n`
          ]);
          assert.strictEqual(await folderExists(repositoryFolderPath), true);
          const remoteUrl: string | undefined = await git.getRemoteUrl("origin", {
            executionFolderPath: repositoryFolderPath,
          });
          assert.strictEqual(remoteUrl, "https://berry@github.com/ts-common/azure-js-dev-tools.git");
        } finally {
          await deleteFolder(repositoryFolderPath);
        }
      });

      it("with owner matching authentication scope", async function () {
        this.timeout(10000);

        const repositoryFolderPath: string = getFolderPath();
        const git = new ExecutableGit({
          authentication: {
            "TS-COMMON": "berry",
          }
        });
        const logger: InMemoryLogger = getInMemoryLogger();
        const cloneResult: ExecutableGit.Result = await git.clone("https://github.com/ts-common/azure-js-dev-tools.git", {
          directory: repositoryFolderPath,
          showCommand: true,
          showResult: true,
          captureError: true,
          captureOutput: true,
          log: (text: string) => logger.logInfo(text),
        });
        try {
          assert.strictEqual(cloneResult.exitCode, 0);
          assertEx.defined(cloneResult.processId, "cloneResult.processId");
          assert.strictEqual(cloneResult.stderr, `Cloning into '${repositoryFolderPath}'...\n`);
          assert.strictEqual(cloneResult.stdout, "");
          assert.strictEqual(cloneResult.error, undefined);
          assert.deepEqual(logger.allLogs, [
            `git clone https://<redacted>@github.com/ts-common/azure-js-dev-tools.git ${repositoryFolderPath}`,
            `Exit Code: 0`,
            `Error:`,
            `Cloning into '${repositoryFolderPath}'...\n`
          ]);
          assert.strictEqual(await folderExists(repositoryFolderPath), true);
          const remoteUrl: string | undefined = await git.getRemoteUrl("origin", {
            executionFolderPath: repositoryFolderPath,
          });
          assert.strictEqual(remoteUrl, "https://berry@github.com/ts-common/azure-js-dev-tools.git");
        } finally {
          await deleteFolder(repositoryFolderPath);
        }
      });

      it("with repository matching authentication scope", async function () {
        this.timeout(10000);

        const repositoryFolderPath: string = getFolderPath();
        const git = new ExecutableGit({
          authentication: {
            "ts-common/azure-js-dev-tools": "berry",
          }
        });
        const logger: InMemoryLogger = getInMemoryLogger();
        const cloneResult: ExecutableGit.Result = await git.clone("https://github.com/ts-common/azure-js-dev-tools.git", {
          directory: repositoryFolderPath,
          showCommand: true,
          showResult: true,
          captureError: true,
          captureOutput: true,
          log: (text: string) => logger.logInfo(text),
        });
        try {
          assert.strictEqual(cloneResult.exitCode, 0);
          assertEx.defined(cloneResult.processId, "cloneResult.processId");
          assert.strictEqual(cloneResult.stderr, `Cloning into '${repositoryFolderPath}'...\n`);
          assert.strictEqual(cloneResult.stdout, "");
          assert.strictEqual(cloneResult.error, undefined);
          assert.deepEqual(logger.allLogs, [
            `git clone https://<redacted>@github.com/ts-common/azure-js-dev-tools.git ${repositoryFolderPath}`,
            `Exit Code: 0`,
            `Error:`,
            `Cloning into '${repositoryFolderPath}'...\n`
          ]);
          assert.strictEqual(await folderExists(repositoryFolderPath), true);
          const remoteUrl: string | undefined = await git.getRemoteUrl("origin", {
            executionFolderPath: repositoryFolderPath,
          });
          assert.strictEqual(remoteUrl, "https://berry@github.com/ts-common/azure-js-dev-tools.git");
        } finally {
          await deleteFolder(repositoryFolderPath);
        }
      });

      it("with multiple repositories matching authentication scope", async function () {
        this.timeout(10000);

        const repositoryFolderPath: string = getFolderPath();
        const git = new ExecutableGit({
          authentication: {
            "ts-common/azure-js-dev": "apples",
            "ts-common/azure-js-dev-tools": "bananas",
          }
        });
        const logger: InMemoryLogger = getInMemoryLogger();
        const cloneResult: ExecutableGit.Result = await git.clone("https://github.com/ts-common/azure-js-dev-tools.git", {
          directory: repositoryFolderPath,
          showCommand: true,
          showResult: true,
          captureError: true,
          captureOutput: true,
          log: (text: string) => logger.logInfo(text),
        });
        try {
          assert.strictEqual(cloneResult.exitCode, 0);
          assertEx.defined(cloneResult.processId, "cloneResult.processId");
          assert.strictEqual(cloneResult.stderr, `Cloning into '${repositoryFolderPath}'...\n`);
          assert.strictEqual(cloneResult.stdout, "");
          assert.strictEqual(cloneResult.error, undefined);
          assert.deepEqual(logger.allLogs, [
            `git clone https://<redacted>@github.com/ts-common/azure-js-dev-tools.git ${repositoryFolderPath}`,
            `Exit Code: 0`,
            `Error:`,
            `Cloning into '${repositoryFolderPath}'...\n`
          ]);
          assert.strictEqual(await folderExists(repositoryFolderPath), true);
          const remoteUrl: string | undefined = await git.getRemoteUrl("origin", {
            executionFolderPath: repositoryFolderPath,
          });
          assert.strictEqual(remoteUrl, "https://bananas@github.com/ts-common/azure-js-dev-tools.git");
        } finally {
          await deleteFolder(repositoryFolderPath);
        }
      });

      it("with owner non-matching authentication scope", async function () {
        this.timeout(10000);

        const repositoryFolderPath: string = getFolderPath();
        const git = new ExecutableGit({
          authentication: {
            "TSUNCOMMON": "berry",
          }
        });
        const logger: InMemoryLogger = getInMemoryLogger();
        const cloneResult: ExecutableGit.Result = await git.clone("https://github.com/ts-common/azure-js-dev-tools.git", {
          directory: repositoryFolderPath,
          showCommand: true,
          showResult: true,
          captureError: true,
          captureOutput: true,
          log: (text: string) => logger.logInfo(text),
        });
        try {
          assert.strictEqual(cloneResult.exitCode, 0);
          assertEx.defined(cloneResult.processId, "cloneResult.processId");
          assert.strictEqual(cloneResult.stderr, `Cloning into '${repositoryFolderPath}'...\n`);
          assert.strictEqual(cloneResult.stdout, "");
          assert.strictEqual(cloneResult.error, undefined);
          assert.deepEqual(logger.allLogs, [
            `git clone https://github.com/ts-common/azure-js-dev-tools.git ${repositoryFolderPath}`,
            `Exit Code: 0`,
            `Error:`,
            `Cloning into '${repositoryFolderPath}'...\n`
          ]);
          assert.strictEqual(await folderExists(repositoryFolderPath), true);
          const remoteUrl: string | undefined = await git.getRemoteUrl("origin", {
            executionFolderPath: repositoryFolderPath,
          });
          assert.strictEqual(remoteUrl, "https://github.com/ts-common/azure-js-dev-tools.git");
        } finally {
          await deleteFolder(repositoryFolderPath);
        }
      });

      it("with repository non-matching authentication scope", async function () {
        this.timeout(10000);

        const repositoryFolderPath: string = getFolderPath();
        const git = new ExecutableGit({
          authentication: {
            "ts-common/azure-js-prod-tools": "berry",
          }
        });
        const logger: InMemoryLogger = getInMemoryLogger();
        const cloneResult: ExecutableGit.Result = await git.clone("https://github.com/ts-common/azure-js-dev-tools.git", {
          directory: repositoryFolderPath,
          showCommand: true,
          showResult: true,
          captureError: true,
          captureOutput: true,
          log: (text: string) => logger.logInfo(text),
        });
        try {
          assert.strictEqual(cloneResult.exitCode, 0);
          assertEx.defined(cloneResult.processId, "cloneResult.processId");
          assert.strictEqual(cloneResult.stderr, `Cloning into '${repositoryFolderPath}'...\n`);
          assert.strictEqual(cloneResult.stdout, "");
          assert.strictEqual(cloneResult.error, undefined);
          assert.deepEqual(logger.allLogs, [
            `git clone https://github.com/ts-common/azure-js-dev-tools.git ${repositoryFolderPath}`,
            `Exit Code: 0`,
            `Error:`,
            `Cloning into '${repositoryFolderPath}'...\n`
          ]);
          assert.strictEqual(await folderExists(repositoryFolderPath), true);
          const remoteUrl: string | undefined = await git.getRemoteUrl("origin", {
            executionFolderPath: repositoryFolderPath,
          });
          assert.strictEqual(remoteUrl, "https://github.com/ts-common/azure-js-dev-tools.git");
        } finally {
          await deleteFolder(repositoryFolderPath);
        }
      });
    });

    describe("checkout()", function () {
      it("with no stderr", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "blah", stderr: "" };
        runner.set({ executable: "git", args: ["checkout", "master"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(
          await git.checkout("master", { runner }),
          {
            ...expectedResult,
            filesThatWouldBeOverwritten: undefined
          });
      });

      it("with empty remote", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "blah", stderr: "" };
        runner.set({ executable: "git", args: ["checkout", "master"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(
          await git.checkout("master", { remote: "", runner }),
          {
            ...expectedResult,
            filesThatWouldBeOverwritten: undefined
          });
      });

      it("with non-empty remote", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "blah", stderr: "" };
        runner.set({ executable: "git", args: ["checkout", "--track", "hello/master"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(
          await git.checkout("master", { remote: "hello", runner }),
          {
            ...expectedResult,
            filesThatWouldBeOverwritten: undefined
          });
      });
    });

    it("pull()", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 1, stdout: "a", stderr: "b" };
      runner.set({ executable: "git", args: ["pull"], result: expectedResult });
      const git = new ExecutableGit();
      assert.deepEqual(await git.pull({ runner }), expectedResult);
    });

    describe("push()", function () {
      it("command line arguments with no setUpstream", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.push({ runner }), expectedResult);
      });

      it("command line arguments with undefined setUpstream", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.push({ setUpstream: undefined, runner }), expectedResult);
      });

      it("command line arguments with null setUpstream", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.push({ setUpstream: undefined, runner }), expectedResult);
      });

      it("command line arguments with empty setUpstream", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.push({ setUpstream: "", runner }), expectedResult);
      });

      it("command line arguments with non-empty setUpstream", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push", "--set-upstream", "hello", "myfakebranch"], result: expectedResult });
        runner.set({ executable: "git", args: ["branch"], result: { exitCode: 0, stdout: "* myfakebranch" } });
        const git = new ExecutableGit();
        assert.deepEqual(await git.push({ setUpstream: "hello", runner }), expectedResult);
      });

      it("command line arguments with true setUpstream", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push", "--set-upstream", "origin", "myfakebranch"], result: expectedResult });
        runner.set({ executable: "git", args: ["branch"], result: { exitCode: 0, stdout: "* myfakebranch" } });
        const git = new ExecutableGit();
        assert.deepEqual(await git.push({ setUpstream: true, runner }), expectedResult);
      });

      it("command line arguments with true setUpstream", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.push({ setUpstream: false, runner }), expectedResult);
      });

      it("command line arguments with false force", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.push({ force: false, runner }), expectedResult);
      });

      it("command line arguments with true force", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push", "--force"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.push({ force: true, runner }), expectedResult);
      });

      it("when branch doesn't exist remotely and set-upstream isn't defined", async function () {
        const git = new ExecutableGit();
        const currentBranch: string = await git.currentBranch();
        await git.createLocalBranch("myFakeBranch");
        try {
          const pushResult: ExecutableGit.Result = await git.push();
          assertEx.defined(pushResult, "pushResult");
          assertEx.defined(pushResult.processId, "pushResult.processId");
          assert.strictEqual(pushResult.exitCode, 128);
          assert.strictEqual(pushResult.stdout, "");
          assertEx.containsAll(pushResult.stderr, [
            "fatal: The current branch myFakeBranch has no upstream branch.",
            "To push the current branch and set the remote as upstream, use",
            "    git push --set-upstream origin myFakeBranch"
          ]);
          assert.strictEqual(pushResult.error, undefined);
        } finally {
          await git.checkout(currentBranch);
          await git.deleteLocalBranch("myFakeBranch");
        }
      });

      it("when branch doesn't exist remotely and set-upstream is false", async function () {
        const git = new ExecutableGit();
        const currentBranch: string = await git.currentBranch();
        await git.createLocalBranch("myFakeBranch");
        try {
          const pushResult: ExecutableGit.Result = await git.push({ setUpstream: false });
          assertEx.defined(pushResult, "pushResult");
          assertEx.defined(pushResult.processId, "pushResult.processId");
          assert.strictEqual(pushResult.exitCode, 128);
          assert.strictEqual(pushResult.stdout, "");
          assertEx.containsAll(pushResult.stderr, [
            "fatal: The current branch myFakeBranch has no upstream branch.",
            "To push the current branch and set the remote as upstream, use",
            "    git push --set-upstream origin myFakeBranch"
          ]);
          assert.strictEqual(pushResult.error, undefined);
        } finally {
          await git.checkout(currentBranch);
          await git.deleteLocalBranch("myFakeBranch");
        }
      });

      (runPushRemoteBranchTests ? it : it.skip)("when branch doesn't exist remotely and set-upstream is origin and branchName is myFakeBranch", async function () {
        this.timeout(20000);

        const git = new ExecutableGit();
        const currentBranch: string = await git.currentBranch();
        await git.createLocalBranch("myFakeBranch");
        try {
          const pushResult: ExecutableGit.Result = await git.push({ setUpstream: "origin", branchName: "myFakeBranch" });
          assertEx.defined(pushResult, "pushResult");
          assertEx.defined(pushResult.processId, "pushResult.processId");
          assert.strictEqual(pushResult.exitCode, 0);
          assert.strictEqual(pushResult.stdout, "Branch 'myFakeBranch' set up to track remote branch 'myFakeBranch' from 'origin'.\n");
          assertEx.containsAll(pushResult.stderr, [
            `remote: `,
            `remote: Create a pull request for 'myFakeBranch' on GitHub by visiting:        `,
            `remote:      https://github.com/ts-common/azure-js-dev-tools/pull/new/myFakeBranch        `,
            `To https://github.com/ts-common/azure-js-dev-tools.git`,
            ` * [new branch]      myFakeBranch -> myFakeBranch`
          ]);
          assert.strictEqual(pushResult.error, undefined);
        } finally {
          await git.checkout(currentBranch);
          await git.deleteLocalBranch("myFakeBranch");
          await git.deleteRemoteBranch("myFakeBranch");
        }
      });

      (runPushRemoteBranchTests ? it : it.skip)("when branch doesn't exist remotely and set-upstream is origin and branchName is not defined", async function () {
        this.timeout(20000);

        const git = new ExecutableGit();
        const currentBranch: string = await git.currentBranch();
        await git.createLocalBranch("myFakeBranch");
        try {
          const pushResult: ExecutableGit.Result = await git.push({ setUpstream: "origin" });
          assertEx.defined(pushResult, "pushResult");
          assertEx.defined(pushResult.processId, "pushResult.processId");
          assert.strictEqual(pushResult.exitCode, 0);
          assert.strictEqual(pushResult.stdout, "Branch 'myFakeBranch' set up to track remote branch 'myFakeBranch' from 'origin'.\n");
          assertEx.containsAll(pushResult.stderr, [
            `remote: `,
            `remote: Create a pull request for 'myFakeBranch' on GitHub by visiting:        `,
            `remote:      https://github.com/ts-common/azure-js-dev-tools/pull/new/myFakeBranch        `,
            `To https://github.com/ts-common/azure-js-dev-tools.git`,
            ` * [new branch]      myFakeBranch -> myFakeBranch`
          ]);
          assert.strictEqual(pushResult.error, undefined);
        } finally {
          await git.checkout(currentBranch);
          await git.deleteLocalBranch("myFakeBranch");
          await git.deleteRemoteBranch("myFakeBranch");
        }
      });

      (runPushRemoteBranchTests ? it : it.skip)("when branch doesn't exist remotely and set-upstream is true and branchName is myFakeBranch", async function () {
        this.timeout(20000);

        const git = new ExecutableGit();
        const currentBranch: string = await git.currentBranch();
        await git.createLocalBranch("myFakeBranch");
        try {
          const pushResult: ExecutableGit.Result = await git.push({ setUpstream: true, branchName: "myFakeBranch" });
          assertEx.defined(pushResult, "pushResult");
          assertEx.defined(pushResult.processId, "pushResult.processId");
          assert.strictEqual(pushResult.exitCode, 0);
          assert.strictEqual(pushResult.stdout, "Branch 'myFakeBranch' set up to track remote branch 'myFakeBranch' from 'origin'.\n");
          assertEx.containsAll(pushResult.stderr, [
            `remote: `,
            `remote: Create a pull request for 'myFakeBranch' on GitHub by visiting:        `,
            `remote:      https://github.com/ts-common/azure-js-dev-tools/pull/new/myFakeBranch        `,
            `To https://github.com/ts-common/azure-js-dev-tools.git`,
            ` * [new branch]      myFakeBranch -> myFakeBranch`
          ]);
          assert.strictEqual(pushResult.error, undefined);
        } finally {
          await git.checkout(currentBranch);
          await git.deleteLocalBranch("myFakeBranch");
          await git.deleteRemoteBranch("myFakeBranch");
        }
      });

      (runPushRemoteBranchTests ? it : it.skip)("when branch doesn't exist remotely and set-upstream is true and branchName is not defined", async function () {
        this.timeout(20000);

        const git = new ExecutableGit();
        const currentBranch: string = await git.currentBranch();
        await git.createLocalBranch("myFakeBranch");
        try {
          const pushResult: ExecutableGit.Result = await git.push({ setUpstream: true });
          assertEx.defined(pushResult, "pushResult");
          assertEx.defined(pushResult.processId, "pushResult.processId");
          assertEx.containsAll(pushResult.stderr, [
            `remote: `,
            `remote: Create a pull request for 'myFakeBranch' on GitHub by visiting:        `,
            `remote:      https://github.com/ts-common/azure-js-dev-tools/pull/new/myFakeBranch        `,
            `To https://github.com/ts-common/azure-js-dev-tools.git`,
            ` * [new branch]      myFakeBranch -> myFakeBranch`
          ]);
          assert.strictEqual(pushResult.stdout, "Branch 'myFakeBranch' set up to track remote branch 'myFakeBranch' from 'origin'.\n");
          assert.strictEqual(pushResult.exitCode, 0);
          assert.strictEqual(pushResult.error, undefined);
        } finally {
          await git.checkout(currentBranch);
          await git.deleteLocalBranch("myFakeBranch");
          await git.deleteRemoteBranch("myFakeBranch");
        }
      });

      it("with invalid authentication", async function () {
        const authentication = "berry";
        const runner = new FakeRunner();
        runner.set({
          executable: "git",
          args: ["push"],
          result: {
            exitCode: 128,
            stderr: `fatal: could not read Password for 'https://${authentication}@github.com': No such device or address`
          }
        });
        const git = new ExecutableGit({
          authentication,
          runner,
        });
        const logger: InMemoryLogger = getInMemoryLogger();
        const cloneResult: ExecutableGit.Result = await git.push({
          showCommand: true,
          showResult: true,
          captureError: true,
          captureOutput: true,
          log: (text: string) => logger.logInfo(text),
        });
        assert.strictEqual(cloneResult.exitCode, 128);
        assert.strictEqual(cloneResult.stderr, `fatal: could not read Password for 'https://${authentication}@github.com': No such device or address`);
        assert.strictEqual(cloneResult.stdout, undefined);
        assert.strictEqual(cloneResult.error, undefined);
        assert.deepEqual(logger.allLogs, [
          `git push`,
          `Exit Code: 128`,
          `Error:`,
          `fatal: could not read Password for 'https://berry@github.com': No such device or address`,
        ]);
      });
    });

    it("addAll()", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set({ executable: "git", args: ["add", "*"], result: expectedResult });
      const git = new ExecutableGit();
      assert.deepEqual(await git.addAll({ runner }), expectedResult);
    });

    describe("commit()", function () {
      it("with one commit message", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["commit", "-m", "Hello World"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.commit("Hello World", { runner }), expectedResult);
      });

      it("with two commit messages", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["commit", "-m", "Hello", "-m", "World"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.commit(["Hello", "World"], { runner }), expectedResult);
      });
    });

    describe("deleteLocalBranch()", function () {
      it("command line arguments", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["branch", "-D", "branchToDelete"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.deleteLocalBranch("branchToDelete", { runner }), expectedResult);
      });

      it("when deleting current branch", async function () {
        const git = new ExecutableGit();
        const currentBranchName: string = await git.currentBranch();
        await git.createLocalBranch("myFakeBranch");
        try {
          const deleteBranchResult: ExecutableGit.Result = await git.deleteLocalBranch("myFakeBranch");
          assertEx.defined(deleteBranchResult, "deleteBranchResult");
          assertEx.defined(deleteBranchResult.processId, "deleteBranchResult.processId");
          assert.strictEqual(deleteBranchResult.error, undefined);
          assertEx.defined(deleteBranchResult.stdout, "deleteBranchResult.stdout");
          assertEx.contains(deleteBranchResult.stderr, `Cannot delete branch 'myFakeBranch' checked out at `);
          assert.strictEqual(await git.currentBranch(), "myFakeBranch");
        } finally {
          await git.checkout(currentBranchName);
          await git.deleteLocalBranch("myFakeBranch");
        }
      });
    });

    describe("createLocalBranch()", function () {
      it("command line arguments", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["checkout", "-b", "branchToCreate"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.createLocalBranch("branchToCreate", { runner }), expectedResult);
      });

      it("when branch doesn't exist", async function () {
        const git = new ExecutableGit();
        const currentBranchName: string = await git.currentBranch();
        const createBranchResult: ExecutableGit.Result = await git.createLocalBranch("newBranchName");
        try {
          assertEx.defined(createBranchResult, "createBranchResult");
          assertEx.defined(createBranchResult.processId, "createBranchResult.processId");
          assert.strictEqual(createBranchResult.error, undefined);
          assert.strictEqual(createBranchResult.exitCode, 0);
          assertEx.defined(createBranchResult.stdout, "createBranchResult.stdout");
          assert.strictEqual(createBranchResult.stderr, "Switched to a new branch 'newBranchName'\n");
          assert.strictEqual(await git.currentBranch(), "newBranchName");
        } finally {
          await git.checkout(currentBranchName);
          await git.deleteLocalBranch("newBranchName");
        }
      });

      it("when branch is the current branch", async function () {
        const git = new ExecutableGit();
        const currentBranchName: string = await git.currentBranch();
        await git.createLocalBranch("myFakeBranch");
        try {
          const createBranchResult: ExecutableGit.Result = await git.createLocalBranch("myFakeBranch");
          assertEx.defined(createBranchResult, "createBranchResult");
          assertEx.defined(createBranchResult.processId, "createBranchResult.processId");
          assert.strictEqual(createBranchResult.error, undefined);
          assert.strictEqual(createBranchResult.exitCode, 128);
          assert.strictEqual(createBranchResult.stdout, "");
          assert.strictEqual(createBranchResult.stderr, `fatal: A branch named 'myFakeBranch' already exists.\n`);
        } finally {
          await git.checkout(currentBranchName);
          await git.deleteLocalBranch("myFakeBranch");
        }
      });
    });

    describe("deleteRemoteBranch()", function () {
      it("command line arguments with no provided remoteName", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push", "origin", ":branchToDelete"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.deleteRemoteBranch("branchToDelete", { runner }), expectedResult);
      });

      it("command line arguments with undefined remoteName", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push", "origin", ":branchToDelete"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.deleteRemoteBranch("branchToDelete", { remoteName: undefined, runner }), expectedResult);
      });

      it("command line arguments with null remoteName", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push", "origin", ":branchToDelete"], result: expectedResult });
        const git = new ExecutableGit();
        // tslint:disable-next-line:no-null-keyword
        assert.deepEqual(await git.deleteRemoteBranch("branchToDelete", { remoteName: null as any, runner }), expectedResult);
      });

      it("command line arguments with empty remoteName", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push", "origin", ":branchToDelete"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.deleteRemoteBranch("branchToDelete", { remoteName: "", runner }), expectedResult);
      });

      it("command line arguments with provided remoteName", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push", "fancypants", ":branchToDelete"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.deleteRemoteBranch("branchToDelete", { remoteName: "fancypants", runner }), expectedResult);
      });

      it("when remote doesn't exist", async function () {
        const git = new ExecutableGit();
        const result: ExecutableGit.Result = await git.deleteRemoteBranch("myFakeBranch", { remoteName: "fancypants" });
        assertEx.defined(result, "result");
        assertEx.defined(result.processId, "result.processId");
        assert.strictEqual(result.exitCode, 128);
        assert.strictEqual(result.stdout, "");
        assertEx.containsAll(result.stderr, [
          "fatal: 'fancypants' does not appear to be a git repository",
          "fatal: Could not read from remote repository.",
          "Please make sure you have the correct access rights",
          "and the repository exists."
        ]);
      });
    });

    describe("diff()", function () {
      it("command line arguments with no options", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.DiffResult = {
          exitCode: 2,
          stdout: "c",
          stderr: "d",
          filesChanged: []
        };
        runner.set({ executable: "git", args: ["diff"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.diff({ runner }), expectedResult);
      });

      it("command line arguments with commit1", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.DiffResult = {
          exitCode: 2,
          stdout: "c",
          stderr: "d",
          filesChanged: []
        };
        runner.set({ executable: "git", args: ["diff", "fake-commit1"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.diff({ runner, commit1: "fake-commit1" }), expectedResult);
      });

      it("command line arguments with commit2", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.DiffResult = {
          exitCode: 2,
          stdout: "c",
          stderr: "d",
          filesChanged: []
        };
        runner.set({ executable: "git", args: ["diff", "fake-commit2"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.diff({ runner, commit2: "fake-commit2" }), expectedResult);
      });

      it("command line arguments with commit1 and commit2", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.DiffResult = {
          exitCode: 2,
          stdout: "c",
          stderr: "d",
          filesChanged: []
        };
        runner.set({ executable: "git", args: ["diff", "fake-commit1", "fake-commit2"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.diff({ runner, commit1: "fake-commit1", commit2: "fake-commit2" }), expectedResult);
      });

      it("command line arguments with nameOnly", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.DiffResult = {
          exitCode: 2,
          stdout: "c",
          stderr: "d",
          filesChanged: [
            joinPath(process.cwd(), "c")
          ]
        };
        runner.set({ executable: "git", args: ["diff", "--name-only"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.diff({ runner, nameOnly: true }), expectedResult);
      });

      it("command line arguments with staged", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.DiffResult = {
          exitCode: 2,
          stdout: "c",
          stderr: "d",
          filesChanged: []
        };
        runner.set({ executable: "git", args: ["diff", "--staged"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.diff({ runner, staged: true }), expectedResult);
      });

      it("command line arguments with ignoreSpace: all", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.DiffResult = {
          exitCode: 2,
          stdout: "c",
          stderr: "d",
          filesChanged: []
        };
        runner.set({ executable: "git", args: ["diff", "--ignore-all-space"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.diff({ runner, ignoreSpace: "all" }), expectedResult);
      });

      it("command line arguments with ignoreSpace: change", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.DiffResult = {
          exitCode: 2,
          stdout: "c",
          stderr: "d",
          filesChanged: []
        };
        runner.set({ executable: "git", args: ["diff", "--ignore-space-change"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.diff({ runner, ignoreSpace: "change" }), expectedResult);
      });

      it("command line arguments with ignoreSpace: at-eol", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.DiffResult = {
          exitCode: 2,
          stdout: "diff --git a/foo.txt b/foo.txt",
          stderr: "d",
          filesChanged: [
            joinPath(process.cwd(), "foo.txt")
          ]
        };
        runner.set({ executable: "git", args: ["diff", "--ignore-space-at-eol"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.diff({ runner, ignoreSpace: "at-eol" }), expectedResult);
      });

      it("command line arguments with usePager: undefined", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.DiffResult = {
          exitCode: 2,
          stdout: "diff --git a/foo.txt b/foo.txt",
          stderr: "d",
          filesChanged: [
            joinPath(process.cwd(), "foo.txt")
          ]
        };
        runner.set({ executable: "git", args: ["diff"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.diff({ runner, usePager: undefined }), expectedResult);
      });

      it("command line arguments with usePager: false", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.DiffResult = {
          exitCode: 2,
          stdout: "diff --git a/foo.txt b/foo.txt",
          stderr: "d",
          filesChanged: [
            joinPath(process.cwd(), "foo.txt")
          ]
        };
        runner.set({ executable: "git", args: ["--no-pager", "diff"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.diff({ runner, usePager: false }), expectedResult);
      });

      it("command line arguments with usePager: true", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.DiffResult = {
          exitCode: 2,
          stdout: "diff --git a/foo.txt b/foo.txt",
          stderr: "d",
          filesChanged: [
            joinPath(process.cwd(), "foo.txt")
          ]
        };
        runner.set({ executable: "git", args: ["--paginate", "diff"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.diff({ runner, usePager: true }), expectedResult);
      });
    });

    describe("localBranches()", function () {
      it("with fake command line arguments", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.LocalBranchesResult = {
          exitCode: 1,
          stdout: "x",
          stderr: "y",
          currentBranch: "",
          localBranches: [
            "x"
          ]
        };
        runner.set({ executable: "git", args: ["branch"], result: expectedResult });
        const git = new ExecutableGit();
        const branchResult: ExecutableGit.LocalBranchesResult = await git.localBranches({ runner });
        assert.deepEqual(branchResult, expectedResult);
      });

      it("with two local branches", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.LocalBranchesResult = {
          currentBranch: "daschult/gitBranchRemote",
          exitCode: 0,
          localBranches: [
            "daschult/gitBranchRemote",
            "master"
          ],
          stdout: "* daschult/gitBranchRemote\n  master\n",
          stderr: "",
        };
        runner.set({ executable: "git", args: ["branch"], result: expectedResult });
        const git = new ExecutableGit();
        const branchResult: ExecutableGit.LocalBranchesResult = await git.localBranches({ runner });
        assert.deepEqual(branchResult, expectedResult);
      });
    });

    describe("remoteBranches()", function () {
      it("with fake command line arguments", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.RemoteBranchesResult = {
          exitCode: 1,
          stdout: "a/x",
          stderr: "y",
          remoteBranches: [
            {
              repositoryTrackingName: "a",
              branchName: "x"
            }
          ],
        };
        runner.set({ executable: "git", args: ["branch", "--remotes"], result: expectedResult });
        const git = new ExecutableGit();
        const branchResult: ExecutableGit.Result = await git.remoteBranches({ runner });
        assert.deepEqual(branchResult, expectedResult);
      });

      it("with fake command line arguments with usePager: false", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.RemoteBranchesResult = {
          exitCode: 1,
          stdout: "a/x",
          stderr: "y",
          remoteBranches: [
            {
              repositoryTrackingName: "a",
              branchName: "x"
            }
          ],
        };
        runner.set({ executable: "git", args: ["--no-pager", "branch", "--remotes"], result: expectedResult });
        const git = new ExecutableGit();
        const branchResult: ExecutableGit.Result = await git.remoteBranches({ runner, usePager: false });
        assert.deepEqual(branchResult, expectedResult);
      });

      it("with fake command line arguments with usePager: true", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.RemoteBranchesResult = {
          exitCode: 1,
          stdout: "a/x",
          stderr: "y",
          remoteBranches: [
            {
              repositoryTrackingName: "a",
              branchName: "x"
            }
          ],
        };
        runner.set({ executable: "git", args: ["--paginate", "branch", "--remotes"], result: expectedResult });
        const git = new ExecutableGit();
        const branchResult: ExecutableGit.Result = await git.remoteBranches({ runner, usePager: true });
        assert.deepEqual(branchResult, expectedResult);
      });

      it("with one remote branch", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.RemoteBranchesResult = {
          exitCode: 0,
          stderr: "",
          stdout: "  origin/HEAD -> origin/master\n  origin/master\n",
          remoteBranches: [
            {
              repositoryTrackingName: "origin",
              branchName: "master"
            }
          ]
        };
        runner.set({ executable: "git", args: ["branch", "--remotes"], result: expectedResult });
        const git = new ExecutableGit();
        const branchResult: ExecutableGit.Result = await git.remoteBranches({ runner });
        assert.deepEqual(branchResult, expectedResult);
      });
    });

    describe("status()", function () {
      it("with not staged modified file", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = {
          exitCode: 2,
          stdout: `On branch daschult/ci
Your branch is up to date with 'origin/daschult/ci'.

Changes not staged for commit:
(use "git add <file>..." to update what will be committed)
(use "git checkout -- <file>..." to discard changes in working directory)

      modified:   gulpfile.ts

no changes added to commit (use "git add" and/or "git commit -a")`
        };
        runner.set({ executable: "git", args: ["status"], result: expectedResult });
        const git = new ExecutableGit();
        const statusResult: ExecutableGit.StatusResult = await git.status({
          executionFolderPath: "/mock/folder/",
          runner
        });
        assert.deepEqual(statusResult, {
          ...expectedResult,
          localBranch: "daschult/ci",
          remoteBranch: "origin/daschult/ci",
          hasUncommittedChanges: true,
          modifiedFiles: [
            "/mock/folder/gulpfile.ts"
          ],
          notStagedDeletedFiles: [],
          notStagedModifiedFiles: [
            "/mock/folder/gulpfile.ts"
          ],
          stagedDeletedFiles: [],
          stagedModifiedFiles: [],
          untrackedFiles: []
        });
      });

      it("with detached head with no changes", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = {
          exitCode: 0,
          stdout:
            `HEAD detached at pull/818/merge
  nothing to commit, working tree clean`,
          stderr: ""
        };
        runner.set({ executable: "git", args: ["status"], result: expectedResult });
        const git = new ExecutableGit();
        const statusResult: ExecutableGit.StatusResult = await git.status({
          runner,
          executionFolderPath: "/mock/folder/"
        });
        assert.deepEqual(statusResult, {
          ...expectedResult,
          localBranch: "pull/818/merge",
          remoteBranch: undefined,
          hasUncommittedChanges: false,
          modifiedFiles: [],
          notStagedDeletedFiles: [],
          notStagedModifiedFiles: [],
          stagedDeletedFiles: [],
          stagedModifiedFiles: [],
          untrackedFiles: []
        });
      });

      it("with untracked files but no files staged for commit", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = {
          exitCode: 0,
          stdout:
            `On branch master
Your branch is up to date with 'origin/master'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)

  modified:   a/b.xml
  modified:   a/b/c.txt

Untracked files:
  (use "git add <file>..." to include in what will be committed)

  a.html
  a/b.txt

no changes added to commit (use "git add" and/or "git commit -a")`,
          stderr: ""
        };
        runner.set({ executable: "git", args: ["status"], result: expectedResult });
        const git = new ExecutableGit();
        const statusResult: ExecutableGit.StatusResult = await git.status({
          runner,
          executionFolderPath: "/mock/folder/"
        });
        assert.deepEqual(statusResult, {
          ...expectedResult,
          localBranch: "master",
          remoteBranch: "origin/master",
          hasUncommittedChanges: true,
          modifiedFiles: [
            "/mock/folder/a/b.xml",
            "/mock/folder/a/b/c.txt",
            "/mock/folder/a.html",
            "/mock/folder/a/b.txt"
          ],
          notStagedDeletedFiles: [],
          notStagedModifiedFiles: [
            "/mock/folder/a/b.xml",
            "/mock/folder/a/b/c.txt"
          ],
          stagedDeletedFiles: [],
          stagedModifiedFiles: [],
          untrackedFiles: [
            "/mock/folder/a.html",
            "/mock/folder/a/b.txt"
          ]
        });
      });
    });

    describe("getConfigurationValue()", function () {
      it("command line arguments", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.GetConfigurationValueResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["config", "--get", "a"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.getConfigurationValue("a", { runner }), expectedResult);
      });

      it("with undefined configurationValueName", async function () {
        const git = new ExecutableGit();
        const result: ExecutableGit.GetConfigurationValueResult = await git.getConfigurationValue(undefined as any);
        assertEx.defined(result, "result");
        assert.strictEqual(result.exitCode, 1);
        assertEx.defined(result.processId, "result.processId");
        assert.strictEqual(result.stdout, "");
        assert.strictEqual(result.stderr, "error: key does not contain a section: undefined\n");
        assert.strictEqual(result.configurationValue, undefined);
      });

      it("with null configurationValueName", async function () {
        const git = new ExecutableGit();
        // tslint:disable-next-line:no-null-keyword
        const result: ExecutableGit.GetConfigurationValueResult = await git.getConfigurationValue(null as any);
        assertEx.defined(result, "result");
        assert.strictEqual(result.exitCode, 1);
        assertEx.defined(result.processId, "result.processId");
        assert.strictEqual(result.stdout, "");
        assert.strictEqual(result.stderr, "error: key does not contain a section: null\n");
        assert.strictEqual(result.configurationValue, undefined);
      });

      it("with non-existing configurationValueName", async function () {
        const git = new ExecutableGit();
        const result: ExecutableGit.GetConfigurationValueResult = await git.getConfigurationValue("blah");
        assertEx.defined(result, "result");
        assert.strictEqual(result.exitCode, 1);
        assertEx.defined(result.processId, "result.processId");
        assert.strictEqual(result.stdout, "");
        assert.strictEqual(result.stderr, "error: key does not contain a section: blah\n");
        assert.strictEqual(result.configurationValue, undefined);
      });

      it("with existing configurationValueName", async function () {
        const git = new ExecutableGit();
        const result: ExecutableGit.GetConfigurationValueResult = await git.getConfigurationValue("remote.origin.url");
        assertEx.defined(result, "result");
        assert.strictEqual(result.exitCode, 0);
        assertEx.defined(result.processId, "result.processId");
        assertEx.oneOf(result.stdout, ["https://github.com/ts-common/azure-js-dev-tools.git\n", "https://github.com/ts-common/azure-js-dev-tools\n"]);
        assert.strictEqual(result.stderr, "");
        assertEx.oneOf(result.configurationValue, ["https://github.com/ts-common/azure-js-dev-tools.git\n", "https://github.com/ts-common/azure-js-dev-tools\n"]);
      });

      it("outside git repository", async function () {
        const folderPath: string = joinPath((await findFileInPath("package.json"))!, "../..");
        const git = new ExecutableGit();
        const result: ExecutableGit.GetConfigurationValueResult = await git.getConfigurationValue("remote.origin.url", { executionFolderPath: folderPath });
        assertEx.defined(result, "result");
        assert.strictEqual(result.exitCode, 1);
        assertEx.defined(result.processId, "result.processId");
        assert.strictEqual(result.stdout, "");
        assert.strictEqual(result.stderr, "");
        assert.strictEqual(result.configurationValue, undefined);
      });
    });

    describe("getRepositoryUrl()", function () {
      it("command line arguments", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.GetConfigurationValueResult = { exitCode: 2, stdout: "c", stderr: "d", configurationValue: "e" };
        runner.set({ executable: "git", args: ["config", "--get", "remote.origin.url"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.getRepositoryUrl({ runner }), expectedResult.configurationValue);
      });

      it("inside git repository", async function () {
        const git = new ExecutableGit();
        const result: string | undefined = await git.getRepositoryUrl();
        assertEx.oneOf(result, ["https://github.com/ts-common/azure-js-dev-tools.git", "https://github.com/ts-common/azure-js-dev-tools"]);
      });

      it("outside git repository", async function () {
        const folderPath: string = joinPath((await findFileInPath("package.json"))!, "../..");
        const git = new ExecutableGit();
        const result: string | undefined = await git.getRepositoryUrl({ executionFolderPath: folderPath });
        assert.strictEqual(result, undefined);
      });
    });

    describe("resetAll()", function () {
      it("command line arguments", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.Result = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["reset", "*"], result: expectedResult });
        const git = new ExecutableGit();
        assert.strictEqual(await git.resetAll({ runner }), expectedResult);
      });
    });

    describe("addRemote()", function () {
      it("command line arguments", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.Result = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["remote", "add", "abc", "def"], result: expectedResult });
        const git = new ExecutableGit();
        assert.strictEqual(await git.addRemote("abc", "def", { runner }), expectedResult);
      });

      it("with authentication()", async function () {
        this.timeout(10000);

        const repositoryFolderPath: string = getFolderPath();
        const git = new ExecutableGit({
          authentication: "berry",
          showCommand: true,
          showResult: true,
          captureError: true,
          captureOutput: true,
          log: (text: string) => logger.logInfo(text),
        });
        const logger: InMemoryLogger = getInMemoryLogger();
        await git.clone("https://github.com/ts-common/azure-js-dev-tools.git", {
          directory: repositoryFolderPath,
        });
        try {
          const addRemoteResult: ExecutableGit.Result = await git.addRemote("fakeremote", "https://fake.git/remote/repository", {
            executionFolderPath: repositoryFolderPath,
          });
          const remoteUrl: string | undefined = await git.getRemoteUrl("fakeremote", {
            executionFolderPath: repositoryFolderPath,
          });
          assert.strictEqual(remoteUrl, "https://berry@fake.git/remote/repository");
          assert.strictEqual(addRemoteResult.exitCode, 0);
          assertEx.defined(addRemoteResult.processId, "addRemoteResult.processId");
          assert.strictEqual(addRemoteResult.stderr, "");
          assert.strictEqual(addRemoteResult.stdout, "");
          assert.strictEqual(addRemoteResult.error, undefined);
          assert.deepEqual(logger.allLogs, [
            `git clone https://<redacted>@github.com/ts-common/azure-js-dev-tools.git ${repositoryFolderPath}`,
            `Exit Code: 0`,
            `Error:`,
            `Cloning into '${repositoryFolderPath}'...\n`,
            `${repositoryFolderPath}: git remote add fakeremote https://<redacted>@fake.git/remote/repository`,
            `Exit Code: 0`,
            `${repositoryFolderPath}: git remote get-url fakeremote`,
            `Exit Code: 0`,
            `Output:`,
            `https://<redacted>@fake.git/remote/repository\n`,
          ]);
        } finally {
          await deleteFolder(repositoryFolderPath);
        }
      });
    });

    describe("getRemoteUrl()", function () {
      it("with undefined", async function () {
        const git = new ExecutableGit();
        assert.strictEqual(await git.getRemoteUrl(undefined as any), undefined);
      });

      it("with empty string", async function () {
        const git = new ExecutableGit();
        assert.strictEqual(await git.getRemoteUrl(""), undefined);
      });

      it("with non-existing remote string", async function () {
        const git = new ExecutableGit();
        assert.strictEqual(await git.getRemoteUrl("idontexist"), undefined);
      });

      it("with origin remote string", async function () {
        const git = new ExecutableGit();
        assertEx.startsWith((await git.getRemoteUrl("origin"))!, `https://github.com/ts-common/azure-js-dev-tools`);
      });
    });

    describe("setRemoteUrl()", function () {
      it("command line arguments", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.Result = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["remote", "set-url", "abc", "def"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.setRemoteUrl("abc", "def", { runner }), expectedResult);
      });
    });

    describe("listRemotes()", function () {
      it("command line arguments", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.ListRemotesResult = {
          exitCode: 2,
          stdout: "c https://github.com/@ts-common/azure-js-dev-tools",
          stderr: "d",
          remotes: {
            "c": "https://github.com/@ts-common/azure-js-dev-tools"
          }
        };
        runner.set({ executable: "git", args: ["remote", "--verbose"], result: expectedResult });
        const git = new ExecutableGit();
        const result: ExecutableGit.ListRemotesResult = await git.listRemotes({ runner });
        assert.deepEqual(result, expectedResult);
      });

      it("with real remotes", async function () {
        const git = new ExecutableGit();
        const remotes: ExecutableGit.ListRemotesResult = await git.listRemotes();
        assertEx.defined(remotes, "remotes");
        assertEx.defined(remotes.remotes, "remotes.remotes");
        assertEx.containsAll(remotes.remotes["origin"], [
          "https://github.com/",
          "/azure-js-dev-tools"
        ]);
      });
    });
  });
});
