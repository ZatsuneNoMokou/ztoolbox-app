import {IChromeExtensionData, IWsMoveSourceData} from "../../classes/bo/chromeNative.js";
import {nunjuckRender} from "./nunjuckRenderHelper.js";
import {BridgedWindow} from "./bo/bridgedWindow.js";
import {Dict} from "./bo/Dict.js";

declare var window : BridgedWindow;

let wsClientDatas: Map<string, IChromeExtensionData>|null = null;

export async function wsClientDatasUpdate(_wsClientDatas: Dict<IChromeExtensionData>) {
	const newData = new Map<string, IChromeExtensionData>();

	const _wsClientDataEntries = Object.entries(_wsClientDatas).sort((a, b) => {
		if (!a[1] || !b[1]) return !!a[1] ? 1 : -1;
		if (a[1].browserName === b[1].browserName) return 0;
		return a[1].browserName > b[1].browserName ? 1 : -1;
	})
	for (let [id, wsClientData] of _wsClientDataEntries) {
		if (!wsClientData) continue;
		newData.set(id, wsClientData);
	}
	wsClientDatas = newData;
	await wsClientDatasDisplay()
}

const containerId = 'wsClientDatas';
async function _wsClientDatasDisplay() {
	if (!wsClientDatas) {
		return;
	}

	const container = document.querySelector('#' + containerId);
	if (!container) {
		throw new Error('#wsClientDatas not found');
	}

	const tabPageServerIp_alias = await window.znmApi.getPreferences('tabPageServerIp_alias')
		.catch(console.error)
	;
	if (tabPageServerIp_alias && 'tabPageServerIp_alias' in tabPageServerIp_alias && tabPageServerIp_alias.tabPageServerIp_alias && typeof tabPageServerIp_alias.tabPageServerIp_alias === 'object') {
		tabPageServerIp_alias.tabPageServerIp_alias;

		const tagIpAlias  = <Dict<string>>(tabPageServerIp_alias.tabPageServerIp_alias);
		for (let [, wsClientData] of wsClientDatas) {
			if (wsClientData.tabData?.ip && wsClientData.tabData.ip in tagIpAlias) {
				wsClientData.tabData.ipMore = tagIpAlias[wsClientData.tabData.ip] ?? false;
			}
		}
	}

	const elements = await nunjuckRender('_wsClientDatas', {
		wsClientDatas
	});

	const section = elements.item(0);
	if (!section || elements.length > 1) {
		throw new Error('ONE_NODE_ONLY');
	}
	section.id = containerId;
	section.classList.add('grid-12');
	container.replaceWith(section);
}



let timer : ReturnType<typeof setTimeout>|null = null;
export async function wsClientDatasDisplay() {
	if (timer) {
		clearTimeout(timer);
	}

	timer = setTimeout(() => {
		timer = null;
		_wsClientDatasDisplay()
			.catch(console.error)
		;
	}, 100);
}



