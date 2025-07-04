// src/setup.js
import { Buffer } from 'buffer';
import process from 'process';
import { util } from 'util';

window.Buffer = Buffer;
window.process = process;
window.global = window;
window.util = util;

// Force Buffer to be available on the prototype
if (!Uint8Array.prototype.slice) {
  Uint8Array.prototype.slice = Array.prototype.slice;
}
