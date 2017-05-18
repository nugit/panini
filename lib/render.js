var extend = require('deepmerge');
var fm = require('front-matter');
var path = require('path');
var through = require('through2');
var processRoot = require('./processRoot');

module.exports = function(panini_instance, data) {
  if(panini_instance) {
    return through.obj(render(panini_instance, data));
  }
  else {
    return through.obj(render(this, this.data));
  }
}

/**
 * Renders a page with a layout. The page also has access to any loaded partials, helpers, or data.
 * @param {object} file - Vinyl file being parsed.
 * @param {string} enc - Vinyl file encoding.
 * @param {function} cb - Callback that passes the rendered page through the stream.
 */
function render(panini_instance, data) {
  return (file, enc, cb) => {
    try {
      // Get the HTML for the current page and layout
      var page = fm(file.contents.toString());
      var pageData;

      // Determine which layout to use
      var basePath = path.relative(panini_instance.options.root, path.dirname(file.path));
      var layout =
        page.attributes.layout ||
        (panini_instance.options.pageLayouts && panini_instance.options.pageLayouts[basePath]) ||
        'default';
      var layoutTemplate = panini_instance.layouts[layout];

      if (!layoutTemplate) {
        if (layout === 'default') {
          throw new Error('Panini error: you must have a layout named "default".');
        }
        else {
          throw new Error('Panini error: no layout named "'+layout+'" exists.');
        }
      }

      // Now create Handlebars templates out of them
      var pageTemplate = panini_instance.Handlebars.compile(page.body + '\n');

      // Build page data with globals
      pageData = extend({}, data);

      // Add any data from stream plugins
      pageData = (file.data) ? extend(pageData, file.data) : pageData;

      // Add this page's front matter
      pageData = extend(pageData, page.attributes);

      // Finish by adding constants
      pageData = extend(pageData, {
        page: path.basename(file.path, '.html'),
        layout: layout,
        root: processRoot(file.path, panini_instance.options.root)
      });

      // Add special ad-hoc partials for #ifpage and #unlesspage
      panini_instance.Handlebars.registerHelper('ifpage', require('../helpers/ifPage')(pageData.page));
      panini_instance.Handlebars.registerHelper('unlesspage', require('../helpers/unlessPage')(pageData.page));

      // Finally, add the page as a partial called "body", and render the layout template
      panini_instance.Handlebars.registerPartial('body', pageTemplate);
      
      layoutTemplate(pageData)
        .then((output) => {
          file.contents = new Buffer(output);
          cb(null, file);
        }).catch((e) => {
          console.log('Panini: rendering error ocurred.\n', e);
          panini_instance.Handlebars.registerPartial('body', 'Panini: template could not be parsed <br> \n <pre>{{error}}</pre>');
          file.contents = new Buffer('<!DOCTYPE html><html><head><title>Panini error</title></head><body><pre class="panini-error">'+e+'</pre></body></html>');
          cb(null, file);
        })
    }
    catch (e) {
      console.log('Panini: rendering error ocurred.\n', e);
      // Not even once - write error directly into the HTML output so the user gets an error
      // Maintain basic html structure to allow Livereloading scripts to be injected properly
      file.contents = new Buffer('<!DOCTYPE html><html><head><title>Panini error</title></head><body><pre  class="panini-error">'+e+'</pre></body></html>');
      cb(null, file)
    }
  }
}
