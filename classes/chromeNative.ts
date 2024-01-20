import http from "http";
import {
	ClientToServerEvents, IChromeExtensionData, IChromeExtensionName,
	InterServerEvents, IWsMoveSourceData, preferenceData, ResponseCallback,
	ServerToClientEvents,
	SocketData,
} from "./bo/chromeNative";
import {settings} from "../main";
import {showSection} from "./windowManager";
import {Server, Socket, RemoteSocket} from "socket.io";
import "../src/websitesData/refreshWebsitesData";
import {BrowserWindow} from "electron";



export type socket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
export type remoteSocket = RemoteSocket<ServerToClientEvents, SocketData>;
export const server = http.createServer(),
	io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server)
;


io.use((socket, next) => {
	const token = socket.request.headers.token;
	if (!token || token !== 'VGWm4VnMVm72oIIEsaOd97GXNU6_Vg3Rv67za8Fzal9aAWNVUb1AWfAKktIu922c') {
		next(new Error("invalid"));
	} else {
		next();
	}
});

io.on("connection", (socket: socket) => {
	console.dir(socket.request.headers["user-agent"]);

	socket.emit('ws open', {
		error: false,
		result: {
			connected: "z-toolbox"
		}
	});

	socket.on('getPreference', function (id:string, cb) {
		cb({
			error: false,
			result: {
				id,
				value: settings.get(id)
			}
		});
	});

	socket.on('getPreferences', function (ids:string[], cb) {
		cb({
			error: false,
			result: ids.map(id => {
				return {
					id,
					value: settings.get(id)
				}
			})
		});
	});

	socket.on('getDefaultValues', function (cb) {
		cb({
			error: false,
			result: settings.getDefaultValues()
		});
	});

	socket.on('ping', function (cb) {
		cb({
			error: false,
			result: 'pong'
		});
	});

	socket.on('showSection', function (sectionName, cb) {
		showSection(sectionName);
		cb({
			error: false,
			result: 'success'
		});
	});

	socket.on('updateSocketData', function (data) {
		if ('notificationSupport' in data) {
			socket.data.notificationSupport = data.notificationSupport;
		}
		if ('browserName' in data && data.browserName !== undefined) {
			socket.data.browserName = data.browserName;
		}
		if ('extensionId' in data && data.extensionId !== undefined) {
			socket.data.extensionId = data.extensionId;
		}
		if ('userAgent' in data && data.userAgent !== undefined) {
			socket.data.userAgent = data.userAgent;
		}
		if ('tabData' in data) {
			socket.data.tabData = data.tabData;

			if (typeof socket.data.tabData?.url === 'string') {
				let url:URL|undefined = undefined;
				try {
					url = new URL(socket.data.tabData?.url)
				} catch (e) {
					console.error(e);
				}

				if (url && url.protocol === 'chrome:') {
					socket.data.tabData.url = undefined;
					socket.data.tabData.domain = undefined;
				}
			}
		}

		getWsClientDatas()
			.then(getWsClientDatas => {
				for (let browserWindow of BrowserWindow.getAllWindows()) {
					browserWindow.webContents.send('wsClientDatasUpdate', Object.fromEntries(getWsClientDatas));
				}
			})
			.catch(console.error)
		;
	});

	socket.on('disconnect', reason => {
		console.log(`Socket disconnected : ${reason}`);

		getWsClientDatas()
			.then(getWsClientDatas => {
				for (let browserWindow of BrowserWindow.getAllWindows()) {
					browserWindow.webContents.send('wsClientDatasUpdate', Object.fromEntries(getWsClientDatas));
				}
			})
			.catch(console.error)
		;
	})

	socket.on('getWsClientNames', async function (cb) {
		cb({
			error: false,
			result: await getWsClientNames()
		});
	});

	socket.on('openUrl', async function (browserName:string, url: string, cb: ResponseCallback<boolean>) {

		const sockets = await io.fetchSockets();
		let targetSocket: RemoteSocket<ServerToClientEvents, SocketData>|null = null;
		for (let client of sockets) {
			if (client.data.browserName === browserName) {
				targetSocket = client;
				break;
			}
		}

		if (!targetSocket) {
			cb({
				error: true
			});
			return;
		}

		targetSocket.emit('openUrl', url, function (response) {
			if (response.error === false) {
				cb({
					error: false,
					result: response.result
				});
			} else {
				cb({
					error: true
				});
			}
		});
	});
});

export function ping(socket: socket): Promise<'pong'> {
	return new Promise((resolve, reject) => {
		socket.emit('ping', function (response) {
			if (response.error === false) {
				resolve(response.result);
			} else {
				reject('Error : ' + response.error);
			}
		});
	});
}

export async function onSettingUpdate(id: string, oldValue: preferenceData['value'], newValue: preferenceData['value']): Promise<void> {
	const sockets = await io.fetchSockets();
	for (let socket of sockets) {
		socket.emit('onSettingUpdate', {
			id,
			oldValue,
			newValue
		});
	}
}



export async function getWsClientNames(): Promise<IChromeExtensionName[]> {
	const output : IChromeExtensionName[] = [];

	const sockets = await io.fetchSockets();
	for (let client of sockets) {
		if (!client.data.userAgent) continue;
		output.push({
			browserName: client.data.browserName ?? 'Unknown',
			userAgent: client.data.userAgent,
			extensionId: client.data.extensionId ?? '',
			notificationSupport: client.data.notificationSupport ?? false
		});
	}

	return output;
}

export async function getWsClientDatas(): Promise<Map<string, IChromeExtensionData>> {
	const output = new Map<string, IChromeExtensionData>();

	const sockets = await io.fetchSockets();
	for (let client of sockets) {
		if (!client.data.userAgent) continue;
		output.set(client.id, {
			browserName: client.data.browserName ?? 'Unknown',
			userAgent: client.data.userAgent,
			extensionId: client.data.extensionId ?? '',
			notificationSupport: client.data.notificationSupport ?? false,
			tabData: client.data.tabData ?? undefined
		});
	}

	return output;
}

export async function moveWsClientUrl(srcData:IWsMoveSourceData, targetId:string) {
	const sockets = await io.fetchSockets();
	let targetSocket: RemoteSocket<ServerToClientEvents, SocketData>|null = null,
		sourceTargetSocket: RemoteSocket<ServerToClientEvents, SocketData>|null = null
	;
	for (let client of sockets) {
		if (client.id === targetId) {
			targetSocket = client;
		}
		if (client.id === srcData.id) {
			sourceTargetSocket = client;
		}
		if (!!targetSocket && !!sourceTargetSocket) {
			break;
		}
	}

	if (!targetSocket) {
		throw new Error('MV_CLIENT_URL_TARGET_NOT_FOUND');
	}

	targetSocket.emit('openUrl', srcData.tabDataUrl, function (response) {
		if (response.error === false) {
			if (sourceTargetSocket) {
				sourceTargetSocket.emit('closeActiveUrl', srcData.tabDataUrl);
			} else {
				console.error('CANNOT_CLOSE_TAB_' + srcData.id);
			}
		} else {
			console.error(response);
		}
	});
}
