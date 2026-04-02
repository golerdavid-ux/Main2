const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'moneybook.json');

function loadData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { notes: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Detect if a serial number belongs to a Star Note (replacement note).
 * Star notes have a star symbol at the end of the serial number.
 */
function isStarNote(serial) {
  if (!serial) return false;
  const cleaned = serial.trim().toUpperCase();
  return cleaned.includes('*') || cleaned.includes('\u2605') || cleaned.includes('\u2606');
}

/**
 * Detect fancy serial number patterns that collectors value.
 */
function detectFancySerial(serial) {
  if (!serial) return [];
  // Extract just the digits from the serial
  const digits = serial.replace(/[^0-9]/g, '');
  if (digits.length < 4) return [];

  const fancies = [];

  // Solid: all same digit (e.g., 88888888)
  if (/^(\d)\1+$/.test(digits)) {
    fancies.push('Solid');
  }

  // Ladder: ascending sequence (e.g., 12345678)
  const ascending = '0123456789';
  const descending = '9876543210';
  if (ascending.includes(digits) || descending.includes(digits)) {
    fancies.push('Ladder');
  }

  // Radar: reads same forwards and backwards (e.g., 12344321)
  if (digits === digits.split('').reverse().join('')) {
    fancies.push('Radar');
  }

  // Repeater: first half equals second half (e.g., 12341234)
  if (digits.length >= 4 && digits.length % 2 === 0) {
    const half = digits.length / 2;
    if (digits.slice(0, half) === digits.slice(half)) {
      fancies.push('Repeater');
    }
  }

  // Super Repeater: two-digit pattern repeated (e.g., 07070707)
  if (digits.length >= 4) {
    const pair = digits.slice(0, 2);
    if (pair.repeat(Math.floor(digits.length / 2)) === digits) {
      fancies.push('Super Repeater');
    }
  }

  // Low Number: starts with many zeros (e.g., 00000012)
  const leadingZeros = digits.match(/^0+/);
  if (leadingZeros && leadingZeros[0].length >= 4) {
    fancies.push('Low Number');
  }

  // High Number: ends with many 9s or is 99999900+
  if (/9{5,}$/.test(digits)) {
    fancies.push('High Number');
  }

  // Binary: only two distinct digits (e.g., 10010110)
  const uniqueDigits = new Set(digits.split(''));
  if (uniqueDigits.size === 2) {
    fancies.push('Binary');
  }

  // Seven-of-a-kind or near-solid
  const digitCounts = {};
  for (const d of digits) {
    digitCounts[d] = (digitCounts[d] || 0) + 1;
  }
  const maxCount = Math.max(...Object.values(digitCounts));
  if (maxCount >= 7 && !fancies.includes('Solid')) {
    fancies.push('Near Solid (7-of-a-kind)');
  }

  // Trinary: only three distinct digits
  if (uniqueDigits.size === 3 && !fancies.includes('Binary')) {
    fancies.push('Trinary');
  }

  return fancies;
}

/**
 * Common Friedberg number lookup based on denomination + series year.
 * This is a simplified reference — a full catalog would be much larger.
 */
const FRIEDBERG_REFERENCE = {
  '1': {
    '1963': 'Fr. 1900',
    '1963A': 'Fr. 1901',
    '1963B': 'Fr. 1902',
    '1969': 'Fr. 1903',
    '1969A': 'Fr. 1904',
    '1969B': 'Fr. 1905',
    '1969C': 'Fr. 1906',
    '1969D': 'Fr. 1907',
    '1974': 'Fr. 1908',
    '1977': 'Fr. 1909',
    '1977A': 'Fr. 1910',
    '1981': 'Fr. 1911',
    '1981A': 'Fr. 1912',
    '1985': 'Fr. 1913',
    '1988': 'Fr. 1914',
    '1988A': 'Fr. 1915',
    '1993': 'Fr. 1918',
    '1995': 'Fr. 1921',
    '1999': 'Fr. 1924',
    '2001': 'Fr. 1926',
    '2003': 'Fr. 1928',
    '2003A': 'Fr. 1929',
    '2006': 'Fr. 1930',
    '2009': 'Fr. 1932',
    '2013': 'Fr. 1933',
    '2017': 'Fr. 1934',
    '2017A': 'Fr. 1935',
  },
  '2': {
    '1976': 'Fr. 1935',
    '1995': 'Fr. 1936',
    '2003': 'Fr. 1937',
    '2003A': 'Fr. 1938',
    '2009': 'Fr. 1939',
    '2013': 'Fr. 1940',
    '2017A': 'Fr. 1941',
  },
  '5': {
    '1963': 'Fr. 1967',
    '1963A': 'Fr. 1968',
    '1969': 'Fr. 1969',
    '1969A': 'Fr. 1970',
    '1969B': 'Fr. 1971',
    '1969C': 'Fr. 1972',
    '1974': 'Fr. 1973',
    '1977': 'Fr. 1974',
    '1977A': 'Fr. 1975',
    '1981': 'Fr. 1976',
    '1981A': 'Fr. 1977',
    '1985': 'Fr. 1978',
    '1988': 'Fr. 1979',
    '1988A': 'Fr. 1980',
    '1993': 'Fr. 1983',
    '1995': 'Fr. 1985',
    '1999': 'Fr. 1987',
    '2001': 'Fr. 1988',
    '2003': 'Fr. 1990',
    '2006': 'Fr. 1993',
    '2009': 'Fr. 1996',
    '2013': 'Fr. 1998',
    '2017': 'Fr. 1999',
    '2017A': 'Fr. 2000',
  },
  '10': {
    '1963': 'Fr. 2016',
    '1963A': 'Fr. 2017',
    '1969': 'Fr. 2018',
    '1969A': 'Fr. 2019',
    '1969B': 'Fr. 2020',
    '1969C': 'Fr. 2021',
    '1974': 'Fr. 2022',
    '1977': 'Fr. 2023',
    '1977A': 'Fr. 2024',
    '1981': 'Fr. 2025',
    '1981A': 'Fr. 2026',
    '1985': 'Fr. 2027',
    '1988A': 'Fr. 2028',
    '1990': 'Fr. 2029',
    '1993': 'Fr. 2030',
    '1995': 'Fr. 2032',
    '1999': 'Fr. 2034',
    '2001': 'Fr. 2036',
    '2003': 'Fr. 2038',
    '2004A': 'Fr. 2040',
    '2006': 'Fr. 2041',
    '2009': 'Fr. 2043',
    '2013': 'Fr. 2045',
    '2017': 'Fr. 2046',
    '2017A': 'Fr. 2047',
  },
  '20': {
    '1963': 'Fr. 2063',
    '1963A': 'Fr. 2064',
    '1969': 'Fr. 2065',
    '1969A': 'Fr. 2066',
    '1969B': 'Fr. 2067',
    '1969C': 'Fr. 2068',
    '1974': 'Fr. 2069',
    '1977': 'Fr. 2070',
    '1981': 'Fr. 2071',
    '1981A': 'Fr. 2072',
    '1985': 'Fr. 2073',
    '1988A': 'Fr. 2074',
    '1990': 'Fr. 2075',
    '1993': 'Fr. 2076',
    '1995': 'Fr. 2078',
    '1996': 'Fr. 2083',
    '1999': 'Fr. 2084',
    '2001': 'Fr. 2085',
    '2004': 'Fr. 2087',
    '2004A': 'Fr. 2088',
    '2006': 'Fr. 2089',
    '2009': 'Fr. 2091',
    '2013': 'Fr. 2093',
    '2017': 'Fr. 2095',
    '2017A': 'Fr. 2096',
  },
  '50': {
    '1963A': 'Fr. 2113',
    '1969': 'Fr. 2114',
    '1969A': 'Fr. 2115',
    '1969B': 'Fr. 2116',
    '1969C': 'Fr. 2117',
    '1974': 'Fr. 2118',
    '1977': 'Fr. 2119',
    '1981': 'Fr. 2120',
    '1981A': 'Fr. 2121',
    '1985': 'Fr. 2122',
    '1988': 'Fr. 2123',
    '1990': 'Fr. 2124',
    '1993': 'Fr. 2125',
    '1996': 'Fr. 2126',
    '2001': 'Fr. 2128',
    '2004': 'Fr. 2130',
    '2006': 'Fr. 2131',
    '2013': 'Fr. 2133',
    '2017A': 'Fr. 2135',
  },
  '100': {
    '1963A': 'Fr. 2163',
    '1969': 'Fr. 2164',
    '1969A': 'Fr. 2165',
    '1969C': 'Fr. 2166',
    '1974': 'Fr. 2167',
    '1977': 'Fr. 2168',
    '1981': 'Fr. 2169',
    '1981A': 'Fr. 2170',
    '1985': 'Fr. 2171',
    '1988': 'Fr. 2172',
    '1990': 'Fr. 2173',
    '1993': 'Fr. 2174',
    '1996': 'Fr. 2175',
    '1999': 'Fr. 2176',
    '2001': 'Fr. 2177',
    '2003': 'Fr. 2179',
    '2003A': 'Fr. 2180',
    '2006': 'Fr. 2181',
    '2006A': 'Fr. 2182',
    '2009': 'Fr. 2183',
    '2009A': 'Fr. 2184',
    '2013': 'Fr. 2188',
    '2017': 'Fr. 2189',
    '2017A': 'Fr. 2190',
  },
};

/**
 * Look up a Friedberg number from denomination and series year.
 */
function lookupFriedberg(denomination, seriesYear) {
  if (!denomination || !seriesYear) return null;
  const denom = String(denomination).replace(/[$,]/g, '');
  const ref = FRIEDBERG_REFERENCE[denom];
  if (!ref) return null;
  return ref[seriesYear] || null;
}

/**
 * Analyze a note and return detected flags/features.
 */
function analyzeNote(noteData) {
  const analysis = {
    isStarNote: isStarNote(noteData.serialNumber),
    fancySerials: detectFancySerial(noteData.serialNumber),
    friedbergNumber: lookupFriedberg(noteData.denomination, noteData.seriesYear),
  };

  const flags = [];
  if (analysis.isStarNote) flags.push('Star Note');
  if (analysis.fancySerials.length > 0) {
    flags.push(...analysis.fancySerials.map(f => `Fancy: ${f}`));
  }
  if (noteData.errors && noteData.errors.length > 0) {
    flags.push(...noteData.errors.map(e => `Error: ${e}`));
  }

  analysis.flags = flags;
  return analysis;
}

/**
 * Get all notes from the money book.
 */
function getAllNotes() {
  return loadData().notes;
}

/**
 * Get a single note by ID.
 */
function getNoteById(id) {
  const data = loadData();
  return data.notes.find(n => n.id === id) || null;
}

/**
 * Add a new note to the money book.
 */
function addNote(noteData) {
  const data = loadData();
  const analysis = analyzeNote(noteData);

  const note = {
    id: noteData.id,
    denomination: noteData.denomination || '',
    seriesYear: noteData.seriesYear || '',
    serialNumber: noteData.serialNumber || '',
    treasurerSignature: noteData.treasurerSignature || '',
    secretarySignature: noteData.secretarySignature || '',
    friedbergNumber: analysis.friedbergNumber || noteData.friedbergNumber || '',
    isStarNote: analysis.isStarNote,
    fancySerials: analysis.fancySerials,
    errors: noteData.errors || [],
    grade: noteData.grade || '',
    grader: noteData.grader || '',
    certNumber: noteData.certNumber || '',
    gradingComments: noteData.gradingComments || '',
    estimatedValue: noteData.estimatedValue || '',
    costPaid: noteData.costPaid || '',
    photoFilename: noteData.photoFilename || '',
    flags: analysis.flags,
    notes: noteData.notes || '',
    dateAdded: new Date().toISOString(),
  };

  data.notes.push(note);
  saveData(data);
  return note;
}

/**
 * Update an existing note.
 */
function updateNote(id, updates) {
  const data = loadData();
  const index = data.notes.findIndex(n => n.id === id);
  if (index === -1) return null;

  const merged = { ...data.notes[index], ...updates };
  const analysis = analyzeNote(merged);
  merged.isStarNote = analysis.isStarNote;
  merged.fancySerials = analysis.fancySerials;
  merged.flags = analysis.flags;
  if (analysis.friedbergNumber) {
    merged.friedbergNumber = analysis.friedbergNumber;
  }

  data.notes[index] = merged;
  saveData(data);
  return merged;
}

/**
 * Delete a note by ID.
 */
function deleteNote(id) {
  const data = loadData();
  const index = data.notes.findIndex(n => n.id === id);
  if (index === -1) return false;
  data.notes.splice(index, 1);
  saveData(data);
  return true;
}

/**
 * Export all notes as CSV string.
 */
function exportCSV() {
  const data = loadData();
  const headers = [
    'ID', 'Denomination', 'Series Year', 'Serial Number',
    'Friedberg #', 'Star Note', 'Fancy Serials', 'Errors',
    'Treasurer', 'Secretary',
    'Grade', 'Grader', 'Cert #', 'Grading Comments',
    'Estimated Value', 'Cost Paid', 'Flags', 'Notes', 'Date Added',
  ];

  const rows = data.notes.map(n => [
    n.id,
    n.denomination,
    n.seriesYear,
    n.serialNumber,
    n.friedbergNumber,
    n.isStarNote ? 'Yes' : 'No',
    (n.fancySerials || []).join('; '),
    (n.errors || []).join('; '),
    n.treasurerSignature,
    n.secretarySignature,
    n.grade,
    n.grader,
    n.certNumber,
    n.gradingComments,
    n.estimatedValue,
    n.costPaid,
    (n.flags || []).join('; '),
    n.notes,
    n.dateAdded,
  ]);

  const escape = (val) => {
    const str = String(val || '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [headers.map(escape).join(',')];
  for (const row of rows) {
    lines.push(row.map(escape).join(','));
  }
  return lines.join('\n');
}

module.exports = {
  getAllNotes,
  getNoteById,
  addNote,
  updateNote,
  deleteNote,
  analyzeNote,
  lookupFriedberg,
  isStarNote,
  detectFancySerial,
  exportCSV,
};
