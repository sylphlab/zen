import { bench, describe } from 'vitest';
import { createMap, get, set, setKey } from './map'; // Import functional API
import { map as nanoMap } from 'nanostores';

describe('Map Creation', () => {
    bench('zen', () => {
        createMap({ name: 'John', age: 30 });
    });

    bench('nanostores', () => {
        nanoMap({ name: 'John', age: 30 });
    });
});

describe('Map Get', () => {
    const zMap = createMap({ name: 'John', age: 30 });
    const nMap = nanoMap({ name: 'John', age: 30 });

    bench('zen', () => {
        get(zMap);
    });

    bench('nanostores', () => {
        nMap.get();
    });
});

describe('Map Set Key (No Listeners)', () => {
    const zMap = createMap({ name: 'John', age: 30 });
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
    const zMap = createMap({ name: 'John', age: 30 });
    // const nMap = nanoMap({ name: 'John', age: 30 }); // Nanostores doesn't have this
    let i = 0;

    bench('zen', () => {
        set(zMap, { name: 'Jane', age: ++i });
    });

    // Nanostores map doesn't have a direct full 'set' method
});
