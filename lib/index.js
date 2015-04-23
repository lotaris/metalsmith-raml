var
	debug = require('debug')('metalsmith-raml'),
	_ = require('underscore'),
	fs = require('fs'),
	raml = require('raml-parser'),
	yaml = require('yamljs'),
	async = require('async'),
	relative = require('path').relative,
	normalize = require('path').normalize,
	consolidate = require('consolidate');

module.exports = function(opts) {

	opts = opts || {};
	opts.src = opts.src || 'src';
	opts.files = opts.files || {};
	opts.template = opts.template || {};
	opts.template.engine = opts.template.engine || 'jade';
	opts.template.file = opts.template.file || 'template.jade';
	opts.template.params = opts.template.params || {};
	opts.template.helpers = opts.template.helpers || {};

	// we need a file-based dictionary, so convert the name-based one.
	var configuredFiles = {};
	_.each(opts.files || {}, function(value, key) {
		configuredFiles[normalize(value.src)] = { dest: value.dest, name: key };
	});

	return function(files, metalsmith, done) {
		var srcFiles = {};

		// pick files to render
		for (var filepath in files) {
			if (files.hasOwnProperty(filepath)) {
				if (configuredFiles[filepath]) {
					srcFiles[filepath] = configuredFiles[filepath];
				}
			}
		}

		// pull object from raml spec
		var metadata = metalsmith.metadata();
		async.each(_.keys(srcFiles), function(file, next) {
			var path = relative(process.cwd(), metalsmith.join(opts.src, file));
			debug('Processing RAML file at %s...', path);
			raml.loadFile(path).then(function(obj) {
				debug('Dumping tree to raml.json.');
				fs.writeFileSync('raml.json', JSON.stringify(obj, null, '\t'));
				obj = parseBaseUri(obj);
				obj = traverse(opts, obj);

				// set title
				//obj.title = 'List of resources';
				obj.minifyAssets = opts.template.minifyAssets;

				// give resource list to metalsmith
				metadata.resources = obj.resources;

				// add helpers
				obj.helpers = opts.template.helpers;

				// add template config
				_.extend(obj, opts.template.params);

				// add metalsmith data
				_.extend(obj, metadata);
				if (opts.section) {
					obj.section = opts.section;
				}

				sortResources(path, obj.resources);

				// render object to html
				consolidate[opts.template.engine](opts.template.file, obj, function(err, html) {
					if (err) {
						return next(err);
					}
					var destFolder = srcFiles[file].dest.replace(/\\/g, '/');
					var dest = destFolder + '/index.html';
					debug('Returning rendered HTML at %s (%d bytes)...', dest, html.length);
					files[dest] = { contents: new Buffer(html) };

					// rewrite api:// links
					for (var filepath in files) {
						if (files.hasOwnProperty(filepath)) {
							if (filepath.substr(filepath.length - 5, filepath.length) == '.html') {
								var contents = files[filepath].contents.toString();
								var changed = false;
								contents = contents.replace(/\s+href="api:\/\/([^\/]+)[^"]+"/gi, function(match) {
									match = match.match(/api:\/\/([^\/]+)\/([^"]*)"/i);
									var apiName = match[1];
									if (srcFiles[file].name == apiName) {
										var link;
										if (match[2]) {
											var anchor = match[2].replace(/[^a-z0-9\.]+/gi, '_').replace(/^_|_$/g, '');
											link = '/' + destFolder + '/#' + anchor;
										} else {
											link = '/' + destFolder;
										}
										changed = true;
										debug('Rewriting link %s to %s.', match[0], link);
										return ' href="' + link + '"';
									} else {
										return match;
									}
								});
								if (changed) {
									files[filepath].contents = new Buffer(contents);
								}
							}
						}
					}
					done();
				});

			}, function(error) {
				next(error);
			});
		}, function(err) {
			done(err);
		});
	};
};

function parseBaseUri(ramlObj) {
	// I have no clue what kind of variables the RAML spec allows in the baseUri.
	// For now keep it super super simple.
	if (ramlObj.baseUri){
		ramlObj.baseUri = ramlObj.baseUri.replace('{version}', ramlObj.version);
	}
	return ramlObj;
}

function makeUniqueId(resource) {
	var fullUrl = resource.parentUrl + resource.relativeUri;
	return fullUrl.replace(/\W/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function traverse(opts, ramlObj, parentResource, allUriParameters) {
	var resource, method, url;

	if (!_.isArray(ramlObj.resources)) {
		return;
	}
	var i = ramlObj.resources.length;
	while (i--) {
		resource = ramlObj.resources[i];
		resource.parentUrl = parentResource ? parentResource.parentUrl + parentResource.relativeUri : '';
		resource.uniqueId = makeUniqueId(resource);
		resource.allUriParameters = [];
		url = resource.parentUrl + resource.relativeUri;

		// loop through methods
		if (_.isArray(resource.methods)) {
			j = resource.methods.length;
			while (j--) {
				method = resource.methods[j];
			}
		}

		if (allUriParameters) {
			resource.allUriParameters.push.apply(resource.allUriParameters, allUriParameters);
		}
		if (resource.uriParameters) {
			var key;
			for (key in resource.uriParameters) {
				if (resource.uriParameters.hasOwnProperty(key)) {
					resource.allUriParameters.push(resource.uriParameters[key]);
				}
			}
		}
		traverse(opts, resource, resource, resource.allUriParameters);
	}

	return ramlObj;
}

function sortResources(path, resources) {
	var root = yaml.load(path);
	var map = {};
	var i = 0;
	_.each(root, function(val, key) {
		if (key[0] == '/') {
			map[key] = i++;
		}
	});
	resources.sort(function(a, b) {
		if (map[a.relativeUri] == null) { // not === in order to match undefined
			debug('Warning: No map for %s', a.relativeUri);
			return 0;
		}
		if (map[b.relativeUri] == null) {
			debug('Warning: No map for %s', b.relativeUri);
			return 0;
		}
		if (map[a.relativeUri] < map[b.relativeUri]) {
			return -1;
		}
		if (map[a.relativeUri] > map[b.relativeUri]) {
			return 1;
		}
		return 0;
	});
}