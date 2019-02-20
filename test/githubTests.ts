import { assert } from "chai";
import { assertEx, findPackageJsonFileSync, getParentFolderPath, joinPath } from "../lib";
import { FakeGitHub, FakeGitHubRepository, getGitHubRepository, getRepositoryFullName, GitHub, GitHubComment, GitHubCommit, GitHubLabel, GitHubMilestone, GitHubPullRequest, gitHubPullRequestGetAssignee, gitHubPullRequestGetLabel, gitHubPullRequestGetLabels, GitHubRepository, GitHubSprintLabel, GitHubUser, RealGitHub } from "../lib/github";

describe("github.ts", function () {
  describe("getGitHubRepository(string)", function () {
    it(`with null`, function () {
      // tslint:disable-next-line:no-null-keyword
      const repository: GitHubRepository = getGitHubRepository(null as any);
      // tslint:disable-next-line:no-null-keyword
      assert.deepEqual(repository, { name: null as any, organization: "" });
    });

    it(`with undefined`, function () {
      const repository: GitHubRepository = getGitHubRepository(undefined as any);
      assert.deepEqual(repository, { name: undefined as any, organization: "" });
    });

    it(`with ""`, function () {
      const repository: GitHubRepository = getGitHubRepository("");
      assert.deepEqual(repository, { name: "", organization: "" });
    });

    it(`with "abc"`, function () {
      const repository: GitHubRepository = getGitHubRepository("abc");
      assert.deepEqual(repository, { name: "abc", organization: "" });
    });

    it(`with "abc/d"`, function () {
      const repository: GitHubRepository = getGitHubRepository("abc/d");
      assert.deepEqual(repository, { name: "d", organization: "abc" });
    });

    it(`with "abc\\d"`, function () {
      const repository: GitHubRepository = getGitHubRepository("abc\\d");
      assert.deepEqual(repository, { name: "d", organization: "abc" });
    });

    it(`with GitHubRepository`, function () {
      const expected: GitHubRepository = { name: "a", organization: "b" };
      const repository: GitHubRepository = getGitHubRepository(expected);
      assert.strictEqual(repository, expected);
    });
  });

  describe("getRepositoryFullName()", function () {
    it("with undefined", function () {
      assert.strictEqual(getRepositoryFullName(undefined as any), "");
    });

    it("with null", function () {
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(getRepositoryFullName(null as any), "");
    });

    it(`with ""`, function () {
      assert.strictEqual(getRepositoryFullName(""), "");
    });

    it(`with "abc"`, function () {
      assert.strictEqual(getRepositoryFullName("abc"), "abc");
    });

    it(`with "abc/d"`, function () {
      assert.strictEqual(getRepositoryFullName("abc/d"), "abc/d");
    });

    it(`with "abc\\d"`, function () {
      assert.strictEqual(getRepositoryFullName("abc\\d"), "abc\\d");
    });

    it(`with { name: "a", organization: "" }`, function () {
      assert.strictEqual(getRepositoryFullName({ name: "a", organization: "" }), "a");
    });

    it(`with { name: "a", organization: "b" }`, function () {
      assert.strictEqual(getRepositoryFullName({ name: "a", organization: "b" }), "b/a");
    });
  });

  describe("gitHubPullRequestGetLabel()", function () {
    it(`with no labels`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      assert.strictEqual(gitHubPullRequestGetLabel(pullRequest, "spam"), undefined);
    });

    it(`with undefined label name`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      assert.strictEqual(gitHubPullRequestGetLabel(pullRequest, undefined as any), undefined);
    });

    it(`with null label name`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(gitHubPullRequestGetLabel(pullRequest, null as any), undefined);
    });

    it(`with "" label name`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      assert.strictEqual(gitHubPullRequestGetLabel(pullRequest, ""), undefined);
    });

    it(`with not existing label name`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      pullRequest.labels.push(createFakeGitHubLabel({ name: "abc" }));
      assert.strictEqual(gitHubPullRequestGetLabel(pullRequest, "a"), undefined);
    });

    it(`with existing label name`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      const label: GitHubLabel = createFakeGitHubLabel({ name: "a" });
      pullRequest.labels.push(label);
      assert.strictEqual(gitHubPullRequestGetLabel(pullRequest, "a"), label);
    });
  });

  describe("gitHubPullRequestGetLabels()", function () {
    it(`with no labels`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      assert.deepEqual(gitHubPullRequestGetLabels(pullRequest, ["abc"]), []);
    });

    it(`with undefined label name`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      assert.deepEqual(gitHubPullRequestGetLabels(pullRequest, undefined as any), []);
    });

    it(`with null label name`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      // tslint:disable-next-line:no-null-keyword
      assert.deepEqual(gitHubPullRequestGetLabels(pullRequest, null as any), []);
    });

    it(`with "" label name`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      assert.deepEqual(gitHubPullRequestGetLabels(pullRequest, ""), []);
    });

    it(`with not existing label name`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      pullRequest.labels.push(createFakeGitHubLabel({ name: "abc" }));
      assert.deepEqual(gitHubPullRequestGetLabels(pullRequest, "a"), []);
    });

    it(`with existing label name`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      const label: GitHubLabel = createFakeGitHubLabel({ name: "a" });
      pullRequest.labels.push(label);
      assert.deepEqual(gitHubPullRequestGetLabels(pullRequest, "a"), [label]);
    });
  });

  describe("gitHubPullRequestGetAssignee()", function () {
    it(`with no pull request assignees`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      assert.strictEqual(gitHubPullRequestGetAssignee(pullRequest, "abc"), undefined);
    });

    it(`with undefined assignee`, function () {
      const user: GitHubUser = createFakeGitHubUser({ login: "abc", id: 5 });
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest({ assignees: [user] });
      assert.strictEqual(gitHubPullRequestGetAssignee(pullRequest, undefined as any), undefined);
    });

    it(`with null assignee`, function () {
      const user: GitHubUser = createFakeGitHubUser({ login: "abc", id: 5 });
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest({ assignees: [user] });
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(gitHubPullRequestGetAssignee(pullRequest, null as any), undefined);
    });

    it(`with not found number assignee`, function () {
      const user: GitHubUser = createFakeGitHubUser({ login: "abc", id: 5 });
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest({ assignees: [user] });
      assert.strictEqual(gitHubPullRequestGetAssignee(pullRequest, 1), undefined);
    });

    it(`with found number assignee`, function () {
      const user: GitHubUser = createFakeGitHubUser({ login: "abc", id: 5 });
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest({ assignees: [user] });
      assert.strictEqual(gitHubPullRequestGetAssignee(pullRequest, user.id), user);
    });

    it(`with not found string assignee`, function () {
      const user: GitHubUser = createFakeGitHubUser({ login: "abc", id: 5 });
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest({ assignees: [user] });
      assert.strictEqual(gitHubPullRequestGetAssignee(pullRequest, "a"), undefined);
    });

    it(`with found string assignee`, function () {
      const user: GitHubUser = createFakeGitHubUser({ login: "abc", id: 5 });
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest({ assignees: [user] });
      assert.strictEqual(gitHubPullRequestGetAssignee(pullRequest, user.login), user);
    });

    it(`with not found GitHubUser assignee`, function () {
      const user: GitHubUser = createFakeGitHubUser({ login: "abc", id: 5 });
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest({ assignees: [user] });
      assert.strictEqual(gitHubPullRequestGetAssignee(pullRequest, createFakeGitHubUser()), undefined);
    });

    it(`with found string assignee`, function () {
      const user: GitHubUser = createFakeGitHubUser({ login: "abc", id: 5 });
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest({ assignees: [user] });
      assert.strictEqual(gitHubPullRequestGetAssignee(pullRequest, user), user);
    });
  });

  describe("FakeGitHubRepository", function () {
    it("with undefined name", function () {
      const repository = new FakeGitHubRepository(undefined as any);
      assert.strictEqual(repository.name, undefined);
      assert.deepEqual(repository.labels, []);
      assert.deepEqual(repository.milestones, []);
      assert.deepEqual(repository.pullRequests, []);
    });

    it("with null name", function () {
      // tslint:disable-next-line:no-null-keyword
      const repository = new FakeGitHubRepository(null as any);
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(repository.name, null);
      assert.deepEqual(repository.labels, []);
      assert.deepEqual(repository.milestones, []);
      assert.deepEqual(repository.pullRequests, []);
    });

    it(`with "" name`, function () {
      const repository = new FakeGitHubRepository("");
      assert.strictEqual(repository.name, "");
      assert.deepEqual(repository.labels, []);
      assert.deepEqual(repository.milestones, []);
      assert.deepEqual(repository.pullRequests, []);
    });

    it(`with "abc" name`, function () {
      const repository = new FakeGitHubRepository("abc");
      assert.strictEqual(repository.name, "abc");
      assert.deepEqual(repository.labels, []);
      assert.deepEqual(repository.milestones, []);
      assert.deepEqual(repository.pullRequests, []);
    });

    it(`with "ab/cd" name`, function () {
      const repository = new FakeGitHubRepository("ab/cd");
      assert.strictEqual(repository.name, "ab/cd");
      assert.deepEqual(repository.labels, []);
      assert.deepEqual(repository.milestones, []);
      assert.deepEqual(repository.pullRequests, []);
    });

    it(`with "ab\\cd" name`, function () {
      const repository = new FakeGitHubRepository("ab\\cd");
      assert.strictEqual(repository.name, "ab\\cd");
      assert.deepEqual(repository.labels, []);
      assert.deepEqual(repository.milestones, []);
      assert.deepEqual(repository.pullRequests, []);
    });
  });

  function githubTests(testSuiteName: string, rawGithub: GitHub | undefined): Mocha.Suite | void {
    const github: GitHub = rawGithub!;
    return (rawGithub ? describe : describe.skip)(testSuiteName, function () {
      this.timeout(10000);

      it("getCurrentUser()", async function () {
        const currentUser: GitHubUser = await github.getCurrentUser();
        assert(currentUser);
        assertEx.definedAndNotEmpty(currentUser.login, "currentUser.login");
        assertEx.defined(currentUser.id, "currentUser.id");
        assertEx.definedAndNotEmpty(currentUser.name, "currentUser.name");
        assertEx.startsWith(currentUser.url, "https://api.github.com/users/", "currentUser.url");
      });

      describe("getLabels()", function () {
        it("with undefined", async function () {
          await assertEx.throwsAsync(github.getLabels(undefined as any));
        });

        it("with null", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.getLabels(null as any));
        });

        it(`with ""`, async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.getLabels(""));
        });

        it(`with "ts-common/azure-js-dev-tools"`, async function () {
          // tslint:disable-next-line:no-null-keyword
          const labels: GitHubLabel[] = await github.getLabels("ts-common/azure-js-dev-tools");
          assertEx.defined(labels, "labels");
          assertEx.greaterThan(labels.length, 0, "labels.length");
        });
      });

      describe("getSprintLabels()", function () {
        it("with undefined", async function () {
          await assertEx.throwsAsync(github.getSprintLabels(undefined as any));
        });

        it("with null", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.getSprintLabels(null as any));
        });

        it(`with ""`, async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.getSprintLabels(""));
        });

        it(`with "ts-common/azure-js-dev-tools"`, async function () {
          // tslint:disable-next-line:no-null-keyword
          const sprintLabels: GitHubSprintLabel[] = await github.getSprintLabels("ts-common/azure-js-dev-tools");
          assertEx.defined(sprintLabels, "sprintLabels");
          assertEx.greaterThan(sprintLabels.length, 0, "sprintLabels.length");
        });
      });

      describe("createLabel()", function () {
        it("with undefined repository", async function () {
          await assertEx.throwsAsync(github.createLabel(undefined as any, "fake label name", "fake color"));
        });

        it("with null repository", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.createLabel(null as any, "fake label name", "fake color"));
        });

        it(`with "" repository`, async function () {
          await assertEx.throwsAsync(github.createLabel(undefined as any, "fake label name", "fake color"));
        });

        it("with undefined label name", async function () {
          await assertEx.throwsAsync(github.createLabel("ts-common/azure-js-dev-tools", undefined as any, "fake color"));
        });

        it("with null label name", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.createLabel("ts-common/azure-js-dev-tools", null as any, "fake color"));
        });

        it(`with "" label name`, async function () {
          await assertEx.throwsAsync(github.createLabel("ts-common/azure-js-dev-tools", "", "fake color"));
        });

        it("with undefined color", async function () {
          await assertEx.throwsAsync(github.createLabel("ts-common/azure-js-dev-tools", "fake label name", undefined as any));
        });

        it("with null color", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.createLabel("ts-common/azure-js-dev-tools", "fake label name", null as any));
        });

        it(`with "" color`, async function () {
          await assertEx.throwsAsync(github.createLabel("ts-common/azure-js-dev-tools", "fake label name", ""));
        });
      });

      describe("getPullRequest()", function () {
        it("with undefined repository", async function () {
          await assertEx.throwsAsync(github.getPullRequest(undefined as any, 50));
        });

        it("with null repository", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.getPullRequest(null as any, 50));
        });

        it(`with "" repository`, async function () {
          await assertEx.throwsAsync(github.getPullRequest("", 50));
        });

        it("with repository that doesn't exist", async function () {
          await assertEx.throwsAsync(github.getPullRequest("ImARepositoryThatDoesntExist", 50));
        });

        it("with pull request number that doesn't exist", async function () {
          await assertEx.throwsAsync(github.getPullRequest("ts-common/azure-js-dev-tools", 1325097123));
        });

        it("with pull request number that exists", async function () {
          const pullRequest: GitHubPullRequest = await github.getPullRequest("ts-common/azure-js-dev-tools", 113);
          assert(pullRequest);
          assert(pullRequest.base);
          assert.strictEqual(pullRequest.base.label, "ts-common:master");
          assert.strictEqual(pullRequest.base.ref, "master");
          assert.strictEqual(pullRequest.base.sha, "c6f8a6b543ece6447ce1f3f5c33d0672989965c5");
          assert.strictEqual(pullRequest.diff_url, "https://github.com/ts-common/azure-js-dev-tools/pull/113.diff");
          assert(pullRequest.head);
          assert.strictEqual(pullRequest.head.label, "ts-common:daschult/capturedLines");
          assert.strictEqual(pullRequest.head.ref, "daschult/capturedLines");
          assert.strictEqual(pullRequest.head.sha, "bc0488dbe9ba7b2dd32c094c826cf799c55ca67d");
          assert.strictEqual(pullRequest.html_url, "https://github.com/ts-common/azure-js-dev-tools/pull/113");
          assert.strictEqual(pullRequest.id, 253577251);
          assert.strictEqual(pullRequest.merge_commit_sha, "17581a5c96422bf4feb5e67edf9920cd62671ccc");
          assert.strictEqual(pullRequest.number, 113);
          assert.strictEqual(pullRequest.state, "closed");
          assert.strictEqual(pullRequest.title, "Buffer external process output and error until newline character");
          assert.strictEqual(pullRequest.url, "https://api.github.com/repos/ts-common/azure-js-dev-tools/pulls/113");
        });
      });

      describe("getPullRequestComments()", function () {
        it("with undefined repository", async function () {
          await assertEx.throwsAsync(github.getPullRequestComments(undefined as any, 50));
        });

        it("with null repository", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.getPullRequestComments(null as any, 50));
        });

        it(`with "" repository`, async function () {
          await assertEx.throwsAsync(github.getPullRequestComments("", 50));
        });

        it("with repository that doesn't exist", async function () {
          await assertEx.throwsAsync(github.getPullRequestComments("ImARepositoryThatDoesntExist", 50));
        });

        it("with pull request number that doesn't exist", async function () {
          await assertEx.throwsAsync(github.getPullRequestComments("ts-common/azure-js-dev-tools", 1325097123));
        });

        it("with pull request number that exists", async function () {
          const comments: GitHubComment[] = await github.getPullRequestComments("ts-common/azure-js-dev-tools", 113);
          assertEx.defined(comments, "comments");
          assert.deepEqual(comments, []);
        });
      });

      describe("createPullRequestComment()", function () {
        it("with undefined repository", async function () {
          await assertEx.throwsAsync(github.createPullRequestComment(undefined as any, 50, "Fake Comment Body"));
        });

        it("with null repository", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.createPullRequestComment(null as any, 50, "Fake Comment Body"));
        });

        it(`with "" repository`, async function () {
          await assertEx.throwsAsync(github.createPullRequestComment("", 50, "Fake Comment Body"));
        });

        it("with repository that doesn't exist", async function () {
          await assertEx.throwsAsync(github.createPullRequestComment("ImARepositoryThatDoesntExist", 50, "Fake Comment Body"));
        });

        it("with pull request number that doesn't exist", async function () {
          await assertEx.throwsAsync(github.createPullRequestComment("ts-common/azure-js-dev-tools", 1325097123, "Fake Comment Body"));
        });

        it("with pull request number that exists", async function () {
          const createdComment: GitHubComment = await github.createPullRequestComment("ts-common/azure-js-dev-tools", 113, "Fake Comment Body");
          try {
            assertEx.defined(createdComment, "createdComment");
            assertEx.defined(createdComment.id, "createdComment.id");
            assert.strictEqual(createdComment.body, "Fake Comment Body");
          } finally {
            await github.deletePullRequestComment("ts-common/azure-js-dev-tools", 113, createdComment);
          }
        });
      });

      describe("updatePullRequestComment()", function () {
        it("with undefined repository", async function () {
          await assertEx.throwsAsync(github.updatePullRequestComment(undefined as any, 50, 12, "Fake Comment Body"));
        });

        it("with null repository", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.updatePullRequestComment(null as any, 50, 12, "Fake Comment Body"));
        });

        it(`with "" repository`, async function () {
          await assertEx.throwsAsync(github.updatePullRequestComment("", 50, 12, "Fake Comment Body"));
        });

        it("with repository that doesn't exist", async function () {
          await assertEx.throwsAsync(github.updatePullRequestComment("ImARepositoryThatDoesntExist", 50, 12, "Fake Comment Body"));
        });

        it("with pull request number that doesn't exist", async function () {
          await assertEx.throwsAsync(github.updatePullRequestComment("ts-common/azure-js-dev-tools", 1325097123, 198761876234, "Fake Comment Body"));
        });

        it("with comment number that doesn't exist", async function () {
          await assertEx.throwsAsync(github.updatePullRequestComment("ts-common/azure-js-dev-tools", 113, 13925876, "New Fake Comment Body"));
        });

        it("with comment that exists", async function () {
          const createdComment: GitHubComment = await github.createPullRequestComment("ts-common/azure-js-dev-tools", 113, "Fake Comment Body");
          try {
            const updatedComment: GitHubComment = await github.updatePullRequestComment("ts-common/azure-js-dev-tools", 113, createdComment, "New Fake Comment Body");
            assertEx.defined(updatedComment, "createdComment");
            assert.strictEqual(updatedComment.id, createdComment.id);
            assert.strictEqual(updatedComment.body, "New Fake Comment Body");
          } finally {
            await github.deletePullRequestComment("ts-common/azure-js-dev-tools", 113, createdComment);
          }
        });
      });

      describe("deletePullRequestComment()", function () {
        it("with undefined repository", async function () {
          await assertEx.throwsAsync(github.deletePullRequestComment(undefined as any, 50, 12));
        });

        it("with null repository", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.deletePullRequestComment(null as any, 50, 12));
        });

        it(`with "" repository`, async function () {
          await assertEx.throwsAsync(github.deletePullRequestComment("", 50, 12));
        });

        it("with repository that doesn't exist", async function () {
          await assertEx.throwsAsync(github.deletePullRequestComment("ImARepositoryThatDoesntExist", 50, 12));
        });

        it("with pull request number that doesn't exist", async function () {
          await assertEx.throwsAsync(github.deletePullRequestComment("ts-common/azure-js-dev-tools", 1325097123, 198761876234));
        });

        it("with comment number that doesn't exist", async function () {
          await assertEx.throwsAsync(github.deletePullRequestComment("ts-common/azure-js-dev-tools", 113, 1392581235476));
        });
      });
    });
  }
  githubTests("FakeGitHub", createFakeGitHub());
  githubTests("RealGitHub", createRealGitHub());
});

