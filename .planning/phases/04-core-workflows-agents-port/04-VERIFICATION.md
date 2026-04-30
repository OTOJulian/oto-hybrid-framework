# Phase 4 - Verification Evidence

## MR-01 Preflight (autonomous)

**Date:** 2026-04-29T23:50:59Z
**Repo HEAD:** 823ad179251ea595f4b8f9ff3458d4a836b9ea7d
**Phase 4 prior plans completed:** 04-01, 04-02, 04-03, 04-04, 04-05, 04-06, 04-07 - all green
**`npm test` result before dogfood:** PASS

```text
1..229
# tests 229
# suites 0
# pass 229
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 8315.576459
```

### Disposable environment

| Variable | Value |
|----------|-------|
| TMP project root | `/tmp/oto-mr01-Z2ho2L` |
| Tmp project init commit | `83e0a93` |
| Tarball | `/tmp/oto-pack-VtJgYu/oto-0.1.0-alpha.1.tgz` |
| Bin prefix | `/tmp/oto-bin-prefix-kqZmpp` |
| Claude config dir | `/tmp/oto-mr01-Z2ho2L/.claude` |
| npm cache | `/tmp/oto-npm-cache-weufIH` |
| Env file | `/tmp/oto-mr01-env-oto-mr01-Z2ho2L.txt` |

### Preflight notes

The first pack/install attempt failed because the local npm cache had root-owned files. The successful retry set `npm_config_cache=/tmp/oto-npm-cache-weufIH`, keeping all npm cache writes disposable and outside the user's persistent cache.

`oto install --claude --config-dir /tmp/oto-mr01-Z2ho2L/.claude` output:

```text
installed: claude — 99 files copied, marker injected, state at /tmp/oto-mr01-Z2ho2L/.claude/oto/.install.json
```

### Operator command for Task 2

```bash
CLAUDE_CONFIG_DIR=/tmp/oto-mr01-Z2ho2L/.claude claude --cwd /tmp/oto-mr01-Z2ho2L
```

### Install-marker content

Path: `/tmp/oto-mr01-Z2ho2L/.claude/oto/.install.json`

