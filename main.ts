import electron, {app, dialog, ipcMain} from 'electron';
import fastifyStatic from '@fastify/static';
import * as path from "node:path";
import {sendNotification} from "./classes/notify.js";
import {PreferenceTypes} from "./browserViews/js/bo/bridgedWindow.js";
import {versionState} from "./classes/versionState.js";
import {fastifyApp, getWsClientDatas, moveWsClientUrl} from "./classes/chromeNative.js";
import {createWindow, getMainWindow} from "./classes/windowManager.js";
import {SettingConfig} from "./classes/bo/settings.js";
import './src/clipboard.js';
import './src/contentSecurityPolicy.js';
import './src/contextMenu.js';
import './src/hourlyAlarm.js';
import {i18n} from "./src/i18next.js";
import './src/manageProtocolAndAutostart.js';
import {appRootPath, resourcePath} from "./classes/constants.js";
import {getNetConnectionAddress} from "./src/getNetConnectionAddress.js";
import {IWsMoveSourceData} from "./classes/bo/chromeNative.js";
import {settings} from "./src/init.js";
import Dict = NodeJS.Dict;
import ini from "ini";
import * as update from './src/update.js';
import fs from "node:fs";
import {nunjucksEnv} from "./src/nunjucksEnv.js";


fastifyApp.register(fastifyStatic, {
	root: path.join(resourcePath, 'browserViews'),
	prefix: '/',
	allowedPath(pathName) {
		return pathName.endsWith('.html');
	},
	decorateReply: false,
});
fastifyApp.register(fastifyStatic, {
	root: path.join(resourcePath, 'browserViews/js'),
	prefix: '/js/',
	decorateReply: false,
});
fastifyApp.register(fastifyStatic, {
	root: path.join(resourcePath, 'browserViews/lib'),
	prefix: '/lib/',
	decorateReply: false,
});
fastifyApp.register(fastifyStatic, {
	root: path.join(resourcePath, 'browserViews/local-assets'),
	prefix: '/local-assets/',
	allowedPath(pathName) {
		const extension = path.extname(pathName);
		return /^\.(?:png|jpe?g|svg|web[pm])$/i.test(extension) && !pathName.split(/[\/\\]/).some(part => part.startsWith('.'));
	},
	cacheControl: true,
	decorateReply: true,
	serveDotFiles: false,
});
const localAssetDefaultPath = path.join(resourcePath, 'browserViews/local-assets');
fastifyApp.route<{ Params: { fileName: string } }>({
	method: ['GET', 'POST'],
	url: '/local-assets/:fileName',
	handler: async function (req, reply) {
		const fileName = req.params.fileName,
			extension = path.extname(fileName);
		if (!extension || !/^\.(?:png|jpe?g|svg|web[pm])$/i.test(extension) || /[\/\\]/.test(fileName) || fileName.startsWith('.')) {
			return reply.status(404).send('Not found');
		}

		const localAssetPaths = new Set<string>([
			localAssetDefaultPath,
			path.normalize(`${settings.storageDir}/local-assets`),
		]);
		let matchedFilePath:string|null = null;
		for (let localAssetPath of localAssetPaths) {
			const filePath = path.normalize(`${localAssetPath}/${fileName}`);
			if (!fs.existsSync(filePath)) continue;

			matchedFilePath = filePath;
			break;
		}
		if (!matchedFilePath) return reply.status(404).send('Not found');
		return reply.sendFile(fileName, path.dirname(matchedFilePath));
	}
});
fastifyApp.listen({
	host: 'localhost',
	port: 42080,
}, (err) => {
	if (err) {
		console.error(err);
	}
	console.log('Listening at localhost:42080');
});




ipcMain.handle('openExternal', async (event, url: string) => {
	return electron.shell.openExternal(url)
		.catch(console.error)
	;
});

