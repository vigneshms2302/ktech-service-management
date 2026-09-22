/**
 * K-Connect Real-Time Auto-Correction & Levenshtein Spell Engine
 * Automatically corrects typos in real-time as the user types (on Spacebar/Enter)
 * and on blur across all inputs, modals, and workspaces.
 */

// 1. BRAND DICTIONARY & COMMON TYPOS
export const BRAND_CORRECTIONS: Record<string, string> = {
  // Major PC & Laptop Brands
  'dell': 'Dell',
  'del': 'Dell',
  'dlel': 'Dell',
  'deel': 'Dell',
  'hp': 'HP',
  'hewlett': 'HP',
  'hewlettpackard': 'HP',
  'hewlett packard': 'HP',
  'lenovo': 'Lenovo',
  'lenvo': 'Lenovo',
  'lenov': 'Lenovo',
  'linovo': 'Lenovo',
  'lenova': 'Lenovo',
  'lnovo': 'Lenovo',
  'asus': 'Asus',
  'asuss': 'Asus',
  'asuz': 'Asus',
  'asux': 'Asus',
  'acer': 'Acer',
  'acrr': 'Acer',
  'acerr': 'Acer',
  'apple': 'Apple',
  'appel': 'Apple',
  'aple': 'Apple',
  'aplle': 'Apple',
  'mac': 'Apple',
  'macbook': 'Apple MacBook',
  'samsung': 'Samsung',
  'samsng': 'Samsung',
  'sumsung': 'Samsung',
  'samsumg': 'Samsung',
  'sansung': 'Samsung',
  'msi': 'MSI',
  'msii': 'MSI',
  'toshiba': 'Toshiba',
  'tosiba': 'Toshiba',
  'sony': 'Sony',
  'soni': 'Sony',
  'vaio': 'Sony Vaio',
  'lg': 'LG',
  'fujitsu': 'Fujitsu',
  'panasonic': 'Panasonic',
  'alienware': 'Alienware',

  // Mobile & Tablet Brands
  'oneplus': 'OnePlus',
  '1plus': 'OnePlus',
  'one plus': 'OnePlus',
  'xiaomi': 'Xiaomi',
  'redmi': 'Xiaomi Redmi',
  'xiomi': 'Xiaomi',
  'mi': 'Xiaomi',
  'realme': 'Realme',
  'relame': 'Realme',
  'relme': 'Realme',
  'vivo': 'Vivo',
  'vivi': 'Vivo',
  'oppo': 'Oppo',
  'opo': 'Oppo',
  'pixel': 'Google Pixel',
  'google pixel': 'Google Pixel',
  'motorola': 'Motorola',
  'moto': 'Motorola',
  'nokia': 'Nokia',
  'nothing': 'Nothing',
  'iqoo': 'iQOO',
  'honor': 'Honor',
  'infinix': 'Infinix',
  'techno': 'Tecno',
  'tecno': 'Tecno',
  'poco': 'Poco',

  // Peripherals & Hardware Components
  'epson': 'Epson',
  'epzon': 'Epson',
  'canon': 'Canon',
  'cannon': 'Canon',
  'brother': 'Brother',
  'brothr': 'Brother',
  'logitech': 'Logitech',
  'logitec': 'Logitech',
  'zebronics': 'Zebronics',
  'zeb': 'Zebronics',
  'fingers': 'Fingers',
  'razer': 'Razer',
  'corsair': 'Corsair',
  'corser': 'Corsair',
  'kingston': 'Kingston',
  'kingstone': 'Kingston',
  'crucial': 'Crucial',
  'crusial': 'Crucial',
  'gigabyte': 'Gigabyte',
  'gigabite': 'Gigabyte',
  'giga byte': 'Gigabyte',
  'seagate': 'Seagate',
  'segate': 'Seagate',
  'western digital': 'Western Digital',
  'westerndigital': 'Western Digital',
  'wd': 'Western Digital',
  'sandisk': 'SanDisk',
  'transcend': 'Transcend',
  'tplink': 'TP-Link',
  'tp-link': 'TP-Link',
  'tp link': 'TP-Link',
  'dlink': 'D-Link',
  'd-link': 'D-Link',
  'netgear': 'Netgear',
  'antesports': 'Ant Esports',
  'ant esports': 'Ant Esports',
  'deepcool': 'Deepcool',
  'circle': 'Circle',
  'intel': 'Intel',
  'intle': 'Intel',
  'amd': 'AMD',
  'nvidia': 'NVIDIA',
  'nvidea': 'NVIDIA',
  'nividia': 'NVIDIA',
  'nvda': 'NVIDIA',
};

