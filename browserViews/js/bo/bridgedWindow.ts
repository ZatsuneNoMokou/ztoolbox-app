import {VersionState} from "../../../classes/bo/versionState";
import {RandomJsonData} from "../../../classes/bo/settings";
import {NotificationResponse} from "../../../classes/bo/notify";
import {Dict} from "./Dict";
import {IJsonWebsiteData} from "./websiteData";
import {getInstallStatesResult, installResult} from "../../../classes/bo/chromeNativeInstallers";
import {IChromeExtensionData} from "../../../classes/bo/chromeNative";
import * as net from "node:net";

export type PreferenceTypes = 'string' | 'boolean' | 'number' | 'date'

export interface IZnmApi {
	nonce(): Promise<string>
	openExternal(url: string): Promise<void>
	digCmd(domain: string): Promise<string>
	preferenceFileDialog(prefId:string): Promise<{ canceled: boolean, filePaths: string[] }|string>
	_(key: string): Promise<string>
	getWsClientDatas(): Promise<IChromeExtensionData[]>

	getProcessArgv(): Promise<string[]>
	getVersionState(): Promise<VersionState|null>

	getPreference(preferenceId: string): Promise<RandomJsonData|undefined>
	getPreference(preferenceId: string, type?:'string'): Promise<string|undefined>
	getPreference(preferenceId: string, type?:'boolean'): Promise<boolean|undefined>
	getPreference(preferenceId: string, type?:'number'): Promise<number|undefined>
	getPreference(preferenceId: string, type?:'date'): Promise<Date|undefined>
	getPreference(preferenceId: string, type?:PreferenceTypes): Promise<RandomJsonData|undefined>
	getPreferences(...preferenceIds: string[]): Promise<Dict<RandomJsonData|undefined>>
	savePreference(preferenceId: string, newValue: RandomJsonData): Promise<boolean>
	chromeNative_install(isUninstall?: boolean): Promise<installResult>
	chromeNative_installStates(): Promise<getInstallStatesResult>

	sendNotification(message: string, title?: string, sound?: boolean): Promise<NotificationResponse>

	nunjuckRender(templateName: string, context: any): Promise<string>

	getNetConnectionAddress(host: string, timeout?: number): Promise<net.AddressInfo>

	onUpdatePreference(cb: (preferenceId: string, newValue: any) => void): void
	onShowSection(cb: (sectionName:string) => void): void
	onThemeUpdate(cb: (theme:string, background_color:string) => void): void
	onWebsiteDataUpdate(cb: (data: Dict<IJsonWebsiteData>, lastUpdate:Date|string) => void): void
	onWsClientDatasUpdate(cb: (data: IChromeExtensionData[]) => void): void
	refreshWebsitesData(): Promise<void>
	openLoginUrl(website:string): Promise<boolean>
}

export type BridgedWindow = Window & typeof globalThis & {
	znmApi: IZnmApi
};