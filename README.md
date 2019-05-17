# [**brl**](https://www.npmjs.com/package/brl)
_Background-log-supporting ReadLine_

[![GitHub license](https://img.shields.io/github/license/edgarogh/brl.svg)](https://github.com/edgarogh/brl/blob/master/LICENSE)
[![David](https://img.shields.io/david/edgarogh/brl.svg)](https://www.npmjs.com/package/brl)

> Have you ever tried using the node `readline` module while having an async callback logging stuff in the background? This breaks the whole `readline` prompt.
>
> `brl` is a `readline` wrapper that uses weird terminal escape tricks, and intercepts `process.stdout`, in order to move the prompt down every time a line is logged.

## Installation
`npm install brl`

## Usage
```typescript
import { createInterface, BRLInterface } from 'brl';
```

The library can be used in two different ways:
 * `createInterface` has the same API as `readline` but is a bit limited
 * `BRLInterface` is quite easy to use and gives you a bit more control over some features

### Examples
```typescript
import { createInterface } from 'brl';

// Same API as readline (actually, it returns a real readline interface)
const rl = createInterface();
rl.setPrompt('> ');
rl.on('line', line => rl.prompt());
rl.prompt();

// Simulate background log
setInterval(() => console.log('Background log...'), 1000);
```

```typescript
import { BRLInterface } from 'brl';

const iface = new BRLInterface();
iface.setPrompt('> ');
iface.promptLoop(); // You can pass a callback directly to this method
// iface.prompt();
// iface.onLine([cb]);
// iface.start()       !!! If you don't use promptLoop(), you must explicitly start the interface

// iface.readline      !!! Access to the underlying readline interface

// Simulate background log
setInterval(() => console.log('Background log...'), 1000);
```

## Bugs & Suggestions
If you notice any bug or have a suggestion, please tell me about it in the issues, it will help everyone!

## License
**brl** is licensed under the very permissive [MIT License](https://tldrlegal.com/license/mit-license). You may use it for commercial projects if you comply to the license. However, the core feature's code was written by [Eric](https://stackoverflow.com/users/102441/eric) in a [StackOverflow answer](https://stackoverflow.com/a/10608048/5554145) licensed as CC-BY-SA. Thanks to him for his big indirect contribution !
