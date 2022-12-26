import './index-main.js';
import './settings.js';
import {loadTranslations} from "./translation-api.js";
import {themeOnLoad, themeCacheUpdate} from "./theme/theme.js";
import {BridgedWindow} from "./bo/bridgedWindow";
import {ShowSectionEvent} from "./bo/showSectionEvent";
import {IJsonWebsiteData} from "./bo/websiteData";
import {WebsiteData} from "./websiteData.js";
import {Dict} from "./bo/Dict";
import {updateClassesFor} from "./labelChecked.js";
import {twigRender} from "./twigRenderHelper.js";

declare var window : BridgedWindow;



const defaultMenu = 'main';

loadTranslations()
	.catch(console.error)
;

async function loadWebsitesData(rawWebsitesData:Dict<IJsonWebsiteData>) {
	const container = document.querySelector('#websitesData');
	if (!container) {
		throw new Error('#websitesData not found');
	}

	// Clear array
	const websitesData : {websiteName: string, websiteData: WebsiteData|IJsonWebsiteData}[] = [];

	let count = 0;
	for (let [name, value] of Object.entries(rawWebsitesData)) {
		if (!value) continue;

		const instance = new WebsiteData();
		instance.fromJSON(value);
		websitesData.push({
			websiteName: name,
			websiteData: instance.toJSON()
		});

		count += instance.count;
	}

	const elements = await twigRender('websitesData', {
		websitesData
	});

	const section = elements.item(0);
	if (!section || elements.length > 1) {
		throw new Error('ONE_NODE_ONLY');
	}

	section.id = 'websitesData';
	section.classList.add('grid-12');
	container.replaceWith(section);

	// @ts-ignore
	if (typeof navigator.setAppBadge === 'function') {
		// @ts-ignore
		navigator.setAppBadge(count);
	}
}

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

async function onLoad() {
	window.znmApi.onShowSection(function (sectionName:string) {
		if (!sectionName || sectionName === 'default') {
			sectionName = defaultMenu;
		}

		triggerMenu(sectionName);
	});



	window.znmApi.getPreferences('websitesData')
		.then(async (result) => {
			if (!!result) {
				loadWebsitesData(result.websitesData as unknown as Dict<IJsonWebsiteData>)
					.catch(console.error)
				;
			}
		})
		.catch(console.error)
	;
	window.znmApi.onWebsiteDataUpdate(function (data) {
		loadWebsitesData(data)
			.catch(console.error)
		;
	});



	function triggerMenu(newSection:string) {
		if (!newSection || newSection === 'default') {
			newSection = defaultMenu;
		}

		const $input = document.querySelector<HTMLInputElement>(`input[name="menu"][value=${newSection}]`);
		if (!$input) {
			throw new Error(`MENU_NOT_FOUND "${newSection}"`);
		}
		if (!$input.checked) {
			$input.checked = true;
		}

		const event:ShowSectionEvent = new CustomEvent('showSection', {
			detail: {
				newSection
			}
		});
		updateMenuShown();
		updateClassesFor($input);
		window.dispatchEvent(event);
	}
	function updateMenuShown() {
		const target = document.querySelector<HTMLInputElement>('input[name="menu"][type="radio"]:checked')
		if (target) {
			const $menuShow = [...document.querySelectorAll<HTMLElement>('[data-menu-show]')];
			for (let item of $menuShow) {
				const menu = item.dataset.menuShow;
				item.style.display = menu === target.value ? '' : 'none';
			}
		}
	}

	triggerMenu(location.hash.substring(1));

	document.addEventListener('change', function onMenuChange(e) {
		const target = (<Element> e.target).closest<HTMLInputElement>('input[name="menu"][type="radio"]');
		if (!target) return;

		const newSection = target.value;
		location.hash = newSection;
		triggerMenu(newSection);
	});
}

if (document.readyState === 'complete') {
	onLoad()
		.catch(console.error)
	;
} else {
	window.addEventListener("load", onLoad);
}