// 2. MODEL SERIES CANONICAL PATTERNS
export const MODEL_SERIES_CORRECTIONS: Record<string, string> = {
  'thinkpad': 'ThinkPad',
  'ideapad': 'IdeaPad',
  'legion': 'Legion',
  'yoga': 'Yoga',
  'loq': 'LOQ',
  'inspiron': 'Inspiron',
  'latitude': 'Latitude',
  'vostro': 'Vostro',
  'optiplex': 'OptiPlex',
  'precision': 'Precision',
  'xps': 'XPS',
  'pavilion': 'Pavilion',
  'probook': 'ProBook',
  'elitebook': 'EliteBook',
  'envy': 'Envy',
  'omen': 'Omen',
  'victus': 'Victus',
  'spectre': 'Spectre',
  'zenbook': 'ZenBook',
  'vivobook': 'VivoBook',
  'rog': 'ROG',
  'tuf': 'TUF',
  'expertbook': 'ExpertBook',
  'zephyrus': 'Zephyrus',
  'strix': 'Strix',
  'predator': 'Predator',
  'nitro': 'Nitro',
  'aspire': 'Aspire',
  'swift': 'Swift',
  'macbook': 'MacBook',
  'macbok': 'MacBook',
  'macbook air': 'MacBook Air',
  'macbook pro': 'MacBook Pro',
  'imac': 'iMac',
  'mac mini': 'Mac mini',
  'mac studio': 'Mac Studio',
  'ipad': 'iPad',
  'iphone': 'iPhone',
  'airpods': 'AirPods',
  'surface pro': 'Surface Pro',
  'surface laptop': 'Surface Laptop',
  'surface book': 'Surface Book',
  'surface go': 'Surface Go',
  'galaxy': 'Galaxy',
};

