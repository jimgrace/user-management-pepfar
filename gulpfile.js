'use strict';
var gulp = require('gulp');
var runSequence = require('run-sequence');
var del = require('del');

var dhisDirectory;
var buildDirectory = 'build';

var files = [
    //Vendor dependency files
    'vendor/angular/angular.js',
    'vendor/ui-router/release/angular-ui-router.js',
    'vendor/lodash/dist/lodash.js',
    'vendor/restangular/dist/restangular.js',
    'vendor/angular-ui-select/dist/select.js',
    'vendor/angular-bootstrap/ui-bootstrap-tpls.js',

    //Test specific includes
    'test/utils/*.js',
    'test/matchers/*.js',
    'test/mocks/*_mock.js',
    'vendor/angular-mocks/angular-mocks.js',

    //Source files
    'src/app/app-controller.js',
    'src/**/*.js',
    //Jasmine spec files
    'test/specs/**/*_spec.js'
];

/**************************************************************************************************
 * Utility functions
 */

function runKarma(watch) {
    var karma = require('gulp-karma');
    var config = {
        configFile: 'test/karma.conf.js'
    };

    if (!watch) {
        watch = false;
    }

    if (watch === true) {
        config.action = 'watch';
    }

    return karma(config);
}

function printHelp() {
    var task;
    var taskDescriptions = {
        default: 'Display this help',
        test: 'Run the unit tests once',
        watch: 'Run the unit tests on change detection',
        jshint: 'Run jshint on the sourcecode',
        jscs: 'Run jscs on the sourcecode',
        sass: 'Run sass on the sass files and save the output to temp directory',
        i18n: 'Copy the language files to the build directory',
        manifest: 'Copy the manifest to the build directory',
        images: 'Copy the images to the build directory',
        package: 'Package the build directory in a zip file',
        min: 'Minify and concat the html and javascript files'
    };

    console.log('\nGulp has the following available tasks.');
    for (task in gulp.tasks) {
        if (gulp.tasks.hasOwnProperty(task)) {
            console.log('  ' + gulp.tasks[task].name + (taskDescriptions[task] ? ' -- ' + taskDescriptions[task] : ''));
        }
    }
    console.log('');
}

/**
 * Checks if the dhis.json file is present in the root of the project. This will be required for
 * tasks that interact with a running dhis2 instance (for example to circumvent the install process)
 */
function checkForDHIS2ConfigFile() {
    var path = require('path');
    var dhisConfig = require(path.resolve('./dhis.json'));

    if (!dhisConfig.dhisDeployDirectory) {
        console.log('');
        console.log('Dhis 2 deploy directory not set, please add a dhis.json to your project that looks like');
        console.log(JSON.stringify({ dhisDeployDirectory: '<YOUR DHIS2 DIRECTORY>' }, undefined, 2));
        console.log('');
        throw new Error('DHIS deploy location not found');
    }
    dhisDirectory = dhisConfig.dhisDeployDirectory;
}

/**************************************************************************************************
 * Gulp tasks
 */
gulp.task('default', function () {
    printHelp();
});

gulp.task('test', function () {
    return gulp.src(files).pipe(runKarma());
});

gulp.task('watch', function () {
    return gulp.src(files).pipe(runKarma(true));
});

gulp.task('jshint', function () {
    var jshint = require('gulp-jshint');
    return gulp.src([
            'test/specs/**/*.js',
            'src/**/*.js'
        ])
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(jshint.reporter('fail'));
});

gulp.task('jscs', function () {
    var jscs = require('gulp-jscs');
    return gulp.src([
        'test/specs/**/*.js',
        'src/**/*.js'
    ]).pipe(jscs('./.jscsrc'));
});

gulp.task('sass', function () {
    var sass = require('gulp-ruby-sass');

    return gulp.src('src/app/app.sass', { base: './src/' })
        .pipe(sass())
        .pipe(gulp.dest(
            ['temp', 'css'].join('/')
        ));
});

gulp.task('i18n', function () {
    return gulp.src('src/i18n/**/*.json', { base: './src/' }).pipe(gulp.dest(
        buildDirectory
    ));
});

gulp.task('manifest', function () {
    return gulp.src('src/**/*.webapp', { base: './src/' }).pipe(gulp.dest(
        buildDirectory
    ));
});

gulp.task('images', function () {
    return gulp.src('src/**/icons/**/*', { base: './src/' }).pipe(gulp.dest(
        buildDirectory
    ));
});

gulp.task('package', function () {
    var zip = require('gulp-zip');
    return gulp.src('build/**/*', { base: './build/' })
        .pipe(zip('user-management.zip', { compress: false }))
        .pipe(gulp.dest('.'));
});

gulp.task('min', ['sass'], function () {
    var usemin = require('gulp-usemin');
    var minifyCss = require('gulp-minify-css');
    var minifyHtml = require('gulp-minify-html');
    var ngAnnotate = require('gulp-ng-annotate');
    var uglify = require('gulp-uglify');
    var rev = require('gulp-rev');

    return gulp.src([
            'src/**/*.html'
        ])
        .pipe(usemin({
            css: [minifyCss()],
            html: [minifyHtml({empty: true, quotes: true })],
            vendor: [
                /*uglify()*/,
                rev()
            ],
            js: [ngAnnotate({
                add: true,
                remove: true,
                single_quotes: true,
                stats: true
            }), /*uglify(),*/ rev()]
        }))
        .pipe(gulp.dest(buildDirectory));
});

gulp.task('copy-files', function () {
    //TODO: Copy templates
});

gulp.task('build', function () {
    return runSequence('clean', 'i18n', 'manifest', 'images', 'jshint', 'jscs', 'min', 'copy-files');
});

gulp.task('build-prod', function () {
    return runSequence('clean', 'i18n', 'manifest', 'images', 'jshint', 'jscs', 'min', 'copy-files', 'package');
});

gulp.task('clean', function () {
    del(buildDirectory);
});

gulp.task('copy-app', function () {
    checkForDHIS2ConfigFile();
    gulp.src('build/**/*.*', { base: './build/' }).pipe(gulp.dest(dhisDirectory));
});

gulp.task('travis', function () {
    return runSequence('test', 'jshint', 'jscs');
});
