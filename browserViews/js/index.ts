// noinspection ES6UnusedImports
import Vue from 'vue';

// @ts-ignore
import indexTemplate from '../index.js';
// @ts-ignore
import settingsTemplate from '../settings.js';
import {loadTranslations} from "./translation-api.js";
import {themeOnLoad, themeCacheUpdate} from "./theme/theme.js";
import {BridgedWindow} from "./bridgedWindow";
import {ShowSectionEvent} from "./bo/showSectionEvent";
import {IData} from "./bo/IData";

declare var window : BridgedWindow;



const defaultMenu = 'main';
const data: IData = {
	main_input_type: 'url',
	menu: defaultMenu,
	message: 'Hello Vue!',
	versions: window.process.versions,
	internetAddress: null,
	versionState: null,
	wsClientNames: []
};

if (location.hash.length > 1) {
	data.menu = location.hash.substring(1);
	if (data.menu === 'default') {
		data.menu = defaultMenu;
	}
}
window.data = data;

loadTranslations()
	.catch(console.error)
;

themeOnLoad()
	.then(styleTheme => {
		if (styleTheme) {
			document.head.append(styleTheme);
		}
	})
	.catch(console.error)
;

window.znmApi.onThemeUpdate(function (theme, background_color) {
	themeCacheUpdate(theme, background_color)
		.catch(console.error)
	;
})

document.addEventListener('click', function (e) {
	const link : HTMLLinkElement|null = (<HTMLElement>e.target).closest('a[target=_blank]');
	if (!link) return;

	window.znmApi.openExternal(link.href)
		.catch(console.error)
	;

	e.preventDefault();
	e.stopPropagation();
});

window.addEventListener("load", async function () {
	window.znmApi.onShowSection(function (sectionName:string) {
		data.menu = data.menu === 'default' ? defaultMenu : sectionName;
		setTimeout(() => {
			const $input = document.querySelector<HTMLInputElement>(`input[type="radio"][name="menu"][id="${sectionName}"]`);
			if ($input) {
				updateClassesFor($input);
			}
		});
	});



	window.Vue.component('settings', settingsTemplate);
	// @ts-ignore
	const app = new window.Vue({
		el: 'main',
		data: data,
		...indexTemplate
	});



	function triggerMenu(newSection:string, oldSection?:string) {
		const event:ShowSectionEvent = new CustomEvent('showSection', {
			detail: {
				oldSection: oldSection,
				newSection,
				app
			}
		});
		window.dispatchEvent(event);
	}
	triggerMenu(data.menu);
	app.$watch('menu', function (newSection:string, oldSection:string) {
		location.hash = newSection;
		triggerMenu(newSection, oldSection);
	});



	function updateClassesFor(target: HTMLInputElement) {
		const nodes: HTMLLabelElement[] = [...document.querySelectorAll<HTMLLabelElement>(`label[for="${target.id}"]`)];
		if (target.type === 'radio') {
			const radios = document.querySelectorAll(`input[type="radio"][name="${target.name}"]:not([id="${target.id}"])`);
			for (let radio of radios) {
				nodes.push(...document.querySelectorAll<HTMLLabelElement>(`label[for="${radio.id}"]`));
			}
		}

		for (let node of nodes) {
			node.classList.toggle('checked', (<HTMLInputElement|null> node.control)?.checked);
		}
	}
	document.addEventListener('change', function (e) {
		const target = (<Element> e.target).closest<HTMLInputElement>('input[type="checkbox"][id],input[type="radio"][id]');
		if (!target) return;

		updateClassesFor(target);
	});
	setTimeout(() => {
		for (let node of document.querySelectorAll('input[type="checkbox"][id],input[type="radio"][id]')) {
			updateClassesFor(<HTMLInputElement> node);
		}
	});
});