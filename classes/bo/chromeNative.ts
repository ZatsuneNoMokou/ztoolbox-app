import {RandomJsonData, SettingsConfig} from "./settings";
import {IJsonWebsiteData} from "../../browserViews/js/bo/websiteData";
import Dict = NodeJS.Dict;

export type SocketMessage<T> = {error: false} & {result: T} | {error: true|string};
export type ResponseCallback<T> = (response:SocketMessage<T>) => void;

export type preferenceData = { id: string, value: undefined|RandomJsonData };

export interface ServerToClientEvents {
	'ws open'(data: SocketMessage<{ connected: string }>): void
	log(...data: any[]): void
	ping(cb: ResponseCallback<'pong'>): void
	onSettingUpdate(preference: {
		id: preferenceData['id'],
		oldValue: preferenceData['value'],
		newValue: preferenceData['value']
	}): void
	sendNotification<T>(opts: ISendNotificationOptions, cb: ResponseCallback<T>): void
}

export interface ClientToServerEvents {
	getPreference(id: string, cb: ResponseCallback<preferenceData>): void
	getPreferences(ids: string[], cb: ResponseCallback<preferenceData[]>): void
	getDefaultValues(cb: ResponseCallback<SettingsConfig>): void
	ping(cb: ResponseCallback<'pong'>): void
	showSection(sectionName: string, cb: ResponseCallback<'success'>): void
	updateSocketData(data: Partial<IChromeExtensionName & {notificationSupport: boolean}>): void
	getWebsitesData(cb: ResponseCallback<Dict<IJsonWebsiteData>>): void
	sendWebsitesData(websiteData: Dict<IJsonWebsiteData>): void
}
export interface InterServerEvents {}

export interface SocketData extends Partial<IChromeExtensionName> {
	notificationSupport?: boolean
}

export interface IChromeExtensionName {
	userAgent: string,
	extensionId: string
}

export interface ISendNotificationOptions {
	title?: string
	message: string
	contextMessage?: string
	buttons?: {
		title: string;
		/**
		 * This url must be available from the browser
		 */
		iconUrl?: string | undefined;
	}[]
	/**
	 * This url must be available from the browser
	 */
	iconURL?: string
}
