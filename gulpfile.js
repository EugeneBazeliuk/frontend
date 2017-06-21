"use strict";

const fs      = require('fs');
const del     = require('del');
const gulp    = require('gulp');
const sass    = require('gulp-sass');
const pug     = require('gulp-pug');
const plumber = require('gulp-plumber');
const concat  = require('gulp-concat');
const mergejson   = require('gulp-merge-json');
const debug       = require('gulp-debug');
const include     = require('gulp-include');
const uglify      = require('gulp-uglify');
const rename      = require('gulp-rename');
const cached      = require('gulp-cached');
const remember    = require('gulp-remember');
const bs          = require('browser-sync').create();

//
// Paths
//
const paths = {

    templates: {
        src: './src/pages/**/[^_]*.pug',
        dest: './dest/',
        watch: './src/pages/**/*.pug'
    },

    styles: {
        src: './src/static/styles/**/[^_]*.scss',
        dest: './dest/assets/css/',
        watch: './src/static/styles/**/*.scss'
    },

    scripts: {
        src: './src/static/scripts/',
        dest: './dest/assets/js/'
    },

    images: {
        src: './src/static/images/',
        dest: './dest/assets/img/'
    },

    assets: {
        css: {
            src: './src/static/assets/css/**/*.css',
            dest: './dest/assets/css/'
        },
        js: {
            src: './src/static/assets/js/**/*.js',
            dest: './dest/assets/js/'
        },
        fonts: {
            src: './src/static/assets/fonts/**/*.{woff}',
            dest: './dest/assets/fonts/'
        }
    },

    modules: {
        src: './src/common.blocks/',
        dest: './tmp/'
    },
    tmp: './tmp'
};

const options = {
    plumber: {
        errorHandler: errorHendler
    }
};

// ---------------------------------
// Build CSS
// ---------------------------------
gulp.task('combine-modules-styles', function() {
    return gulp.src(paths.modules.src + '**/[^_]*.scss')
        .pipe(cached('modules-styles'))
        .pipe(plumber(options.plumber))
        .pipe(remember('modules-styles'))
        .pipe(concat('modules.scss'))
        .pipe(gulp.dest(paths.modules.dest));
});

gulp.task('compile-styles', function(cb) {
    gulp.src([paths.styles.src, paths.modules.dest + 'modules.scss'])
        .pipe(plumber(options.plumber))
        .pipe(sass())
        .pipe(gulp.dest(paths.styles.dest))
        .pipe(bs.stream({match: '**/*.css'}));
    cb()
});

gulp.task('build-css', gulp.series('combine-modules-styles', 'compile-styles'));

// ---------------------------------
// Build HTML
// ---------------------------------
gulp.task('combine-modules-data', function() {
    return gulp.src(paths.modules.src + '**/[^_]*.json')
        .pipe(plumber(options.plumber))
        .pipe(mergejson({fileName: 'modules.json'}))
        .pipe(gulp.dest(paths.modules.dest));
});

gulp.task('compile-pages', function(cb) {
    gulp.src(paths.templates.src)
        .pipe(plumber(options.plumber))
        .pipe(pug({
            pretty: true,
            data: getData('./tmp/modules.json')
        }))
        .pipe(gulp.dest(paths.templates.dest));
    cb();
});

gulp.task('build-html', gulp.series('combine-modules-data', 'compile-pages'));

// ---------------------------------
// Build JS
// ---------------------------------
gulp.task('combine-modules-scripts', function() {
    return gulp.src(paths.modules.src + '**/[^_]*.js')
        .pipe(plumber(options.plumber))
        .pipe(concat('modules.js'))
        .pipe(gulp.dest(paths.modules.dest));
});

gulp.task('compile-scripts', function(cb) {
    gulp.src(paths.scripts.src + '**/[^_]*.js')
        .pipe(cached('compile-scripts'))
        .pipe(plumber(options.plumber))
        .pipe(include())
        .pipe(gulp.dest(paths.scripts.dest))
        .pipe(uglify())
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest(paths.scripts.dest))
        .pipe(bs.stream({match: '**/*.js'}));
    cb();
});

gulp.task('build-js', gulp.series('combine-modules-scripts', 'compile-scripts'));

// ---------------------------------
// Copy images
// ---------------------------------
gulp.task('copy-images', function() {
    return gulp.src(paths.images.src + '**/[^_]*.{jpg,gif,svg,png}', {since: gulp.lastRun('copy-images')})
        .pipe(gulp.dest(paths.images.dest));
});

// ---------------------------------
// Copy assets
// ---------------------------------
gulp.task('copy-assets-css', function(cb) {
    gulp.src(paths.assets.css.src, {since: gulp.lastRun('copy-assets-css')})
        .pipe(gulp.dest(paths.assets.css.dest));
    cb();
});

gulp.task('copy-assets-js', function(cb) {
    gulp.src(paths.assets.js.src, {since: gulp.lastRun('copy-assets-js')})
        .pipe(gulp.dest(paths.assets.js.dest));
    cb();
});

gulp.task('copy-assets-fonts', function(cb) {
    gulp.src(paths.assets.fonts.src, {since: gulp.lastRun('copy-assets-fonts')})
        .pipe(gulp.dest(paths.assets.fonts.dest));
    cb();
});

gulp.task('copy-assets', gulp.parallel('copy-assets-css', 'copy-assets-js', 'copy-assets-fonts'));

// ---------------------------------
// Server
// ---------------------------------
gulp.task('server', function() {

    bs.init({
        server: {
            baseDir: "./dest",
            directory: false
        },
        ui: false,
        tunnel: false,
        open: false,
        reloadOnRestart: true,
        browser: "google chrome"
    });

    // Modules
    gulp.watch(paths.modules.src + '**/*.scss', gulp.parallel('build-css'));
    gulp.watch(paths.modules.src + '**/*.pug', gulp.parallel('build-html'));
    gulp.watch(paths.modules.src + '**/*.js', gulp.parallel('build-js'));

    // Static
    gulp.watch(paths.styles.watch, gulp.parallel('compile-styles'));
    gulp.watch(paths.templates.watch, gulp.parallel('compile-pages'));
    gulp.watch(paths.scripts.src + '**/*.js', gulp.parallel('compile-scripts'));
    gulp.watch(paths.images.src + '**/*', gulp.parallel('copy-images'));

    // Reload server
    gulp.watch(paths.templates.dest + '**/*.html').on('change', reload);
});


// ---------------------------------
// Helpers
// ---------------------------------
function reload() {
    bs.reload();
}

function clean() {
    return del([ 'dest', 'tmp' ]);
}

function getData(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (er) {
        console.log(er);
    }

    return false;
}

function errorHendler(err) {
    console.log(err.name + ' in ' + err.plugin + ' ' + err.message);
}

// ---------------------------------
// Init
// ---------------------------------
gulp.task('build', gulp.parallel('build-html', 'build-css', 'build-js', 'copy-images', 'copy-assets'));
gulp.task('default', gulp.series(clean, 'build', 'server'));