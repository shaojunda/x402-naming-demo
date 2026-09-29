// 规则起名：根据出生季节和性别，从字库中确定性地组合出名字。
// 同样的输入永远得到同样的结果，不依赖任何外部服务。

// 第一个字：取自出生季节的意象
const SEASON_CHARS = {
  spring: {
    label: "春",
    female: [["芷", "白芷，香草，喻品行高洁"], ["萱", "萱草，寓意无忧"], ["若", "杜若，香草，清雅脱俗"], ["晴", "春日晴朗，心境明亮"], ["芸", "芸香，书香气质"]],
    male: [["青", "春日青翠，生机勃勃"], ["楷", "楷树挺拔，为人楷模"], ["晨", "清晨朝气，前程光明"], ["朗", "天气朗润，性情开朗"], ["柏", "松柏常青，坚韧不拔"]],
  },
  summer: {
    label: "夏",
    female: [["荷", "夏荷出水，清雅纯净"], ["茉", "茉莉芬芳，温婉可人"], ["晗", "天将明时，充满希望"], ["瑶", "美玉，珍贵美好"], ["曦", "晨光熹微，温暖明亮"]],
    male: [["昊", "夏日长空，心胸广阔"], ["烨", "火光明盛，才华出众"], ["晟", "光明兴盛，事业昌隆"], ["航", "扬帆远航，志在四方"], ["骁", "骁勇矫健，意气风发"]],
  },
  autumn: {
    label: "秋",
    female: [["桂", "秋桂飘香，蟾宫折桂"], ["岚", "山间岚气，灵秀飘逸"], ["月", "秋月皎洁，温柔明净"], ["锦", "秋色如锦，前程似锦"], ["语", "秋语温柔，善于表达"]],
    male: [["枫", "秋枫似火，热忱坚定"], ["岳", "山岳巍峨，稳重可靠"], ["铭", "铭记于心，重情重义"], ["谦", "谦逊有礼，虚怀若谷"], ["景", "秋景开阔，眼界高远"]],
  },
  winter: {
    label: "冬",
    female: [["雪", "瑞雪纯洁，冰清玉洁"], ["梅", "寒梅傲雪，坚韧美丽"], ["素", "素雅纯净，淡泊宁静"], ["清", "清澈明净，心地纯良"], ["凝", "凝神专注，沉静聪慧"]],
    male: [["松", "青松傲雪，坚贞不屈"], ["凛", "凛然正气，光明磊落"], ["泽", "恩泽广被，仁厚宽和"], ["瀚", "浩瀚如海，学识渊博"], ["砚", "笔墨砚台，文采斐然"]],
  },
};

// 第二个字：寄托品格与祝愿
const VIRTUE_CHARS = {
  female: [["妍", "美丽聪慧"], ["怡", "心情愉悦"], ["宁", "平安宁静"], ["然", "自然天成"], ["悦", "喜悦快乐"], ["婷", "亭亭玉立"], ["安", "平安顺遂"], ["思", "善于思考"], ["馨", "温馨芬芳"], ["心", "心地善良"]],
  male: [["轩", "气宇轩昂"], ["宇", "胸怀宇宙"], ["睿", "睿智通达"], ["远", "志向远大"], ["哲", "明理有智慧"], ["辰", "如星辰闪耀"], ["诚", "诚实守信"], ["霖", "甘霖润物，惠及他人"], ["安", "平安顺遂"], ["然", "自然洒脱"]],
};

function seasonOf(month) {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

// FNV-1a 哈希，用于把输入稳定地映射到字库下标
function hash(text) {
  let h = 0x811c9dc5;
  for (const ch of text) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

export class InputError extends Error {}

export function validateInput(input) {
  if (!input || typeof input !== "object") throw new InputError("请求体必须是 JSON 对象");
  const { birth_date, gender, surname } = input;

  if (typeof birth_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(birth_date)) {
    throw new InputError("birth_date 格式应为 YYYY-MM-DD");
  }
  const date = new Date(`${birth_date}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== birth_date) {
    throw new InputError("birth_date 不是有效日期");
  }
  if (date.getUTCFullYear() < 1900 || date.getTime() > Date.now() + 366 * 86400000) {
    throw new InputError("birth_date 超出支持范围（1900 年至明年）");
  }
  if (gender !== "male" && gender !== "female") throw new InputError("gender 只能是 male 或 female");
  if (surname !== undefined && (typeof surname !== "string" || !/^[一-龥]{1,2}$/.test(surname))) {
    throw new InputError("surname 应为 1 到 2 个汉字");
  }
  return { birth_date, gender, surname, month: date.getUTCMonth() + 1 };
}

export function generateName(input) {
  const { birth_date, gender, surname, month } = validateInput(input);
  const season = seasonOf(month);
  const firstPool = SEASON_CHARS[season][gender];
  const secondPool = VIRTUE_CHARS[gender];

  const h = hash(`${birth_date}|${gender}|${surname ?? ""}`);
  const [c1, m1] = firstPool[h % firstPool.length];
  let second = secondPool[Math.floor(h / firstPool.length) % secondPool.length];
  if (second[0] === c1) second = secondPool[(secondPool.indexOf(second) + 1) % secondPool.length];
  const [c2, m2] = second;

  const givenName = c1 + c2;
  return {
    name: (surname ?? "") + givenName,
    given_name: givenName,
    meaning: `生于${SEASON_CHARS[season].label}季。「${c1}」取${m1}；「${c2}」寓意${m2}。`,
    characters: [
      { char: c1, meaning: m1, source: `${SEASON_CHARS[season].label}季意象` },
      { char: c2, meaning: m2, source: "品格祝愿" },
    ],
    season,
    note: "基于出生季节和性别的规则生成，仅供娱乐参考。",
  };
}
