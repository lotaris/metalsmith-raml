# metalsmith-raml

This is a plugin for [Metalsmith](http://metalsmith.io/) that parses [RAML API
Specifications](http://raml.org/) and renders them using any templating engine.

## Warning

> The versions `2+` are not backward compatible with previous versions. 

### Breakings

* In fact, the `markdown` rendering is removed from this library. It is quite easy to enable the `markdown` rendering
outside of the lib. You can configure the template engine with several helper functions. Therefore, it's easy peasy to 
add the `highlighting` and `markdown` directly where you want in your templates.

* The scoping is no more supported at the moment in the lib.

## Usage

Options are explained below. If using the CLI for Metalsmith, metalsmith-raml
can be used like any other plugin by including it in `metalsmith.json`. For 
example:

```json
{
  "src": "src",
  "files": {
    "myApi": { 
      "src": "api/raml/index.raml", 
      "dest": "api/reference"
    }
  },
  "section": "api",
  "template": {
    "engine": "jade",
    "file": "templates/raml/template.jade",
    "params": {
      "pretty": true
    },
    "minifyAssets": true
  }
}
```

For Metalscript's JavaScript API, metalsmith-raml can be used like any other
plugin, by attaching it to the function invocation chain on the Metalscript 
object. For example:

```js
var metalsmithRaml = require('metalsmith-raml');
require('metalsmith')(__dirname)
  .use(metalsmithRaml({
    src: 'src',
    files: {
      'myApi': { src: 'api/raml/index.raml', dest: 'api/reference' }
    },
    section: 'api',
    template: {
      engine: 'jade',
      file: 'templates/raml/template.jade',
      params: {
        pretty: true
      },
      helpers: {
        highlight: function(code) {
          return ...;
        },
        markdown: function(content) {
          return ...;
        }
      },
      minifyAssets: minifyAssets
    }
  })
  .build();
```

## Options

### `src`

The source folder of the Metalsmith documentation relative to the project 
root. Default: `src`.

### `files`

A property/value list of `.raml` file to process. Every value contains an 
object with the property `src` and `dest`, where `src` is the path to the 
`.raml` file relative to the `src` folder defined above and `dest` is the
folder where the HTML files are written to.

Example: Given that your `.raml` file sits at `src/api/raml/index.raml`, you
would end up with this configuration:

```json
{
  "src": "src",
  "files": {
    "myApi": { 
      "src": "api/raml/index.raml", 
      "dest": "api/reference"
    }
  }
}
```

### `section`

An optional attribute that will show up in the built file. Useful for menu 
navigation if the documentation is part of a larger site.

### `template`

The templating options. It takes an object with the following options:

 * `engine` - The name of the engine to use. Note that there is no dependency
   included, so you'll need to install it yourself. For a list of template
   engines support, see the [Consolidate Documentation](https://github.com/visionmedia/consolidate.js/#supported-template-engines).
 * `file` - The file to use for the rendering with the template engine defined
   above. Path is relative to the project root.
 * `params` - An object of parameters that is passed to the template engine 
   when rendering.
 * `minifyAssets` - A variable that will show up during rendering. This is 
   handy if you want to render multiple versions, such as a production and
   development version where assets inclusion in the template would differ
   depending on which environment you're building for.

## Credits

To [Kevin Renskers](https://github.com/kevinrenskers) for his excellent
[raml2html](https://github.com/kevinrenskers/raml2html) which served as
inspiration.

## License

MIT, see [LICENSE](LICENSE).
