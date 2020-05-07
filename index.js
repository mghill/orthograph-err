const core = require('@actions/core');
const github = require('@actions/github');
const {TextLintEngine} = require("textlint");

async function lint(path) {
  const engine = new TextLintEngine();
  const results = await engine.executeOnFiles([path]);
  if (engine.isErrorResults(results)) {
    const output = engine.formatResults(results);
    core.setFailed(output);
  }
  return results;
}

function updateChecks(api, results) {
  const level = ['notice', 'warning', 'failure'];

  results.map(result => {
    api.checks.update({
      ...github.context.repo,
      check_run_id: process.env.GITHUB_RUN_ID,
      output: {
        title: 'Textlint',
        summary: 'Linter results',
        annotations: result.messages.map(message => ({
          path:             result.filePath,
          start_line:       message.line,
          end_line:         message.line,
          start_column:     message.column,
          end_column:       message.column,
          annotation_level: level[message.severity],
          message:          message.message,
          title:            message.ruleId,
        })),
      },
    })
  });
}

async function run() {
  try {
    const path     = core.getInput('path', { required: true });
    const gh_token = core.getInput('gh_token', { required: true });

    const result = await lint(path);

    if (result.length > 0) {
      const api = new github.GitHub(gh_token);
      Promise.all(updateChecks(api, result));
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
