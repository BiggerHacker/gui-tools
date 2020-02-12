'use strict';

module.exports = function getNpmArgs() {
  let npmArgv = null;

  try {
    npmArgv = JSON.parse(process.env.npm_config_argv);
  } catch (err) {
    return null;
  }

  if (typeof npmArgv !== 'object' || !npmArgv.cooked || !Array.isArray(npmArgv.cooked)) {
    return null;
  }

  return npmArgv.cooked;
};
