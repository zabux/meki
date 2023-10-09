const style = {
	a: "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘQʀꜱᴛᴜᴠᴡxʏᴢ",
	b: "αႦƈԃҽϝɠԋιʝƙʅɱɳσρϙɾʂƚυʋɯxყȥ",
	c: "𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻",
	d: "𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣",
	e: "𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳",
	f: "a̶ ̶b̶ ̶c̶ ̶d̶ ̶e̶ ̶f̶ ̶g̶ ̶h̶ ̶i̶ ̶j̶ ̶k̶ ̶l̶ ̶m̶ ̶n̶ ̶o̶ ̶p̶ ̶q̶ ̶r̶ ̶s̶ ̶t̶ ̶u̶ ̶v̶ ̶w̶ ̶x̶ ̶y̶ ̶z̶",
	g: "a̴ ̴b̴ ̴c̴ ̴d̴ ̴e̴ ̴f̴ ̴g̴ ̴h̴ ̴i̴ ̴j̴ ̴k̴ ̴l̴ ̴m̴ ̴n̴ ̴o̴ ̴p̴ ̴q̴ ̴r̴ ̴s̴ ̴t̴ ̴u̴ ̴v̴ ̴w̴ ̴x̴ ̴y̴ ̴z̴",
	h: "a̷ ̷b̷ ̷c̷ ̷d̷ ̷e̷ ̷f̷ ̷g̷ ̷h̷ ̷i̷ ̷j̷ ̷k̷ ̷l̷ ̷m̷ ̷n̷ ̷o̷ ̷p̷ ̷q̷ ̷r̷ ̷s̷ ̷t̷ ̷u̷ ̷v̷ ̷w̷ ̷x̷ ̷y̷ ̷z̷",
	i: "a̲ ̲b̲ ̲c̲ ̲d̲ ̲e̲ ̲f̲ ̲g̲ ̲h̲ ̲i̲ ̲j̲ ̲k̲ ̲l̲ ̲m̲ ̲n̲ ̲o̲ ̲p̲ ̲q̲ ̲r̲ ̲s̲ ̲t̲ ̲u̲ ̲v̲ ̲w̲ ̲x̲ ̲y̲ ̲z̲",
	g: "ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙ",
};
const str = [
	"a",
	"b",
	"c",
	"d",
	"e",
	"f",
	"g",
	"h",
	"i",
	"j",
	"k",
	"l",
	"m",
	"n",
	"o",
	"p",
	"q",
	"r",
	"s",
	"t",
	"u",
	"v",
	"w",
	"x",
	"y",
	"z",
];
function generate(text, name) {
	if (!style[name]) {
		const keys = Object.keys(style);
		name = keys[Math.floor(Math.random() * keys.length)];
	}
	const _style = style[name]
		.split("")
		.map((v) => v.trim())
		.join("")
		.split("");
	let objStyle = {};
	str.forEach((key, i) => {
		objStyle[key] = _style[i];
	});
	const tempText = text.toLowerCase().split("");
	let genText = "";
	tempText.forEach((key) => {
		if (objStyle[key]) {
			genText += objStyle[key];
		} else {
			genText += key;
		}
	});
	return genText;
}
module.exports = {
	font: generate,
	style: Object.keys(style),
};

const chalk = require("chalk");
const fs = require("fs");
let file = require.resolve(__filename);
fs.watchFile(file, () => {
	fs.unwatchFile(file);
	console.log(chalk.green("[UPDATED]", chalk.white(__filename)));
	delete require.cache[file];
	require(file);
});