```json
{
  "version": 1,
  "oto_version": "0.1.0-alpha.1",
  "installed_at": "2026-04-29T23:50:44.392Z",
  "runtime": "claude",
  "config_dir": "/tmp/oto-mr01-Z2ho2L/.claude",
  "files": [
    {
      "path": "commands/oto/add-backlog.md",
      "sha256": "47f43e0966662aa4021bda054a79740ef06ad5b2a4bf5001a1d9aa56bd891fef"
    },
    {
      "path": "commands/oto/add-phase.md",
      "sha256": "3068734968be89741050526dd92c7060ce29d9487e18bbfa2f7b695a1fc0dbb3"
    },
    {
      "path": "commands/oto/add-tests.md",
      "sha256": "7de4f0a78e100e0d5e1e1e152dd7782b9dd6339cec95f66bedbadbaab6e895cc"
    },
    {
      "path": "commands/oto/add-todo.md",
      "sha256": "07b22b28191a0461f35ab38c2cf9fe166204a7e1e7143f32fdd07957b4ba2bf3"
    },
    {
      "path": "commands/oto/ai-integration-phase.md",
      "sha256": "75f487308b0baea30fe3cd7559c21dceb0c7ac503be1a61278ca587d32f1ef45"
    },
    {
      "path": "commands/oto/analyze-dependencies.md",
      "sha256": "8f4416722fc8115a737d98a00d4c36aca3e07d202f3a8bfd85efc4fca9b958b8"
    },
    {
      "path": "commands/oto/audit-fix.md",
      "sha256": "e342ad7d3d61a9ab5284233b8f9e597673a3aabc4bc9d1498551f2f85e40fae4"
    },
    {
      "path": "commands/oto/audit-milestone.md",
      "sha256": "424e2d66c50bfaad922ad5465ecbaa4bac60ac0228ac4f0d09337f008b184e63"
    },
    {
      "path": "commands/oto/audit-uat.md",
      "sha256": "65e428fc60e48ab9c35178dfed7d7b962c486910af06874bc75e42c4c27bdb44"
    },
    {
      "path": "commands/oto/autonomous.md",
      "sha256": "7318f70065359d24075a6c4843d56d67e8963b95716a81c2e86483cdeccf9407"
    },
    {
      "path": "commands/oto/check-todos.md",
      "sha256": "249f850a9a48acb136dbadc6679198b5b86e381f3ef52d4d191a54caebf92a63"
    },
    {
      "path": "commands/oto/cleanup.md",
      "sha256": "4724452ff7f8a32c15b5d093ccc63c1c24965ac247b47f67834ecad88e92764a"
    },
    {
      "path": "commands/oto/code-review-fix.md",
      "sha256": "ddd39ce7e1012fa19166d47715bcecd96a753ca737cf5bbafa8c5e74e9a49017"
    },
    {
      "path": "commands/oto/code-review.md",
      "sha256": "dbd22e24e18991fb5d444e09a26f13077f5b20299eb26afde2d032447b4e3402"
    },
    {
      "path": "commands/oto/complete-milestone.md",
      "sha256": "d9bff6318d692c072f21a240285077f130b1efbe6bca6db2bfae8c824a835f10"
    },
    {
      "path": "commands/oto/debug.md",
      "sha256": "b027115da57109cd1dd87944734fd71f156394ab2af322ead48b5128d37cc5b2"
    },
    {
      "path": "commands/oto/discuss-phase.md",
      "sha256": "b961fb0f36b726b549c46bf48d31515b00beb1bb91d60ce26c0baa1f17cd7faa"
    },
    {
      "path": "commands/oto/do.md",
      "sha256": "bd6dd6f5a99971ac6004da3dc99226b6e65af08840a99db1dc30085f28639f23"
    },
    {
      "path": "commands/oto/docs-update.md",
      "sha256": "06f1a615cad1d84a0b17672f72b8bb77d6480fe25837544197539352d9658f17"
    },
    {
      "path": "commands/oto/edit-phase.md",
      "sha256": "d3d0cd3fd548d6ab77e5df6f004eada177ebc697138b17a503d0d28ee8c496bf"
    },
    {
      "path": "commands/oto/eval-review.md",
      "sha256": "b51cc3401c45d7690a5b60e6010e76170523d3ceb072a3bd2bd66ff71c5eeaea"
    },
    {
      "path": "commands/oto/execute-phase.md",
      "sha256": "37f3fb28560bfafd82575721fa4cc53ec312242c173af0d61736c8f02b726b79"
    },
    {
      "path": "commands/oto/explore.md",
      "sha256": "2e8eefb628ee8b643b794450566344e72a8ad598e3e523c842c542050c1fa19e"
    },
    {
      "path": "commands/oto/fast.md",
      "sha256": "1900778684f75d1845ab5c3b61df79eb92ddc084c2b2389638a3722fd20e8d49"
    },
    {
      "path": "commands/oto/forensics.md",
      "sha256": "b74fe62e6fc835b0ddd3c3c9d4675f03f39f0bcdcdf9d96f0750d7e747016c95"
    },
    {
      "path": "commands/oto/health.md",
      "sha256": "c85d6993bae35993e9de4541671badda496cdea4737fa5587f6c1521f82da458"
    },
    {
      "path": "commands/oto/help.md",
      "sha256": "e30bc37d78a810703863a5aef8fccf34061e04193feefc5bf1e097e2b5e59ec9"
    },
    {
      "path": "commands/oto/import.md",
      "sha256": "589fe844cecf5ab00e549e566f11c430ef5e1eb287dde3fe349bb2c1bd87bd1f"
    },
    {
      "path": "commands/oto/ingest-docs.md",
      "sha256": "d5ec636cd1435c6e3ce86f510e31600f1a18d129e70d2ac6c6ea1e9b422ac186"
    },
    {
      "path": "commands/oto/insert-phase.md",
      "sha256": "fff1e4787ad517abd479e7da4252a33cb9847de250ce6ce3ffbb30cb98372326"
    },
    {
      "path": "commands/oto/list-phase-assumptions.md",
      "sha256": "886097511167186a7eaf1050add2dd0a96e3943c94139cb579ecb388604d3fd9"
    },
    {
      "path": "commands/oto/list-workspaces.md",
      "sha256": "620d4e231d1c1b9d8e9732c0d19e3ab5e5d6951a688ad927b4240517f2905b9c"
    },
    {
      "path": "commands/oto/manager.md",
      "sha256": "a71620625bab3c6d77842154a07b68d33773714d0b547a6ceec07340e8926ee8"
    },
    {
      "path": "commands/oto/map-codebase.md",
      "sha256": "876685b348835a9411f074df3c787c544b2aea6a81a6ed8a5c2bcf33e49b24a3"
    },
    {
      "path": "commands/oto/milestone-summary.md",
      "sha256": "734aa26a3658612a883babc8809bf6c9d51c58d3e868aafc70bd1a69bf2d5360"
    },
    {
      "path": "commands/oto/new-milestone.md",
      "sha256": "4dbabdd81dc32c71e1587c2c92142e398ba76d2b096a39355c829a2a23a353fe"
    },
    {
      "path": "commands/oto/new-project.md",
      "sha256": "2289dc6078759d189e907826a012dc1a97c28aa900af5eaf2570ff12ea7a995e"
    },
    {
      "path": "commands/oto/new-workspace.md",
      "sha256": "8cdf252c0c884188b03eb883e8a0d18f539914ca2ef78d840da902ef3814fa40"
    },
    {
      "path": "commands/oto/next.md",
      "sha256": "27d11a5a92822a444446016a840f761707402a6ba5999bd152cfe81d586697b2"
    },
    {
      "path": "commands/oto/note.md",
      "sha256": "d58202ee416e2baa03c0368a49899ed78164bc2c1286f69dd0b24efe26958653"
    },
    {
      "path": "commands/oto/pause-work.md",
      "sha256": "600996ff68aba5c84111c6dfbede4ca5703a277d500ab858c16457f947818b6c"
    },
    {
      "path": "commands/oto/plan-milestone-gaps.md",
      "sha256": "d4a46a2baa8efb37b94a07022ec6ded9a89195a134d88f10045fc7939a9ff239"
    },
    {
      "path": "commands/oto/plan-phase.md",
      "sha256": "9ebaabea0b47a773ceb4553835f85727da10db4de629f98cfb72a0d3f514961e"
    },
    {
      "path": "commands/oto/plan-review-convergence.md",
      "sha256": "d37d9c224aca8f582416173c213a60595f723bf7988a292d42b60f9f32ed8504"
    },
    {
      "path": "commands/oto/plant-seed.md",
      "sha256": "9771436b87bacd19846a820229ff5259435b6e2d11fa2f82e494b011a5c193fc"
    },
    {
      "path": "commands/oto/pr-branch.md",
      "sha256": "1c6eedc7d6f5d5edd3386e02c46a1208acde5c92c915b3ce22a57cbcebe082bc"
    },
    {
      "path": "commands/oto/progress.md",
      "sha256": "4d14846b69816506f94cd4348f6ca91e7122a3171d3cf02d34c4dfa75981cb6f"
    },
    {
      "path": "commands/oto/quick.md",
      "sha256": "87b2745d6074f9f0559c108d935e41f88442c18bba449b8ce9c65dbd14a10067"
    },
    {
      "path": "commands/oto/remove-phase.md",
      "sha256": "ae916650bacc1b973575888b751c4145afb497c1961b6a04b11f4f74080e451a"
    },
    {
      "path": "commands/oto/remove-workspace.md",
      "sha256": "62d1684556089e2442970cb1ee041af26a802402d82d4dfcdca178890ecadb42"
    },
    {
      "path": "commands/oto/research-phase.md",
      "sha256": "22b23532d53e442433135bcc076b579672de30ff399eb576c15281976e2361be"
    },
    {
      "path": "commands/oto/resume-work.md",
      "sha256": "a3ba31cec72480f62f801e04f7c9a38bccd4a8f9e66e3650d36f32e4785f3819"
    },
    {
      "path": "commands/oto/review-backlog.md",
      "sha256": "386921e653abb8e22ad5283fe46becccc6dd5a0b04396fa3b76d7f299cda85f8"
    },
    {
      "path": "commands/oto/review.md",
      "sha256": "6a6984eaded650cec13ce8d0b5f3fcf76a2e3171c6823042189762b0dd680faa"
    },
    {
      "path": "commands/oto/scan.md",
      "sha256": "3b8145a2f33ea1a19d67c234af30801f616a7f43a72b69f37b66dce5baf6f42e"
    },
    {
      "path": "commands/oto/secure-phase.md",
      "sha256": "e0e5b14c150c1bbec2ac1759518b90cfc415d1bc879fec32b27e252f05c9a11e"
    },
    {
      "path": "commands/oto/session-report.md",
      "sha256": "69eb4e41b59eb5a82a511c70034dc4dc3bba596400cb6a9010da7e9ee59730d6"
    },
    {
      "path": "commands/oto/set-profile.md",
      "sha256": "d230fab70a35cc8d1bcbd2ffdfdc93b697a1cd1f7a887093781dbee0697a69d3"
    },
    {
      "path": "commands/oto/settings-advanced.md",
      "sha256": "cbb494e34bf6d66551ec7a74b0e88fe1c72c2cdcc42a458e328a9828620d1043"
    },
    {
      "path": "commands/oto/settings-integrations.md",
      "sha256": "d53285d712ede1a792b69c34c09b2b20f917053b8bff4b784c051f413bddb096"
    },
    {
      "path": "commands/oto/settings.md",
      "sha256": "f082ba58bf19a08afd3e314645682913a212a93275a67229c121e77da1bb91c1"
    },
    {
      "path": "commands/oto/ship.md",
      "sha256": "2cc9674d9ee2923fedf61066e5936c7211a29e2234d752da6f0babb38b379142"
    },
    {
      "path": "commands/oto/sketch-wrap-up.md",
      "sha256": "8059f41e15018eeafa15a2966714adbf5e25e6354d9e0eb336ad9568f14a1122"
    },
    {
      "path": "commands/oto/sketch.md",
      "sha256": "cb8d8f4ce52eee165cafca4b17e5b579f340c92de7f32c5847250955a43ba9c8"
    },
    {
      "path": "commands/oto/spec-phase.md",
      "sha256": "38fff4454f373517500a7aca2080c0222606ff812c08fb31c9a4d8c49441ac09"
    },
    {
      "path": "commands/oto/spike-wrap-up.md",
      "sha256": "ba9903c27b597dc8afcbf3430ac38a52a33067fd1d2811db82664cf1185bf0d9"
    },
    {
      "path": "commands/oto/spike.md",
      "sha256": "d64fcbfb81f820b4afab4aec33147c18fc8ccdb5ec0eab041034957d5c9a75ec"
    },
    {
      "path": "commands/oto/stats.md",
      "sha256": "3f518a83bd2730c7ed69b1160d0b5d2608caf6bc3f3549a1fea3f118ee786b40"
    },
    {
      "path": "commands/oto/sync-skills.md",
      "sha256": "41936180d9c2fa12b9e83b225177071237dfd8d879904db83cc114c758d40688"
    },
    {
      "path": "commands/oto/ui-phase.md",
      "sha256": "ebab20227993b8a18e07fc9a24b006aa00df9fda23591a6efc6d3af230c8e64e"
    },
    {
      "path": "commands/oto/ui-review.md",
      "sha256": "8e85793834ba51ea87c1c01c7ecd1ca926594449fa0fdaab03e4144eb7cb3152"
    },
    {
      "path": "commands/oto/undo.md",
      "sha256": "5e74964573c2ad9365292bf0b03062c229eca9a69beca91e9a971fed0b1cc351"
    },
    {
      "path": "commands/oto/update.md",
      "sha256": "a8384ef6dd3f2d45e5daeabab1a5b2456f4ead028f0edc8ceda94b992553c7cb"
    },
    {
      "path": "commands/oto/validate-phase.md",
      "sha256": "e54ab5e11d454bbd69ea2e6b2cc5b22b1cadac6ffdd370369e086752dffa7628"
    },
    {
      "path": "commands/oto/verify-work.md",
      "sha256": "e619eebf034b893adc87fec0c27298af570016a5f7eddf5e5bc226028b54a98a"
    },
    {
      "path": "commands/oto/workstreams.md",
      "sha256": "4a9256c34ab781a815986ea271947b9301308bd9839e42da37d8a7ad77f46a99"
    },
    {
      "path": "agents/oto-advisor-researcher.md",
      "sha256": "c469b947719b7370736c23392da3781c93bdcc87a184cfe7cd67622bd5ca21d6"
    },
    {
      "path": "agents/oto-assumptions-analyzer.md",
      "sha256": "365e87a13f80fc407778288e47015c8f1523a77b83051dde6c6672de16c72c15"
    },
    {
      "path": "agents/oto-code-fixer.md",
      "sha256": "537b96f516c7e0598badc0f1c51c7391b5869536a6f106d10b7e148034eaaefd"
    },
    {
      "path": "agents/oto-code-reviewer.md",
      "sha256": "0ebfcff619d2d9dac7008707e9624af9a5cee8642ee2bb40240205171faaf4b0"
    },
    {
      "path": "agents/oto-codebase-mapper.md",
      "sha256": "53f78cd3fba2f2d9dfc535bb45648b612aa17c054832c9d1c35d485a30560d76"
    },
    {
      "path": "agents/oto-debugger.md",
      "sha256": "42818d7df3b1708b56b709e66ab0fb01193e81263d93ea878ce87be8a403c78f"
    },
    {
      "path": "agents/oto-doc-verifier.md",
      "sha256": "0d8c86c3aa4d6a3116e733a52067bb5aabfda1738704460495477bc44248c86f"
    },
    {
      "path": "agents/oto-doc-writer.md",
      "sha256": "5b3ef6e332effbbbdf17a349cff7b7b95c7fbf5ad4a980b3a801f79d29fd2bf9"
    },
    {
      "path": "agents/oto-domain-researcher.md",
      "sha256": "a6c6da3b3c5f2db865074933682a3300d9173c540e3a878114e232e70d960bb1"
    },
    {
      "path": "agents/oto-executor.md",
      "sha256": "8e91e46dcd007a65d698afbf56829641ccfed7cad0ce18e7550dc591ea1d1956"
    },
    {
      "path": "agents/oto-integration-checker.md",
      "sha256": "a196955741ee10c8b58569969c26cd232bcde3d371138eb6aebc5b7ae236e878"
    },
    {
      "path": "agents/oto-nyquist-auditor.md",
      "sha256": "1e2a13dac6d779223cdbd5aceeee9a72c9a86345805ee1f6fd48dffb4a006317"
    },
    {
      "path": "agents/oto-phase-researcher.md",
      "sha256": "abfc5309656e53a88e9b51bc4044ea4cdb819b9457023282ec8886fe3218eb3f"
    },
    {
      "path": "agents/oto-plan-checker.md",
      "sha256": "7ef71241270ea31812c9fdb570fce4182739a042b36c3306ad26d8b9bc8d6a32"
    },
    {
      "path": "agents/oto-planner.md",
      "sha256": "30f719847044f5401bcbfb261892a6326b39a948615afc9cbdab35e958f896ec"
    },
    {
      "path": "agents/oto-project-researcher.md",
      "sha256": "6414911498c40f18022b7706d64eecf643342f74f425c01c005f63f66ed9fb6c"
    },
    {
      "path": "agents/oto-research-synthesizer.md",
      "sha256": "4971fb1ae4bd168a8c8e1f3fe2b86b51ff4b077f3f3b92a638c54dc5bcdfb389"
    },
    {
      "path": "agents/oto-roadmapper.md",
      "sha256": "c9a2f18aff3977b9aa9202791717f8208f5a148aa492538a1b1d3d59d6e76fa7"
    },
    {
      "path": "agents/oto-security-auditor.md",
      "sha256": "000fb6bfea3d020c512d919ceb4c9a5792c3e760852aa2508814ae194db96d54"
    },
    {
      "path": "agents/oto-ui-auditor.md",
      "sha256": "a7d6884113ce1528a07edc965813573762ea7c7ed3671b79e8fef731f8a83137"
    },
    {
      "path": "agents/oto-ui-checker.md",
      "sha256": "7028bfcfe19041ba64719835afb0c4706f4d9d850a28a29176d8c6404094eb92"
    },
    {
      "path": "agents/oto-ui-researcher.md",
      "sha256": "817e73d275a536ed512400215051090af1fd3e09032b43b6ff9195548d1f6b97"
    },
    {
      "path": "agents/oto-verifier.md",
      "sha256": "ca5cf4b48db696106b88b5dbfc78fd9a01972fafe11342fcb8572705fd3b34d6"
    }
  ],
  "instruction_file": {
    "path": "CLAUDE.md",
    "open_marker": "<!-- OTO Configuration -->",
    "close_marker": "<!-- /OTO Configuration -->"
  }
}
```

