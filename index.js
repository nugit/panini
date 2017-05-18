var panini;

/**
 * Initializes an instance of Panini.
 * @constructor
 * @param {object} options - Configuration options to use.
 */
function Panini(options) {
  this.options = options;
  this.Handlebars = require('promised-handlebars')(require('handlebars'), { Promise });
  this.layouts = {};
  this.data = {};

  if (!options.layouts) {
    throw new Error('Panini error: you must specify a directory for layouts.');
  }

  if (!options.root) {
    throw new Error('Panini error: you must specify the root folder that pages live in.')
  }
}

Panini.prototype.refresh = require('./lib/refresh');
Panini.prototype.loadLayouts = require('./lib/loadLayouts');
Panini.prototype.loadPartials = require('./lib/loadPartials');
Panini.prototype.loadHelpers = require('./lib/loadHelpers');
Panini.prototype.loadBuiltinHelpers = require('./lib/loadBuiltinHelpers');
Panini.prototype.loadData = require('./lib/loadData');
Panini.prototype.render = require('./lib/render');

/**
 * Gulp stream function that renders HTML pages. The first time the function is invoked in the stream, a new instance of Panini is created with the given options.
 * @param {object} options - Configuration options to pass to the new Panini instance.
 * @returns {function} Transform stream function that renders HTML pages.
 */
module.exports = function(options, stateless=false) {
  if (!panini) {
    panini = new Panini(options);
    panini.loadBuiltinHelpers();
    panini.refresh();
    module.exports.refresh = panini.refresh.bind(panini);
  }

  let data = {};
  data[options.dataName] = options.jsonData; // forked line

  if(!stateless) {
    panini.data = data;
  }

  // Compile pages with the above helpers
  return stateless ? panini.render(panini, data) : panini.render();
}

module.exports.Panini = Panini;
module.exports.refresh = function() {}
