import { bench, describe } from 'vitest';
import { map as zenMap } from './map'; // Import map
import { map as nanoMap } from 'nanostores';

describe('Map Creation', () => {
    bench('zen', () => {
        zenMap({ name: 'John', age: 30 });
    });

    bench('nanostores', () => {
        nanoMap({ name: 'John', age: 30 });
    });
});

describe('Map Get', () => {
    const zMap = zenMap({ name: 'John', age: 30 });
    const nMap = nanoMap({ name: 'John', age: 30 });

    bench('zen', () => {
        zMap.get();
    });

    bench('nanostores', () => {
        nMap.get();
    });
});

describe('Map Set Key (No Listeners)', () => {
    const zMap = zenMap({ name: 'John', age: 30 });
    const nMap = nanoMap({ name: 'John', age: 30 });
    let i = 0;

    bench('zen', () => {
        zMap.setKey('age', ++i);
    });

    bench('nanostores', () => {
        nMap.setKey('age', ++i);
    });
});

describe('Map Set Full Object (No Listeners)', () => {
    const zMap = zenMap({ name: 'John', age: 30 });
    // const nMap = nanoMap({ name: 'John', age: 30 }); // Nanostores doesn't have this
    let i = 0;

    bench('zen', () => {
        zMap.set({ name: 'Jane', age: ++i });
    });

    // Nanostores map doesn't have a direct full 'set' method
});