function createFakeGitHub(): FakeGitHub {
  const fakeGitHub = new FakeGitHub();

  const fakeUserLogin = "fakeUser";
  fakeGitHub.createUser(fakeUserLogin);
  fakeGitHub.setCurrentUser(fakeUserLogin);

  fakeGitHub.createFakeRepository("ts-common/azure-js-dev-tools");
  fakeGitHub.createLabel("ts-common/azure-js-dev-tools", "Planned-Sprint-130", "fake label color");
  fakeGitHub.createPullRequest("ts-common/azure-js-dev-tools", createFakeGitHubPullRequest({
    base: {
      label: "ts-common:master",
      ref: "master",
      sha: "c6f8a6b543ece6447ce1f3f5c33d0672989965c5"
    },
    diff_url: "https://github.com/ts-common/azure-js-dev-tools/pull/113.diff",
    head: {
      label: "ts-common:daschult/capturedLines",
      ref: "daschult/capturedLines",
      sha: "bc0488dbe9ba7b2dd32c094c826cf799c55ca67d"
    },
    html_url: "https://github.com/ts-common/azure-js-dev-tools/pull/113",
    id: 253577251,
    merge_commit_sha: "17581a5c96422bf4feb5e67edf9920cd62671ccc",
    number: 113,
    state: "closed",
    title: "Buffer external process output and error until newline character",
    url: "https://api.github.com/repos/ts-common/azure-js-dev-tools/pulls/113"
  }));

  return fakeGitHub;
}

