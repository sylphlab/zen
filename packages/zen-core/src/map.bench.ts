import { map as nanoMap } from 'nanostores';
import { bench, describe } from 'vitest';
import { get } from './index'; // Import core 'get' from main entry
import { map, set, setKey } from './map'; // Import map-specific functional API

describe('Map Creation', () => {
  bench('zen', () => {
    map({ name: 'John', age: 30 });
  });

  bench('nanostores', () => {
    nanoMap({ name: 'John', age: 30 });
  });
});

describe('Map Get', () => {
  const zMap = map({ name: 'John', age: 30 });
  const nMap = nanoMap({ name: 'John', age: 30 });

  bench('zen', () => {
    get(zMap);
  });

  bench('nanostores', () => {
    nMap.get();
  });
});

describe('Map Set Key (No Listeners)', () => {
  const zMap = map({ name: 'John', age: 30 });
  const nMap = nanoMap({ name: 'John', age: 30 });
  let i = 0;

  bench('zen', () => {
    setKey(zMap, 'age', ++i);
  });

  bench('nanostores', () => {
    nMap.setKey('age', ++i);
  });
});

describe('Map Set Full Object (No Listeners)', () => {
  const zMap = map({ name: 'John', age: 30 });
  // const nMap = nanoMap({ name: 'John', age: 30 }); // Nanostores doesn't have this
  let i = 0;

  bench('zen', () => {
    set(zMap, { name: 'Jane', age: ++i });
  });

  // Nanostores map doesn't have a direct full 'set' method
});