// 3. COMMON GENERAL & TECHNICAL TYPOS MAP
export const WORD_TYPO_MAP: Record<string, string> = {
  // English common typos
  'teh': 'the',
  'adn': 'and',
  'wit': 'with',
  'wiht': 'with',
  'wihout': 'without',
  'becuse': 'because',
  'becasue': 'because',
  'untill': 'until',
  'alot': 'a lot',
  'thier': 'their',
  'wich': 'which',
  'whcih': 'which',
  'dosent': 'does not',
  'dont': "don't",
  'cant': "can't",
  'wont': "won't",
  'didnt': "didn't",

  // IT & Computer Hardware typos
  'lapop': 'laptop',
  'laptp': 'laptop',
  'lptop': 'laptop',
  'loptop': 'laptop',
  'desktp': 'desktop',
  'deskto': 'desktop',
  'computr': 'computer',
  'comptr': 'computer',
  'computre': 'computer',
  'mothebord': 'motherboard',
  'motherbord': 'motherboard',
  'mothrboard': 'motherboard',
  'mothrbrd': 'motherboard',
  'mboard': 'motherboard',
  'mobo': 'motherboard',
  'chargr': 'charger',
  'chrg': 'charger',
  'chgr': 'charger',
  'adpter': 'adapter',
  'adptor': 'adapter',
  'adaptor': 'adapter',
  'dispaly': 'display',
  'disply': 'display',
  'dsplay': 'display',
  'scren': 'screen',
  'scrn': 'screen',
  'scrren': 'screen',
  'keybord': 'keyboard',
  'kybrd': 'keyboard',
  'kyboard': 'keyboard',
  'moues': 'mouse',
  'muose': 'mouse',
  'monitr': 'monitor',
  'montor': 'monitor',
  'moniter': 'monitor',
  'batry': 'battery',
  'battry': 'battery',
  'batterry': 'battery',
  'batery': 'battery',
  'powr': 'power',
  'powre': 'power',
  'pwer': 'power',
  'cabel': 'cable',
  'cbl': 'cable',
  'spekr': 'speaker',
  'speeker': 'speaker',
  'spkr': 'speaker',
  'procesor': 'processor',
  'proccesor': 'processor',
  'prossesor': 'processor',
  'softwear': 'software',
  'softwar': 'software',
  'hardwear': 'hardware',
  'hardwar': 'hardware',
  'windos': 'Windows',
  'windws': 'Windows',
  'wndws': 'Windows',
  'pendriv': 'pen drive',
  'pendrive': 'pen drive',
  'cabnet': 'cabinet',
  'cabint': 'cabinet',
  'graphic': 'graphics',
  'grafic': 'graphics',
  'grafics': 'graphics',
  'conector': 'connector',
  'conecter': 'connector',
  'senser': 'sensor',
  'internel': 'internal',
  'externel': 'external',

  // Service, Repair & Business terms
  'custmer': 'customer',
  'custome': 'customer',
  'custmr': 'customer',
  'invoce': 'invoice',
  'invce': 'invoice',
  'quotetion': 'quotation',
  'quotaton': 'quotation',
  'quotion': 'quotation',
  'paymnt': 'payment',
  'paymet': 'payment',
  'paymnet': 'payment',
  'recieve': 'receive',
  'recieved': 'received',
  'reciept': 'receipt',
  'recpt': 'receipt',
  'recipt': 'receipt',
  'waranty': 'warranty',
  'warenty': 'warranty',
  'wrnty': 'warranty',
  'serice': 'service',
  'srvice': 'service',
  'srevice': 'service',
  'servis': 'service',
  'rpair': 'repair',
  'repar': 'repair',
  'repaire': 'repair',
  'repir': 'repair',
  'replacd': 'replaced',
  'replac': 'replace',
  'replece': 'replace',
  'diagns': 'diagnosis',
  'diagnos': 'diagnosis',
  'diagno': 'diagnosis',
  'cleand': 'cleaned',
  'upgrd': 'upgrade',
  'upgarde': 'upgrade',
  'passowrd': 'password',
  'pasword': 'password',
  'passwrd': 'password',
  'psswrd': 'password',
  'recomended': 'recommended',
  'sucessful': 'successful',
  'succesful': 'successful',
  'instaled': 'installed',
  'instal': 'install',
  'damge': 'damage',
  'damg': 'damage',
  'dammage': 'damage',
  'damged': 'damaged',
  'corupt': 'corrupt',
  'corrpt': 'corrupt',
  'overhet': 'overheat',
  'overheting': 'overheating',
  'ovrheat': 'overheat',
  'slw': 'slow',
  'freez': 'freeze',
  'freezg': 'freezing',
  'freze': 'freeze',
  'frezing': 'freezing',
  'problm': 'problem',
  'probem': 'problem',
  'prblm': 'problem',
  'prblem': 'problem',
  'issu': 'issue',
  'isue': 'issue',
  'issuse': 'issue',
  'wrking': 'working',
  'workng': 'working',
  'bluscreen': 'blue screen',
  'bluescren': 'blue screen',
  'watr': 'water',
  'sys': 'system',
  'sytem': 'system',
};

import {
  GLOBAL_VOCABULARY_LIST,
  GLOBAL_VOCABULARY_SET,
  VOCABULARY_BY_LENGTH,
  ENTITY_PROPER_CASE_MAP,
} from './globalDictionary.ts';