function createRealGitHub(): RealGitHub | undefined {
  const packageJsonFilePath: string | undefined = findPackageJsonFileSync(__dirname);
  const githubAuthFilePath: string = joinPath(getParentFolderPath(packageJsonFilePath!), "github.auth");
  let result: RealGitHub | undefined;
  try {
    result = RealGitHub.fromTokenFile(githubAuthFilePath);
  } catch (error) {
  }
  return result;
}

interface GitHubPullRequestOptions {
  base?: GitHubCommit;
  head?: GitHubCommit;
  id?: number;
  labels?: GitHubLabel[];
  merge_commit_sha?: string;
  number?: number;
  state?: "open" | "closed";
  title?: string;
  url?: string;
  html_url?: string;
  diff_url?: string;
  milestone?: GitHubMilestone;
  assignees?: GitHubUser[];
}

function createFakeGitHubPullRequest(options: GitHubPullRequestOptions = {}): GitHubPullRequest {
  const url: string = options.url != undefined ? options.url : "Fake URL";
  return {
    base: options.base || createFakeGitHubCommit("Base"),
    head: options.head || createFakeGitHubCommit("Head"),
    id: options.id != undefined ? options.id : 0,
    labels: options.labels || [],
    merge_commit_sha: options.merge_commit_sha != undefined ? options.merge_commit_sha : "Fake Merge Commit SHA",
    number: options.number != undefined ? options.number : 1,
    state: options.state != undefined ? options.state : "open",
    title: options.title != undefined ? options.title : "Fake Title",
    url: url,
    html_url: options.html_url != undefined ? options.html_url : url,
    diff_url: options.diff_url != undefined ? options.diff_url : `${url}.diff`,
    assignees: options.assignees,
    milestone: options.milestone
  };
}

