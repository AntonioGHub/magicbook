// Require
// --------------------------------------------

var helpers = require('./helpers/helpers');
var PluginExecuter = require('./plugin_executer.js');
var _ = require('lodash');
var through = require('through2');
var gutil = require('gulp-util');
var path = require('path');

// Variables
// --------------------------------------------

var pluginsCache = {};
var layoutCache = {};

var defaults = {

  // The most important plugins are specified first, so
  // the following plugins can register before/after them.
  "plugins" : [
    "load",
    "markdown",
    "liquid",
    "layouts",
    "stylesheets",
    "javascripts",
    "fonts",
    "html",
    "pdf",
    "frontmatter",
    "ids",
    "toc",
    "katex",
    "links",
    "footnotes",
    "navigation",
    "images"
  ],

  "verbose" : true,
  "files" : "content/*.md",
  "destination" : "build/:build",
  "liquid" : {
    "includes" : "includes"
  },
  "images" : {
    "files" : "images/**/*.*",
    "destination" : "assets"
  },
  "stylesheets" : {
    "destination" : "assets"
  },
  "javascripts" : {
    "destination" : "assets"
  },
  "fonts" : {
    "files" : "fonts/**/*.*",
    "destination" : "assets"
  }
}

// Pipes
// --------------------------------------------

// through2 function to remove leading number, - and _
// in filenames, so people can order their files.
function removeNumbers() {
  return through.obj(function (file, enc, cb) {
    file.path = file.path.replace(/\/[\d-_]*/g, '/');
    cb(null, file);
	});
}

// Main
// --------------------------------------------

module.exports = function(jsonConfig) {

  // if there is no builds array or it's empty,
  // return an error message
  if(!_.isArray(jsonConfig.builds) || _.isEmpty(jsonConfig.builds)) {
    return console.log("No build settings detected. Please add a builds array to your config");
  }

  // Create the plugin executer object, which handles proper loading of
  // plugins, and waterfall execution per build.
  var executer = new PluginExecuter();

  // run build for each format
  _.each(jsonConfig.builds, function(build, i) {

    // if there is no format in the build object
    if(!build.format) return console.log("no format in build setting. Skipping build " + (i+1))

    // make a config object that consists of the build config,
    // with the main config and defaults merged on top of it.
    // We remove the "builds" property and add the build number.
    var config = _.merge({ buildNumber: i + 1 }, defaults, jsonConfig, build);
    delete config.builds;

    // figure out the build folder for this format
    var destination = helpers.destination(config.destination, config.buildNumber);

    // Figure out what plugins are needed for this build
    if(config.addPlugins)     config.plugins = config.plugins.concat(config.addPlugins);
    if(config.removePlugins)  config.plugins = _.difference(config.plugins, config.removePlugins);

    // execute all plugin functions.
    var args = [config, { destination: destination }];
    var finish = function(config, stream, extras) {
      if(config.verbose) console.log('Build', config.buildNumber, 'finished');
      if(config.finish) {
        config.finish(config.format, null);
      }
    }
    executer.execute(config.plugins, args, finish);
  });
}