// 4. STANDARD VOCABULARY DICTIONARY FOR LEVENSHTEIN FUZZY MATCHING
export const VOCABULARY_DICTIONARY: string[] = [
  ...GLOBAL_VOCABULARY_LIST,
  'laptop', 'desktop', 'computer', 'monitor', 'keyboard', 'mouse', 'screen',
  'display', 'adapter', 'charger', 'motherboard', 'processor', 'memory',
  'battery', 'speaker', 'cabinet', 'printer', 'scanner', 'camera', 'headphone',
  'microphone', 'cable', 'cables', 'graphics', 'service', 'repair', 'replace',
  'upgrade', 'install', 'windows', 'driver', 'system', 'power', 'supply',
  'socket', 'hinge', 'damage', 'scratch', 'problem', 'issue', 'customer',
  'invoice', 'quotation', 'warranty', 'payment', 'receipt', 'testing',
  'delivered', 'received', 'approved', 'pending', 'completed', 'cancelled',
  'critical', 'urgent', 'normal', 'general', 'internal', 'external',
  'original', 'compatible', 'refurbished', 'salvage', 'device', 'equipment',
  'hardware', 'software', 'network', 'bluetooth', 'wireless', 'ethernet',
  'internet', 'storage', 'backup', 'recovery', 'format', 'corrupt', 'freeze',
  'restart', 'shutdown', 'overheating', 'cooling', 'cleaning', 'thermal',
  'paste', 'voltage', 'short', 'ground', 'signal', 'sensor', 'connector',
  'switch', 'button', 'panel', 'chassis', 'touchpad', 'trackpad', 'webcam',
  'sound', 'audio', 'video', 'board', 'chip', 'component', 'resistor',
  'capacitor', 'diode', 'mosfet', 'controller', 'firmware', 'bios',
  'diagnose', 'diagnostic', 'inspection', 'estimate', 'solution', 'status',
  'contact', 'mobile', 'phone', 'address', 'amount', 'balance', 'discount',
  'tax', 'total', 'price', 'quantity', 'condition', 'working', 'broken',
  'dead', 'crack', 'cracked', 'liquid', 'water', 'spill', 'burnt', 'smell',
  'noise', 'slow', 'hanging', 'booting', 'failure', 'detected', 'access',
  'security', 'password', 'login', 'admin', 'technician', 'manager', 'owner',
  // Common inflections & verbs
  'replaced', 'replacing', 'replacement', 'replaces',
  'received', 'receiving', 'receipts',
  'delivered', 'delivering', 'delivery',
  'serviced', 'servicing', 'services',
  'repaired', 'repairing', 'repairs',
  'installed', 'installing', 'installation',
  'upgraded', 'upgrading', 'upgrades',
  'cleaned',
  'formatted', 'formatting',
  'connected', 'connecting', 'connectors',
  'detected', 'detecting',
  'flickering',
  'laptops', 'desktops', 'computers', 'monitors', 'keyboards', 'chargers', 'adapters', 'cables', 'screens', 'printers', 'batteries', 'speakers',
];

export const VOCABULARY_SET = new Set<string>([
  ...GLOBAL_VOCABULARY_LIST,
  ...VOCABULARY_DICTIONARY,
]);