### Files installed under configDir (sample)

Output of `find /tmp/oto-mr01-Z2ho2L/.claude/commands/oto -name '*.md' | sort | head -10`:

```text
/tmp/oto-mr01-Z2ho2L/.claude/commands/oto/add-backlog.md
/tmp/oto-mr01-Z2ho2L/.claude/commands/oto/add-phase.md
/tmp/oto-mr01-Z2ho2L/.claude/commands/oto/add-tests.md
/tmp/oto-mr01-Z2ho2L/.claude/commands/oto/add-todo.md
/tmp/oto-mr01-Z2ho2L/.claude/commands/oto/ai-integration-phase.md
/tmp/oto-mr01-Z2ho2L/.claude/commands/oto/analyze-dependencies.md
/tmp/oto-mr01-Z2ho2L/.claude/commands/oto/audit-fix.md
/tmp/oto-mr01-Z2ho2L/.claude/commands/oto/audit-milestone.md
/tmp/oto-mr01-Z2ho2L/.claude/commands/oto/audit-uat.md
/tmp/oto-mr01-Z2ho2L/.claude/commands/oto/autonomous.md
```

Output of `find /tmp/oto-mr01-Z2ho2L/.claude/agents -name 'oto-*.md' | wc -l`:

```text
23
```

Output of `test -f /tmp/oto-mr01-Z2ho2L/.claude/commands/oto/plan-phase.md`:

