'use strict';

// Neutralize expo winter lazy getters installed by expo/src/winter/runtime.native.ts
// during the jest-expo setupFiles phase.
//
// These lazy getters call require() via jest's module system when accessed.
// If accessed while jest's isInsideTestCode===false (e.g., between hooks),
// jest-runtime throws "outside of scope" error.
//
// Fix: replace each lazy getter with a safe concrete value.

function neutralizeLazyGetter(name, safeValue) {
  const descriptor = Object.getOwnPropertyDescriptor(global, name);
  if (descriptor && typeof descriptor.get === 'function') {
    Object.defineProperty(global, name, {
      value: safeValue,
      writable: true,
      configurable: true,
      enumerable: descriptor.enumerable !== false,
    });
  }
}

// Node.js built-in implementations
const { TextDecoder } = require('util');
const { URL, URLSearchParams } = require('url');
const { serialize, deserialize } = require('v8');

neutralizeLazyGetter('TextDecoder', TextDecoder);
neutralizeLazyGetter('TextDecoderStream', null);
neutralizeLazyGetter('TextEncoderStream', null);
neutralizeLazyGetter('URL', URL);
neutralizeLazyGetter('URLSearchParams', URLSearchParams);
neutralizeLazyGetter('__ExpoImportMetaRegistry', null);
neutralizeLazyGetter('structuredClone', (value) => deserialize(serialize(value)));
neutralizeLazyGetter('ReadableStream', null);
