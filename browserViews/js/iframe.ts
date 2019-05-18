declare var stripHtml : Function;



function clearAllSelect(sel: string) {
	document.querySelectorAll(sel).forEach(node => {
		node.remove();
	})
}

var vm:any = null;
function init(e: any) {
	if (e.origin.startsWith('file://') === false) {
		throw 'SomethingWrong';
	}

	if (typeof e.data !== 'object' || typeof e.type !== 'string') {
		throw 'SomethingWrong';
	}

	switch (e.data.type) {
		case 'init':
			// https://yarnpkg.com/fr/package/vm2
			// @ts-ignore
			vm = new VM({
				timeout: 10000,
				sandbox: {
					/**
					 *
					 * @param {string} moduleName
					 * @return {Module}
					 */
					loadModule: function(moduleName: string) {
						const url = `https://unpkg.com/${moduleName}`;

						// @ts-ignore
						return import(url);
					},
					console,
					document
				},
				eval: false,
				require: false
			});
			break;
		case 'js':
			if (vm === null) {
				throw 'vm not loaded';
			}

			vm.run(e.data.js);
			break;
		case 'css':
			clearAllSelect('head style.onMessage');
			const css = document.createElement('style');
			css.textContent = e.data.css;
			css.classList.add('onMessage');
			document.head.appendChild(css);
			break;
		case 'html':
			document.body.textContent = '';
			document.body.innerHTML = stripHtml(e.data.html, {
				skipHtmlDecoding: true,
				onlyStripTags: ['html', 'head', 'script']
			});
	}
}
window.addEventListener('message', init, false);