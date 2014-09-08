# grunt-heroku-slug
Direct slug release to Heroku.

I developed this, because scala compile of Heroku is too late.


## Installation
Not yet registered to npm repository.

    npm install grunt-heroku-slug

This plugin requires Grunt `~0.4.5`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-heroku-slug --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-heroku-slug');
```

## Usage
Specified your heroku appname as MultiTask-key.
You must copy your slug files to &lt;targetDir>/app.

```
    herokuSlug: {
      "my-heroku-app" : {
        "env" : {
          "jdk_version" : "1.7"
        },
        "targetDir" : "heroku",
        "process_types" : {
            "web" : "target/universal/stage/bin/report2 -Dhttp.port=$PORT"
        }
      }
    },
```

### Options

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
_(Nothing yet)_
