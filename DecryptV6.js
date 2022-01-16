/*
* JsjiamiV6简易解密（作者：NXY666）
*/
const FILE_NAME = "./template/4.js";

const fs = require("fs");
const vm = require("vm");

Array.prototype.top = function () {
	return this[this.length - 1];
};
String.prototype.replaceWithStr = function (st, en, str) {
	return this.slice(0, st) + str + this.slice(en);
};
String.prototype.splitByOtherStr = function (str, separator) {
	if (this.length !== str.length) {
		throw Error("字符串长度与源字符串长度不一致。");
	}
	let splitRes = str.split(separator);
	let nowPos = 0;
	return splitRes.map(function (item) {
		let res = this.slice(nowPos, nowPos + item.length);
		nowPos += item.length + separator.length;
		return res;
	}.bind(this));
};
// noinspection JSUnusedGlobalSymbols
String.prototype.searchOf = function (regexp, position) {
	if (typeof regexp == "string") {
		return this.indexOf(regexp, position);
	}

	if (position < 0) {
		position = 0;
	} else if (position >= this.length) {
		return -1;
	}

	return position + this.slice(position).search(regexp);
};
String.prototype.lastSearchOf = function (regexp, position) {
	if (typeof regexp != "object") {
		return this.lastIndexOf(regexp, position);
	} else {
		regexp = new RegExp(regexp.source, regexp.flags + 'g');
	}

	let thisStr = this;
	if (position < 0) {
		return -1;
	} else if (position < thisStr.length) {
		thisStr = thisStr.slice(0, position + 1);
	}

	let posRes = -1, matchRes;
	while ((matchRes = regexp.exec(thisStr)) != null) {
		posRes = matchRes.index;
	}

	return posRes;
};

