declare var CodeMirror : any;
interface CompiledVue {
	render: Function,
	staticRenderFns: Function[]
}



const path = require('path'),
	Vue = require('vue'),
	{ ipcRenderer } = require('electron')
;

const data = {
	message: 'Hello Vue!',
	versions: process.versions
};



window.addEventListener("load", function () {
	const indexTemplate:CompiledVue = require(path.resolve(__dirname, './index.js'));

	const app = new Vue(Object.assign({
		el: 'main',
		data: data,
		methods: {
			onStreamLink: function () {
				ipcRenderer.send('openStreamlink');
			},
			reloadIframe: function () {
				app.$refs.iframe.contentWindow.location.reload();
			}
		}
	}, indexTemplate));





	const defaultOptions = {
		indentWithTabs: true,
		lineNumbers: true,
		lineSeparator: "\n",
		lineWrapping: true,
		theme: 'monokai'
	};

	const htmlEditor = new CodeMirror(document.querySelector('#input1'), Object.assign({
		value: '<h3>No need to write &lt;body&gt; &lt;/body&gt;</h3>',
		mode: 'htmlmixed'
	}, defaultOptions));
	const cssEditor = new CodeMirror(document.querySelector('#input2'), Object.assign({
		value: "body {\n\tpadding: 0;\n}",
		mode: 'css'
	}, defaultOptions));
	const jsEditor = new CodeMirror(document.querySelector('#input3'), Object.assign({
		value: 'function test(){return true;}',
		mode: 'javascript'
	}, defaultOptions));



	const iframe = document.querySelector('#iframe') as HTMLIFrameElement;
	iframe.addEventListener('load', function () {
		const {VM} = require('vm2'),
			stripHtml = require('string-strip-html')
		;

		const iframeWin = iframe.contentWindow;
		// @ts-ignore
		iframeWin.stripHtml = stripHtml;
		// @ts-ignore
		iframeWin.VM = VM;

		iframeWin.postMessage({
			type: 'init'
		}, location.href);



		try {
			iframeWin.postMessage({
				type: 'html',
				html: htmlEditor.getValue()
			}, location.href);
		} catch (e) {
			console.error(e);
		}

		try {
			iframeWin.postMessage({
				type: 'css',
				css: cssEditor.getValue()
			}, location.href);
		} catch (e) {
			console.error(e);
		}

		try {
			iframeWin.postMessage({
				type: 'js',
				js: jsEditor.getValue()
			}, location.href);
		} catch (e) {
			console.error(e);
		}
	});



	iframe.contentWindow.location.reload();
});