// 5. COMMON SERVICE SYMPTOMS & FAULTS AUTOCORRECT
const SYMPTOM_PHRASE_CORRECTIONS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b(no\s*pow?er?|dead|not\s*turn?ing\s*on|not\s*pow?ering\s*on|0a)\b/gi, replacement: 'No Power (Dead)' },
  { pattern: /\b(no\s*dis?p?lay|blan?k\s*scree?n|black\s*scree?n|no\s*light\s*scree?n)\b/gi, replacement: 'No Display' },
  { pattern: /\b(bat+e?ry\s*drain|bat+e?ry\s*backup\s*less|bat+e?ry\s*issu?e|bat+ry)\b/gi, replacement: 'Battery Backup Issue' },
  { pattern: /\b(not\s*char?g?ing|charg?er\s*not\s*detec?t?ed|charg?ing\s*pin\s*loose|charg?ng\s*prob?l?em?)\b/gi, replacement: 'Charging Port / Not Charging' },
  { pattern: /\b(sl+ow(\s*sys?tem)?\s*hang|sl+ow|sys?tem\s*hang|hang+ing|frez+ing|freeze|lag+ing)\b/gi, replacement: 'Slow Performance / System Freezing' },
  { pattern: /\b(wat+er\s*dam+a?ge|wat+er\s*spil+ed|liq+uid\s*dam+a?ge|liq+uid\s*spil+ed|wet)\b/gi, replacement: 'Liquid / Water Damage' },
  { pattern: /\b(key?bo?a?rd\s*not\s*wor?k?ing|key\s*miss?ing|some\s*keys\s*not\s*wor?k?ing|key?bo?rd)\b/gi, replacement: 'Keyboard Malfunction' },
  { pattern: /\b(over\s*heat+ing|heat+ing|fan\s*noi?se|fan\s*not\s*spin+ing|auto\s*shut+d?own)\b/gi, replacement: 'Overheating / Fan Issue' },
  { pattern: /\b(blu?e\s*scree?n|bsod|dum?p\s*err?or|stop\s*code)\b/gi, replacement: 'Blue Screen (BSOD)' },
  { pattern: /\b(mothe?r?\s*bo?a?rd\s*shor?t|ic\s*burn?t?|mothe?r?\s*bo?rd\s*issu?e|chip\s*lev?e?l)\b/gi, replacement: 'Motherboard / Chip-Level Short' },
  { pattern: /\b(wind?ow?s?\s*cor+upt|os\s*not\s*boo?t?ing|boo?t\s*loo?p|no\s*boo?table\s*dev?i?ce)\b/gi, replacement: 'OS Boot Failure / Windows Corruption' },
  { pattern: /\b(hin?ge\s*brok?e?n?|body\s*dam+a?ge|scree?n\s*panel\s*brok?e?n?|cra?ck)\b/gi, replacement: 'Hinge / Cabinet Damage' },
  { pattern: /\b(no\s*sou?nd|spea?k?er\s*crac?k?l?ing|aud?io\s*not\s*wor?k?ing|spk?r)\b/gi, replacement: 'Audio / Speaker Issue' },
  { pattern: /\b(wi-?fi\s*not\s*wor?k?ing|no\s*wi-?fi|blue?too?th\s*not\s*wor?k?ing|net?wor?k\s*prob?l?em?)\b/gi, replacement: 'Wi-Fi / Network Issue' },
  { pattern: /\b(dat+a\s*recov?e?ry|hdd\s*not\s*detec?t?ed|click+ing\s*noi?se|hard\s*disk\s*cor+upt)\b/gi, replacement: 'Data Recovery Required' },
];

/**
 * Fast Levenshtein distance implementation for fuzzy spelling correction.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const aLen = a.length;
  const bLen = b.length;

  // Single array optimization for sub-millisecond execution (<0.01ms)
  let prevRow = new Array(bLen + 1);
  let currRow = new Array(bLen + 1);

  for (let j = 0; j <= bLen; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= aLen; i++) {
    currRow[0] = i;
    const aChar = a.charAt(i - 1);

    for (let j = 1; j <= bLen; j++) {
      const bChar = b.charAt(j - 1);
      const cost = aChar === bChar ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1] + 1,     // insertion
        prevRow[j] + 1,         // deletion
        prevRow[j - 1] + cost   // substitution
      );
    }

    // Swap rows
    const temp = prevRow;
    prevRow = currRow;
    currRow = temp;
  }

  return prevRow[bLen];
}

/**
 * Corrects an individual word in real-time.
 * Checks exact typo maps, brands, entities, hardware patterns, and fuzzy Levenshtein distance.
 */