```text
PASS
```

Output of install-marker JSON parse and file count check:

```text
PASS: files array length is 99
```

### Task 2 pending evidence

Task 2 is the blocking human-action dogfood gate. No operator approval, transcript summary, post-dogfood commit SHAs, exit codes, or cleanup evidence have been recorded yet.

## MR-01 Dogfood Blocker and Rebuild

**Date:** 2026-04-30T20:29:52Z
**Status:** Blocked old disposable install; rebuilt a fresh fixed install for retry.

### Observed blocker

The first operator dogfood session loaded `/oto:new-project`, then stalled after the command attempted to invoke `oto-sdk`:

```text
which oto-sdk 2>&1 && oto-sdk --version 2>&1 | head -5
Error: Exit code 1
oto-sdk not found
```

Diagnosis:

- Published package exposed only `oto` in `package.json#bin`, while shipped Claude commands and workflows call `oto-sdk query ...`.
- The compatibility CLI implementation at `oto/bin/lib/oto-tools.cjs` used stale `./lib/*.cjs` require paths even though the file itself lives in `oto/bin/lib/`.
- The old disposable environment `/tmp/oto-mr01-Z2ho2L` is invalid for MR-01 dogfood approval because it was built before the fix.

### Fix and local verification

Implemented a lightweight `oto-sdk` package binary that delegates `oto-sdk query <handler>` to the existing CJS tools compatibility implementation. Also corrected the local require paths inside `oto/bin/lib/oto-tools.cjs`.

