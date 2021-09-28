import * as gulp from "gulp";
import del from "del";
import * as fs from "fs-extra";
import _gulpSass from "gulp-sass";
import * as nodeSass from "node-sass";
import * as sourcemaps from "gulp-sourcemaps";
import gulpPug from "gulp-pug";
import gulpVue from "./scripts/gulp-vue.js";
import gulpTs from "gulp-typescript";

const gulpSass = _gulpSass(nodeSass),
	tsOptions = fs.readJsonSync('./tsconfig.json')
;

const paths = {
	html: {
		src: 'browserViews/*.pug',
		dest: 'browserViews/'
	},
	vue: {
		src: 'browserViews/*.vue',
		dest: 'browserViews/'
	},
	styles: {
		src: 'browserViews/css/**/*.sass',
		dest: 'browserViews/css/'
	},
	js: {
		src: 'browserViews/js/**/*.ts',
		dest: 'browserViews/js/'
	},
	mainJs: {
		src: './*.ts',
		dest: '.'
	},
	mainClassJs: {
		src: 'classes/*.ts',
		dest: 'classes/'
	}
};





function clearCss() {
	return del([
		'browserViews/css/**/*.css',
		'browserViews/css/**/*.map',
	]);
}

function _css() {
	return gulp.src([paths.styles.src, '!**/_*.sass'])
		.pipe(sourcemaps.init())
		.pipe(
			gulpSass({
				indentedSyntax: true,
				indentType: 'tab',
				indentWidth: 1,
				linefeed: 'lf',
				sourceComments: true
			})
				.on('error', gulpSass.logError)
		)
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest(paths.styles.dest))
}
export const css = gulp.series(clearCss, _css);





function clearHtml() {
	return del([
		'browserViews/*.html',
	]);
}

function _html() {
	return gulp.src([paths.html.src, '!_*.pug'])
		.pipe(gulpPug({
			// Your options in here.
		}))
		.pipe(gulp.dest(paths.html.dest))
}
export const html = gulp.series(clearHtml, _html);





function clearVue() {
	return del([
		'browserViews/*.js',
	]);
}

function _vue() {
	return gulp.src(paths.vue.src)
		.pipe(gulpVue())
		.pipe(gulp.dest(paths.vue.dest))
}
export const vue = gulp.series(clearVue, _vue);





function clearMainJs() {
	return del([
		'./*.js',
		'./*.d.ts',
		'./*.map',
		'classes/*.js',
		'classes/*.d.ts',
		'classes/*.map',
	])
}

function _mainJs() {
	return gulp.src([
		paths.mainJs.src, '!_*.ts',
		paths.mainClassJs.src, '!**/_*.ts'
	], {
		cwd: __dirname,
		base: __dirname
	})
		.pipe(sourcemaps.init())

		.pipe(gulpTs(tsOptions.compilerOptions))

		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest(paths.mainJs.dest))
}

// noinspection JSUnusedGlobalSymbols
export const mainJs = gulp.series(clearMainJs, _mainJs);





function clearJs() {
	return del([
		'browserViews/js/*.js',
		'browserViews/js/**/*.js',
		'browserViews/js/**/*.map',
	]);
}

function _js() {
	const _tsOptions = JSON.parse(JSON.stringify(tsOptions));
	_tsOptions.compilerOptions.module = 'es6';

	return gulp.src([paths.js.src, '!**/_*.ts'])
		.pipe(sourcemaps.init())

		.pipe(gulpTs(_tsOptions.compilerOptions))

		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest(paths.js.dest))
}
export const js = gulp.series(clearJs, _js);





export const clear = gulp.series(clearCss, clearHtml, clearVue, clearJs, clearMainJs);

export const build = gulp.series(clear, gulp.parallel(_css, _html, _vue, _js, _mainJs));

function _watch() {
	gulp.watch(paths.styles.src, _css);
	gulp.watch(paths.html.src, _html);
	gulp.watch(paths.vue.src, _vue);
	gulp.watch(paths.js.src, _js);
	gulp.watch(paths.mainJs.src, _mainJs);
	gulp.watch(paths.mainClassJs.src, _mainJs);
}
export const watch = gulp.series(clear, build, _watch);

//Watch task
// noinspection JSUnusedGlobalSymbols
export default build;
