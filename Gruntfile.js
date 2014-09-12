/*
 * grunt-heroku-slug-push
 * https://github.com/shunjikonishi/grunt-heroku-slug-push
 *
 * Copyright (c) 2014 Shunji Konishi
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
        '<%= nodeunit.tests %>'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },
    copy: {
        app: {
            files: [{
                expand: true,
                cwd: "../report2/target/universal/stage",
                src: "**/*",
                dest: "heroku/app/stage"
            }]
        }
    },
    watch: {
      scripts: {
        files: [
          'tasks/*.js'
        ],
        tasks: ['jshint']
      }
    },

    // Before generating any new files, remove any previously-created files.
    clean: {
      tests: [
        "heroku/**/*",
        "heroku"
      ],
      target: [
        "heroku/app/stage/**.*",
        "heroku/app/stage"
      ]
    },

    // Configuration to be run (and then tested).
    herokuSlug: {
      "slug-push-test" : {
        "env" : {
          "jdk_version" : "1.7"
        },
        "tar" : "gtar",
        "process_types" : {
            "web" : "stage/bin/report2 -Dhttp.port=$PORT"
        }
      }
    },

    // Unit tests.
    nodeunit: {
      tests: ['test/*_test.js']
    }

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('test', ['clean:target', 'copy:app', 'herokuSlug', 'nodeunit']);
//  grunt.registerTask('test', ['herokuSlug', 'nodeunit']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'test']);

};