Direct shim check against the previously failing project:

```bash
node bin/oto-sdk.js query init.new-project --cwd /tmp/oto-mr01-Z2ho2L
```

Result: PASS. The command returned valid init JSON with `project_exists: false`.

Targeted tests:

```text
node --test tests/phase-02-package-json.test.cjs tests/phase-04-mr01-install-smoke.test.cjs
1..6
# tests 6
# pass 6
# fail 0
# todo 0
```

Phase 4 tests:

```text
node --test --test-concurrency=4 tests/phase-04-*.test.cjs
1..14
# tests 14
# pass 14
# fail 0
# todo 0
```

Full suite:

```text
npm test
1..229
# tests 229
# pass 229
# fail 0
# todo 0
```

### Fresh disposable environment for Task 2 retry

| Variable | Value |
|----------|-------|
| TMP project root | `/tmp/oto-mr01-rerun-f0nveR` |
| Tarball | `/tmp/oto-pack-rerun-feRqWu/oto-0.1.0-alpha.1.tgz` |
| Bin prefix | `/tmp/oto-bin-prefix-rerun-kUcuEr` |
| Claude config dir | `/tmp/oto-mr01-rerun-f0nveR/.claude` |
| npm cache | `/tmp/oto-npm-cache-rerun-BvTIsP` |
| Env file | `/tmp/oto-mr01-env-oto-mr01-rerun-f0nveR.txt` |

