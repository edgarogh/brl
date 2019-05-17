import { ok as assert } from 'assert';
import { AsyncCompleter, Completer, createInterface as rlCreateInterface, ReadLine as ReadLineBase } from 'readline';

interface ReadLine extends ReadLineBase {
    output: NodeJS.WritableStream;
    _refreshLine(): void;
}

export class BRLInterface {

    public readonly readline: ReadLine;

    public readonly wrappedStdout: NodeJS.WritableStream;
    public readonly wrappedStderr: NodeJS.WritableStream;
    public readonly wrappedConsole: Console;

    private state = InterfaceState.STOPPED;

    private stdoutPD: PropertyDescriptor;
    private stderrPD: PropertyDescriptor;
    private consolePD: PropertyDescriptor;

    private console = console;

    constructor(
        private stdout: NodeJS.WritableStream = process.stdout,
        private stderr: NodeJS.WritableStream = process.stderr,
        stdin: NodeJS.ReadableStream = process.stdin,
        completer: Completer | AsyncCompleter | undefined = undefined,
    ) {
        this.readline = rlCreateInterface(stdin, stdout, completer) as ReadLine;

        this.wrappedStdout = this.wrapWritable(stdout);
        this.wrappedStderr = this.wrapWritable(stderr);

        this.wrappedConsole = new console.Console(this.wrappedStdout,
            this.wrappedStderr);
    }

    private wrapWritable<T extends NodeJS.WritableStream>(writable: T) {
        const wrapped: T = Object.create(writable);

        wrapped.write = (buffer, cb) => {
            writable.write('\x1b[2K\r');
            const result = writable.write(buffer, cb);
            this.readline._refreshLine();
            return result;
        };

        return wrapped;
    }

    public setPrompt(prompt: string) {
        this.readline.setPrompt(prompt);
    }

    public onLine(cb: (line: string) => void) {
        this.readline.on('line', cb);
    }

    public prompt() {
        this.readline.prompt();
    }

    public promptLoop(cb?: (line: string) => void) {
        if (cb) this.onLine(cb);
        this.readline.on('line', () => this.prompt());

        if (this.state !== InterfaceState.STARTED) this.start();
        this.prompt();
    }

    // The following methods allow the replacement of `process.stdout` and 
    // `process.stderr`. They will have an inconsistent behavior if used with 
    // other streams

    /**
     * Start replacing `process.stdout`, `process.stderr` and `console` with 
     * their wrapped version
     */
    start() {
        assert(this.state === InterfaceState.STOPPED,
            'interface already started');

        this.stdoutPD = Object.getOwnPropertyDescriptor(process, 'stdout')!;
        this.stderrPD = Object.getOwnPropertyDescriptor(process, 'stderr')!;
        this.consolePD = Object.getOwnPropertyDescriptor(global, 'console')!;

        const this$Interface = this;

        const cases = <const>[
            [process, 'stdout', this.stdout, this.wrappedStdout],
            [process, 'stderr', this.stderr, this.wrappedStderr],
            [global, 'console', this.console, this.wrappedConsole],
        ];

        for (const [obj, name, base, wrapped] of cases) {
            Object.defineProperty(obj, name, {
                get() {
                    // If paused, return the base object
                    if (this$Interface.state === InterfaceState.PAUSED) {
                        return base;
                    }
                    // If started, return the wrapped object
                    else {
                        return wrapped;
                    }
                },
            });
        }

        this.state = InterfaceState.STARTED;
    }

    /**
     * Makes the replaced `process.stdout`, `process.stderr` and `console` 
     * return their initial value until {@link resume} is called. This doesn't 
     * reset the replaced properties, it just turns a flag on
     */
    pause() {
        assert(this.state === InterfaceState.STARTED,
            'interface stopped or already paused');

        this.state = InterfaceState.PAUSED;
    }

    /**
     * @see {@link pause}
     */
    resume() {
        assert(this.state === InterfaceState.PAUSED,
            'interface not paused');

        this.state = InterfaceState.STARTED;
    }

    /**
     * Completely reset `process.stdout`, `process.stderr` and `console` to 
     * their original property descriptors
     */
    stop() {
        assert(this.state !== InterfaceState.STOPPED,
            'interface already stopped');

        // Reset properties to their initial property descriptor
        Object.defineProperty(process, 'stdout', this.stdoutPD);
        Object.defineProperty(process, 'stderr', this.stderrPD);
        Object.defineProperty(global, 'console', this.consolePD);

        this.state = InterfaceState.STOPPED;
    }

}

export function createInterface(
    input?: NodeJS.ReadableStream,
    output?: NodeJS.WritableStream,
    completer?: Completer | AsyncCompleter,
) {
    const iface = new BRLInterface(output, process.stderr, input, completer);
    iface.start();
    iface.readline.on('close', () => iface.stop());
    return iface.readline;
}

export enum InterfaceState {
    STARTED,
    PAUSED,
    STOPPED,
}