export function correctSingleWord(rawWord: string): string {
  if (!rawWord || rawWord.length < 2) return rawWord;

  // Separate leading/trailing punctuation (e.g. "kankumari," -> clean "kankumari", punct ",")
  const prefixMatch = rawWord.match(/^[^a-zA-Z0-9]+/);
  const suffixMatch = rawWord.match(/[^a-zA-Z0-9]+$/);
  const prefix = prefixMatch ? prefixMatch[0] : '';
  const suffix = suffixMatch ? suffixMatch[0] : '';

  const clean = rawWord.slice(prefix.length, rawWord.length - suffix.length);
  if (!clean || clean.length < 2) return rawWord;

  const lower = clean.toLowerCase();

  // 1. Check Hardware Unit Patterns (e.g. 16gb, 512gb, ddr5, rtx4060, i7)
  const unitMatch = clean.match(/^(\d+)\s*(gb|tb|mb)$/i);
  if (unitMatch) {
    return prefix + `${unitMatch[1]}${unitMatch[2].toUpperCase()}` + suffix;
  }
  if (/^(ram|ssd|hdd|nvme|sata|ddr[345]|lpddr[45])$/i.test(clean)) {
    const fixed = lower === 'nvme' ? 'NVMe' : clean.toUpperCase();
    return prefix + fixed + suffix;
  }

  let corrected = '';

  // 2. Check Word Typo Dictionary
  if (WORD_TYPO_MAP[lower]) {
    corrected = WORD_TYPO_MAP[lower];
  }
  // 3. Check Brand Dictionary
  else if (BRAND_CORRECTIONS[lower]) {
    corrected = BRAND_CORRECTIONS[lower];
  }
  // 4. Check Model Series Dictionary
  else if (MODEL_SERIES_CORRECTIONS[lower]) {
    corrected = MODEL_SERIES_CORRECTIONS[lower];
  }
  // 5. Check Proper Entity Casing (e.g. kanyakumari -> Kanyakumari)
  else if (ENTITY_PROPER_CASE_MAP[lower]) {
    corrected = ENTITY_PROPER_CASE_MAP[lower];
  }
  // 6. If word is already a valid dictionary word, leave it untouched
  else if (GLOBAL_VOCABULARY_SET.has(lower) || VOCABULARY_SET.has(lower)) {
    return rawWord;
  }
  // 7. Fast Bucket-Indexed Levenshtein Fuzzy Matching
  else if (clean.length >= 4 && !/\d/.test(clean)) {
    const maxAllowed = lower.length <= 4 ? 1 : 2;
    let minDistance = 999;
    let bestCandidate = '';

    // Search length buckets from (len - maxAllowed) to (len + maxAllowed)
    const minLen = Math.max(2, lower.length - maxAllowed);
    const maxLen = lower.length + maxAllowed;

    for (let l = minLen; l <= maxLen; l++) {
      const candidates = VOCABULARY_BY_LENGTH.get(l);
      if (!candidates) continue;

      for (let i = 0; i < candidates.length; i++) {
        const vocab = candidates[i];
        const dist = levenshteinDistance(lower, vocab);

        if (dist <= maxAllowed && dist < minDistance) {
          minDistance = dist;
          bestCandidate = vocab;
          if (dist === 1 && lower.length <= 6) break; // Fast break on close match
        }
      }
    }

    if (bestCandidate && minDistance <= maxAllowed) {
      const candLower = bestCandidate.toLowerCase();
      if (ENTITY_PROPER_CASE_MAP[candLower]) {
        corrected = ENTITY_PROPER_CASE_MAP[candLower];
      } else if (BRAND_CORRECTIONS[candLower]) {
        corrected = BRAND_CORRECTIONS[candLower];
      } else if (MODEL_SERIES_CORRECTIONS[candLower]) {
        corrected = MODEL_SERIES_CORRECTIONS[candLower];
      } else {
        corrected = bestCandidate;
      }
    }
  }

  if (!corrected) {
    return rawWord;
  }

  // Preserve casing from original input
  const isAllUpper = clean === clean.toUpperCase() && clean.length > 1;
  const isCapitalized = clean.charAt(0) === clean.charAt(0).toUpperCase() && clean.slice(1) === clean.slice(1).toLowerCase();

  let finalWord = corrected;
  if (isAllUpper && !BRAND_CORRECTIONS[lower] && !ENTITY_PROPER_CASE_MAP[lower]) {
    finalWord = corrected.toUpperCase();
  } else if (isCapitalized && !BRAND_CORRECTIONS[lower] && !MODEL_SERIES_CORRECTIONS[lower] && !ENTITY_PROPER_CASE_MAP[lower]) {
    finalWord = corrected.charAt(0).toUpperCase() + corrected.slice(1);
  }

  return prefix + finalWord + suffix;
}