Install output:

```text
installed: claude — 99 files copied, marker injected, state at /tmp/oto-mr01-rerun-f0nveR/.claude/oto/.install.json
```

Fresh install checks:

```text
sdk_project_exists=false
sdk_agents_installed=false
agent_count=23
command_exists=yes
oto_sdk_bin=executable
```

Operator command for retry:

```bash
cd /tmp/oto-mr01-rerun-f0nveR
PATH=/tmp/oto-bin-prefix-rerun-kUcuEr/bin:$PATH CLAUDE_CONFIG_DIR=/tmp/oto-mr01-rerun-f0nveR/.claude claude
```

Then run:

```text
/oto:new-project
```

Expected result: the workflow should progress past the previous `oto-sdk not found` failure. The gate remains open until the operator completes this retry and records approval or failure notes.

Note: `PATH` is required for this disposable preflight because the package was installed with `npm install -g --prefix /tmp/oto-bin-prefix-rerun-kUcuEr`; real default global installs normally put package binaries on the user's existing shell `PATH`.

## MR-01 Support Directory Blocker and Rebuild

**Date:** 2026-04-30T20:40:46Z
**Status:** Blocked second disposable install; rebuilt a fresh fixed install for retry.

### Observed blocker

The second operator dogfood session found that `/oto:new-project` could resolve `oto-sdk`, but could not load command support references:

```text
The OTO install at /tmp/oto-mr01-rerun-f0nveR/.claude/oto/ is incomplete.
Only commands/ and agents/ were dropped — the workflows/, references/, and
templates/ directories that commands/oto/new-project.md references via
@~/.claude/oto/workflows/new-project.md etc. don't exist anywhere on disk.
```

Diagnosis:

- Runtime adapters copied only `commands`, `agents`, `skills`, and `hooks`.
- Phase 4 commands reference framework support docs under `@~/.claude/oto/workflows/...`, `@~/.claude/oto/references/...`, and `@~/.claude/oto/templates/...`.
- The install manifest listed only command and agent payload files, so uninstall/reinstall state also could not manage the missing support directories.
- The old disposable environment `/tmp/oto-mr01-rerun-f0nveR` is invalid for MR-01 dogfood approval because it was built before the support-directory fix.

### Fix and local verification

Extended all runtime adapters to install support payloads:

- `oto/workflows` -> `<configDir>/oto/workflows`
- `oto/references` -> `<configDir>/oto/references`
- `oto/templates` -> `<configDir>/oto/templates`
- `oto/contexts` -> `<configDir>/oto/contexts`

