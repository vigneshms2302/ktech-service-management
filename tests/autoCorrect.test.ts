import { describe, it, expect } from 'vitest';
import {
  autoCorrectBrand,
  autoCorrectModel,
  autoCorrectSpecs,
  autoCorrectFaultText,
  autoCorrectName,
  autoCorrectPhone,
  autoCorrectEmail,
  autoCorrectCode,
  autoCorrectGeneralText,
  levenshteinDistance,
  correctSingleWord,
  autoCorrectOnSpace,
} from '../src/utils/autoCorrect.ts';

describe('Auto-Correction & Text Sanitization Engine', () => {
  it('should compute Levenshtein distance accurately', () => {
    expect(levenshteinDistance('lapop', 'laptop')).toBe(1);
    expect(levenshteinDistance('mothebord', 'motherboard')).toBe(2);
    expect(levenshteinDistance('apple', 'apple')).toBe(0);
    expect(levenshteinDistance('cat', 'hat')).toBe(1);
  });

  it('should auto-correct individual words in real-time including fuzzy matches', () => {
    expect(correctSingleWord('lapop')).toBe('laptop');
    expect(correctSingleWord('Lapop')).toBe('Laptop');
    expect(correctSingleWord('LAPOP')).toBe('LAPTOP');
    expect(correctSingleWord('dispaly,')).toBe('display,');
    expect(correctSingleWord('mothebord')).toBe('motherboard');
    expect(correctSingleWord('dell')).toBe('Dell');
    expect(correctSingleWord('lenovo')).toBe('Lenovo');
    expect(correctSingleWord('thinkpad')).toBe('ThinkPad');
    expect(correctSingleWord('16gb')).toBe('16GB');
    expect(correctSingleWord('512gb')).toBe('512GB');
  });

  it('should auto-correct on spacebar keystrokes in real-time', () => {
    const input = 'fixing lapop';
    const result = autoCorrectOnSpace(input, input.length);
    expect(result.wasCorrected).toBe(true);
    expect(result.newText).toBe('fixing laptop');
    expect(result.newCursor).toBe('fixing laptop'.length);

    const brandInput = 'customer has lnovo';
    const brandResult = autoCorrectOnSpace(brandInput, brandInput.length);
    expect(brandResult.wasCorrected).toBe(true);
    expect(brandResult.newText).toBe('customer has Lenovo');
  });

  it('should auto-correct brand names and common brand typos', () => {
    expect(autoCorrectBrand('dell')).toBe('Dell');
    expect(autoCorrectBrand('del')).toBe('Dell');
    expect(autoCorrectBrand('hp')).toBe('HP');
    expect(autoCorrectBrand('lenvo')).toBe('Lenovo');
    expect(autoCorrectBrand('linovo')).toBe('Lenovo');
    expect(autoCorrectBrand('appel')).toBe('Apple');
    expect(autoCorrectBrand('samsng')).toBe('Samsung');
    expect(autoCorrectBrand('asus')).toBe('Asus');
    expect(autoCorrectBrand('1plus')).toBe('OnePlus');
    expect(autoCorrectBrand('redmi')).toBe('Xiaomi Redmi');
    expect(autoCorrectBrand('gigabite')).toBe('Gigabyte');
    expect(autoCorrectBrand('wd')).toBe('Western Digital');
    expect(autoCorrectBrand('nvidea')).toBe('NVIDIA');
  });

  it('should auto-correct model series and capitalization', () => {
    expect(autoCorrectModel('thinkpad l490')).toBe('ThinkPad l490');
    expect(autoCorrectModel('inspiron 3520')).toBe('Inspiron 3520');
    expect(autoCorrectModel('macbook air m2')).toBe('MacBook Air m2');
    expect(autoCorrectModel('legion 5 pro')).toBe('Legion 5 pro');
    expect(autoCorrectModel('rog strix g15')).toBe('ROG Strix g15');
    expect(autoCorrectModel('core i5 gen 11')).toBe('Core i5 GEN 11');
  });

  it('should auto-correct hardware specifications and units', () => {
    expect(autoCorrectSpecs('16gb ram 512gb ssd')).toBe('16GB RAM 512GB SSD');
    expect(autoCorrectSpecs('1tb nvme m.2')).toBe('1TB NVMe m.2');
    expect(autoCorrectSpecs('ddr4 3200mhz')).toBe('DDR4 3200mhz');
    expect(autoCorrectSpecs('core i7 with rtx 4060')).toBe('Core i7 with RTX 4060');
    expect(autoCorrectSpecs('ryzen 5 processor')).toBe('Ryzen 5 processor');
  });

  it('should auto-correct service symptoms and technical fault descriptions', () => {
    expect(autoCorrectFaultText('no powr')).toBe('No Power (Dead)');
    expect(autoCorrectFaultText('dead')).toBe('No Power (Dead)');
    expect(autoCorrectFaultText('no dispaly')).toBe('No Display');
    expect(autoCorrectFaultText('batry drain')).toBe('Battery Backup Issue');
    expect(autoCorrectFaultText('slw sys hang')).toBe('Slow Performance / System Freezing');
    expect(autoCorrectFaultText('watr damge')).toBe('Liquid / Water Damage');
    expect(autoCorrectFaultText('keybord not wrking')).toBe('Keyboard Malfunction');
    expect(autoCorrectFaultText('overheting')).toBe('Overheating / Fan Issue');
    expect(autoCorrectFaultText('bluscreen')).toBe('Blue Screen (BSOD)');
  });

  it('should auto-correct customer names and titles', () => {
    expect(autoCorrectName('rajesh kumar')).toBe('Rajesh Kumar');
    expect(autoCorrectName('s. vignesh')).toBe('S. Vignesh');
    expect(autoCorrectName('dr. a.p.j. abdul')).toBe('Dr. A.P.J. Abdul');
    expect(autoCorrectName('  karthik   m   ')).toBe('Karthik M');
  });

  it('should auto-correct phone numbers, emails, and serial codes', () => {
    expect(autoCorrectPhone('+91 98430 11223')).toBe('9843011223');
    expect(autoCorrectPhone('09843011223')).toBe('9843011223');
    expect(autoCorrectPhone('98430-11223')).toBe('9843011223');

    expect(autoCorrectEmail('  Ramesh.Kumar@GMAIL.COM  ')).toBe('ramesh.kumar@gmail.com');

    expect(autoCorrectCode('  sn1234-xyz  ')).toBe('SN1234-XYZ');
  });

  it('should auto-correct common English technical typos', () => {
    expect(autoCorrectGeneralText('teh custmer brought mothebord for repar')).toBe('the customer brought motherboard for repair');
    expect(autoCorrectGeneralText('invoce paymnt recieved sucessful')).toBe('invoice payment received successful');
    expect(autoCorrectGeneralText('chargr and adpter cabel replaced')).toBe('charger and adapter cable replaced');
    expect(autoCorrectGeneralText('customer reported lapop dispaly flickering')).toBe('customer reported laptop display flickering');
  });

  it('should auto-correct Indian cities, districts, places and address typos globally', () => {
    expect(correctSingleWord('kankumari')).toBe('Kanyakumari');
    expect(correctSingleWord('coimbator')).toBe('Coimbatore');
    expect(correctSingleWord('chenai')).toBe('Chennai');
    expect(correctSingleWord('madurei')).toBe('Madurai');
    expect(correctSingleWord('tuticorin')).toBe('Tuticorin');
    expect(correctSingleWord('thothukudi')).toBe('Thoothukudi');
    expect(correctSingleWord('banglore')).toBe('Bengaluru');
    expect(correctSingleWord('tirupur')).toBe('Tiruppur');

    const addressSpace = autoCorrectOnSpace('Delivered to kankumari', 'Delivered to kankumari'.length);
    expect(addressSpace.wasCorrected).toBe(true);
    expect(addressSpace.newText).toBe('Delivered to Kanyakumari');
  });
});