ipcMain.handle('preferenceFileDialog', async function (event, prefId:string): Promise<{ canceled: boolean, filePaths: string[] }|string> {
	const mainWindow = getMainWindow();
	if (!mainWindow) return 'NO_MAIN_WINDOW';

	const conf:SettingConfig|undefined = settings.getSettingConfig(prefId);
	let title:string|undefined = undefined,
		buttonLabel:string|undefined = undefined
	;

	if (!conf || !(conf.type === 'path' || conf.type === 'paths')) {
		return 'SETTINGS_TYPE';
	}

	const _ = await i18n;
	title = _(`preferences.${prefId}_WTitle`, {
		nsSeparator: '.',
		defaultValue: ''
	});
	buttonLabel = _(`preferences.${prefId}_WButton`, {
		nsSeparator: '.',
		defaultValue: ''
	});

	const opts : Electron.OpenDialogOptions = {
		title,
		buttonLabel,
		properties: [
			(conf.opts.asFile === true ? 'openDirectory' : 'openFile'),
			'dontAddToRecent',
			'promptToCreate'
		]
	};
	if (Array.isArray(conf.opts.asFile)) {
		opts.filters = conf.opts.asFile;
	}
	switch (conf.type) {
		case 'path':
			opts.defaultPath = settings.getString(prefId);
			break;
		case 'paths':
			if (opts.properties === undefined) throw new Error('SHOULD_NOT_HAPPEN');
			opts.properties.push('multiSelections');

			const val = settings.getArray(prefId);
			if (val && val.length) {
				const [first] = val;
				if (typeof first === 'string') {
					opts.defaultPath = first;
				}
			}
			break;
	}

	const result = await dialog.showOpenDialog(mainWindow, opts);
	return {
		canceled: result.canceled,
		filePaths: result.filePaths
	}
});

// noinspection JSUnusedLocalSymbols
ipcMain.handle('getWsClientDatas', async function (event, args) {
	return Object.fromEntries(await getWsClientDatas());
});

ipcMain.handle('moveWsClientUrl', async function (event, srcData:IWsMoveSourceData, targetId:string) {
	return await moveWsClientUrl(srcData, targetId);
});

ipcMain.handle('getUpdateStatus', async function (event) {
	return await update.updateStatus();
});

ipcMain.handle('doUpdate', async function (event) {
	return await update.doUpdate();
});

ipcMain.handle('parseIni', async function (event, rawContent:string) {
	return ini.parse(rawContent);
});

ipcMain.handle('i18n', async (event, key) => {
	const _ = await i18n;
	return _(key, {
		defaultValue: ''
	});
});

ipcMain.handle('getProcessArgv', () => {
	return process.argv;
});

ipcMain.handle('getVersionState', async () => {
	return versionState(appRootPath);
});

ipcMain.handle('getPreference', (e, preferenceId:string, type?:PreferenceTypes) => {
	if (!!type) {
		switch (type) {
			case "string":
				return settings.getString(preferenceId);
			case "number":
				return settings.getNumber(preferenceId);
			case "boolean":
				return settings.getBoolean(preferenceId);
			case "date":
				return settings.getDate(preferenceId);
			default:
				throw new Error('UNHANDLED_TYPE');
		}
	}

	return settings.get(preferenceId);
});

ipcMain.handle('getPreferences', (e, ...preferenceIds:string[]) => {
	const output:Dict<any> = {}
	for (let preferenceId of preferenceIds) {
		output[preferenceId] = settings.get(preferenceId);
	}
	return output;
});

ipcMain.handle('savePreference', (e, preferenceId:string, newValue:any) => {
	settings.set(preferenceId, newValue);
	return true;
});

ipcMain.handle('sendNotification', async (e, message: string, title?: string, sound?: boolean) => {
	return await sendNotification({
		message,
		title: title || app.name,
		sound
	});
});

ipcMain.handle('nunjuckRender', async (e, templateName:string, context:any) => {
	return nunjucksEnv.render(`${templateName}.njk`, context);
});

ipcMain.handle('getNetConnectionAddress', async (e, host:string, timeout:number=5000) => {
	try {
		return await getNetConnectionAddress(host, timeout);
	} catch (e) {
		console.error(e);
		return null;
	}
});



// Quit when all windows are closed.
app.on('window-all-closed', function () {
	/*
	 * On macOS it is common for applications and their menu bar
	 * to stay active until the user quits explicitly with Cmd + Q
	 * if (process.platform !== 'darwin') app.quit()
	 */
});

app.on('activate', function () {
	/*
	 * On macOS it's common to re-create a window in the app when the
	 * dock icon is clicked and there are no other windows open.
	 */
	if (getMainWindow() === null) {
		createWindow();
	}
});