Updated MR-01 smoke coverage to assert support files exist on disk and in `.install.json`.

Focused installer tests:

```text
node --test tests/phase-03-runtime-claude.test.cjs tests/phase-03-runtime-codex.test.cjs tests/phase-03-runtime-gemini.test.cjs tests/phase-03-install-claude.integration.test.cjs tests/phase-04-mr01-install-smoke.test.cjs
1..36
# tests 36
# pass 36
# fail 0
# todo 0
```

Phase 4 tests:

```text
node --test --test-concurrency=4 tests/phase-04-*.test.cjs
1..14
# tests 14
# pass 14
# fail 0
# todo 0
```

Full suite:

```text
npm test
1..229
# tests 229
# pass 229
# fail 0
# todo 0
```

### Fresh disposable environment for Task 2 retry

| Variable | Value |
|----------|-------|
| TMP project root | `/tmp/oto-mr01-rerun2-7V4ZQP` |
| Tarball | `/tmp/oto-pack-rerun2-4EYhHv/oto-0.1.0-alpha.1.tgz` |
| Bin prefix | `/tmp/oto-bin-prefix-rerun2-952wKs` |
| Claude config dir | `/tmp/oto-mr01-rerun2-7V4ZQP/.claude` |
| npm cache | `/tmp/oto-npm-cache-rerun2-ugjR7l` |
| Env file | `/tmp/oto-mr01-env-oto-mr01-rerun2-7V4ZQP.txt` |

Install output:

```text
installed: claude — 296 files copied, marker injected, state at /tmp/oto-mr01-rerun2-7V4ZQP/.claude/oto/.install.json
```

Fresh install checks:

```text
sdk_project_exists=false
agent_count=23
command_exists=yes
workflow_exists=yes
reference_exists=yes
template_exists=yes
context_exists=yes
manifest_count=296
oto_sdk_bin=executable
```

Operator command for retry:

```bash
cd /tmp/oto-mr01-rerun2-7V4ZQP
PATH=/tmp/oto-bin-prefix-rerun2-952wKs/bin:$PATH CLAUDE_CONFIG_DIR=/tmp/oto-mr01-rerun2-7V4ZQP/.claude claude
```

Then run:

```text
/oto:new-project
```

Expected result: the workflow should progress past both previous failures: `oto-sdk not found` and missing `oto/workflows`, `oto/references`, `oto/templates`, or `oto/contexts`. The gate remains open until the operator completes this retry and records approval or failure notes.

## MR-01 Agent Directory Resolver Blocker and Rebuild

**Date:** 2026-04-30T21:17:00Z
**Status:** Blocked third disposable session; rebuilt a fresh fixed install for retry.

### Observed blocker

The third operator dogfood session reached the `/oto:new-project` questionnaire, but `init.new-project` warned that all model-profile agents were missing:

```text
OTO agents not installed. The following agents are missing from your agents directory:
  oto-planner
  oto-roadmapper
  oto-executor
  ...
  oto-doc-verifier
```

Local reproduction showed the installed files existed under the disposable Claude config dir:

```text
find /tmp/oto-mr01-rerun2-7V4ZQP/.claude/agents -maxdepth 1 -type f -name 'oto-*.md' | wc -l
23
```

Diagnosis:

- `getAgentsDir()` in `oto/bin/lib/core.cjs` resolved from the npm package location, not from `CLAUDE_CONFIG_DIR`.
- The disposable install had the agents in the right runtime config dir, but the SDK checked the wrong directory.
- `oto-pattern-mapper` was still listed in `MODEL_PROFILES` even though ADR-07 and the Phase 4 retained-agent fixture classify it as dropped.

### Fix and local verification