const appDataType = 'application/ws-client-item-url'
function dragstartHandler(target:HTMLElement, e:DragEvent) {
	if (!e.dataTransfer) {
		throw new Error('NO_DATA_TRANSFERT');
	}
	const tabDataUrl = target.dataset.tabDataUrl,
		id = target.id
	;

	// Add the target element's id to the data transfer object
	e.dataTransfer.setData(appDataType, JSON.stringify({
		id,
		tabDataUrl
	}));
	e.dataTransfer.effectAllowed = "move";
}
function extractUriData(e:DragEvent) : IWsMoveSourceData|IWsMoveSourceData[]|File[]|void {
	if (!e.dataTransfer) {
		throw new Error('NO_DATA_TRANSFERT');
	}
	e.preventDefault();



	if (e.dataTransfer.files.length > 0) {
		return [...e.dataTransfer.files];
	}



	const transferredData = e.dataTransfer.getData(appDataType);
	let data : IWsMoveSourceData|undefined = undefined;
	try {
		data = JSON.parse(transferredData);
	} catch (e) {
		console.error(e);
	}

	if (!data) {
		let raw : string|undefined = e.dataTransfer.getData("text/html");
		let uriList : (string|undefined)[] | undefined = undefined
		if (!!raw) {
			uriList = [...raw.matchAll(/<a.*?href=("[^"]+").*?>/gm)].map<string|undefined>(item => {
				const rawUrl = item.at(1);
				if (rawUrl === undefined) return;
				return JSON.parse(rawUrl);
			});

		}

		if (!uriList) {
			raw = e.dataTransfer.getData("text/uri-list");
			if (raw) {
				uriList = [...raw.split(/\w+:\/\//)]
					.filter(item => !!item)
				;
			}
		}

		if (uriList && uriList.length) {
			let output:  IWsMoveSourceData[] = [];

			for (let url of uriList) {
				if (!url) continue;

				output.push({
					tabDataUrl: url,
				});
			}
			return output;
		}
	}

	if (!data || typeof data !== 'object' || !data.id || !data.tabDataUrl) {
		throw new Error('DATA_TRANSFERT_DATA_ERROR');
	}

	return data;
}
function dragoverHandler(target:HTMLElement, e:DragEvent) {
	if (!e.dataTransfer) {
		throw new Error('NO_DATA_TRANSFERT');
	}
	e.preventDefault();

	const data = extractUriData(e);
	if (!Array.isArray(data) && typeof data === 'object' && data && data.id === target.id) {
		// No Self tab "moving"
		e.dataTransfer.dropEffect = "none";
		return;
	}
	e.dataTransfer.dropEffect = "move";
}
function dropHandler(target:HTMLElement, e:DragEvent) {
	if (!target) return;
	if (!e.dataTransfer) {
		throw new Error('NO_DATA_TRANSFERT');
	}
	e.preventDefault();


	const data = extractUriData(e);
	if (Array.isArray(data)) {
		console.debug('Opening ', data, 'into', target.id);
		for (let url of data) {
			if (!url) continue;
			if (!(url instanceof File)) {
				window.znmApi.moveWsClientUrl(url, target.id)
					.catch(console.error)
				;
				continue;
			}

			if (url.name.toLowerCase().endsWith('.url')) {
				url.text()
					.then(async (fileRaw) => {
						let iniData: Dict<any> | null = null;
						try {
							iniData = await window.znmApi.parseIni(fileRaw);
							if (!!iniData?.InternetShortcut && !iniData?.InternetShortcut?.url) {
								iniData.InternetShortcut.url = iniData?.InternetShortcut?.URL;
							}
						} catch (e) {
							console.error(e);
						}

						if (iniData && typeof iniData === 'object' && iniData.InternetShortcut && typeof iniData.InternetShortcut === 'object' && typeof iniData.InternetShortcut.url === 'string') {
							const url: string = iniData.InternetShortcut.url;
							window.znmApi.moveWsClientUrl({
								tabDataUrl: url
							}, target.id)
								.catch(console.error)
							;
						} else {
							console.error('Wrong file format', iniData ?? fileRaw);
						}
					})
					.catch(console.error)
				;
			} else {
				console.error('Wrong file format', url);
			}
		}
		return;
	}

	if (!data || typeof data !== 'object' || !data.id || !data.tabDataUrl) {
		throw new Error('DATA_TRANSFERT_DATA_ERROR');
	}
	if (typeof data === 'object' && data && data.id === target.id) {
		// No Self tab "moving"
		return;
	}

	console.debug('Moving ', data, 'to', target.id);
	window.znmApi.moveWsClientUrl(data, target.id)
		.catch(console.error)
	;
}

document.body.addEventListener('dragstart', function (e) {
	const target = (<Element> e.target).closest<HTMLElement>('.buttonItem.wsClientDatasItem[data-tab-data-url]');
	if (target) {
		dragstartHandler(target, e);
	}
});
document.body.addEventListener('dragover', function (e) {
	const target = (<Element> e.target).closest<HTMLElement>('.buttonItem.wsClientDatasItem');
	if (target) {
		dragoverHandler(target, e);
	}
});
document.body.addEventListener('drop', function (e) {
	const target = (<Element> e.target).closest<HTMLElement>('.buttonItem.wsClientDatasItem');
	if (target) {
		dropHandler(target, e);
	}
});