interface GitHubLabelOptions {
  id?: number;
  node_id?: string;
  url?: string;
  name?: string;
  color?: string;
  default?: boolean;
}

function createFakeGitHubLabel(options: GitHubLabelOptions = {}): GitHubLabel {
  return {
    name: options.name != undefined ? options.name : "Fake Label Name",
    color: options.color != undefined ? options.color : "Fake Label Color",
    default: options.default != undefined ? options.default : false,
    id: options.id != undefined ? options.id : 0,
    node_id: options.node_id != undefined ? options.node_id : "Fake node_id",
    url: options.url != undefined ? options.url : "Fake Label URL"
  };
}

function createFakeGitHubCommit(name: "Base" | "Head"): GitHubCommit {
  return {
    label: `Fake ${name} Commit`,
    ref: `Fake ${name} Ref`,
    sha: `Fake ${name} SHA`
  };
}

export interface GitHubUserOptions {
  id?: number;
  login?: string;
  node_id?: string;
  name?: string;
  url?: string;
  site_admin?: boolean;
}

function createFakeGitHubUser(options: GitHubUserOptions = {}): GitHubUser {
  return {
    id: options.id != undefined ? options.id : 0,
    login: options.login != undefined ? options.login : "Fake User Login",
    node_id: options.node_id != undefined ? options.node_id : "Fake Node ID",
    name: options.name != undefined ? options.name : "Fake User Name",
    url: options.url != undefined ? options.url : "Fake User URL",
    site_admin: options.site_admin != undefined ? options.site_admin : false,
  };
}