Updated `getAgentsDir()` to prefer runtime config environment variables (`CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `GEMINI_CONFIG_DIR`, etc.) before falling back to package-relative lookup.

Removed dropped `oto-pattern-mapper` from `MODEL_PROFILES`.

Added MR-01 smoke coverage that installs into a disposable Claude config dir and then verifies:

```text
CLAUDE_CONFIG_DIR=<tmp-config> oto-sdk query init.new-project
agents_installed=true
missing_agents=[]
```

Focused tests:

```text
node --test tests/phase-04-no-dropped-agents.test.cjs tests/phase-04-mr01-install-smoke.test.cjs
1..2
# tests 2
# pass 2
# fail 0
```

Full Phase 4 test set after the fix:

```text
node --test --test-concurrency=4 tests/phase-04-*.test.cjs
1..14
# tests 14
# pass 14
# fail 0
```

### Fresh disposable environment for Task 2 retry

| Variable | Value |
|----------|-------|
| TMP project root | `/tmp/oto-mr01-rerun3-qbykSp` |
| Tarball | `/tmp/oto-pack-rerun3-Uhp4Or/oto-0.1.0-alpha.1.tgz` |
| Bin prefix | `/tmp/oto-bin-prefix-rerun3-ixTeAl` |
| Claude config dir | `/tmp/oto-mr01-rerun3-qbykSp/.claude` |
| npm cache | `/tmp/oto-npm-cache-rerun3-lh9nh6` |

Install output:

```text
installed: claude - 296 files copied, marker injected, state at /tmp/oto-mr01-rerun3-qbykSp/.claude/oto/.install.json
```

Fresh install checks:

```text
agent_count=23
manifest_count=296
agents_installed=true
missing_agents=[]
```

Operator command for retry:

```bash
cd /tmp/oto-mr01-rerun3-qbykSp
PATH=/tmp/oto-bin-prefix-rerun3-ixTeAl/bin:$PATH CLAUDE_CONFIG_DIR=/tmp/oto-mr01-rerun3-qbykSp/.claude claude
```

Then run:

```text
/oto:new-project
```

Expected result: the workflow should progress past all previous failures: `oto-sdk not found`, missing support directories, and false missing-agent detection. The gate remains open until the operator completes this retry and records approval or failure notes.

## MR-01 Operator Dogfood Result

**Date:** 2026-04-30T22:30:14Z
**Status:** APPROVED
**Operator:** Julian
**Claude Code version:** `2.1.123 (Claude Code)`

### Final disposable environment

| Variable | Value |
|----------|-------|
| TMP project root | `/tmp/oto-mr01-rerun3-qbykSp` |
| Tarball | `/tmp/oto-pack-rerun3-Uhp4Or/oto-0.1.0-alpha.1.tgz` |
| Bin prefix | `/tmp/oto-bin-prefix-rerun3-ixTeAl` |
| Claude config dir | `/tmp/oto-mr01-rerun3-qbykSp/.claude` |
| npm cache | `/tmp/oto-npm-cache-rerun3-lh9nh6` |

### Final install checks

```text
agent_count=23
manifest_count=296
agents_installed=true
missing_agents=[]
```

### Core spine exercised

| Command | Result |
|---------|--------|
| `/oto:new-project` | Created scratch project `.oto/` artifacts for `oto-mr01-hello` |
| `/oto:discuss-phase` | Captured minimal Phase 01 Hello CLI context |
| `/oto:plan-phase` | Created one executable plan at `.oto/phases/01-hello-cli/01-01-PLAN.md` |
| `/oto:execute-phase 1` | Implemented `package.json`, `scripts/hello.js`, and `README.md`; code review gate ran clean |
| `/oto:verify-work 1` | UAT passed 3/3 |
| `/oto:progress` | Reported scratch project complete and routed to milestone closeout |
| `/oto:pause-work` | Wrote `.oto/HANDOFF.json` and `.oto/.continue-here.md` |
| `/oto:resume-work` | Resumed successfully after `/clear` |

### Scratch project evidence

Git commits in the disposable scratch project:

```text
e1800b5 wip: milestone-complete checkpoint paused at 1/1 phases
ce214d6 test(01): complete UAT - 3 passed, 0 issues
e375bb1 docs(phase-01): evolve PROJECT.md after phase completion
bf10191 docs(phase-01): complete phase execution
0d14e61 docs(01): add code review report
c15cb44 docs(phase-01): update tracking after wave 1
2219bc8 chore: merge executor worktree (worktree-agent-ad408a29f0b455301)
4a11cda docs(state): mark phase 01 in progress
303b21b docs(01-01): complete hello-cli plan
bdcb317 docs(01-01): replace README placeholder with usage section
```

Scratch UAT:

```text
status: complete
total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0
```

Scratch verification:

```text
status: passed
score: 4/4 must-haves verified
```

Scratch code review:

```text
status: clean
findings: critical 0, warning 0, info 0, total 0
```

Pause/resume handoff evidence:

```text
status: milestone_complete_pending_archive
next_action: Run /oto-complete-milestone to archive milestone v1.0
blockers: []
human_actions_pending: []
```

### Cleanup

After evidence capture, the disposable paths were removed:

```text
/tmp/oto-mr01-rerun3-qbykSp -> removed
/tmp/oto-bin-prefix-rerun3-ixTeAl -> removed
/tmp/oto-pack-rerun3-Uhp4Or -> removed
/tmp/oto-npm-cache-rerun3-lh9nh6 -> removed
```

### Operator approval

The operator reported that pause/resume "seemed to have worked well" after `/clear` and `/oto:resume-work`. This is treated as MR-01 approval because all blocking commands in D-07 completed and no core-spine failure remained open.