/* 日志工具 */
function showMsgProgress(msg) {
	console.clear();
	console.warn(`* 正在${msg}……`);
}
function showNumProgress(msg, nowProgress, maxProgress) {
	let percent = Math.floor(nowProgress / maxProgress * 50);
	let progressArr = [];
	for (let i = 0; i < 50; i++) {
		if (i < percent) {
			progressArr.push("▇");
		} else {
			progressArr.push(" ");
		}
	}
	console.clear();
	console.warn(`* 正在${msg}…… [${progressArr.join("")}] ${(nowProgress / maxProgress * 100).toFixed(1).padStart(5, " ")}%`);
}
/* 分析代码工具 */
function transStr(jsStr) {
	let signStack = [], jsArr = jsStr.split("");
	for (let nowPos = 0; nowPos < jsArr.length; nowPos++) {
		switch (jsArr[nowPos]) {
			case '/':
				if (signStack.top() === jsArr[nowPos]) {
					// 结束正则
					signStack.pop();
				} else if (signStack.length === 0) {
					// [{( +-* <>=? &|! ~^
					if (nowPos === 0 || jsArr[nowPos - 1].match(/[\[{(+\-*<>=?&|!~^;]/)) {
						// 开始正则
						signStack.push(jsArr[nowPos]);
					}
				} else {
					jsArr[nowPos] = 'S';
				}
				break;
			case '"':
			case "'":
			case '`':
				if (signStack.top() === jsArr[nowPos]) {
					// 结束字符串
					signStack.pop();
				} else if (signStack.length === 0) {
					// 开始字符串
					signStack.push(jsArr[nowPos]);
				} else {
					jsArr[nowPos] = 'S';
				}
				break;
			case '\\':
				if (signStack.top() === '"' || signStack.top() === "'" || signStack.top() === '/' || signStack.top() === '`') {
					jsArr[nowPos++] = jsArr[nowPos] = 'S';
				}
				break;
			default:
				if (signStack.top() === '"' || signStack.top() === "'" || signStack.top() === '/' || signStack.top() === '`') {
					jsArr[nowPos] = 'S';
				}
				break;
		}
	}
	return jsArr.join("");
}
function transLayer(jsStr, layer) {
	jsStr = transStr(jsStr);
	if (layer === undefined) {
		layer = 1;
	}

	let signStack = [], jsArr = jsStr.split("");
	for (let nowPos = 0; nowPos < jsArr.length; nowPos++) {
		switch (jsArr[nowPos]) {
			case '[':
			case '{':
			case '(':
				// 开始
				signStack.push(jsArr[nowPos]);
				if (signStack.length > layer) {
					jsArr[nowPos] = 'Q';
				}
				break;
			case ']':
				if (signStack.top() === "[") {
					// 结束
					if (signStack.length > layer) {
						jsArr[nowPos] = 'Q';
					}
					signStack.pop();
				} else {
					console.error("“]”关闭失败");
					throw EvalError("解析失败");
				}
				break;
			case '}':
				if (signStack.top() === "{") {
					// 结束
					if (signStack.length > layer) {
						jsArr[nowPos] = 'Q';
					}
					signStack.pop();
				} else {
					console.error("“}”关闭失败");
					throw EvalError("解析失败");
				}
				break;
			case ')':
				if (signStack.top() === "(") {
					// 结束
					if (signStack.length > layer) {
						jsArr[nowPos] = 'Q';
					}
					signStack.pop();
				} else {
					console.error("“)”关闭失败");
					throw EvalError("解析失败");
				}
				break;
			default:
				if (signStack.length > layer - 1) {
					jsArr[nowPos] = 'Q';
				}
				break;
		}
	}
	return jsArr.join("");
}
function escapeEvalStr(str) {
	return "'" + JSON.stringify(str).slice(1, -1).replace(/'/g, "\\'").replace(/\\"/g, '"') + "'";
}
function getQuoteEndPos(jsStr, startPos) {
	if (startPos === undefined) {
		startPos = 0;
	}
	jsStr = transStr(jsStr);

	let signStack = [], jsArr = jsStr.split("");
	for (let nowPos = startPos; nowPos < jsArr.length; nowPos++) {
		switch (jsArr[nowPos]) {
			case '[':
			case '{':
			case '(':
				// 开始
				signStack.push(jsArr[nowPos]);
				break;
			case ']':
				if (signStack.top() === "[") {
					// 结束
					signStack.pop();
				} else {
					console.error("“]”关闭失败");
					throw EvalError("解析失败");
				}
				break;
			case '}':
				if (signStack.top() === "{") {
					// 结束
					signStack.pop();
				} else {
					console.error("“}”关闭失败");
					throw EvalError("解析失败");
				}
				break;
			case ')':
				if (signStack.top() === "(") {
					// 结束
					signStack.pop();
				} else {
					console.error("“)”关闭失败");
					throw EvalError("解析失败");
				}
				break;
			default:
				break;
		}
		if (signStack.length === 0) {
			return nowPos;
		}
	}
	throw Error("未知错误");
}
function splitStatements(jsStr) {
	let transLayerRes = transLayer(jsStr), splitJsArr = [];
	let startPos = 0, endPos = undefined;
	while ((endPos = transLayerRes.indexOf(";", startPos)) !== -1) {
		splitJsArr.push(jsStr.slice(startPos, endPos + 1));
		startPos = endPos + 1;
	}
	if (startPos < jsStr.length) {
		splitJsArr.push(jsStr.slice(startPos));
	}
	return splitJsArr;
}
/* 虚拟机执行工具 */
let globalContext = vm.createContext();
function virtualEval(jsStr) {
	return virtualGlobalEval(jsStr);
}
function virtualGlobalEval(jsStr) {
	return vm.runInContext(jsStr, globalContext);
}

const START_TIME = new Date().getTime();

showMsgProgress("解除全局加密");
// 如果是对象，则返回空数组
function decryptGlobalJs(js) {
	let transStrRes = transStr(js);

	let boolMarkPos = Number.POSITIVE_INFINITY;
	while ((boolMarkPos === Number.POSITIVE_INFINITY || boolMarkPos - 1 >= 0) && (boolMarkPos = transStrRes.lastIndexOf("![]", boolMarkPos - 1)) !== -1) {
		if (transStrRes[boolMarkPos - 1] === "!") {
			js = js.replaceWithStr(boolMarkPos - 1, boolMarkPos + 3, ((transStrRes[boolMarkPos - 2].match(/[{}\[\]().,+\-*\/~!%<>=&|^?:; @]/) ? "" : " ")) + "true");
		} else {
			js = js.replaceWithStr(boolMarkPos, boolMarkPos + 3, ((transStrRes[boolMarkPos - 1].match(/[{}\[\]().,+\-*\/~!%<>=&|^?:; @]/) ? "" : " ")) + "false");
		}
	}

	let jsArr = splitStatements(js);

	for (let i = 0; i < 3; i++) {
		virtualGlobalEval(jsArr[i]);
	}

	let decryptor = jsArr[2];
	let decryptorName = decryptor.slice(decryptor.indexOf("function") + 9, decryptor.indexOf("(")) || decryptor.slice(decryptor.indexOf("var ") + 4, decryptor.indexOf("=function("));

	return jsArr.slice(3, -1).map(function (funcJs) {
		transStrRes = transStr(funcJs);

		let decryptorPos = Number.POSITIVE_INFINITY;
		while ((decryptorPos === Number.POSITIVE_INFINITY || decryptorPos - 1 >= 0) && (decryptorPos = transStrRes.lastIndexOf(decryptorName, decryptorPos - 1)) !== -1) {
			let endPos = transStrRes.indexOf(")", decryptorPos);
			funcJs = funcJs.replaceWithStr(decryptorPos, endPos + 1, escapeEvalStr(virtualEval(funcJs.slice(decryptorPos, endPos + 1))));
		}

		return funcJs;
	});
}
let js = fs.readFileSync(FILE_NAME).toString();
jsStatementsArr = decryptGlobalJs(js);
fs.writeFileSync("DecryptResult1.js", jsStatementsArr.join("\n"));

showMsgProgress("解除代码块加密");
// 有则输出名字，无则输出false
function getFuncDecryptorName(jsStr) {
	// jsStr为空或不是以var 开头
	if (!jsStr || jsStr.slice(0, 4) !== "var ") {
		// console.log("初步检查不通过:", jsStr);
		return false;
	}

	let transStrRes = transLayer(jsStr, 2);
	let checkRes = transStrRes.slice(transStrRes.indexOf("{") + 1, transStrRes.lastIndexOf("}")).split(",").every(function (objectItem) {
		let checkRes;
		if ((checkRes = objectItem.match(/'(S)*':('(S)*'|function\((Q)*\){(Q)*})/))) {
			return checkRes[0] === objectItem;
		}
	});
	if (checkRes) {
		// console.log("检查通过:", jsStr.slice(0, 100));
		return transStrRes.slice(4, transStrRes.indexOf("="));
	} else {
		// console.warn("非加密对象:", jsStr);
		return false;
	}
}
// 替换掉代码块中所有用加密对象加密过的东西
function replaceObjFunc(callFunc, callStr) {
	// console.log("*", callStr);
	let funcStr = callFunc.toString(), transFuncStr = transStr(funcStr);
	let funcParams = funcStr.slice(transFuncStr.indexOf("(") + 1, transFuncStr.indexOf(")")).splitByOtherStr(transFuncStr.slice(transFuncStr.indexOf("(") + 1, transFuncStr.indexOf(")")), ",");

	let transCallLayer = transLayer(callStr), transCallLayer2 = transLayer(callStr, 2);
	// console.log("# callStr:", callStr, "\n- transCallLayer:", transCallLayer, "\n- transCallLayer2:", transCallLayer2);
	let callParamsStr = callStr.slice(transCallLayer.indexOf("(") + 1, transCallLayer.indexOf(")"));
	let callParams = callParamsStr.splitByOtherStr(transCallLayer2.slice(transCallLayer.indexOf("(") + 1, transCallLayer.indexOf(")")), ",");
	if (funcParams.length === callParams.length) {
		// console.log(funcParams, callParams);
	} else {
		console.error("×", funcParams, callParams);
	}

	let funcResStr = funcStr.slice(transFuncStr.indexOf("{return ") + 8, transFuncStr.lastIndexOf(";}"));
	funcParams.forEach(function (param, index) {
		funcResStr = funcResStr.replace(param, callParams[index]);
	});

	// console.log(funcStr, funcResStr, "\n");
	return funcResStr;
}
function findAndDecryptCodeBlock(jsArr, isShowProgress) {
	return jsArr.map(function (jsStr, progress) {
		let transLayerRes = transLayer(jsStr);
		let startPos = Number.POSITIVE_INFINITY;
		while ((startPos === Number.POSITIVE_INFINITY || startPos - 1 >= 0) && (startPos = Math.max(
			transLayerRes.lastIndexOf("{", startPos - 1),
			transLayerRes.lastIndexOf("(", startPos - 1),
			transLayerRes.lastIndexOf("[", startPos - 1)
		)) !== -1) {
			let endPos = getQuoteEndPos(jsStr, startPos);
			if (jsStr[startPos] === "{") {
				let splitStatementsRes = splitStatements(jsStr.slice(startPos + 1, endPos));
				if (splitStatementsRes.length) {
					jsStr = jsStr.replaceWithStr(startPos + 1, endPos, decryptCodeBlockArr(splitStatementsRes).join(""));
				}
			} else {
				jsStr = jsStr.replaceWithStr(startPos + 1, endPos, findAndDecryptCodeBlock([jsStr.slice(startPos + 1, endPos)]).join(""));
			}
		}
		if (isShowProgress) {
			showNumProgress("解除代码块加密", progress + 1, jsArr.length);
		}
		return jsStr;
	});
}
function decryptCodeBlockArr(jsArr, isShowProgress) {
	if (isShowProgress) {
		showNumProgress("解除代码块加密", 0, jsArr.length);
	}
	let decryptorObjName = getFuncDecryptorName(jsArr[0]);
	// 代码块解密
	if (decryptorObjName) {
		virtualGlobalEval(jsArr[0]);

		let transStrRes;

		jsArr = jsArr.slice(1).map(function (jsStr) {
			transStrRes = transStr(jsStr);

			let decryptorPos = Number.POSITIVE_INFINITY;
			while ((decryptorPos === Number.POSITIVE_INFINITY || decryptorPos - 1 >= 0) && (decryptorPos = transStrRes.lastIndexOf(decryptorObjName, decryptorPos - 1)) !== -1) {
				let leftSquarePos = transStrRes.indexOf("[", decryptorPos),
					rightSquarePos = transStrRes.indexOf("]", decryptorPos);

				switch (virtualEval("typeof " + decryptorObjName + jsStr.slice(leftSquarePos, rightSquarePos + 1))) {
					case "string": {
						jsStr = jsStr.replaceWithStr(decryptorPos, rightSquarePos + 1, escapeEvalStr(virtualEval(decryptorObjName + jsStr.slice(leftSquarePos, rightSquarePos + 1))));
						break;
					}
					case "function": {
						let transLayerRes = transStr(jsStr);
						let rightRoundPos = getQuoteEndPos(transLayerRes, rightSquarePos + 1);
						jsStr = jsStr.replaceWithStr(decryptorPos, rightRoundPos + 1, replaceObjFunc(virtualEval(decryptorObjName + jsStr.slice(leftSquarePos, rightSquarePos + 1)), jsStr.slice(decryptorPos, rightRoundPos + 1)));
						break;
					}
				}
			}
			return jsStr;
		});
	}
	return findAndDecryptCodeBlock(jsArr, isShowProgress);
}
jsStatementsArr = decryptCodeBlockArr(jsStatementsArr, true);
fs.writeFileSync("DecryptResult2.js", jsStatementsArr.join("\n"));

showMsgProgress("清理死代码（花指令）");
function simplifyIf(ifJsStr) {
	let ifRes = eval(ifJsStr.slice(2, 21));
	let elsePos = getQuoteEndPos(ifJsStr, 21) + 1, endPos = getQuoteEndPos(ifJsStr, elsePos + 4);

	if (ifRes) {
		return ifJsStr.slice(22, elsePos - 1);
	} else {
		return ifJsStr.slice(elsePos + 5, endPos);
	}
}
function findAndClearDeadCodes(jsArr, isShowProgress) {
	return jsArr.map(function (jsStr, progress) {
		let transLayerRes = transLayer(jsStr);
		let startPos = Number.POSITIVE_INFINITY;
		while ((startPos === Number.POSITIVE_INFINITY || startPos - 1 >= 0) && (startPos = Math.max(
			transLayerRes.lastIndexOf("{", startPos - 1),
			transLayerRes.lastIndexOf("(", startPos - 1),
			transLayerRes.lastIndexOf("[", startPos - 1)
		)) !== -1) {
			let endPos = getQuoteEndPos(jsStr, startPos);
			if (jsStr[startPos] === "{") {
				let endPos = getQuoteEndPos(jsStr, startPos);
				let splitStatementsRes = splitStatements(jsStr.slice(startPos + 1, endPos));
				if (splitStatementsRes.length) {
					jsStr = jsStr.replaceWithStr(startPos + 1, endPos, clearDeadCodes(splitStatementsRes).join(""));
				}
			} else {
				jsStr = jsStr.replaceWithStr(startPos + 1, endPos, findAndClearDeadCodes([jsStr.slice(startPos + 1, endPos)]).join(""));
			}
		}
		if (isShowProgress) {
			showNumProgress("清理死代码（花指令）", progress + 1, jsArr.length);
		}
		return jsStr;
	});
}
function clearDeadCodes(jsArr, isShowProgress) {
	if (isShowProgress) {
		showNumProgress("清理死代码（花指令）", 0, jsArr.length);
	}
	if (jsArr.length === 1) {
		// if死代码
		let transStrRes = transStr(jsArr[0]), transLayerRes = transLayer(jsArr[0]);
		if (transStrRes.search(/if\('([a-zA-Z]){5}'([=!])?=='([a-zA-Z]){5}'\)/) === 0) {
			let transFakeIfStr = transLayerRes.match(/if\((Q){17}\){(Q)*}else{(Q)*}/)[0];
			return clearDeadCodes(splitStatements(simplifyIf(jsArr[0].slice(0, transFakeIfStr.length))));
		}
	} else if (jsArr.length === 2) {
		// switch死代码
		if (
			jsArr[0].search(/var (\S*?)='[0-9|]*?'\['split']\('\|'\),(\S*?)=0x0;/) === 0 &&
			jsArr[1].search(/while\(true\){switch\((\S*?)\[(\S*?)\+\+]\)/) === 0
		) {
			let initMatch = jsArr[0].match(/var (\S*?)='[0-9|]*?'\['split']\('\|'\),(\S*?)=0x0;/),
				whileMatch = jsArr[1].match(/while\(true\){switch\((\S*?)\[(\S*?)\+\+]\)/);
			let sequence;
			if ((
				initMatch && initMatch.length === 3 &&
				whileMatch && whileMatch.length === 3
			) && (
				(sequence = initMatch[1]) === whileMatch[1] &&
				initMatch[2] === whileMatch[2]
			)) {
				virtualEval(jsArr[0]);
				let sequenceList = virtualEval(sequence);
				let caseBlock = jsArr[1].slice(whileMatch[0].length + 1, getQuoteEndPos(jsArr[1], whileMatch[0].length));
				let transCaseBlock = transLayer(caseBlock);
				let caseList = [];
				let caseRegexp = /case'S*'/g;

				sequenceList.forEach(function () {
					let regRes = caseRegexp.exec(transCaseBlock);
					let startPos = regRes.index + regRes[0].length + 1,
						endPos = (() => {
							let casePos = transCaseBlock.indexOf("case'", startPos + 1);
							let continuePos = transCaseBlock.indexOf("continue;", startPos + 1);
							if (casePos === -1) {
								casePos = Number.POSITIVE_INFINITY;
							}
							if (continuePos === -1) {
								continuePos = Number.POSITIVE_INFINITY;
							}
							let res = Math.min(casePos, continuePos);
							if (res !== Number.POSITIVE_INFINITY) {
								return res;
							} else {
								throw Error("意料之外的switch...case死代码");
							}
						})();
					caseList.push(caseBlock.slice(startPos, endPos).replace("continue;", ""));
				});

				return clearDeadCodes(sequenceList.map(function (index) {
					return caseList[index];
				}));
			}
		}
	}
	return findAndClearDeadCodes(jsArr, isShowProgress);
}
jsStatementsArr = clearDeadCodes(jsStatementsArr, true);
fs.writeFileSync("DecryptResult3.js", jsStatementsArr.join("\n"));

showMsgProgress("提升代码可读性");
function decryptFormat(globalJsArr) {
	return globalJsArr.map(function (statement) {
		let transStrRes = transStr(statement);
		let hexNumberPos = Number.POSITIVE_INFINITY;
		while ((hexNumberPos = transStrRes.lastSearchOf(/0x([0-9a-fA-F])*/, hexNumberPos - 1)) !== -1) {
			let activeNumStr = transStrRes.slice(hexNumberPos).match(/0x([0-9a-fA-F])*/)[0];
			let checkNumberRegexp = /[{}\[\]().,+\-*\/~!%<>=&|^?:; ]/;
			if (
				transStrRes[hexNumberPos - 1].match(checkNumberRegexp) != null &&
				transStrRes[hexNumberPos + activeNumStr.length].match(checkNumberRegexp) != null
			) {
				// console.log("√", hexNumberPos, activeNumStr);
				statement = statement.replaceWithStr(hexNumberPos, hexNumberPos + activeNumStr.length, parseInt(activeNumStr, 16));
			} else {
				// console.log("×", hexNumberPos, activeNumStr, "[", transStrRes[hexNumberPos - 1], ",", transStrRes[hexNumberPos + activeNumStr.length], "]");
			}
		}

		transStrRes = transStr(statement);
		let objIndexerPos = Number.POSITIVE_INFINITY;
		while ((objIndexerPos = transStrRes.lastSearchOf(/\['(S)*.']/, objIndexerPos - 1)) !== -1) {
			let activeIndexerStr = transStrRes.slice(objIndexerPos).match(/\['(S)*.']/)[0];
			let leftSplitter, rightSplitter;

			if (statement.slice(objIndexerPos + 2, objIndexerPos + activeIndexerStr.length - 2).match(/[{}\[\]().,+\-*\/~!%<>=&|^?:; @]/)) {
				// 包含特殊符号，不转换
			} else {
				if (transStrRes[objIndexerPos + activeIndexerStr.length].match(/[^{}\[\]().,+\-*\/~!%<>=&|^?:; ]/) != null) {
					// console.log("√ R", objIndexerPos, activeIndexerStr);
					rightSplitter = ".";
				} else {
					// console.log("× R", objIndexerPos, activeIndexerStr, "[", transStrRes[objIndexerPos - 1], ",", transStrRes[objIndexerPos + activeIndexerStr.length], "]");
					rightSplitter = "";
				}
				statement = statement.replaceWithStr(objIndexerPos + activeIndexerStr.length - 2, objIndexerPos + activeIndexerStr.length, rightSplitter);
				transStrRes = transStrRes.replaceWithStr(objIndexerPos + activeIndexerStr.length - 2, objIndexerPos + activeIndexerStr.length, rightSplitter);

				if (transStrRes[objIndexerPos - 1] === "/") {
					let lastRegExpPos = transStrRes.lastSearchOf(/\/(S)*\//, objIndexerPos);
					if (lastRegExpPos === -1) {
						leftSplitter = "";
						// console.log("× E", objIndexerPos, activeIndexerStr);
					} else {
						let activeRegExpStr = transStrRes.slice(lastRegExpPos).match(/\/(S)*\//)[0];
						if (lastRegExpPos + activeRegExpStr.length === objIndexerPos) {
							leftSplitter = ".";
							// console.log("√ E", objIndexerPos, activeIndexerStr);
						} else {
							leftSplitter = "";
							// console.log("× E", objIndexerPos, activeIndexerStr);
						}
					}
				} else if (transStrRes[objIndexerPos - 1].match(/[^{\[(.,+\-*~!%<>=&|^?:; ]/) != null) {
					// console.log("√ L", objIndexerPos, activeIndexerStr);
					leftSplitter = ".";
				} else {
					// console.log("× L", objIndexerPos, activeIndexerStr, "[", transStrRes[objIndexerPos - 1], ",", transStrRes[objIndexerPos + activeIndexerStr.length], "]");
					leftSplitter = "";
				}
				statement = statement.replaceWithStr(objIndexerPos, objIndexerPos + 2, leftSplitter);
				transStrRes = transStrRes.replaceWithStr(objIndexerPos, objIndexerPos + 2, leftSplitter);
			}
		}

		return statement;
	});
}
jsStatementsArr = decryptFormat(jsStatementsArr);
fs.writeFileSync("DecryptResult4.js", jsStatementsArr.join("\n"));

const END_TIME = new Date().getTime();

console.clear();
console.info(`* 解密完成！
* 耗时：${END_TIME - START_TIME}ms`);