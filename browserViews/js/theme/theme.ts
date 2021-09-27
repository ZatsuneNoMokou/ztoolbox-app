import {BridgedWindow} from "../bridgedWindow";
import {Color} from "./color.js";

async function getPreferences() {
	const znmApi = (<BridgedWindow> window).znmApi;
	return {
		"panel_theme": await znmApi.getPreference('panel_theme'),
		"background_color": await znmApi.getPreference('background_color')
	}
}

async function render(data:any) {
	const znmApi = (<BridgedWindow> window).znmApi;
	return znmApi.mustacheRender("backgroundTheme", data);
}

const STYLE_NODE_ID = 'generated-color-stylesheet';
export async function themeCacheUpdate() {
	let colorStylesheetNode:HTMLElement|null = document.querySelector<HTMLElement>('#' + STYLE_NODE_ID) ?? null;

	const options = await getPreferences(),
		currentTheme = options.panel_theme ?? 'dark',
		background_color = options.background_color ?? '#000000'
	;

	if (colorStylesheetNode !== null && currentTheme === colorStylesheetNode.dataset.theme && background_color === colorStylesheetNode.dataset.background_color) {
		console.info("Loaded theme is already good");
		return null;
	}


	const baseColor = new Color(background_color),
		baseColor_hsl = baseColor.getHSL(),
		baseColor_L = JSON.parse(baseColor_hsl.L.replace("%",""))/100
	;
	let values;
	if (currentTheme === "dark") {
		if (baseColor_L > 0.5 || baseColor_L < 0.1) {
			values = ["19%","13%","26%","13%"];
		} else {
			values = [(baseColor_L + 0.06) * 100 + "%", baseColor_L * 100 + "%", (baseColor_L + 0.13) * 100 + "%", baseColor_L * 100 + "%"];
		}
	} else if (currentTheme === "light") {
		if (baseColor_L < 0.5 /*|| baseColor_L > 0.9*/) {
			values = ["87%","74%","81%","87%"];
		} else {
			values = [baseColor_L * 100 + "%", (baseColor_L - 0.13) * 100 + "%", (baseColor_L - 0.06) * 100 + "%", baseColor_L * 100 + "%"];
		}
	}



	const style = await render({
		"isDarkTheme": (currentTheme === "dark"),
		"isLightTheme": (currentTheme === "light"),
		"baseColor_hsl": baseColor_hsl,
		"light0": values[0],
		"light1": values[1],
		"light2": values[2],
		"light3": values[3],
		"invBaseColor_hue": ''+(baseColor_hsl.H - 360/2 * ((baseColor_hsl.H < 360/2)? 1 : -1)),
		"invBaseColor_light": (currentTheme === "dark")? "77%" : "33%"
	});

	const styleElement = colorStylesheetNode ?? document.createElement("style");
	styleElement.id = STYLE_NODE_ID;
	styleElement.textContent = style;
	styleElement.dataset.theme = currentTheme;
	styleElement.dataset.background_color = background_color;
	//console.log(baseColor.rgbCode());
	return styleElement.cloneNode(true);
}