/**
 * Real-time Spacebar / Keystroke auto-corrector.
 * Inspects the text immediately before the cursor and corrects the last word.
 * Returns the new text, the new cursor position, and whether a replacement was made.
 */
export function autoCorrectOnSpace(
  fullText: string,
  cursorIndex: number
): { newText: string; newCursor: number; wasCorrected: boolean } {
  if (!fullText || cursorIndex <= 0) {
    return { newText: fullText, newCursor: cursorIndex, wasCorrected: false };
  }

  // Text before the cursor
  const textBefore = fullText.slice(0, cursorIndex);
  const textAfter = fullText.slice(cursorIndex);

  // Match the word preceding the cursor (excluding trailing space)
  const match = textBefore.match(/([a-zA-Z0-9\-_./]+)\s*$/);
  if (!match) {
    return { newText: fullText, newCursor: cursorIndex, wasCorrected: false };
  }

  const rawWord = match[1];
  const wordStartIndex = match.index!;
  const correctedWord = correctSingleWord(rawWord);

  if (correctedWord === rawWord) {
    return { newText: fullText, newCursor: cursorIndex, wasCorrected: false };
  }

  // Replace rawWord with correctedWord in textBefore
  const newBefore = textBefore.slice(0, wordStartIndex) + correctedWord + textBefore.slice(wordStartIndex + rawWord.length);
  const newText = newBefore + textAfter;
  const newCursor = newBefore.length;

  return { newText, newCursor, wasCorrected: true };
}

/**
 * Standard React KeyDown event handler for input & textarea fields.
 * Intercepts Spacebar to perform instant real-time word correction.
 */
export function handleAutoCorrectKeyDown(
  e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  currentValue: string,
  onChange: (val: string) => void
): void {
  if (e.key === ' ' || e.key === 'Spacebar') {
    const target = e.currentTarget;
    const cursor = target.selectionStart || currentValue.length;
    const { newText, newCursor, wasCorrected } = autoCorrectOnSpace(currentValue, cursor);

    if (wasCorrected) {
      e.preventDefault();
      // Insert space after corrected word
      const updatedText = newText.slice(0, newCursor) + ' ' + newText.slice(newCursor);
      onChange(updatedText);

      // Restore cursor position immediately after the newly inserted space
      const nextPos = newCursor + 1;
      requestAnimationFrame(() => {
        if (target) {
          target.setSelectionRange(nextPos, nextPos);
        }
      });
    }
  }
}

/**
 * Capitalizes names properly (e.g. "s. rajesh kumar" -> "S. Rajesh Kumar")
 */
