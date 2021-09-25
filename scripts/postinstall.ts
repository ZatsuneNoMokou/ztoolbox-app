#!/usr/bin/env ts-node

import fs from "fs-extra";
import path from "path";

const currentPath = path.resolve(path.dirname(__filename), '..'),
	libPath = path.resolve(currentPath, './browserViews/lib/')
;

if (!fs.existsSync(libPath)){
	fs.mkdirSync(libPath);
}

fs.copy(path.resolve(currentPath, './node_modules/codemirror/'), path.resolve(libPath, './codemirror'))
	.catch(console.error)
;

fs.copy(path.resolve(currentPath, './node_modules/muicss/dist/'), path.resolve(libPath, './muicss'))
	.catch(console.error)
;