export function autoCorrectName(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  return trimmed
    .split(' ')
    .map((word) => {
      if (word.length === 0) return '';
      if (word.includes('.')) {
        return word.split('.').map(part => part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : '').join('.');
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Auto-corrects Title casing for general fields
 */
export function autoCorrectTitle(raw: string): string {
  return autoCorrectName(raw);
}

/**
 * Auto-corrects and normalizes Brand names
 */
export function autoCorrectBrand(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const clean = raw.trim();
  const lower = clean.toLowerCase();

  if (BRAND_CORRECTIONS[lower]) {
    return BRAND_CORRECTIONS[lower];
  }

  for (const [key, canonical] of Object.entries(BRAND_CORRECTIONS)) {
    if (lower === key || lower.startsWith(`${key} `)) {
      const rest = clean.slice(key.length);
      return canonical + autoCorrectName(rest);
    }
  }

  return autoCorrectName(clean);
}

/**
 * Auto-corrects Model Names and Hardware Models
 */
export function autoCorrectModel(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let text = raw.trim().replace(/\s+/g, ' ');

  for (const [key, canonical] of Object.entries(MODEL_SERIES_CORRECTIONS)) {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    text = text.replace(regex, canonical);
  }

  text = text.replace(/\b(gen\s*\d+)\b/gi, (match) => match.toUpperCase().replace(/\s+/, ' '));
  text = text.replace(/\b(core\s*i[3579])\b/gi, (match) => {
    const num = match.slice(-1);
    return `Core i${num}`;
  });

  return text;
}

/**
 * Auto-corrects Hardware Specifications (RAM, SSD, Processor, GPU, Screen)
 */
export function autoCorrectSpecs(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let text = raw.trim().replace(/\s+/g, ' ');

  text = text.replace(/\b(\d+)\s*(gb|tb|mb)\b/gi, (_, num, unit) => `${num}${unit.toUpperCase()}`);
  text = text.replace(/\b(ram|ssd|hdd|nvme|sata|emmc|rom|vram)\b/gi, (match) => {
    if (match.toLowerCase() === 'nvme') return 'NVMe';
    return match.toUpperCase();
  });
  text = text.replace(/\b(ddr[345]|lpddr[45])\b/gi, (match) => match.toUpperCase());
  text = text.replace(/\b(rtx\s*\d{4}|gtx\s*\d{4})\b/gi, (match) => match.toUpperCase().replace(/\s+/, ' '));
  text = text.replace(/\b(core\s*i[3579]|i[3579]-?\d{4,5}[a-z]?)\b/gi, (match) => {
    if (match.toLowerCase().startsWith('core')) {
      return `Core i${match.slice(-1)}`;
    }
    return match.toUpperCase();
  });
  text = text.replace(/\b(ryzen\s*[3579])\b/gi, (match) => {
    const num = match.slice(-1);
    return `Ryzen ${num}`;
  });

  return text;
}

/**
 * Auto-corrects reported fault / symptoms descriptions
 */
export function autoCorrectFaultText(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim().replace(/\s+/g, ' ');

  // Check if the input directly matches a standard symptom phrase
  for (const { pattern, replacement } of SYMPTOM_PHRASE_CORRECTIONS) {
    if (pattern.test(trimmed)) {
      if (trimmed.length <= 40) {
        return replacement;
      }
    }
  }

  let text = autoCorrectGeneralText(trimmed);

  for (const { pattern, replacement } of SYMPTOM_PHRASE_CORRECTIONS) {
    if (pattern.test(text)) {
      if (text.length <= 40) {
        return replacement;
      }
      text = text.replace(pattern, replacement);
    }
  }

  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  return text;
}

/**
 * Auto-corrects general words and common technical typos across full strings.
 */
export function autoCorrectGeneralText(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const text = raw.trim().replace(/\s+/g, ' ');

  const words = text.split(' ');
  const correctedWords = words.map((w) => correctSingleWord(w));

  return correctedWords.join(' ');
}

/**
 * Auto-corrects Hardware item names (e.g. "8gb ram ddr4 for laptop")
 */
export function autoCorrectHardwareText(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const specCorrected = autoCorrectSpecs(raw);
  return autoCorrectGeneralText(specCorrected);
}

/**
 * Auto-corrects Code / Serial / Identification numbers
 */
export function autoCorrectCode(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Auto-corrects Phone numbers (Strips non-digits, normalizes +91 and 10 digits)
 */
export function autoCorrectPhone(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  if (digits.length > 10) {
    return digits.slice(0, 10);
  }
  return digits;
}

/**
 * Auto-corrects Email address (Strips spaces, lowercases)
 */
export function autoCorrectEmail(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * Auto-corrects Address lines (fixes typos in street/area/city/place names, applies proper casing)
 */
export function autoCorrectAddress(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const text = raw.trim().replace(/\s+/g, ' ');
  const words = text.split(' ');
  const correctedWords = words.map((w) => correctSingleWord(w));
  return correctedWords.join(' ');
}

